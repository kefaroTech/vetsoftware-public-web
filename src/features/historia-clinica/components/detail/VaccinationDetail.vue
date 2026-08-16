<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { VaccinationResponse } from '@/features/dashboard/views/consulta/nueva/types/vaccination.types'

defineProps<{ data: VaccinationResponse }>()
</script>

<template>
  <div class="ds-detail-grid">
    <DetailField label="Tipo de vacuna" :value="data.vaccinationType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Lote" :value="data.lot" />
    <DetailField
      label="Próxima vacunación"
      :value="data.nextVaccination ? formatEventDate(data.nextVaccination) : null"
    />
    <DetailField label="Notas" :value="data.notes" span="full" />
    <DetailField v-if="data.consultation" label="Consulta vinculada" span="full">
      #{{ data.consultation.id }} · {{ formatEventDate(data.consultation.date) }}
    </DetailField>
  </div>
</template>
