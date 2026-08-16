<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Printer } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { usePrescriptionExport } from '@/features/dashboard/views/consulta/nueva/composables/usePrescriptionExport'
import { EVENT_TYPES } from '../constants/eventTypes'
import { formatEventDate } from '../composables/format'
import type { ClinicalEvent } from '../types/historia'

import { vaccinationApi } from '@/features/dashboard/views/consulta/nueva/api/vaccination.api'
import type { VaccinationResponse } from '@/features/dashboard/views/consulta/nueva/types/vaccination.types'
import { laboratoryTestApi } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import { surgeryApi } from '@/features/dashboard/views/consulta/nueva/api/surgery.api'
import type { SurgeryResponse } from '@/features/dashboard/views/consulta/nueva/types/surgery.types'
import { dewormingApi } from '@/features/dashboard/views/consulta/nueva/api/deworming.api'
import type { DewormingResponse } from '@/features/dashboard/views/consulta/nueva/types/deworming.types'
import { hospitalizationApi } from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'
import { diagnosticImagingApi } from '@/features/dashboard/views/consulta/nueva/api/diagnosticImaging.api'
import type { DiagnosticImagingResponse } from '@/features/dashboard/views/consulta/nueva/types/diagnosticImaging.types'
import { prescriptionApi } from '@/features/dashboard/views/consulta/nueva/api/prescription.api'
import type { PrescriptionResponse } from '@/features/dashboard/views/consulta/nueva/types/prescription.types'
import { consultationApi } from '@/features/dashboard/views/consulta/nueva/api/consultation.api'
import type { ConsultationResponse } from '@/features/dashboard/views/consulta/nueva/types/consultation.types'
import { spaApi } from '@/features/dashboard/views/consulta/nueva/api/spa.api'
import type { SpaResponse } from '@/features/dashboard/views/consulta/nueva/types/spa.types'

import VaccinationDetail from './detail/VaccinationDetail.vue'
import LaboratoryTestDetail from './detail/LaboratoryTestDetail.vue'
import SurgeryDetail from './detail/SurgeryDetail.vue'
import DewormingDetail from './detail/DewormingDetail.vue'
import HospitalizationDetail from './detail/HospitalizationDetail.vue'
import DiagnosticImagingDetail from './detail/DiagnosticImagingDetail.vue'
import PrescriptionDetail from './detail/PrescriptionDetail.vue'
import ConsultationDetail from './detail/ConsultationDetail.vue'
import SpaDetail from './detail/SpaDetail.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    event: ClinicalEvent | null
    children?: ClinicalEvent[]
  }>(),
  { children: () => [] },
)
const emit = defineEmits<{ close: []; selectEvent: [event: ClinicalEvent] }>()

type Payload =
  | { type: 'VACCINATION'; data: VaccinationResponse }
  | { type: 'LABORATORY_TEST'; data: LaboratoryTestResponse }
  | { type: 'SURGERY'; data: SurgeryResponse }
  | { type: 'DEWORMING'; data: DewormingResponse }
  | { type: 'HOSPITALIZATION'; data: HospitalizationResponse }
  | { type: 'DIAGNOSTIC_IMAGING'; data: DiagnosticImagingResponse }
  | { type: 'PRESCRIPTION'; data: PrescriptionResponse }
  | { type: 'CONSULTATION'; data: ConsultationResponse }
  | { type: 'SPA'; data: SpaResponse }

const loading = ref(false)
const error = ref<string | null>(null)
const payload = ref<Payload | null>(null)

async function fetchEvent(ev: ClinicalEvent) {
  loading.value = true
  error.value = null
  payload.value = null
  try {
    const id = ev.sourceId
    switch (ev.eventType) {
      case 'VACCINATION':
        payload.value = { type: 'VACCINATION', data: await vaccinationApi.findById(id) }
        break
      case 'LABORATORY_TEST':
        payload.value = {
          type: 'LABORATORY_TEST',
          data: await laboratoryTestApi.findById(id),
        }
        break
      case 'SURGERY':
        payload.value = { type: 'SURGERY', data: await surgeryApi.findById(id) }
        break
      case 'DEWORMING':
        payload.value = { type: 'DEWORMING', data: await dewormingApi.findById(id) }
        break
      case 'HOSPITALIZATION':
        payload.value = {
          type: 'HOSPITALIZATION',
          data: await hospitalizationApi.findById(id),
        }
        break
      case 'DIAGNOSTIC_IMAGING':
        payload.value = {
          type: 'DIAGNOSTIC_IMAGING',
          data: await diagnosticImagingApi.findById(id),
        }
        break
      case 'PRESCRIPTION':
        payload.value = {
          type: 'PRESCRIPTION',
          data: await prescriptionApi.findById(id),
        }
        break
      case 'CONSULTATION':
        payload.value = {
          type: 'CONSULTATION',
          data: await consultationApi.findById(id),
        }
        break
      case 'SPA':
        payload.value = { type: 'SPA', data: await spaApi.findById(id) }
        break
      default:
        error.value = 'Tipo de evento no soportado.'
    }
  } catch {
    error.value = 'No se pudo cargar el detalle del evento.'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.event?.sourceId, props.event?.eventType] as const,
  ([open]) => {
    if (open && props.event) {
      fetchEvent(props.event)
    } else if (!open) {
      payload.value = null
      error.value = null
    }
  },
  { immediate: true },
)

const title = computed(() => {
  if (!props.event) return ''
  const meta = EVENT_TYPES[props.event.eventType]
  return `${meta.icon}  ${meta.label}`
})

const subtitle = computed(() => {
  if (!props.event) return ''
  return `${formatEventDate(props.event.eventDate)} · #${props.event.sourceId}`
})

// Imprimir la fórmula médica veterinaria (solo cuando el detalle es una receta).
const { exporting: printing, exportPdf: exportPrescription } = usePrescriptionExport()
function printReceta() {
  if (payload.value?.type === 'PRESCRIPTION') exportPrescription(payload.value.data.id)
}
</script>

<template>
  <ModalShell :open="open" :title="title" :subtitle="subtitle" :width="1120" @close="emit('close')">
    <template #body>
      <div v-if="loading" class="state-row">
        <PawLoader :size="56" :glow="false" :speed="900" />
      </div>

      <div v-else-if="error" class="banner error">{{ error }}</div>

      <template v-else-if="payload">
        <VaccinationDetail v-if="payload.type === 'VACCINATION'" :data="payload.data" />
        <LaboratoryTestDetail v-else-if="payload.type === 'LABORATORY_TEST'" :data="payload.data" />
        <SurgeryDetail v-else-if="payload.type === 'SURGERY'" :data="payload.data" />
        <DewormingDetail v-else-if="payload.type === 'DEWORMING'" :data="payload.data" />
        <HospitalizationDetail
          v-else-if="payload.type === 'HOSPITALIZATION'"
          :data="payload.data"
        />
        <DiagnosticImagingDetail
          v-else-if="payload.type === 'DIAGNOSTIC_IMAGING'"
          :data="payload.data"
        />
        <PrescriptionDetail v-else-if="payload.type === 'PRESCRIPTION'" :data="payload.data" />
        <ConsultationDetail
          v-else-if="payload.type === 'CONSULTATION'"
          :data="payload.data"
          :children="props.children"
          @select="emit('selectEvent', $event)"
        />
        <SpaDetail v-else-if="payload.type === 'SPA'" :data="payload.data" />
      </template>
    </template>

    <template #footer-actions>
      <button
        v-if="payload?.type === 'PRESCRIPTION'"
        type="button"
        class="btn-print"
        :disabled="printing"
        @click="printReceta"
      >
        <Printer :size="14" :stroke-width="1.8" />
        <span>{{ printing ? 'Generando…' : 'Imprimir receta' }}</span>
      </button>
      <button type="button" class="ds-btn ds-btn--solid ds-btn--snug" @click="emit('close')">
        Cerrar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.state-row {
  display: grid;
  place-items: center;
  padding: 40px 0;
}

.banner.error {
  padding: 12px 14px;
  font-size: 13px;
  border-radius: 10px;
  background: oklch(97% 0.02 25deg);
  color: var(--danger-700);
  border: 1px solid oklch(85% 0.06 25deg);
}

.btn-print {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  background: var(--warm-50);
  color: var(--amatista-700);
  border: 1px solid var(--amatista-300);
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}

.btn-print:hover:not(:disabled) {
  background: var(--amatista-50);
}

.btn-print:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
