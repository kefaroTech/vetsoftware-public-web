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
import { initials, formatDateLong } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { daysSince } from '../composables/mar'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import type { HospitalizationObservationResponse } from '../api/hospitalizationObservation.api'
import type { HospitalizationProgressNoteResponse } from '../api/hospitalizationProgressNote.api'
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
  <div class="detail">
    <button type="button" class="back" @click="emit('back')">
      <ArrowLeft :size="14" :stroke-width="1.8" /> Volver al tablero
    </button>

    <header class="head">
      <div class="avatar">{{ initials(patient.animal.name) }}</div>
      <div class="who">
        <div class="name-row">
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
      <button type="button" class="discharge" @click="dischargeOpen = true">
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

    <button type="button" class="treat-cta" @click="emit('administer')">
      <div class="cta-icon"><Stethoscope :size="20" :stroke-width="1.7" /></div>
      <div class="cta-text">
        <div class="cta-title">Tratamiento y administración de dosis</div>
        <div class="cta-sub">Calendario semanal, plan de medicamentos y procedimientos</div>
      </div>
      <span class="cta-go">Administrar <ChevronRight :size="16" :stroke-width="1.8" /></span>
    </button>

    <div class="cols">
      <!-- Observaciones -->
      <section class="block">
        <div class="block-head">
          <h3><ClipboardList :size="15" :stroke-width="1.7" /> Observaciones</h3>
          <button type="button" class="mini" @click="obsOpen = true">
            <Plus :size="13" :stroke-width="1.8" /> Observación
          </button>
        </div>
        <p v-if="observations.length === 0" class="block-empty">Sin observaciones.</p>
        <div v-for="o in observations" :key="o.id" class="entry">
          <div class="entry-meta">{{ fmtStamp(o.createdDate) }} · {{ o.createdBy.name }}</div>
          <p class="entry-text obs">{{ o.description }}</p>
        </div>
      </section>

      <!-- Notas evolutivas -->
      <section class="block">
        <div class="block-head">
          <h3><MessageSquare :size="15" :stroke-width="1.7" /> Notas evolutivas</h3>
          <button type="button" class="mini" @click="noteOpen = true">
            <Plus :size="13" :stroke-width="1.8" /> Nota
          </button>
        </div>
        <p v-if="notes.length === 0" class="block-empty">Sin notas evolutivas.</p>
        <div v-for="n in notes" :key="n.id" class="entry">
          <div class="entry-meta">{{ fmtStamp(n.createdDate) }} · {{ n.createdBy.name }}</div>
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
      @save="(t) => { emit('add-observation', t); obsOpen = false }"
      @close="obsOpen = false"
    />
    <TextNoteModal
      :open="noteOpen"
      :icon="MessageSquare"
      title="Nueva nota evolutiva"
      subtitle="Estado y evolución del turno"
      label="Nota"
      placeholder="Estado general, evolución, incidencias del turno…"
      @save="(t) => { emit('add-note', t); noteOpen = false }"
      @close="noteOpen = false"
    />
    <DischargeDialog
      :open="dischargeOpen"
      :patient-name="patient.animal.name"
      @confirm="(r) => { emit('discharge', r); dischargeOpen = false }"
      @close="dischargeOpen = false"
    />
  </div>
</template>

<style scoped>
.detail { font-family: var(--font-sans); }
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--warm-600);
  cursor: pointer;
  margin-bottom: 14px;
}
.back:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}
.head {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--amatista-100);
  color: var(--amatista-700);
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 500;
  flex-shrink: 0;
  box-shadow: 0 6px 18px -10px oklch(50% 0.18 var(--hue));
}
.who { flex: 1; min-width: 0; }
.name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.name {
  margin: 0;
  font-family: var(--font-serif);
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
.code { font-family: var(--font-mono); }
.discharge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: var(--amatista-700);
  color: white;
  border-radius: 9px;
  padding: 9px 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
}
.discharge:hover { background: var(--amatista-800); }
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
.dx-text:last-child { margin-bottom: 0; }
.treat-cta {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  text-align: left;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.12s ease;
}
.treat-cta:hover { border-color: var(--amatista-300); }
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
.cta-text { flex: 1; min-width: 0; }
.cta-title { font-size: 14.5px; font-weight: 600; color: var(--warm-900); }
.cta-sub { font-size: 12.5px; color: var(--warm-600); margin-top: 2px; }
.cta-go {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--amatista-700);
  flex-shrink: 0;
}
.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 24px;
}
@media (max-width: 820px) {
  .cols { grid-template-columns: 1fr; }
}
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
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
.mini {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--amatista-200);
  background: var(--amatista-50);
  color: var(--amatista-700);
  border-radius: 8px;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.mini:hover { border-color: var(--amatista-500); }
.block-empty {
  margin: 0;
  font-size: 13px;
  color: var(--warm-500);
}
.entry {
  padding: 10px 0;
  border-bottom: 1px solid var(--warm-150);
}
.entry:last-child { border-bottom: none; }
.entry-meta {
  font-size: 11.5px;
  color: var(--warm-500);
  font-weight: 500;
}
.entry-text {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--warm-800);
  line-height: 1.5;
}
.entry-text.obs {
  background: oklch(96% 0.04 80);
  border-left: 2px solid oklch(70% 0.13 75);
  padding: 7px 11px;
  border-radius: 0 6px 6px 0;
}
</style>
