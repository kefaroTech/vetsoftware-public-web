<script setup lang="ts">
import { computed } from 'vue'
import { formatDateLong } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import { pruebaUniforme } from '../api/contratacion.source'
import type { LineaPrueba } from '../types/contratacion.types'

/**
 * La prueba, que vence POR LÍNEA y no por contrato.
 *
 * ── El hecho, verificado en el modelo ──────────────────────────────────────
 * `ModuleGrantLine.java:45` lleva el `trialEndDate` en cada línea de concesión;
 * `ContractItemJpaRepository.java:72` lo lee de la línea del contrato, no de la
 * cabecera; y `default_trial_days` es por artículo. Caja puede vencer el día 14
 * y Agenda el 30 dentro del mismo contrato.
 *
 * Por eso la landing dice «Prueba gratis. Sin tarjeta» y **nunca «30 días»**:
 * sería falso para Caja, y el día 14 el usuario descubriría que le cobran algo
 * que creía gratis hasta el 30. Esa sorpresa quema una cuenta nueva.
 *
 * ── Reglas de redacción, que valen para el resto de la app ─────────────────
 *  - Siempre la fecha, y siempre con el módulo delante. Nunca «tu prueba vence
 *    el 11 de septiembre» (¿cuál prueba?), nunca «te quedan 14 días» a secas.
 *  - «Gratis **hasta** el 11» y no «hasta el 12»: `trialEndDate` es el último
 *    día inclusive. Equivocarse aquí es equivocarse en un día de cobro.
 *  - Se ordena por fecha de fin ASCENDENTE, no alfabéticamente: lo primero que
 *    hay que ver es lo primero que se acaba. Lo hace el adaptador.
 *  - Cuando todas comparten fecha, la frase se colapsa a una sola. El caso
 *    simple no paga el precio del complejo.
 *  - **Un módulo SIN prueba no se rotula con una fecha.** El catálogo tiene
 *    artículos `NEVER_FREE` —hoy `ELECTRONIC_INVOICING`, que viaja dentro de
 *    `PACK_FULL`— y para ellos `trialEndDate` es el propio día de alta. Pintar
 *    «gratis hasta el 29 de agosto» sobre algo que se cobra desde el primer día
 *    es la misma promesa falsa que la tabla existe para no hacer, solo que con
 *    un día de duración en vez de treinta. Se dice «Sin prueba» y se saca de la
 *    frase de arriba, que habla de pruebas.
 *
 * Las fechas se formatean con `composables/format.ts`, nunca con un
 * `toLocaleDateString` suelto, y el marcador de ausencia es su `—`.
 */
const props = defineProps<{ lineas: LineaPrueba[] }>()

/** Solo las que de verdad tienen prueba: son las únicas de las que habla la frase. */
const conPrueba = computed(() => props.lineas.filter((l) => l.trialDays != null && l.trialDays > 0))
const sinPrueba = computed(() =>
  props.lineas.filter((l) => l.trialDays == null || l.trialDays <= 0),
)

const uniforme = computed(() => pruebaUniforme(conPrueba.value))

/** La primera que se acaba y la última: son las dos que nombra la frase. */
const primera = computed(() => conPrueba.value[0] ?? null)
const ultima = computed(() => conPrueba.value[conPrueba.value.length - 1] ?? null)

/** «Caja» · «Caja y Compras» · «Caja, Compras y Cuentas abiertas». */
const nombresSinPrueba = computed(() => {
  const nombres = sinPrueba.value.map((l) => l.name)
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
})
</script>

<template>
  <div v-if="lineas.length > 0" class="ds-stack ds-stack--10">
    <p v-if="conPrueba.length === 0" class="trial-lead">
      Este plan no incluye prueba: se cobra desde el primer día.
    </p>
    <p v-else-if="uniforme" class="trial-lead">
      Todo tu plan es gratis hasta el {{ formatDateLong(primera?.trialEndDate) }}.
    </p>
    <p v-else class="trial-lead">
      Cada módulo tiene su propia prueba, y no terminan todas el mismo día.
      <strong>{{ primera?.name }} termina antes:</strong> el
      {{ formatDateLong(primera?.trialEndDate) }} empezamos a cobrar {{ primera?.name }}, y
      {{ ultima?.name }} sigue gratis hasta el {{ formatDateLong(ultima?.trialEndDate) }}.
    </p>

    <!-- Va aparte y no dentro de la frase de arriba: no es una prueba más corta,
         es la ausencia de prueba, y mezclarlas invitaría a leerlo como un plazo. -->
    <p v-if="sinPrueba.length > 0" class="trial-lead">
      <strong>{{ nombresSinPrueba }}</strong>
      {{ sinPrueba.length === 1 ? 'no tiene' : 'no tienen' }} prueba:
      {{ sinPrueba.length === 1 ? 'se cobra' : 'se cobran' }} desde el primer día.
    </p>

    <div class="ds-table-scroll">
      <table class="ds-table ds-table--dense">
        <caption class="ds-sr-only">
          Fecha de fin de la prueba de cada módulo, de la que termina antes a la que termina después
        </caption>
        <thead>
          <tr>
            <th scope="col">Módulo</th>
            <th scope="col">Gratis hasta</th>
            <th scope="col">Después</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in lineas" :key="l.code">
            <td class="ds-text-strong">{{ l.name }}</td>
            <!-- Sin prueba NO lleva fecha: `trialEndDate` sería el día de alta y
                 se leería como una prueba de un día. Ver el encabezado. -->
            <td>
              <span v-if="l.trialDays == null || l.trialDays <= 0">
                Sin prueba · se cobra desde el primer día
              </span>
              <span v-else>{{ formatDateLong(l.trialEndDate) }}</span>
            </td>
            <!-- «Incluido en tu plan» se leía como «gratis para siempre», que es lo contrario
                 de lo que dice esta columna: lo que hay después de la prueba es cobro. No hay
                 precio POR MÓDULO en ninguna fuente (ver `precioDespues` en el adaptador), así
                 que se dice dónde se cobra y no cuánto — inventar la cifra sería peor, pero
                 callar que se cobra es lo que quema una cuenta nueva el día 14. -->
            <td>
              <span v-if="l.precioDespues == null">Se cobra dentro del total del plan</span>
              <span v-else>{{ formatMoney(l.precioDespues) }} + IVA / mes</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* La pila la pone `.ds-stack` desde `primitives.css`: reescribirla aquí es
   justo lo que rechaza `vetsoftware/no-duplicate-primitive`. */
.trial-lead {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
}
</style>
