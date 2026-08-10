<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Calendar,
  AlertTriangle,
  ArrowRight,
  Ban,
  Move,
  Pencil,
  Trash2,
  User,
} from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import AppointmentStatusPill from './AppointmentStatusPill.vue'
import AppointmentVetBadge from './AppointmentVetBadge.vue'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import {
  APPT_STATUS,
  APPT_TERMINAL,
  APPT_TRANSITIONS,
  APPT_TYPES,
  APPT_REASON_MAX,
  apptDate,
  apptTime,
  type AppointmentResponse,
  type AppointmentStatus,
} from '../types/appointment'
import { formatDayLong, parseISO } from '../composables/dateUtils'

const props = defineProps<{ appointment: AppointmentResponse | null }>()

const emit = defineEmits<{
  close: []
  edit: [appt: AppointmentResponse]
  reschedule: [appt: AppointmentResponse]
  transition: [appt: AppointmentResponse, status: AppointmentStatus]
  cancel: [appt: AppointmentResponse, reason: string]
  remove: [appt: AppointmentResponse]
}>()

const { can } = useAuthorization()
const canUpdate = can(PERMISSIONS.APPOINTMENT_UPDATE)
const canCancelPerm = can(PERMISSIONS.APPOINTMENT_CANCEL)
const canDelete = can(PERMISSIONS.APPOINTMENT_DELETE)

const open = computed(() => props.appointment !== null)

const cancelOpen = ref(false)
const reason = ref('')
const confirmDelete = ref(false)

// Reset del estado interno cada vez que cambia la cita mostrada.
watch(
  () => props.appointment?.id,
  () => {
    cancelOpen.value = false
    reason.value = ''
    confirmDelete.value = false
  },
)

const typeMeta = computed(() => (props.appointment ? APPT_TYPES[props.appointment.type] : null))
const isTerminal = computed(() =>
  props.appointment ? APPT_TERMINAL.has(props.appointment.status) : true,
)
const nexts = computed<AppointmentStatus[]>(() =>
  props.appointment ? APPT_TRANSITIONS[props.appointment.status] : [],
)
const statusNexts = computed(() => nexts.value.filter((s) => s !== 'CANCELLED'))
const canCancelTransition = computed(() => nexts.value.includes('CANCELLED'))
const clashIds = computed(() => props.appointment?.overlappingAppointmentIds ?? [])

const title = computed(() =>
  props.appointment && typeMeta.value
    ? `Cita #${props.appointment.id} · ${typeMeta.value.label}`
    : 'Cita',
)
const subtitle = computed(() => {
  const a = props.appointment
  if (!a) return ''
  const d = parseISO(apptDate(a.startAt))
  return d ? `${formatDayLong(d)}, ${apptTime(a.startAt)}` : apptTime(a.startAt)
})

const reasonModel = computed({
  get: () => reason.value,
  set: (v: string) => (reason.value = v.slice(0, APPT_REASON_MAX)),
})

const notesCancellation = computed(() =>
  props.appointment?.status === 'CANCELLED' ? props.appointment.cancellationReason : null,
)
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Calendar"
    :title="title"
    :subtitle="subtitle"
    :width="640"
    compact
    accent="amatista"
    @close="emit('close')"
  >
    <template v-if="appointment" #body>
      <div class="detail-cols">
        <!-- Datos -->
        <div class="detail-col">
          <div class="status-hero">
            <span class="hero-time">{{ apptTime(appointment.startAt) }}</span>
            <AppointmentStatusPill :status="appointment.status" />
          </div>

          <div v-if="clashIds.length > 0" class="banner warn">
            <AlertTriangle :size="16" :stroke-width="1.7" class="banner-ic" />
            <span>
              <b>Choque de horario:</b> comparte las {{ apptTime(appointment.startAt) }} con
              {{ clashIds.map((id) => '#' + id).join(', ') }}.
            </span>
          </div>

          <div class="dfield">
            <div class="dlabel">Veterinario/a</div>
            <div class="dvalue">
              <AppointmentVetBadge
                :employee-id="appointment.employee.id"
                :name="appointment.employee.name"
              />
            </div>
          </div>

          <div class="dfield">
            <div class="dlabel">Paciente</div>
            <div class="dvalue">
              <template v-if="appointment.animal">
                {{ appointment.animal.name }}
                <span v-if="appointment.animal.code" class="muted">
                  · {{ appointment.animal.code }}</span
                >
              </template>
              <span v-else class="muted">Por confirmar</span>
            </div>
          </div>

          <div class="dfield">
            <div class="dlabel">{{ appointment.owner ? 'Propietario' : 'Contacto' }}</div>
            <div class="dvalue">
              <template v-if="appointment.owner">{{ appointment.owner.name }}</template>
              <template v-else-if="appointment.clientName">
                {{ appointment.clientName }}
                <span v-if="appointment.clientPhone" class="muted">
                  · {{ appointment.clientPhone }}</span
                >
                <span class="freewalk"><User :size="11" :stroke-width="1.8" /> Sin registrar</span>
              </template>
              <span v-else class="muted">—</span>
            </div>
          </div>

          <div v-if="appointment.notes" class="dfield">
            <div class="dlabel">Notas</div>
            <div class="dvalue">{{ appointment.notes }}</div>
          </div>

          <div v-if="notesCancellation" class="banner neutral">
            <Ban :size="15" :stroke-width="1.7" class="banner-ic" />
            <span><b>Motivo de cancelación:</b> {{ notesCancellation }}</span>
          </div>
        </div>

        <!-- Acciones de estado -->
        <div class="detail-col">
          <div class="section-title">{{ isTerminal ? 'Estado' : 'Siguiente paso' }}</div>

          <div v-if="isTerminal" class="terminal-note">
            Cita en estado <b>{{ APPT_STATUS[appointment.status].label }}</b
            >. No admite más cambios de estado.
          </div>

          <div v-else class="transitions">
            <button
              v-for="st in statusNexts"
              :key="st"
              type="button"
              class="trans-btn"
              :disabled="!canUpdate"
              @click="emit('transition', appointment, st)"
            >
              <span class="trans-dot" :style="{ background: APPT_STATUS[st].dot }" />
              Marcar como&nbsp;<b>{{ APPT_STATUS[st].label }}</b>
              <ArrowRight :size="15" :stroke-width="1.7" class="trans-arrow" />
            </button>

            <template v-if="canCancelTransition && canCancelPerm">
              <button
                v-if="!cancelOpen"
                type="button"
                class="trans-btn danger"
                @click="cancelOpen = true"
              >
                <span class="trans-dot" :style="{ background: 'var(--warm-500)' }" />
                Cancelar la cita
                <Ban :size="15" :stroke-width="1.7" class="trans-arrow" />
              </button>
              <div v-else class="cancel-box">
                <label class="dlabel">Motivo de cancelación (opcional)</label>
                <BaseTextarea
                  v-model="reasonModel"
                  :rows="2"
                  placeholder="Ej. El dueño reprogramará"
                />
                <div class="cancel-actions">
                  <button
                    type="button"
                    class="ds-btn ds-btn--ghost"
                    @click="((cancelOpen = false), (reason = ''))"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    class="ds-btn ds-btn--danger grow"
                    @click="emit('cancel', appointment, reason.trim())"
                  >
                    <Ban :size="15" :stroke-width="1.7" /> Confirmar
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <template v-if="appointment && !isTerminal && canUpdate" #footer-left>
      <div class="foot-left-actions">
        <button type="button" class="ds-btn ds-btn--ghost" @click="emit('reschedule', appointment)">
          <Move :size="15" :stroke-width="1.7" /> Reprogramar
        </button>
        <button type="button" class="ds-btn ds-btn--ghost" @click="emit('edit', appointment)">
          <Pencil :size="15" :stroke-width="1.7" /> Editar
        </button>
      </div>
    </template>

    <template v-if="appointment && canDelete" #footer-actions>
      <button
        v-if="!confirmDelete"
        type="button"
        class="ds-btn ds-btn--danger"
        @click="confirmDelete = true"
      >
        <Trash2 :size="15" :stroke-width="1.7" /> Eliminar
      </button>
      <div v-else class="confirm-delete">
        <span class="confirm-label">¿Eliminar?</span>
        <button type="button" class="ds-btn ds-btn--ghost" @click="confirmDelete = false">
          No
        </button>
        <button type="button" class="ds-btn ds-btn--danger" @click="emit('remove', appointment)">
          Sí, eliminar
        </button>
      </div>
    </template>
  </ModalShell>
</template>

<style scoped>
.detail-cols {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 26px;
  align-items: start;
}

.detail-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.status-hero {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-time {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--warm-900);
}

.dfield {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dlabel {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--warm-500);
  font-weight: 600;
}

.dvalue {
  font-size: 14px;
  color: var(--warm-900);
  line-height: 1.5;
}

.muted {
  color: var(--warm-500);
}

.freewalk {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  margin-left: 8px;
  border-radius: 5px;
  background: var(--warm-150);
  color: var(--warm-600);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--warm-500);
}

.terminal-note {
  font-size: 12.5px;
  color: var(--warm-500);
  background: var(--warm-100);
  border: 1px dashed var(--warm-200);
  border-radius: 9px;
  padding: 12px 13px;
  line-height: 1.5;
}

.transitions {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.trans-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  padding: 11px 13px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-800);
  transition: all 0.1s;
}

.trans-btn:hover:not(:disabled) {
  border-color: var(--amatista-400);
  background: var(--amatista-50);
  color: var(--amatista-700);
}

.trans-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trans-btn b {
  font-weight: 600;
}

.trans-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.trans-arrow {
  margin-left: auto;
  color: var(--warm-400);
}

.trans-btn.danger:hover {
  border-color: oklch(75% 0.12 25deg);
  background: oklch(96% 0.04 25deg);
  color: var(--danger-700);
}

.cancel-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 12px;
}

.cancel-actions {
  display: flex;
  gap: 8px;
}

.banner {
  display: flex;
  gap: 9px;
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  line-height: 1.5;
}

.banner-ic {
  flex-shrink: 0;
  margin-top: 1px;
}

.banner.warn {
  background: oklch(95% 0.07 80deg);
  color: oklch(42% 0.13 60deg);
  border: 1px solid var(--warning-200);
}

.banner.neutral {
  background: var(--warm-100);
  color: var(--warm-700);
  border: 1px solid var(--warm-200);
}

.banner b {
  font-weight: 600;
}

.foot-left-actions {
  display: flex;
  gap: 8px;
}

.confirm-delete {
  display: flex;
  gap: 8px;
  align-items: center;
}

.confirm-label {
  font-size: 12px;
  color: var(--warm-600);
}

.grow {
  flex: 1;
}

@media (width <= 720px) {
  .detail-cols {
    grid-template-columns: 1fr;
  }
}
</style>
