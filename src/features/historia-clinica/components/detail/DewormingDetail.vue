<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { DewormingResponse } from '@/features/dashboard/views/consulta/nueva/api/deworming.api'
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
  <div class="detail-grid">
    <DetailField label="Tipo" :value="DEWORMING_TYPE_LABEL[data.type]" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField
      label="Última desparasitación"
      :value="data.lastDeworming ? formatEventDate(data.lastDeworming) : null"
    />
    <DetailField
      label="Próximo control"
      :value="data.nextControl ? formatEventDate(data.nextControl) : null"
    />
    <DetailField label="Producto" :value="data.product" />
    <DetailField label="Dosis" :value="data.dosage" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />
    <DetailField v-if="data.consultation" label="Consulta vinculada" span="full">
      #{{ data.consultation.id }} · {{ formatEventDate(data.consultation.date) }}
    </DetailField>
  </div>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 24px;
}

@media (width <= 560px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
