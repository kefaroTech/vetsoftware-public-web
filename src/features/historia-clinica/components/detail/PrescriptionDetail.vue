<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { PrescriptionResponse } from '@/features/dashboard/views/consulta/nueva/api/prescription.api'

defineProps<{ data: PrescriptionResponse }>()
</script>

<template>
  <div class="detail-grid">
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Diagnóstico" :value="data.diagnosis" span="full" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />

    <div class="medicaments-section">
      <div class="medicaments-head">
        <span class="medicaments-label">Medicamentos</span>
        <span class="medicaments-count">
          {{ data.medicaments.length === 1 ? '1 ítem' : `${data.medicaments.length} ítems` }}
        </span>
      </div>

      <div v-if="data.medicaments.length === 0" class="empty">
        Sin medicamentos registrados.
      </div>

      <ul v-else class="medicaments">
        <li v-for="med in data.medicaments" :key="med.id" class="med">
          <div class="med-head">
            <span class="med-name">{{ med.name }}</span>
            <span class="med-qty">×{{ med.quantity }}</span>
          </div>
          <div class="med-line">
            <span class="med-tag">Presentación</span>
            <span>{{ med.presentation }}</span>
          </div>
          <div class="med-line">
            <span class="med-tag">Posología</span>
            <span>{{ med.posology }}</span>
          </div>
        </li>
      </ul>
    </div>

    <DetailField
      v-if="data.consultation"
      label="Consulta vinculada"
      span="full"
    >
      #{{ data.consultation.id }} · {{ formatEventDate(data.consultation.date) }}
    </DetailField>
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

.medicaments-section {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.medicaments-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.medicaments-label {
  font-size: 11.5px;
  color: var(--warm-500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
}
.medicaments-count {
  font-size: 11.5px;
  color: var(--warm-400);
}
.empty {
  padding: 14px 16px;
  font-size: 13px;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px dashed var(--warm-200);
  border-radius: 10px;
}
.medicaments {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.med {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.med-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.med-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
}
.med-qty {
  font-size: 12.5px;
  color: var(--warm-600);
  font-family: var(--font-mono);
}
.med-line {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--warm-700);
  line-height: 1.4;
}
.med-tag {
  font-size: 11px;
  color: var(--warm-500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  min-width: 92px;
  padding-top: 2px;
}
</style>
