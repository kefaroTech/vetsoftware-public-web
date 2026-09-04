<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import { importeEstimado } from '@/features/landing/composables/planPricing'
import { CICLO_LABEL } from '@/features/landing/types/plans.types'
import { useScrollableRegion } from '@/composables/useScrollableRegion'
import type { ResumenContratacion } from '../types/contratacion.types'

/**
 * El resumen del paso vinculante, con «Cambiar» en cada fila.
 *
 * ── El nombre accesible de cada «Cambiar» es completo ──────────────────────
 * «Cambiar el plan», «Cambiar el ciclo de pago», «Cambiar el número de sedes».
 * Nunca cuatro enlaces que se llamen «Cambiar»: en la lista de enlaces que
 * produce un lector de pantalla serían indistinguibles, y es la regla R04 de
 * `reglas-de-interfaz.md`. La parte visible del texto es corta; el resto viaja
 * en `.ds-sr-only`, así que el rótulo leído y el rótulo visible empiezan igual
 * (§2.5.3 Label in Name).
 *
 * ── Un importe puede faltar, y entonces se escribe `—` ─────────────────
 * Cuando la selección incluye una capacidad que se cobra y que la lista de
 * precio no publica en el ciclo elegido, el resumen llega sin subtotal, sin IVA
 * y sin total. Las tres celdas escriben `—` —el marcador de «sin dato» de toda
 * la aplicación— y NO un cero, que en la pantalla que decide una compra se lee
 * como «no me cobran nada». El motivo lo explica la vista, que en ese caso
 * además esconde el botón de confirmar. Las filas de arriba se quedan: el plan,
 * el ciclo y las cantidades siguen siendo verdad, y los «Cambiar» son la salida.
 *
 * ── Por qué existen estos cuatro enlaces ───────────────────────────────────
 * Son la mitad de *corregir* de WCAG §3.3.4 Error Prevention (Legal,
 * Financial, Data), que aquí se cumple por la vía «Confirmed»: hay un mecanismo
 * para revisar, confirmar y corregir antes de finalizar el envío. La casilla y
 * el botón separado son la mitad de *confirmar*.
 */
const props = defineProps<{ resumen: ResumenContratacion }>()

/**
 * Volver al sitio donde se armó la selección, **con ella puesta**.
 *
 * <p>Las dos formas vuelven a `/planes` porque las dos se arman ahí —el
 * configurador de paquetes arriba, el asistente debajo—, pero la de la propuesta
 * NO lleva `plan` en la consulta: preseleccionaría un paquete que el prospecto
 * no eligió, y ese es el patrón oscuro exacto de «te devolvemos al catálogo con
 * algo ya marcado».
 */
const volverAPlanes = computed(() => ({
  name: 'planes',
  query: {
    ...(props.resumen.origen === 'PLAN' ? { plan: props.resumen.planCode } : {}),
    ciclo: props.resumen.ciclo,
    // Y las cantidades tampoco viajan en la vuelta cuando es una propuesta: el
    // configurador de paquetes las leería de la URL y las pintaría puestas,
    // que es preseleccionar por el prospecto lo mismo que `plan` no hace.
    ...(props.resumen.origen === 'PLAN'
      ? { sedes: String(props.resumen.sedes), usuarios: String(props.resumen.usuarios) }
      : {}),
  },
}))

/**
 * Las filas de arriba: qué se contrata.
 *
 * <p>En la rama del plan es una fila —el paquete—; en la de la propuesta son
 * **sus N líneas**, que es toda la diferencia entre las dos formas. La cantidad
 * se pinta solo cuando pasa de una: {@link LineaContratada.importe} es el precio
 * unitario que devolvió el servidor, así que una línea de tres unidades enseñaría
 * un importe que no explica su parte del subtotal si no se dice cuántas son. Y
 * no se multiplica: eso es aritmética de dinero en el cliente.
 */
const filas = computed(() => {
  const r = props.resumen
  const ciclo = {
    rotulo: 'Ciclo de pago',
    valor: CICLO_LABEL[r.ciclo],
    cambiar: 'el ciclo de pago',
  }

  if (r.origen === 'PLAN') {
    return [
      { rotulo: 'Plan', valor: r.titulo, cambiar: 'el plan' },
      ciclo,
      // Aquí las dos cifras SÍ son lo que se contrata: `lineasDeContratacion`
      // las manda como línea de la oferta en cuanto pasan de lo incluido.
      { rotulo: 'Sedes', valor: String(r.sedes), cambiar: 'el número de sedes' },
      { rotulo: 'Personas', valor: String(r.usuarios), cambiar: 'el número de personas' },
    ]
  }

  // La propuesta NO lleva filas de sedes ni de personas, y es la corrección de
  // un hueco de negocio, no una simplificación: la oferta de esta rama son sus
  // líneas y nada más (`lineasDePropuesta`), así que la capacidad que se cobra
  // ya está abajo con su cantidad y su importe —«Usuario adicional (capacidad)
  // 3 × $ 12.000»—. Las dos filas de arriba venían del control de
  // `PropuestaCapacidades`, que no sale a la red: enseñaban «Personas 8» encima
  // de una oferta que pedía tres, con un «Cambiar» que no cambiaba nada de lo
  // que se iba a cobrar. Ver `ResumenPlan.sedes`.
  return [
    ...r.lineas.map((l) => ({
      // Una CAPACIDAD cotizada no es una funcionalidad, y sin decirlo las dos
      // filas son indistinguibles: «Personas adicionales» leído como un
      // módulo más. El `kind` viene del servidor y estaba en el contrato
      // desde el principio; lo que faltaba era pintarlo.
      rotulo: l.tipo === 'CAPACITY' ? `${l.nombre} (capacidad)` : l.nombre,
      valor: l.cantidad > 1 ? `${l.cantidad} × ${importeEstimado(l.importe)}` : '✓',
      cambiar: 'lo que incluye tu propuesta',
    })),
    ciclo,
  ]
})

/**
 * El rótulo del IVA.
 *
 * <p>Con tipo publicado se escribe «IVA (19 %)»; sin él, **«IVA» a secas** y el
 * importe al lado, que sí es del servidor. La propuesta del asistente no publica
 * el tipo —el contrato solo trae un `taxRate` por línea y sin escala declarada—,
 * y escribir un porcentaje deducido en la pantalla que decide una compra es
 * equivocarse por un factor de cien de la forma más barata posible.
 */
const rotuloImpuesto = computed(() =>
  props.resumen.tasaImpuesto != null ? `IVA (${props.resumen.tasaImpuesto} %)` : 'IVA',
)

const seleccion = useTemplateRef<HTMLElement>('seleccion')
const seleccionDesborda = useScrollableRegion(seleccion)
const importes = useTemplateRef<HTMLElement>('importes')
const importesDesborda = useScrollableRegion(importes)
</script>

<template>
  <div class="res">
    <div
      ref="seleccion"
      class="ds-table-scroll ds-focus-ring"
      role="region"
      aria-label="Lo que vas a contratar"
      :tabindex="seleccionDesborda ? 0 : undefined"
    >
      <table class="ds-table ds-table--dense">
        <caption class="ds-sr-only">
          Lo que vas a contratar, con un enlace para cambiar cada dato
        </caption>
        <tbody>
          <tr v-for="f in filas" :key="f.rotulo">
            <th scope="row">{{ f.rotulo }}</th>
            <td class="ds-text-strong">{{ f.valor }}</td>
            <td class="res-action">
              <RouterLink :to="volverAPlanes">
                Cambiar<span class="ds-sr-only"> {{ f.cambiar }}</span>
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      ref="importes"
      class="ds-table-scroll ds-focus-ring"
      role="region"
      aria-label="Importes de la contratación"
      :tabindex="importesDesborda ? 0 : undefined"
    >
      <table class="ds-table ds-table--dense">
        <caption class="ds-sr-only">
          Importes
        </caption>
        <tbody>
          <tr>
            <th scope="row">Subtotal</th>
            <td class="ds-num">{{ importeEstimado(resumen.subtotal) }}</td>
          </tr>
          <tr>
            <th scope="row">{{ rotuloImpuesto }}</th>
            <td class="ds-num">{{ importeEstimado(resumen.impuesto) }}</td>
          </tr>
          <!-- El rótulo decía «Total del primer mes» y era FALSO: durante la prueba no se cobra
               nada, y esta misma pantalla lo dice dos bloques más arriba. Un total que no se
               cobra este mes no se llama «total del primer mes». Lo que este número es, es lo
               que costará el ciclo cuando la prueba termine. -->
          <tr>
            <th scope="row" class="ds-text-strong">
              {{ resumen.ciclo === 'ANUAL' ? 'Total por año' : 'Total por mes' }}, cuando termine la
              prueba
            </th>
            <td class="ds-num ds-text-strong">{{ importeEstimado(resumen.total) }}</td>
          </tr>
          <!-- Y la respuesta a la única pregunta que se hace quien está a punto de confirmar. -->
          <tr>
            <th scope="row" class="ds-text-strong">Lo que se te cobra hoy</th>
            <td class="ds-num ds-text-strong">{{ importeEstimado(0) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.res {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.res-action {
  text-align: right;
  white-space: nowrap;
}
</style>
