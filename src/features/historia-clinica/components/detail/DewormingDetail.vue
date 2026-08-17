<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatDateShort } from '@/composables/format'
import type { DewormingResponse } from '@/features/dashboard/views/consulta/nueva/types/deworming.types'
import type { DewormingType } from '@/types/domain'

defineProps<{ data: DewormingResponse }>()

const DEWORMING_TYPE_LABEL: Record<DewormingType, string> = {
  INTERNAL: 'Interna',
  EXTERNAL: 'Externa',
  MIX: 'Mixta',
  OTHER: 'Otra',
}
</script>

<template>
  <div class="ds-detail-grid">
    <DetailField label="Tipo" :value="DEWORMING_TYPE_LABEL[data.type]" />
    <DetailField label="Fecha" :value="formatDateShort(data.date)" />
    <DetailField
      label="Última desparasitación"
      :value="data.lastDeworming ? formatDateShort(data.lastDeworming) : null"
    />
    <DetailField
      label="Próximo control"
      :value="data.nextControl ? formatDateShort(data.nextControl) : null"
    />
    <DetailField label="Producto" :value="data.product" />
    <DetailField label="Dosis" :value="data.dosage" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />
    <DetailField v-if="data.consultation" label="Consulta vinculada" span="full">
      #{{ data.consultation.id }} · {{ formatDateShort(data.consultation.date) }}
    </DetailField>
  </div>
</template>
