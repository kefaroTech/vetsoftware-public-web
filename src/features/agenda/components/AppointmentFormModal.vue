<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { scrollToFirstError } from '@/composables/scrollToError'
import { Calendar, Check, AlertTriangle, Zap } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppointmentNoticeBanner from './AppointmentNoticeBanner.vue'
import AppointmentBranchConfirm from './AppointmentBranchConfirm.vue'
import AppointmentWhenFields from './AppointmentWhenFields.vue'
import AppointmentSubjectFields from './AppointmentSubjectFields.vue'
import { useVets } from '../composables/useVets'
import { useAppointmentForm } from '../composables/useAppointmentForm'
import { useAppointmentDuration } from '../composables/useAppointmentDuration'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { useBranches } from '@/features/branches/composables/useBranches'
import { useAnimalsByOwnerStore } from '@/features/dashboard/views/consulta/nueva/stores/animalsByOwner.store'
import type {
  AppointmentResponse,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from '../types/appointment'
import type { Animal, Owner } from '@/types/domain'

type FormMode = 'create' | 'edit' | 'reschedule'

const props = defineProps<{
  open: boolean
  mode: FormMode
  appointment: AppointmentResponse | null
  focusDate: string // yyyy-MM-dd
  existing: AppointmentResponse[]
  /**
   * Motivo del último guardado fallido, o `null`. Lo posee la vista, que es quien
   * llama a la API: el `submit` de este modal es fire-and-forget y no puede saber
   * si el POST salió bien. Se limpia al abrir y al reintentar.
   */
  saveError: string | null
  /**
   * `true` sólo cuando ese fallo fue el 409 de solape (`APPOINTMENT_OVERLAP`). Es lo que
   * distingue «el hueco está ocupado, puedes forzarlo» de cualquier otro error de guardado,
   * donde ofrecer «Agendar de todos modos» sería mentir: reintentar igual volvería a fallar.
   */
  saveErrorOverlap: boolean
  /**
   * FORM-10 — lo controla la vista mientras el POST/PUT está en vuelo. Opcional:
   * sin pasarlo el modal se protege igual con su propia bandera (`emitted`).
   */
  saving?: boolean
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
// Duración por defecto de la empresa: se refresca al abrir; el cálculo del rango y del
// solape (BE-17) vive en `AppointmentWhenFields`.
const { refresh: refreshDuration } = useAppointmentDuration()
// Forzar el solape es un permiso aparte (`appointment.overlap.force`), solo del rol ADMIN.
const { can } = useAuthorization()
const canForceOverlap = can(PERMISSIONS.APPOINTMENT_OVERLAP_FORCE)
// Desplegable de sede: solo las sedes ASIGNADAS al usuario (aunque sea admin).
const { assignedBranches, selectedBranchId } = useBranches()
const animalsStore = useAnimalsByOwnerStore()

// ── Draft ────────────────────────────────────────────────────────────
// Estado, validación y payload del formulario: ver useAppointmentForm.ts
const form = useAppointmentForm({
  mode: computed(() => props.mode),
  appointment: computed(() => props.appointment),
  focusDate: computed(() => props.focusDate),
})
// Sólo lo que usa el propio modal: el resto del borrador viaja entero a las dos
// secciones del formulario en la prop `form`.
const {
  employeeId,
  ownerName,
  animalId,
  submitted,
  isReschedule,
  isEdit,
  valid,
  title,
  subtitle,
  submitLabel,
} = form

const branchId = ref<number | null>(null)
const defaultBranchId = ref<number | null>(null)
const confirmingBranch = ref(false)

/**
 * FORM-10 — guarda de reenvío. Este modal es fire-and-forget: `emit('submit')`
 * devuelve el control de inmediato y la vista es quien llama a la API, así que
 * el modal no puede saber cuándo termina; lo que sí sabe es que YA emitió. La
 * bandera se levanta en `doEmit()` —el único punto por el que salen los tres
 * caminos de envío— y baja al reabrir y cuando la vista informa de un fallo
 * (`saveError`), que es la señal de que el intento terminó y hay que reintentar.
 *
 * Sin esto, el botón «Sí, agendar en esta sede» del paso de confirmación de
 * sede llamaba `doEmit()` directo y sin guarda: era la ruta abierta a la cita
 * duplicada EN OTRA SEDE, la más cara de las dos.
 */
const emitted = ref(false)
const busy = computed(() => props.saving === true || emitted.value)

const pets = ref<Animal[]>([])
const petsLoading = ref(false)

function resetFromProps() {
  confirmingBranch.value = false
  emitted.value = false
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
      // Ídem con la duración por defecto de la empresa: un admin pudo cambiarla entre aperturas.
      void refreshDuration()
      resetFromProps()
    }
  },
  { immediate: true },
)

/**
 * El banner del error de guardado vive arriba del formulario: si el cuerpo del modal estaba
 * desplazado al pulsar Guardar, el motivo aparece fuera de la vista y el usuario sólo ve que
 * "no pasa nada". Se reutiliza el mismo desplazamiento que la validación (el banner lleva el
 * marcador `data-error-anchor`, que `scrollToFirstError` reconoce).
 */
watch(
  () => props.saveError,
  (message) => {
    if (message) {
      // El intento terminó (mal): se vuelve a permitir enviar.
      emitted.value = false
      void scrollToFirstError()
    }
  },
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
  const firstVet = list[0]
  if (!firstVet) {
    employeeId.value = null
    return
  }
  if (employeeId.value == null || !list.some((v) => v.id === employeeId.value)) {
    employeeId.value = firstVet.id
  }
})
function submit() {
  if (busy.value) return
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

/**
 * Reenvío del mismo formulario con `forceOverlap: true`, desde el banner del 409. Nada más
 * cambia: si la sede ya se confirmó, no se vuelve a preguntar.
 */
function forceSubmit() {
  if (busy.value || !valid.value || employeeId.value == null) return
  doEmit(true)
}

function doEmit(forceOverlap = false) {
  // La guarda va AQUÍ y no solo en los llamadores: por esta función pasan los
  // tres caminos de envío, incluido el botón «Sí, agendar en esta sede», que
  // la llama directamente desde el marcado.
  if (busy.value) return
  confirmingBranch.value = false
  if (employeeId.value == null) return
  emitted.value = true

  if (isReschedule.value && props.appointment) {
    emit('submit', {
      mode: 'reschedule',
      id: props.appointment.id,
      payload: form.buildReschedulePayload({ forceOverlap }),
    })
    return
  }

  const payload = form.buildPayload(branchId.value, { forceOverlap })
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
      <AppointmentBranchConfirm
        v-if="confirmingBranch"
        :branch-name="branchName(branchId)"
        :default-branch-name="branchName(defaultBranchId)"
      />
      <div v-else class="ds-stack ds-stack--18">
        <!-- Motivo del último guardado fallido (p. ej. el 409 de solape). -->
        <!-- Sin `role` escrito aquí: `AppointmentNoticeBanner` lo deriva de su tono,
             y al ser fallthrough sobre raíz única un `role` de fuera lo REEMPLAZA
             en vez de anidarse. Hoy coincidían por casualidad; escrito así, el día
             que este sitio use un tono informativo seguiría interrumpiendo. -->
        <AppointmentNoticeBanner
          v-if="saveError"
          tone="err"
          :icon="AlertTriangle"
          data-error-anchor
        >
          <div class="banner-body ds-stack ds-stack--8">
            <span>{{ saveError }}</span>
            <!-- Forzar solo tiene sentido ante el 409 de solape, y solo si hay permiso. -->
            <button
              v-if="saveErrorOverlap && canForceOverlap"
              type="button"
              class="ds-btn ds-btn--ghost force-btn"
              :disabled="busy"
              @click="forceSubmit"
            >
              <Zap :size="15" :stroke-width="1.8" /> Agendar de todos modos
            </button>
            <span v-else-if="saveErrorOverlap" class="force-hint">
              Agendar sobre un hueco ocupado requiere permiso de administrador. Elige otro horario o
              pide que lo agenden por ti.
            </span>
          </div>
        </AppointmentNoticeBanner>

        <AppointmentWhenFields
          v-model:branch-id="branchId"
          :form="form"
          :appointment="appointment"
          :existing="existing"
          :vet-options="vetOptions"
          :branch-options="branchOptions"
          :show-branch-field="showBranchField"
        />

        <template v-if="!isReschedule">
          <div class="divider" />

          <AppointmentSubjectFields
            :form="form"
            :pets="pets"
            :pets-loading="petsLoading"
            @owner-select="onOwnerSelect"
          />
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
        <button type="button" class="ds-btn ds-btn--solid" :disabled="busy" @click="doEmit()">
          <Check :size="16" :stroke-width="1.8" />
          {{ busy ? 'Guardando…' : 'Sí, agendar en esta sede' }}
        </button>
      </template>
      <template v-else>
        <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
        <button type="button" class="ds-btn ds-btn--solid" :disabled="busy" @click="submit">
          <Check :size="16" :stroke-width="1.8" /> {{ busy ? 'Guardando…' : submitLabel }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
/* El aviso de sede está en `AppointmentBranchConfirm.vue`; los campos, en
   `AppointmentWhenFields.vue` y `AppointmentSubjectFields.vue`. Aquí sólo queda el
   cromo del modal: separador, banner de error de guardado y el asterisco del pie. */

.req {
  color: oklch(60% 0.2 25deg);
}

.divider {
  height: 1px;
  background: var(--warm-200);
}

/* Columna del cuerpo del banner (`.ds-stack --8`): el texto del error y, debajo,
   la acción de forzar el solape (o el aviso de que hace falta permiso). */
.banner-body {
  align-items: flex-start;
  min-width: 0;
}

/* A11Y-09: el borde escrito a mano medía 1,67:1 sobre el `--danger-50` del
   banner y 1,66:1 bajo el relleno del hover, por debajo del 3:1 de WCAG 2.2
   §1.4.11. `--danger-border` da 3,68:1 y 3,65:1. */
.force-btn {
  border-color: var(--danger-border);
  color: var(--danger-700);
}

.force-btn:hover {
  background: oklch(96% 0.04 25deg);
}

.force-hint {
  font-size: 11.5px;
  line-height: 1.45;
  opacity: 0.85;
}
</style>
