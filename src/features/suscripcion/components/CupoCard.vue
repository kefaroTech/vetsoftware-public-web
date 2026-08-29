<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import MedidorCupo from './MedidorCupo.vue'
import { antiguedadTexto, sustantivo } from '../composables/cuposText'
import type { CupoResuelto } from '../composables/useCupos'
import type { EffectiveLimitResponse } from '../types/cupos.types'

/**
 * Un cupo: su medidor, su aviso de umbral y —bajo demanda— de dónde sale su tope.
 *
 * <p>El botón de salida no abre un formulario de alta: **el tenant no puede añadir líneas**
 * (`POST /subscriptions/{id}/items` es de sistema). Lleva a Cotizaciones con una explicación
 * honesta, que es preferible a un control apagado con un `title`.
 */
const props = defineProps<{
  cupo: CupoResuelto
  origen: EffectiveLimitResponse | undefined
}>()

const emit = defineEmits<{ 'pedir-origen': [limitDimensionId: number] }>()

/** Estado por instancia del componente: `ref()` local, que no es el patrón híbrido prohibido. */
const abierto = ref(false)

const nombre = computed(() => sustantivo(props.cupo.capacidad.dimensionCode))

const claseAviso = computed(() =>
  props.cupo.aviso?.tono === 'error' ? 'ds-banner--error' : 'ds-banner--warning',
)

const ORIGEN_LABELS: Record<string, string> = {
  COMPANY_OVERRIDE: 'Es un tope propio que se pactó para tu clínica.',
  SUBSCRIPTION: 'Sale de las líneas que tienes contratadas.',
  CATALOG_DEFAULT: 'Es el tope de fábrica de tu plan.',
  NONE: 'No hay ningún tope declarado para esto.',
}

const origenTexto = computed(() => {
  const o = props.origen
  if (!o) return null
  if (o.unlimited) return 'Este cupo no tiene techo.'
  return ORIGEN_LABELS[o.source] ?? o.source.toUpperCase()
})

function alternar() {
  abierto.value = !abierto.value
  const id = props.cupo.capacidad.limitDimensionId
  if (abierto.value && id != null) emit('pedir-origen', id)
}
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <MedidorCupo
      :dimension-code="cupo.capacidad.dimensionCode"
      :usado="cupo.capacidad.usedQuantity"
      :limite="cupo.capacidad.limitQuantity"
    />

    <!-- La fecha del recálculo es un indicador de salud: si se queda vieja hay un proceso
         caído y la clínica está decidiendo sobre una foto antigua sin saberlo. -->
    <p v-if="cupo.conRetraso" class="ds-meta">
      <span class="ds-pill ds-tone--warning">Datos con retraso</span>
      Estos números se actualizaron hace
      {{ antiguedadTexto(cupo.capacidad.limitRecalculatedAt) }}. Si algo no cuadra, escríbenos.
    </p>

    <!-- Solo el umbral MÁS ALTO alcanzado, nunca los tres apilados. `role="status"`: es una
         condición de la cuenta, no un suceso que deba interrumpir a nadie. -->
    <div v-if="cupo.aviso" class="ds-banner" :class="claseAviso" role="status">
      <AlertTriangle :size="16" :stroke-width="2" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        <strong>{{ cupo.aviso.fuerte }}</strong>
        {{ cupo.aviso.resto }}
      </span>
      <RouterLink
        :to="{ name: 'suscripcion-cotizaciones' }"
        class="ds-btn ds-btn--neutral ds-btn--snug salida"
      >
        Pedir más cupo
      </RouterLink>
    </div>

    <details :open="abierto">
      <summary class="ds-hint" @click.prevent="alternar">¿De dónde sale este tope?</summary>
      <p v-if="origenTexto" class="ds-meta">{{ origenTexto }}</p>
      <p v-else class="ds-meta">
        No pudimos averiguar de dónde sale tu tope de {{ nombre }}. Escríbenos y lo miramos.
      </p>
    </details>
  </div>
</template>

<style scoped>
.salida {
  flex-shrink: 0;
  white-space: nowrap;
}

summary {
  cursor: pointer;
}
</style>
