<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatDateShort } from '@/composables/format'
import type { SurgeryResponse } from '@/features/dashboard/views/consulta/nueva/types/surgery.types'

defineProps<{ data: SurgeryResponse }>()
</script>

<template>
  <div class="ds-detail-grid">
    <DetailField label="Tipo de cirugía" :value="data.surgeryType.name" />
    <DetailField label="Fecha" :value="formatDateShort(data.date)" />
    <DetailField label="Descripción" :value="data.description" span="full" />
    <DetailField label="Medicamento" :value="data.medicament" span="full" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />
    <DetailField label="Complicaciones" :value="data.complications" span="full" />
    <DetailField v-if="data.consultation" label="Consulta vinculada" span="full">
      #{{ data.consultation.id }} · {{ formatDateShort(data.consultation.date) }}
    </DetailField>
  </div>
</template>
