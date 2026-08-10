<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'

defineProps<{ data: LaboratoryTestResponse }>()
</script>

<template>
  <div class="ds-detail-grid">
    <DetailField label="Tipo de examen" :value="data.testType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Cantidad" :value="data.quantity" />
    <DetailField label="Diagnóstico" :value="data.diagnosis" span="full" />
    <DetailField v-if="data.consultation" label="Consulta vinculada" span="full">
      #{{ data.consultation.id }} · {{ formatEventDate(data.consultation.date) }}
    </DetailField>
  </div>
</template>
