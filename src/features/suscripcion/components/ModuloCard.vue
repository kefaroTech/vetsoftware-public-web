<script setup lang="ts">
import { computed } from 'vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import { todayISO } from '@/composables/format'
import type { ModuleShowcaseResponse } from '@/features/entitlements/types/modulos.types'
import MedidorCupo from './MedidorCupo.vue'
import { avisoCupo, medidorTexto } from '../composables/cuposText'
import {
  CUERPO_DE_PAGO,
  CUERPO_NO_INCLUIDO,
  CUERPO_NUNCA_GRATIS,
  CUERPO_SOLO_LECTURA,
  SIN_PERMISO_COMPRA,
  ctaCompra,
  cuerpoTrial,
  esComprable,
  estadoPill,
  sufijoEje,
} from '../composables/modulosText'

/**
 * Una tarjeta del escaparate: el estado de un módulo del catálogo, lo tenga la empresa o no.
 *
 * <p>El botón de comprar se gatea por `modulo.canPurchase` —lo calcula el backend con el rol base
 * ADMIN de la empresa— y no por un permiso local: quien no puede comprar ve la tarjeta completa
 * (estado, medidor, fechas) menos el CTA, con el hueco honesto de `SIN_PERMISO_COMPRA` en su lugar.
 */
const props = defineProps<{
  modulo: ModuleShowcaseResponse
  seleccionado: boolean
}>()

const emit = defineEmits<{ alternar: [code: string, marcado: boolean] }>()

const pill = computed(() => estadoPill(props.modulo.state))

const cuerpo = computed(() => {
  switch (props.modulo.state) {
    case 'TRIAL':
      return cuerpoTrial(props.modulo.trialEndDate, todayISO())
    case 'EXPIRED_READ_ONLY':
      return CUERPO_SOLO_LECTURA
    case 'PAID':
      return CUERPO_DE_PAGO
    case 'NEVER_FREE':
      return CUERPO_NUNCA_GRATIS
    case 'NOT_INCLUDED':
      return CUERPO_NO_INCLUIDO
    default:
      return null
  }
})

const techos = computed(() =>
  (props.modulo.ceilings ?? []).map((c) => ({
    dimensionCode: c.dimensionCode,
    usado: c.used,
    limite: c.limit,
    sufijo: sufijoEje(c.measureKind),
    aviso: avisoCupo(
      { usedQuantity: c.used, limitQuantity: c.limit, dimensionCode: c.dimensionCode },
      c.enforcement as Parameters<typeof avisoCupo>[1],
      c.warnThreshold,
    ),
  })),
)

const comprable = computed(
  () =>
    esComprable(props.modulo.state, props.modulo.purchasable) && props.modulo.canPurchase === true,
)
const cta = computed(() => ctaCompra(props.modulo.state))

function alDeMarcar(event: Event): void {
  emit('alternar', props.modulo.code ?? '', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="ds-card mc-card">
    <div class="ds-flex-row mc-head">
      <span class="ds-flex-fill ds-item-label">{{ modulo.name ?? modulo.code }}</span>
      <BaseChip :variant="pill.variant">{{ pill.texto }}</BaseChip>
    </div>

    <p v-if="modulo.shortDescription" class="ds-meta">{{ modulo.shortDescription }}</p>
    <p v-if="cuerpo" class="ds-meta">{{ cuerpo }}</p>

    <div
      v-if="modulo.state === 'FREE_LIMITED' && techos.length > 0"
      class="ds-stack ds-stack--10 mc-techos"
    >
      <div v-for="t in techos" :key="t.dimensionCode ?? t.limite" class="ds-stack ds-stack--8">
        <MedidorCupo :dimension-code="t.dimensionCode" :usado="t.usado" :limite="t.limite" />
        <p class="ds-meta">
          {{ medidorTexto(t.usado, t.limite, t.dimensionCode) }} {{ t.sufijo }}.
        </p>
        <div
          v-if="t.aviso"
          class="ds-banner ds-banner--sm"
          :class="t.aviso.tono === 'error' ? 'ds-banner--error' : 'ds-banner--warning'"
          role="status"
        >
          <span class="ds-flex-fill"
            ><strong>{{ t.aviso.fuerte }}</strong> {{ t.aviso.resto }}</span
          >
        </div>
      </div>
    </div>

    <template v-if="comprable">
      <label class="ds-flex-row mc-seleccion">
        <input type="checkbox" :checked="seleccionado" @change="alDeMarcar" />
        {{ cta }} {{ modulo.name }}
      </label>
    </template>
    <p v-else-if="modulo.purchasable && modulo.canPurchase === false" class="ds-meta">
      {{ SIN_PERMISO_COMPRA }}
    </p>
  </div>
</template>

<style scoped>
.mc-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
}

.mc-head {
  align-items: center;
}

.mc-techos {
  margin-top: var(--space-4);
}

.mc-seleccion {
  align-items: center;
  gap: var(--space-8);
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--amatista-700);
}
</style>
