<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { scrollToFirstError } from '@/composables/scrollToError'
import { Calendar, Check, AlertTriangle } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import TimeInput from './TimeInput.vue'
import OwnerSearchAutocomplete from './OwnerSearchAutocomplete.vue'
import { useVets } from '../composables/useVets'
import { useAppointmentForm } from '../composables/useAppointmentForm'
import { useBranches } from '@/features/branches/composables/useBranches'
import { useAnimalsByOwnerStore } from '@/features/dashboard/views/consulta/nueva/stores/animalsByOwner.store'
import {
  APPT_TYPES,
  APPT_NOTES_MAX,
  apptClashes,
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

const { vets, load: loadVets } = useVets()
// Desplegable de sede: solo las sedes ASIGNADAS al usuario (aunque sea admin).
const { assignedBranches, selectedBranchId } = useBranches()
const animalsStore = useAnimalsByOwnerStore()

const typeEntries = Object.entries(APPT_TYPES) as [
  AppointmentType,
  (typeof APPT_TYPES)[AppointmentType],
][]

// ── Draft ────────────────────────────────────────────────────────────
// Estado, validación y payload del formulario: ver useAppointmentForm.ts
const form = useAppointmentForm({
  mode: computed(() => props.mode),
  appointment: computed(() => props.appointment),
  focusDate: computed(() => props.focusDate),
})
const {
  date,
  time,
  type,
  employeeId,
  subjectMode,
  ownerId,
  ownerName,
  animalId,
  notes,
  submitted,
  isReschedule,
  isEdit,
  notesModel,
  clientNameModel,
  clientPhoneModel,
  clientEmailModel,
  missingSubject,
  clientEmailInvalid,
  valid,
  startAtIso,
  title,
  subtitle,
  submitLabel,
} = form

const branchId = ref<number | null>(null)
const defaultBranchId = ref<number | null>(null)
const confirmingBranch = ref(false)

const pets = ref<Animal[]>([])
const petsLoading = ref(false)

function resetFromProps() {
  confirmingBranch.value = false
  // Sede por defecto: la del menú si está entre las asignadas del usuario; si no, su primera sede asignada.
  defaultBranchId.value = resolveDefaultBranch()
  branchId.value = defaultBranchId.value
  form.resetFrom(props.appointment, availableVets.value[0]?.id ?? null)
  if (props.appointment?.owner) void loadPets(String(props.appointment.owner.id))
  else pets.value = []
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      // El modal está siempre montado (se controla con :open), así que su onMounted corre una sola vez.
      // Al ABRIR se recarga siempre la lista de veterinarios desde el backend (por si cambió).
      void loadVets(true)
      resetFromProps()
    }
  },
  { immediate: true },
)

// Default de sede cuando las sucursales llegan tarde.
watch(assignedBranches, () => {
  if (props.open && branchId.value == null) {
    defaultBranchId.value = resolveDefaultBranch()
    branchId.value = defaultBranchId.value
  }
})

// Sede por defecto: la del menú si el usuario la tiene asignada; si no, su primera sede asignada.
function resolveDefaultBranch(): number | null {
  const ids = assignedBranches.value.map((b) => b.id)
  if (selectedBranchId.value != null && ids.includes(selectedBranchId.value))
    return selectedBranchId.value
  return assignedBranches.value[0]?.id ?? null
}
// El select de sede solo se muestra al crear y si el usuario tiene ≥2 sedes asignadas.
const showBranchField = computed(() => props.mode === 'create' && assignedBranches.value.length > 1)
const branchOptions = computed(() =>
  assignedBranches.value.map((b) => ({
    value: String(b.id),
    label: b.city?.name ? `${b.name} - ${b.city.name}` : b.name,
  })),
)
function branchName(id: number | null): string {
  return assignedBranches.value.find((b) => b.id === id)?.name ?? 'la sede'
}
// Hay que confirmar si (al crear) la sede elegida difiere de la sede por defecto.
const needsBranchConfirm = computed(
  () =>
    props.mode === 'create' &&
    defaultBranchId.value != null &&
    branchId.value != null &&
    branchId.value !== defaultBranchId.value,
)

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
// Veterinarios disponibles: al CREAR se filtran por la sede elegida en la cita (solo los que atienden esa sede);
// en editar/reprogramar se muestran todos (la cita ya tiene su sede).
const availableVets = computed(() => {
  const bid = branchId.value
  if (props.mode !== 'create' || bid == null) return vets.value
  return vets.value.filter((v) => v.branchIds.includes(bid))
})
const vetOptions = computed(() =>
  availableVets.value.map((v) => ({ value: String(v.id), label: v.name })),
)

// Al cambiar la sede (o al llegar los vets, en modo crear) reconciliar el veterinario: si el seleccionado no
// atiende esa sede, caer al primero disponible.
watch(availableVets, (list) => {
  if (!props.open || props.mode !== 'create') return
  if (list.length === 0) {
    employeeId.value = null
    return
  }
  if (employeeId.value == null || !list.some((v) => v.id === employeeId.value)) {
    employeeId.value = list[0].id
  }
})
const petOptions = computed(() => [
  { value: '', label: ownerId.value ? '— Por confirmar —' : 'Elige un dueño primero' },
  ...pets.value.map((p) => ({
    value: p.id,
    label: `${p.name} · ${p.specie.name}, ${p.breed.name}`,
  })),
])

// ── Clash preview ────────────────────────────────────────────────────
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

function submit() {
  submitted.value = true
  if (!valid.value || employeeId.value == null) {
    // Igual que el resto de formularios: centra el scroll (con shake) sobre el primer campo faltante.
    void scrollToFirstError()
    return
  }
  // Si la sede elegida difiere de la del menú principal, pedir confirmación antes de agendar.
  if (needsBranchConfirm.value && !confirmingBranch.value) {
    confirmingBranch.value = true
    return
  }
  doEmit()
}

function doEmit() {
  confirmingBranch.value = false
  if (employeeId.value == null) return

  if (isReschedule.value && props.appointment) {
    emit('submit', {
      mode: 'reschedule',
      id: props.appointment.id,
      payload: { startAt: startAtIso.value, employeeId: employeeId.value },
    })
    return
  }

  const payload = form.buildPayload(branchId.value)
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
      <div v-if="confirmingBranch" class="branch-confirm">
        <AlertTriangle :size="22" :stroke-width="1.7" class="bc-ic" />
        <div>
          <p class="bc-title">Sede distinta a la del menú</p>
          <p class="bc-text">
            Vas a agendar esta cita en <b>{{ branchName(branchId) }}</b
            >, que es <b>diferente</b> a la sede por defecto (<b>{{
              branchName(defaultBranchId)
            }}</b
            >). ¿Seguro que quieres agendar en esa sede?
          </p>
        </div>
      </div>
      <div v-else class="mform">
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
            <div v-if="showBranchField" class="field">
              <label class="flabel">Sede <span class="req">*</span></label>
              <BaseSelect
                :model-value="branchId != null ? String(branchId) : null"
                :options="branchOptions"
                placeholder="Selecciona una sede"
                @update:model-value="(v: string) => (branchId = Number(v))"
              />
              <div class="fhint">Por defecto, la sede seleccionada en el menú principal.</div>
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
              <span class="typebtn-ic" aria-hidden="true">{{ m.icon }}</span
              >{{ m.label }}
            </button>
          </div>
        </div>

        <!-- Aviso de choque -->
        <div v-if="clashing.length > 0" class="banner warn">
          <AlertTriangle :size="16" :stroke-width="1.7" class="banner-ic" />
          <span>
            <b>Choque de horario.</b> {{ clashVetName }} ya tiene
            {{ clashing.length === 1 ? 'otra cita' : `${clashing.length} citas` }} a las {{ time }}.
            Se puede agendar igual — sólo es una advertencia.
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
                    :invalid="submitted && missingSubject"
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
                  <BaseInput
                    v-model="clientNameModel"
                    :invalid="submitted && missingSubject"
                    placeholder="Ej. María Pérez"
                  />
                </div>
                <div class="field">
                  <label class="flabel">Teléfono</label>
                  <BaseInput v-model="clientPhoneModel" placeholder="Ej. 300 123 4567" />
                </div>
                <div class="field">
                  <label class="flabel">Correo <span class="opt">(opcional)</span></label>
                  <BaseInput
                    v-model="clientEmailModel"
                    type="email"
                    :invalid="submitted && clientEmailInvalid"
                    placeholder="Ej. maria@correo.com"
                  />
                  <div class="fhint">Si lo indicas, le enviaremos la confirmación de la cita.</div>
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
      <span v-if="!confirmingBranch"
        >Los campos con <span class="req">*</span> son obligatorios.</span
      >
    </template>
    <template #footer-actions>
      <template v-if="confirmingBranch">
        <button type="button" class="ds-btn ds-btn--ghost" @click="confirmingBranch = false">
          Volver
        </button>
        <button type="button" class="ds-btn ds-btn--solid" @click="doEmit">
          <Check :size="16" :stroke-width="1.8" /> Sí, agendar en esta sede
        </button>
      </template>
      <template v-else>
        <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
        <button type="button" class="ds-btn ds-btn--solid" @click="submit">
          <Check :size="16" :stroke-width="1.8" /> {{ submitLabel }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
.mform {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.branch-confirm {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 11px;
  background: oklch(96% 0.05 80deg);
  border: 1px solid var(--warning-200);
}

.bc-ic {
  flex-shrink: 0;
  color: oklch(55% 0.14 60deg);
  margin-top: 2px;
}

.bc-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: oklch(38% 0.13 60deg);
}

.bc-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--warm-700);
}

.bc-text b {
  font-weight: 600;
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
  color: oklch(60% 0.2 25deg);
}

.opt {
  color: var(--warm-400);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
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
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
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
  background: oklch(95% 0.07 80deg);
  color: oklch(42% 0.13 60deg);
  border: 1px solid var(--warning-200);
}

.banner.err {
  background: var(--danger-50);
  color: var(--danger-700);
  border: 1px solid oklch(88% 0.07 25deg);
}

.banner b {
  font-weight: 600;
}

@media (width <= 720px) {
  .cols {
    grid-template-columns: 1fr;
  }
}
</style>
