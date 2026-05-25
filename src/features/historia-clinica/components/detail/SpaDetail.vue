<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { SpaResponse } from '@/features/dashboard/views/consulta/nueva/api/spa.api'

defineProps<{ data: SpaResponse }>()
</script>

<template>
  <div class="detail-grid">
    <DetailField label="Tipo de servicio" :value="data.spaType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Motivo" :value="data.reason" span="full" />
    <DetailField label="Detalles" :value="data.details" span="full" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />
  </div>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}
@media (max-width: 560px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
