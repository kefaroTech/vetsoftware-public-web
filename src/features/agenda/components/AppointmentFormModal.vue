<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Calendar, Check, AlertTriangle } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import TimeInput from './TimeInput.vue'
import OwnerSearchAutocomplete from './OwnerSearchAutocomplete.vue'
import { useVets } from '../composables/useVets'
import { useAnimalsByOwnerStore } from '@/features/dashboard/views/consulta/nueva/stores/animalsByOwner.store'
import {
  APPT_TYPES,
  APPT_NOTES_MAX,
  APPT_CLIENT_NAME_MAX,
  APPT_CLIENT_PHONE_MAX,
  apptClashes,
  apptDate,
  apptTime,
  toIsoLocalDateTime,
  type AppointmentResponse,
  type AppointmentType,
  type CreateAppointmentRequest,
  type RescheduleAppointmentRequest,
  type UpdateAppointmentRequest,
} from '../types/appointment'
import type { Animal, Owner } from '@/types/domain'

type FormMode = 'create' | 'edit' | 'reschedule'

const props = defineProps<{
  open: boolean
  mode: FormMode
  appointment: AppointmentResponse | null
  focusDate: string // yyyy-MM-dd
  existing: AppointmentResponse[]
}>()

const emit = defineEmits<{
  close: []
  submit: [
    result:
      | { mode: 'create'; payload: CreateAppointmentRequest }
      | { mode: 'edit'; id: number; payload: UpdateAppointmentRequest }
      | { mode: 'reschedule'; id: number; payload: RescheduleAppointmentRequest },
  ]
}>()

const { vets } = useVets()
const animalsStore = useAnimalsByOwnerStore()

const typeEntries = Object.entries(APPT_TYPES) as [AppointmentType, (typeof APPT_TYPES)[AppointmentType]][]

// ── Draft ────────────────────────────────────────────────────────────
const date = ref('')
const time = ref('09:00')
const type = ref<AppointmentType>('CONSULTATION')
const employeeId = ref<number | null>(null)
const subjectMode = ref<'registered' | 'free'>('registered')
const ownerId = ref<string | null>(null)
const ownerName = ref<string | null>(null)
const animalId = ref<string>('') // '' = por confirmar
const clientName = ref('')
const clientPhone = ref('')
const notes = ref('')
const submitted = ref(false)

const pets = ref<Animal[]>([])
const petsLoading = ref(false)

const isReschedule = computed(() => props.mode === 'reschedule')
const isEdit = computed(() => props.mode === 'edit')

function resetFromProps() {
  submitted.value = false
  const appt = props.appointment
  if (appt) {
    date.value = apptDate(appt.startAt)
    time.value = apptTime(appt.startAt)
    type.value = appt.type
    employeeId.value = appt.employee.id
    const free = !appt.owner && !!appt.clientName
    subjectMode.value = free ? 'free' : 'registered'
    ownerId.value = appt.owner ? String(appt.owner.id) : null
    ownerName.value = appt.owner?.name ?? null
    animalId.value = appt.animal ? String(appt.animal.id) : ''
    clientName.value = appt.clientName ?? ''
    clientPhone.value = appt.clientPhone ?? ''
    notes.value = appt.notes ?? ''
    if (ownerId.value) void loadPets(ownerId.value)
  } else {
    date.value = props.focusDate
    time.value = '09:00'
    type.value = 'CONSULTATION'
    employeeId.value = vets.value[0]?.id ?? null
    subjectMode.value = 'registered'
    ownerId.value = null
    ownerName.value = null
    animalId.value = ''
    clientName.value = ''
    clientPhone.value = ''
    notes.value = ''
    pets.value = []
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) resetFromProps()
  },
  { immediate: true },
)

// Default de vet cuando la lista llega tarde (modo crear).
watch(vets, (list) => {
  if (props.open && !props.appointment && employeeId.value == null) {
    employeeId.value = list[0]?.id ?? null
  }
})

async function loadPets(oid: string) {
  petsLoading.value = true
  try {
    pets.value = await animalsStore.load(oid)
  } catch {
    pets.value = []
  } finally {
    petsLoading.value = false
  }
}

function onOwnerSelect(owner: Owner | null) {
  animalId.value = ''
  pets.value = []
  ownerName.value = owner?.name ?? null
  if (owner) void loadPets(owner.id)
}

// ── Opciones ─────────────────────────────────────────────────────────
const vetOptions = computed(() =>
  vets.value.map((v) => ({ value: String(v.id), label: v.name })),
)
const petOptions = computed(() => [
  { value: '', label: ownerId.value ? '— Por confirmar —' : 'Elige un dueño primero' },
  ...pets.value.map((p) => ({
    value: p.id,
    label: `${p.name} · ${p.specie.name}, ${p.breed.name}`,
  })),
])

// ── Char counters con límite ─────────────────────────────────────────
const notesModel = computed({
  get: () => notes.value,
  set: (v: string) => (notes.value = v.slice(0, APPT_NOTES_MAX)),
})
const clientNameModel = computed({
  get: () => clientName.value,
  set: (v: string) => (clientName.value = v.slice(0, APPT_CLIENT_NAME_MAX)),
})
const clientPhoneModel = computed({
  get: () => clientPhone.value,
  set: (v: string) => (clientPhone.value = v.slice(0, APPT_CLIENT_PHONE_MAX)),
})

// ── Validación ───────────────────────────────────────────────────────
const hasSubject = computed(() =>
  subjectMode.value === 'registered'
    ? !!ownerId.value || !!animalId.value
    : clientName.value.trim().length > 0,
)
const missingSubject = computed(() => !isReschedule.value && !hasSubject.value)
const valid = computed(
  () =>
    !!date.value &&
    !!time.value &&
    !!type.value &&
    employeeId.value != null &&
    (isReschedule.value || hasSubject.value),
)

// ── Clash preview ────────────────────────────────────────────────────
const startAtIso = computed(() =>
  date.value && time.value ? toIsoLocalDateTime(date.value, time.value) : '',
)
const clashing = computed(() => {
  if (employeeId.value == null || !startAtIso.value) return []
  return apptClashes(props.existing, {
    id: props.appointment?.id,
    employeeId: employeeId.value,
    startAt: startAtIso.value,
    status: props.appointment?.status ?? 'REQUESTED',
  })
})
const clashVetName = computed(
  () => vets.value.find((v) => v.id === employeeId.value)?.name ?? 'El veterinario/a',
)

// ── Submit ───────────────────────────────────────────────────────────
const title = computed(() => {
  if (isReschedule.value) return `Reprogramar cita #${props.appointment?.id ?? ''}`
  if (isEdit.value) return `Editar cita #${props.appointment?.id ?? ''}`
  return 'Agendar cita'
})
const subtitle = computed(() => {
  if (isReschedule.value) return 'Elige nueva fecha, hora y veterinario/a.'
  if (isEdit.value) return 'Modifica los datos de la cita.'
  return 'Registra una nueva cita en la agenda.'
})
const submitLabel = computed(() => {
  if (isReschedule.value) return 'Reprogramar'
  if (isEdit.value) return 'Guardar cambios'
  return 'Agendar cita'
})

function submit() {
  submitted.value = true
  if (!valid.value || employeeId.value == null) return
  const startAt = toIsoLocalDateTime(date.value, time.value)

  if (isReschedule.value && props.appointment) {
    emit('submit', {
      mode: 'reschedule',
      id: props.appointment.id,
      payload: { startAt, employeeId: employeeId.value },
    })
    return
  }

  const registered = subjectMode.value === 'registered'
  const payload: CreateAppointmentRequest = {
    startAt,
    type: type.value,
    employeeId: employeeId.value,
    ownerId: registered && ownerId.value ? Number(ownerId.value) : null,
    animalId: registered && animalId.value ? Number(animalId.value) : null,
    clientName: !registered ? clientName.value.trim() || null : null,
    clientPhone: !registered ? clientPhone.value.trim() || null : null,
    notes: notes.value.trim() || null,
  }

  if (isEdit.value && props.appointment) {
    emit('submit', { mode: 'edit', id: props.appointment.id, payload })
  } else {
    emit('submit', { mode: 'create', payload })
  }
}
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
    <template #body>
      <div class="mform">
        <!-- Cuándo + vet -->
        <div class="cols">
          <div class="col">
            <div class="field-row">
              <div class="field">
                <label class="flabel">Fecha <span class="req">*</span></label>
                <DateInput
                  v-model="date"
                  :invalid="submitted && !date"
                  placeholder="Selecciona fecha"
                />
              </div>
              <div class="field">
                <label class="flabel">Hora de inicio <span class="req">*</span></label>
                <TimeInput v-model="time" :invalid="submitted && !time" />
              </div>
            </div>
          </div>
          <div class="col">
            <div class="field">
              <label class="flabel">Veterinario/a asignado <span class="req">*</span></label>
              <BaseSelect
                :model-value="employeeId != null ? String(employeeId) : null"
                :options="vetOptions"
                :invalid="submitted && employeeId == null"
                placeholder="Selecciona un veterinario/a"
                @update:model-value="(v: string) => (employeeId = Number(v))"
              />
            </div>
          </div>
        </div>

        <!-- Tipo (oculto en reprogramación) -->
        <div v-if="!isReschedule" class="field">
          <label class="flabel">Tipo de cita <span class="req">*</span></label>
          <div class="typegrid">
            <button
              v-for="[key, m] in typeEntries"
              :key="key"
              type="button"
              class="typebtn"
              :class="{ sel: type === key }"
              @click="type = key"
            >
              <span class="typebtn-ic" aria-hidden="true">{{ m.icon }}</span>{{ m.label }}
            </button>
          </div>
        </div>

        <!-- Aviso de choque -->
        <div v-if="clashing.length > 0" class="banner warn">
          <AlertTriangle :size="16" :stroke-width="1.7" class="banner-ic" />
          <span>
            <b>Choque de horario.</b> {{ clashVetName }} ya tiene
            {{ clashing.length === 1 ? 'otra cita' : `${clashing.length} citas` }} a las
            {{ time }}. Se puede agendar igual — sólo es una advertencia.
          </span>
        </div>

        <template v-if="!isReschedule">
          <div class="divider" />

          <!-- Sujeto + notas -->
          <div class="cols">
            <div class="col">
              <div class="field">
                <label class="flabel">¿A quién es la cita?</label>
                <div class="subject-toggle">
                  <button
                    type="button"
                    :class="{ active: subjectMode === 'registered' }"
                    @click="subjectMode = 'registered'"
                  >
                    Cliente registrado
                  </button>
                  <button
                    type="button"
                    :class="{ active: subjectMode === 'free' }"
                    @click="subjectMode = 'free'"
                  >
                    Contacto libre
                  </button>
                </div>
                <div class="fhint">
                  {{
                    subjectMode === 'registered'
                      ? 'Busca el dueño por nombre, ID o documento; luego elige su mascota.'
                      : 'Para quien aún no está registrado. Basta con el nombre.'
                  }}
                </div>
              </div>

              <template v-if="subjectMode === 'registered'">
                <div class="field">
                  <label class="flabel">Propietario</label>
                  <OwnerSearchAutocomplete
                    v-model="ownerId"
                    :initial-name="ownerName"
                    @select="onOwnerSelect"
                  />
                </div>
                <div class="field">
                  <label class="flabel">Mascota</label>
                  <BaseSelect
                    v-model="animalId"
                    :options="petOptions"
                    :disabled="!ownerId || petsLoading"
                    :placeholder="petsLoading ? 'Cargando…' : 'Selecciona una mascota'"
                  />
                </div>
              </template>

              <template v-else>
                <div class="field">
                  <label class="flabel">Nombre del contacto</label>
                  <BaseInput v-model="clientNameModel" placeholder="Ej. María Pérez" />
                </div>
                <div class="field">
                  <label class="flabel">Teléfono</label>
                  <BaseInput v-model="clientPhoneModel" placeholder="Ej. 300 123 4567" />
                </div>
              </template>

              <div v-if="submitted && missingSubject" class="banner err">
                <AlertTriangle :size="16" :stroke-width="1.7" class="banner-ic" />
                <span>Indica al menos <b>mascota, propietario o nombre de contacto</b>.</span>
              </div>
            </div>

            <div class="col">
              <div class="field grow">
                <label class="flabel">Motivo / notas de recepción</label>
                <BaseTextarea
                  v-model="notesModel"
                  :rows="7"
                  placeholder="Ej. Control post-cirugía"
                />
                <div class="charcount">{{ notes.length }}/{{ APPT_NOTES_MAX }}</div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

    <template #footer-left>
      <span>Los campos con <span class="req">*</span> son obligatorios.</span>
    </template>
    <template #footer-actions>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn btn-primary" @click="submit">
        <Check :size="16" :stroke-width="1.8" /> {{ submitLabel }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.mform {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.field.grow {
  flex: 1;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.flabel {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--warm-500);
}
.req {
  color: oklch(60% 0.2 25);
}
.fhint {
  font-size: 11.5px;
  color: var(--warm-500);
  line-height: 1.45;
}
.charcount {
  font-size: 11px;
  color: var(--warm-400);
  text-align: right;
}
.typegrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 6px;
}
.typebtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 9px 6px;
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  background: var(--warm-50);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  color: var(--warm-700);
  transition: all 0.1s;
}
.typebtn:hover {
  border-color: var(--amatista-300);
}
.typebtn.sel {
  border-color: var(--amatista-500);
  background: var(--amatista-50);
  color: var(--amatista-700);
  box-shadow: 0 0 0 1px var(--amatista-400) inset;
}
.typebtn-ic {
  font-size: 18px;
}
.subject-toggle {
  display: inline-flex;
  background: var(--warm-150);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}
.subject-toggle button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--warm-600);
  padding: 6px 12px;
  border-radius: 6px;
}
.subject-toggle button.active {
  background: var(--warm-50);
  color: var(--warm-900);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.divider {
  height: 1px;
  background: var(--warm-200);
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
  background: oklch(95% 0.07 80);
  color: oklch(42% 0.13 60);
  border: 1px solid oklch(88% 0.09 80);
}
.banner.err {
  background: oklch(95% 0.05 25);
  color: oklch(48% 0.18 25);
  border: 1px solid oklch(88% 0.07 25);
}
.banner b {
  font-weight: 600;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: 9px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: filter 0.12s, background 0.12s;
}
.btn-primary {
  background: var(--amatista-700);
  color: white;
}
.btn-primary:hover {
  filter: brightness(1.07);
}
.btn-ghost {
  background: var(--warm-50);
  border-color: var(--warm-200);
  color: var(--warm-700);
}
.btn-ghost:hover {
  background: var(--warm-100);
}

@media (max-width: 720px) {
  .cols {
    grid-template-columns: 1fr;
  }
}
</style>
