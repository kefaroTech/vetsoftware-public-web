<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import type { HospitalizationType, ReasonLeaving } from '@/types/domain'

defineProps<{ data: HospitalizationResponse }>()

const TYPE_LABEL: Record<HospitalizationType, string> = {
  HOSPITALIZATION: 'Hospitalización',
  OUTPATIENT: 'Ambulatoria',
}

const REASON_LEAVING_LABEL: Record<ReasonLeaving, string> = {
  MEDICAL_DISCHARGE: 'Alta médica',
  HOME_TREATMENT: 'Tratamiento en casa',
  TRANSFER: 'Traslado',
  TUTOR_WISH: 'Deseo del tutor',
  ADMIN: 'Administrativa',
  DEATH: 'Fallecimiento',
  EUTHANASIA: 'Eutanasia',
}
</script>

<template>
  <div class="ds-detail-grid">
    <DetailField label="Tipo" :value="TYPE_LABEL[data.type]" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Inicio" :value="formatEventDate(data.startDate)" />
    <DetailField label="Fin" :value="data.endDate ? formatEventDate(data.endDate) : null" />
    <DetailField
      label="Motivo de egreso"
      :value="data.reasonLeaving ? REASON_LEAVING_LABEL[data.reasonLeaving] : null"
      span="full"
    />
    <DetailField label="Motivo" :value="data.reason" span="full" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />
    <DetailField v-if="data.consultation" label="Consulta vinculada" span="full">
      #{{ data.consultation.id }} · {{ formatEventDate(data.consultation.date) }}
    </DetailField>
  </div>
</template>
