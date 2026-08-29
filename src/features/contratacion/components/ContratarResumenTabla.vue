<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatMoney } from '@/composables/money'
import { CICLO_LABEL } from '@/features/landing/types/plans.types'
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
 * ── Por qué existen estos cuatro enlaces ───────────────────────────────────
 * Son la mitad de *corregir* de WCAG §3.3.4 Error Prevention (Legal,
 * Financial, Data), que aquí se cumple por la vía «Confirmed»: hay un mecanismo
 * para revisar, confirmar y corregir antes de finalizar el envío. La casilla y
 * el botón separado son la mitad de *confirmar*.
 */
const props = defineProps<{ resumen: ResumenContratacion }>()

/** Volver al configurador con la selección puesta, no a un formulario vacío. */
const volverAPlanes = {
  name: 'planes',
  query: {
    plan: props.resumen.planCode,
    ciclo: props.resumen.ciclo,
    sedes: String(props.resumen.sedes),
    usuarios: String(props.resumen.usuarios),
  },
} as const

const filas = [
  { rotulo: 'Plan', valor: props.resumen.planNombre, cambiar: 'el plan' },
  { rotulo: 'Ciclo de pago', valor: CICLO_LABEL[props.resumen.ciclo], cambiar: 'el ciclo de pago' },
  { rotulo: 'Sedes', valor: String(props.resumen.sedes), cambiar: 'el número de sedes' },
  { rotulo: 'Personas', valor: String(props.resumen.usuarios), cambiar: 'el número de personas' },
]
</script>

<template>
  <div class="res">
    <div class="ds-table-scroll">
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

    <div class="ds-table-scroll">
      <table class="ds-table ds-table--dense">
        <caption class="ds-sr-only">
          Importes
        </caption>
        <tbody>
          <tr>
            <th scope="row">Subtotal</th>
            <td class="ds-num">{{ formatMoney(resumen.subtotal) }}</td>
          </tr>
          <tr>
            <th scope="row">IVA ({{ resumen.tasaImpuesto }} %)</th>
            <td class="ds-num">{{ formatMoney(resumen.impuesto) }}</td>
          </tr>
          <tr>
            <th scope="row" class="ds-text-strong">
              {{ resumen.ciclo === 'ANUAL' ? 'Total del primer año' : 'Total del primer mes' }}
            </th>
            <td class="ds-num ds-text-strong">{{ formatMoney(resumen.total) }}</td>
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
