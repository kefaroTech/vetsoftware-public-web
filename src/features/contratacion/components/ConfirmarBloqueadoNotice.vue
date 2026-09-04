<script setup lang="ts">
import { computed } from 'vue'
import { textoSinPrecio } from '@/features/landing/composables/planPricing'
import type { CapacityUnit, Ciclo } from '@/features/landing/types/plans.types'

/**
 * Por qué NO se puede confirmar, cuando no se puede.
 *
 * ── La convención que aplica a los dos motivos ─────────────────────────────
 * La acción **desaparece** y en su sitio va una frase. No se deshabilita el
 * botón: un botón apagado sin motivo visible se lee como una avería de la
 * aplicación, y aquí no ha fallado nada — es el estado de la cuenta o el de la
 * lista de precio. «Ahora no» sigue estando en los dos casos: quien no puede
 * contratar tiene que poder salir del embudo.
 *
 * `role="status"` y no `alert` por lo mismo: es una condición, no un error.
 *
 * ── `PERMISO` ─────────────────────────────────────────────────────────────
 * `POST /quotes/self-serve` exige `quote.request`, sembrado **solo en nivel
 * `FULL`** (changeset 378): una empresa en mora queda en `READ_ONLY` y no lo
 * tiene. No es un borde raro, es el estado normal de una clínica que se atrasó
 * en un pago. La frase dice quién puede resolverlo y no nombra el permiso, que
 * al usuario no le dice nada.
 *
 * ── `SIN_PRECIO` ──────────────────────────────────────────────────────────
 * La selección incluye una capacidad que se cobra y que la lista no publica en
 * el ciclo elegido, así que el resumen llega sin importes. Mandar la oferta
 * igual no es una opción: el traductor de la autocontratación exige precio EN EL
 * CICLO PEDIDO y, si falta, tumba la oferta entera con un mensaje
 * indistinguible — el usuario vería «no pudimos registrar tu contratación» sin
 * saber por qué, y volvería a intentarlo. Se corta antes, con el motivo escrito
 * y con la salida que de verdad existe (el otro ciclo, o los «Cambiar» del
 * resumen).
 */
const props = defineProps<{
  motivo: 'PERMISO' | 'SIN_PRECIO'
  sinPrecio: CapacityUnit[]
  ciclo: Ciclo
}>()

const texto = computed(() => textoSinPrecio(props.sinPrecio, props.ciclo))
</script>

<template>
  <p v-if="motivo === 'PERMISO'" class="ds-banner ds-banner--warning" role="status">
    Tu usuario no puede confirmar la contratación. Puede hacerlo quien administre la cuenta de tu
    negocio; si tu negocio tiene pagos pendientes, escríbenos a
    <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a> y lo resolvemos.
  </p>

  <p v-else class="ds-banner ds-banner--warning" role="status">{{ texto }}</p>
</template>
