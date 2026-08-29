<script setup lang="ts">
import { computed } from 'vue'
import { formatDateShort } from '@/composables/format'
import { mandateStatusLabel, methodKindLabel } from '../composables/cotizacionesText'
import type { MedioConAviso } from '../composables/useMediosPago'

/**
 * Un medio de pago.
 *
 * <p>**No se muestran** `gateway`, `mandateEvidence` ni ningún token: son constancia interna, y
 * `mandateEvidence` puede llevar una referencia de pasarela.
 *
 * <p>Un mandato vencido **no se oculta**: se pinta apagado con su motivo escrito. Una tarjeta
 * que desaparece se lee como «me la borraron».
 */
const props = defineProps<{ entrada: MedioConAviso }>()

const emit = defineEmits<{
  predeterminado: []
  revocar: []
}>()

const medio = computed(() => props.entrada.medio)

const apagado = computed(() => medio.value.mandateStatus !== 'ACTIVE')

const claseAviso = computed(() =>
  props.entrada.aviso?.tono === 'error' ? 'ds-banner--error' : 'ds-banner--warning',
)
</script>

<template>
  <div class="ds-card ds-card--tight ds-stack ds-stack--10" :class="{ 'ds-is-disabled': apagado }">
    <div class="ds-flex-row ds-flex-row--12">
      <span class="ds-item-label ds-flex-fill">
        {{ methodKindLabel(medio.methodKind) }}
        <template v-if="medio.brand"> · {{ medio.brand }}</template>
        <template v-if="medio.lastFour"> · •••• {{ medio.lastFour }}</template>
      </span>
      <span v-if="medio.defaultMethod" class="ds-pill ds-tone--success">Predeterminado</span>
      <span v-if="apagado" class="ds-pill ds-tone--neutral">
        {{ mandateStatusLabel(medio.mandateStatus) }}
      </span>
    </div>

    <p class="ds-meta">
      <template v-if="medio.expiresOn">Vence el {{ formatDateShort(medio.expiresOn) }}.</template>
      <template v-if="medio.mandateStatus === 'REVOKED' && medio.revokedAt">
        Revocado el {{ formatDateShort(medio.revokedAt) }}.
      </template>
    </p>

    <div v-if="entrada.aviso" class="ds-banner ds-banner--sm" :class="claseAviso" role="status">
      <span class="ds-flex-fill">
        <strong>{{ entrada.aviso.fuerte }}</strong>
        {{ entrada.aviso.resto }}
      </span>
    </div>

    <div v-if="!apagado" class="ds-actions">
      <!-- Solo aparece en las que NO lo son: un botón que no cambia nada es ruido. -->
      <button
        v-if="!medio.defaultMethod"
        type="button"
        class="ds-btn ds-btn--neutral ds-btn--snug"
        @click="emit('predeterminado')"
      >
        Hacer predeterminado
      </button>
      <button type="button" class="ds-btn ds-btn--danger ds-btn--snug" @click="emit('revocar')">
        Revocar
      </button>
    </div>
  </div>
</template>
