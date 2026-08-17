<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatDateShort } from '@/composables/format'
import type { PrescriptionResponse } from '@/features/dashboard/views/consulta/nueva/types/prescription.types'

defineProps<{ data: PrescriptionResponse }>()
</script>

<template>
  <div class="ds-detail-grid">
    <DetailField label="Fecha" :value="formatDateShort(data.date)" />
    <DetailField label="Diagnóstico" :value="data.diagnosis" span="full" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />

    <div class="ds-grid-span ds-stack ds-stack--10">
      <div class="medicaments-head ds-flex-row">
        <span class="ds-label">Medicamentos</span>
        <span class="medicaments-count">
          {{ data.medicaments.length === 1 ? '1 ítem' : `${data.medicaments.length} ítems` }}
        </span>
      </div>

      <div v-if="data.medicaments.length === 0" class="ds-empty ds-empty--boxed">
        Sin medicamentos registrados.
      </div>

      <ul v-else class="ds-list-reset ds-stack ds-stack--8">
        <li v-for="med in data.medicaments" :key="med.id" class="med ds-stack">
          <div class="med-head">
            <span class="ds-item-label ds-item-label--lg">{{ med.name }}</span>
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

    <DetailField v-if="data.consultation" label="Consulta vinculada" span="full">
      #{{ data.consultation.id }} · {{ formatDateShort(data.consultation.date) }}
    </DetailField>
  </div>
</template>

<style scoped>
/* Resto sobre `.ds-flex-row`: gap propio (10px). */
.medicaments-head {
  gap: var(--space-10);
}

.medicaments-count {
  font-size: 11.5px;
  color: var(--warm-400);
}

.med {
  gap: var(--space-6);
  padding: var(--space-12) var(--space-14);
  border: 1px solid var(--warm-200);
  border-radius: var(--radius-panel);
  background: var(--warm-50);
}

.med-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
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
