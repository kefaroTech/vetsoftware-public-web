<script setup lang="ts">
import { ref } from 'vue'
import {
  ArrowLeft,
  Check,
  Stethoscope,
  Plus,
  MessageSquare,
  ClipboardList,
  ChevronRight,
} from 'lucide-vue-next'
import HospStatusPill from './HospStatusPill.vue'
import TextNoteModal from '../modals/TextNoteModal.vue'
import DischargeDialog from '../modals/DischargeDialog.vue'
import { initials, formatDateLong } from '@/composables/format'
import { daysSince } from '../composables/mar'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'
import type { HospitalizationObservationResponse } from '../types/hospitalizationObservation.types'
import type { HospitalizationProgressNoteResponse } from '../types/hospitalizationProgressNote.types'
import type { ReasonLeaving } from '@/types/domain'

defineProps<{
  patient: HospitalizationResponse
  observations: HospitalizationObservationResponse[]
  notes: HospitalizationProgressNoteResponse[]
}>()

const emit = defineEmits<{
  back: []
  administer: []
  discharge: [reason: ReasonLeaving]
  'add-observation': [text: string]
  'add-note': [text: string]
}>()

const obsOpen = ref(false)
const noteOpen = ref(false)
const dischargeOpen = ref(false)

function fmtStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = `${d.getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} · ${time}`
}
</script>

<template>
  <div class="ds-page">
    <button type="button" class="back ds-btn ds-btn--plain ds-hover-accent" @click="emit('back')">
      <ArrowLeft :size="14" :stroke-width="1.8" /> Volver al tablero
    </button>

    <header class="head ds-flex-row">
      <div class="avatar ds-tone--accent">{{ initials(patient.animal.name) }}</div>
      <div class="ds-flex-fill">
        <div class="name-row ds-flex-row ds-flex-row--12">
          <h2 class="name">{{ patient.animal.name }}</h2>
          <!-- TODO backend: status clínico no existe en Hospitalization -->
          <HospStatusPill status="ESTABLE" />
        </div>
        <div class="meta">
          <span class="code">{{ patient.animal.code }}</span>
          <span>·</span>
          <span>Día {{ daysSince(patient.startDate) }} de internación</span>
          <span>·</span>
          <span>Ingreso {{ formatDateLong(patient.startDate) }}</span>
        </div>
      </div>
      <button type="button" class="discharge ds-btn ds-btn--solid" @click="dischargeOpen = true">
        <Check :size="15" :stroke-width="1.7" /> Dar de alta
      </button>
    </header>

    <div class="diagnosis">
      <div class="dx-label">Motivo de internación</div>
      <p class="dx-text">{{ patient.reason }}</p>
      <template v-if="patient.observations">
        <div class="dx-label">Observaciones de ingreso</div>
        <p class="dx-text">{{ patient.observations }}</p>
      </template>
    </div>

    <button type="button" class="treat-cta ds-flex-row" @click="emit('administer')">
      <div class="cta-icon"><Stethoscope :size="20" :stroke-width="1.7" /></div>
      <div class="ds-flex-fill">
        <div class="cta-title ds-strong">Tratamiento y administración de dosis</div>
        <div class="cta-sub">Calendario semanal, plan de medicamentos y procedimientos</div>
      </div>
      <span class="cta-go">Administrar <ChevronRight :size="16" :stroke-width="1.8" /></span>
    </button>

    <div class="cols">
      <!-- Observaciones -->
      <section class="block">
        <div class="block-head ds-block-head">
          <h3><ClipboardList :size="15" :stroke-width="1.7" /> Observaciones</h3>
          <button type="button" class="mini ds-tone--accent-soft" @click="obsOpen = true">
            <Plus :size="13" :stroke-width="1.8" /> Observación
          </button>
        </div>
        <p v-if="observations.length === 0" class="block-empty">Sin observaciones.</p>
        <div v-for="o in observations" :key="o.id" class="entry">
          <div class="entry-meta ds-hint">
            {{ fmtStamp(o.createdDate) }} · {{ o.createdBy.name }}
          </div>
          <p class="entry-text obs">{{ o.description }}</p>
        </div>
      </section>

      <!-- Notas evolutivas -->
      <section class="block">
        <div class="block-head ds-block-head">
          <h3><MessageSquare :size="15" :stroke-width="1.7" /> Notas evolutivas</h3>
          <button type="button" class="mini ds-tone--accent-soft" @click="noteOpen = true">
            <Plus :size="13" :stroke-width="1.8" /> Nota
          </button>
        </div>
        <p v-if="notes.length === 0" class="block-empty">Sin notas evolutivas.</p>
        <div v-for="n in notes" :key="n.id" class="entry">
          <div class="entry-meta ds-hint">
            {{ fmtStamp(n.createdDate) }} · {{ n.createdBy.name }}
          </div>
          <p class="entry-text">{{ n.description }}</p>
        </div>
      </section>
    </div>

    <TextNoteModal
      :open="obsOpen"
      :icon="ClipboardList"
      title="Nueva observación"
      subtitle="Indicación o cuidado para el paciente"
      label="Observación"
      placeholder="Ej. No dar comida sólida hasta nueva orden."
      @save="
        (t) => {
          emit('add-observation', t)
          obsOpen = false
        }
      "
      @close="obsOpen = false"
    />
    <TextNoteModal
      :open="noteOpen"
      :icon="MessageSquare"
      title="Nueva nota evolutiva"
      subtitle="Estado y evolución del turno"
      label="Nota"
      placeholder="Estado general, evolución, incidencias del turno…"
      @save="
        (t) => {
          emit('add-note', t)
          noteOpen = false
        }
      "
      @close="noteOpen = false"
    />
    <DischargeDialog
      :open="dischargeOpen"
      :patient-name="patient.animal.name"
      @confirm="
        (r) => {
          emit('discharge', r)
          dischargeOpen = false
        }
      "
      @close="dischargeOpen = false"
    />
  </div>
</template>

<style scoped>
/* Resto sobre `.ds-btn --plain` + `.ds-hover-accent` (que gana al :hover de
   --plain por orden en primitives.css, con la misma especificidad). */
.back {
  margin-bottom: var(--space-14);
  padding: var(--space-6) var(--space-10);
  font-size: var(--text-body);
  font-weight: var(--weight-normal);
}

/* Resto sobre `.ds-flex-row`: gap propio (16px). */
.head {
  gap: var(--space-16);
  flex-wrap: wrap;
}

/* Resto sobre `.ds-tone--accent`: forma y tipografía del avatar. */
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  flex-shrink: 0;
  box-shadow: 0 6px 18px -10px var(--amatista-600);
}

.name-row {
  flex-wrap: wrap;
}

.name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  color: var(--warm-900);
  line-height: 1.05;
}

.meta {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--warm-500);
  margin-top: 6px;
}
.code {
  font-family: var(--font-mono);
}

/* Resto sobre `.ds-btn --solid`: sin borde (la primitiva pone 1px transparente). */
.discharge {
  border: none;
  flex-shrink: 0;
}

/* Gana al filter: brightness() de .ds-btn--solid:hover por especificidad. */
.discharge:hover:not(:disabled) {
  background: var(--amatista-800);
}

.diagnosis {
  margin: 18px 0;
  padding: 14px 16px;
  background: var(--warm-100);
  border-radius: 10px;
}

.dx-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 500;
}

.dx-text {
  margin: 4px 0 12px;
  font-size: 13.5px;
  color: var(--warm-800);
  line-height: 1.5;
}
.dx-text:last-child {
  margin-bottom: 0;
}

/* Resto sobre `.ds-flex-row`: gap propio (14px). */
.treat-cta {
  gap: var(--space-14);
  width: 100%;
  text-align: left;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.12s ease;
}

/* A11Y-09: `--amatista-300` daba 1,99:1, por debajo del reposo `--warm-450`
   (3,54:1). `--amatista-450` da 3,69:1. */
.treat-cta:hover {
  border-color: var(--amatista-450);
}

.cta-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: var(--amatista-100);
  color: var(--amatista-700);
  flex-shrink: 0;
}

.cta-title {
  font-size: var(--text-2xl);
}
.cta-sub {
  font-size: 12.5px;
  color: var(--warm-600);
  margin-top: 2px;
}

.cta-go {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--amatista-700);
  flex-shrink: 0;
}

/* Rejilla `auto-fit` local: el design system no cataloga ninguna equivalente. */
.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: var(--space-20);
  margin-top: var(--space-24);
}

.block-head h3 {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
  color: var(--warm-900);
}

/* Resto sobre `.ds-tone--accent-soft`: forma y borde propios. */
.mini {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--amatista-450);
  border-radius: 8px;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.mini:hover {
  border-color: var(--amatista-500);
}

.block-empty {
  margin: 0;
  font-size: 13px;
  color: var(--warm-500);
}

.entry {
  padding: 10px 0;
  border-bottom: 1px solid var(--warm-150);
}
.entry:last-child {
  border-bottom: none;
}

.entry-meta {
  font-weight: var(--weight-medium);
}

.entry-text {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--warm-800);
  line-height: 1.5;
}

.entry-text.obs {
  background: var(--warning-50);
  border-left: 2px solid var(--warning-border);
  padding: 7px 11px;
  border-radius: 0 6px 6px 0;
}
</style>
