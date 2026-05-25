<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import PawLoader from '@/components/ui/PawLoader.vue'
import { EVENT_TYPES } from '../constants/eventTypes'
import { formatEventDate } from '../composables/format'
import type { ClinicalEvent } from '../types/historia'

import {
  vaccinationApi,
  type VaccinationResponse,
} from '@/features/dashboard/views/consulta/nueva/api/vaccination.api'
import {
  laboratoryTestApi,
  type LaboratoryTestResponse,
} from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'
import {
  surgeryApi,
  type SurgeryResponse,
} from '@/features/dashboard/views/consulta/nueva/api/surgery.api'
import {
  dewormingApi,
  type DewormingResponse,
} from '@/features/dashboard/views/consulta/nueva/api/deworming.api'
import {
  hospitalizationApi,
  type HospitalizationResponse,
} from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import {
  diagnosticImagingApi,
  type DiagnosticImagingResponse,
} from '@/features/dashboard/views/consulta/nueva/api/diagnosticImaging.api'
import {
  prescriptionApi,
  type PrescriptionResponse,
} from '@/features/dashboard/views/consulta/nueva/api/prescription.api'
import {
  consultationApi,
  type ConsultationResponse,
} from '@/features/dashboard/views/consulta/nueva/api/consultation.api'
import {
  spaApi,
  type SpaResponse,
} from '@/features/dashboard/views/consulta/nueva/api/spa.api'

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
const emit = defineEmits<{ close: [] }>()

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
</script>

<template>
  <ModalShell
    :open="open"
    :title="title"
    :subtitle="subtitle"
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="loading" class="state-row">
        <PawLoader :size="56" :glow="false" :speed="900" />
      </div>

      <div v-else-if="error" class="banner error">{{ error }}</div>

      <template v-else-if="payload">
        <VaccinationDetail v-if="payload.type === 'VACCINATION'" :data="payload.data" />
        <LaboratoryTestDetail
          v-else-if="payload.type === 'LABORATORY_TEST'"
          :data="payload.data"
        />
        <SurgeryDetail v-else-if="payload.type === 'SURGERY'" :data="payload.data" />
        <DewormingDetail
          v-else-if="payload.type === 'DEWORMING'"
          :data="payload.data"
        />
        <HospitalizationDetail
          v-else-if="payload.type === 'HOSPITALIZATION'"
          :data="payload.data"
        />
        <DiagnosticImagingDetail
          v-else-if="payload.type === 'DIAGNOSTIC_IMAGING'"
          :data="payload.data"
        />
        <PrescriptionDetail
          v-else-if="payload.type === 'PRESCRIPTION'"
          :data="payload.data"
        />
        <ConsultationDetail
          v-else-if="payload.type === 'CONSULTATION'"
          :data="payload.data"
          :children="props.children"
        />
        <SpaDetail v-else-if="payload.type === 'SPA'" :data="payload.data" />
      </template>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-close" @click="emit('close')">Cerrar</button>
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
  background: oklch(97% 0.02 25);
  color: oklch(48% 0.18 25);
  border: 1px solid oklch(85% 0.06 25);
}
.btn-close {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  background: var(--amatista-700);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}
.btn-close:hover {
  background: var(--amatista-600);
}
</style>
