<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { UserPlus, Pencil } from 'lucide-vue-next'
import type { Employee, EmployeeStatus } from '@/types/domain'
import { useRoles } from '@/features/roles/composables/useRoles'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import SegmentedRadio from '@/features/dashboard/components/ui/SegmentedRadio.vue'
import RoleSelectorGrid from './RoleSelectorGrid.vue'
import { scrollToFirstError } from '@/composables/scrollToError'
import { employeeApi } from '../api/employee.api'

const props = defineProps<{
  open: boolean
  initial: Employee | null
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [data: EmployeeFormData]
}>()

export interface EmployeeFormData {
  employeeCode: string
  name: string
  email: string
  status: EmployeeStatus
  password: string
  roleIds: number[]
}

type FieldKey = 'employeeCode' | 'name' | 'email' | 'password' | 'roles'

const isEditing = computed(() => props.initial !== null)

const { list: roles } = useRoles()

const draft = ref<EmployeeFormData>({
  employeeCode: '',
  name: '',
  email: '',
  status: 'ACTIVE',
  password: '',
  roleIds: [],
})

const selectedRoleIds = ref<Set<number>>(new Set())

// --- Autogeneración del código (solo alta): bloqueado hasta escribir el nombre, editable, disp. en vivo ---
type CodeStatus = 'idle' | 'checking' | 'available' | 'taken'
const codeStatus = ref<CodeStatus>('idle')
let codeAuto = true // true hasta que el usuario edite el código a mano
let applyingSuggestion = false
let suggestTimer: ReturnType<typeof setTimeout> | undefined
let availTimer: ReturnType<typeof setTimeout> | undefined

// El código se bloquea mientras no haya nombre (solo en alta).
const codeDisabled = computed(() => !isEditing.value && !draft.value.name.trim())
const codeHint = computed<string | undefined>(() => {
  if (isEditing.value) return undefined
  if (codeDisabled.value) return 'Escribe el nombre y se genera automáticamente. Luego puedes editarlo.'
  if (codeStatus.value === 'checking') return 'Verificando disponibilidad…'
  if (codeStatus.value === 'available') return '✓ Disponible'
  return 'Puedes editarlo.'
})

const touched = reactive<Record<FieldKey, boolean>>({
  employeeCode: false,
  name: false,
  email: false,
  password: false,
  roles: false,
})

function reset() {
  if (props.initial) {
    draft.value = {
      employeeCode: props.initial.employeeCode,
      name: props.initial.name,
      email: props.initial.email,
      status: props.initial.enabled ? 'ACTIVE' : 'INACTIVE',
      password: '',
      roleIds: [],
    }
    selectedRoleIds.value = new Set()
  } else {
    draft.value = {
      employeeCode: '',
      name: '',
      email: '',
      status: 'ACTIVE',
      password: '',
      roleIds: [],
    }
    selectedRoleIds.value = new Set()
  }
  touched.employeeCode = false
  touched.name = false
  touched.email = false
  touched.password = false
  touched.roles = false
  banner.value = false
  confirming.value = false
  codeStatus.value = 'idle'
  codeAuto = !props.initial // en edición no autogeneramos
  applyingSuggestion = false
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
  { immediate: true },
)

async function fetchSuggestion() {
  if (isEditing.value || !codeAuto) return
  const name = draft.value.name.trim()
  if (!name) return
  try {
    const suggestion = await employeeApi.suggestCode(name)
    if (isEditing.value || !codeAuto) return
    applyingSuggestion = true
    draft.value.employeeCode = suggestion
    codeStatus.value = 'available'
  } catch {
    /* sin sugerencia: el usuario escribe el código a mano */
  }
}

async function checkAvailability() {
  const code = draft.value.employeeCode.trim()
  if (!code) {
    codeStatus.value = 'idle'
    return
  }
  codeStatus.value = 'checking'
  try {
    const available = await employeeApi.checkCodeAvailability(code)
    if (code !== draft.value.employeeCode.trim()) return // el valor cambió mientras respondía
    codeStatus.value = available ? 'available' : 'taken'
  } catch {
    codeStatus.value = 'idle'
  }
}

// Alta: al escribir el nombre se autogenera el código (mientras no se haya editado a mano).
watch(
  () => draft.value.name,
  () => {
    if (isEditing.value) return
    clearTimeout(suggestTimer)
    suggestTimer = setTimeout(fetchSuggestion, 450)
  },
)

// Alta: al editar el código, chequeo de disponibilidad (excepto cuando el valor lo puso la sugerencia).
watch(
  () => draft.value.employeeCode,
  () => {
    if (isEditing.value) return
    if (applyingSuggestion) {
      applyingSuggestion = false
      return
    }
    codeAuto = false
    clearTimeout(availTimer)
    availTimer = setTimeout(checkAvailability, 400)
  },
)

const errors = computed(() => {
  const e: Partial<Record<FieldKey, string>> = {}
  const code = draft.value.employeeCode.trim()
  if (!code) e.employeeCode = 'El código es requerido'
  else if (code.length > 50) e.employeeCode = 'Máximo 50 caracteres'
  else if (!isEditing.value && codeStatus.value === 'taken') e.employeeCode = 'Ese código ya está en uso'

  const name = draft.value.name.trim()
  if (!name) e.name = 'El nombre es requerido'
  else if (name.length < 2) e.name = 'Mínimo 2 caracteres'
  else if (name.length > 100) e.name = 'Máximo 100 caracteres'

  const email = draft.value.email.trim()
  if (!email) e.email = 'El correo es requerido'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'Correo inválido'
  else if (email.length > 100) e.email = 'Máximo 100 caracteres'

  if (!isEditing.value) {
    const pw = draft.value.password
    if (!pw) e.password = 'La contraseña es requerida'
    else if (pw.length < 8) e.password = 'Mínimo 8 caracteres'
    else if (pw.length > 100) e.password = 'Máximo 100 caracteres'

    if (selectedRoleIds.value.size === 0) e.roles = 'Selecciona al menos un rol'
  }

  return e
})

function err(field: FieldKey): string | undefined {
  return touched[field] && errors.value[field] ? errors.value[field] : undefined
}

function markTouched(field: FieldKey) {
  touched[field] = true
}

const banner = ref(false)
const confirming = ref(false)

function submit() {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  const ok = Object.keys(errors.value).length === 0
  if (!ok) {
    scrollToFirstError()
    banner.value = true
    return
  }
  banner.value = false
  // Alta: pedir confirmación antes de crear (se enviará la invitación por correo). Edición: guardar directo.
  if (!isEditing.value) {
    confirming.value = true
    return
  }
  doSubmit()
}

function doSubmit() {
  confirming.value = false
  emit('submit', {
    ...draft.value,
    roleIds: [...selectedRoleIds.value],
  })
}

const statusOptions = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
]

function onSelectedIdsUpdate(next: Set<number>) {
  selectedRoleIds.value = next
  markTouched('roles')
}

const titleText = computed(() => (isEditing.value ? 'Editar empleado' : 'Nuevo empleado'))
const subtitleText = computed(() =>
  isEditing.value
    ? 'Actualiza los datos del empleado.'
    : 'Crea una cuenta para un nuevo miembro del equipo.',
)
</script>

<template>
  <ModalShell
    :open="open"
    :title="titleText"
    :subtitle="subtitleText"
    :icon="isEditing ? Pencil : UserPlus"
    accent="amatista"
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="confirming" class="confirm">
        <p>
          Se creará la cuenta de <strong>{{ draft.name || 'este empleado' }}</strong> y se enviará una
          invitación a <strong>{{ draft.email }}</strong> con su usuario
          (<strong>{{ draft.employeeCode }}</strong>) y la contraseña para el primer ingreso.
        </p>
        <p class="confirm-note">
          Al iniciar sesión por primera vez, el sistema le pedirá crear una contraseña nueva.
        </p>
      </div>

      <template v-else>
        <div v-if="banner" class="banner">Revisa los campos marcados antes de continuar.</div>
        <div class="form">
        <BaseField label="Nombre completo" required :error="err('name')">
          <BaseInput
            v-model="draft.name"
            placeholder="Mariana Soto Quispe"
            :invalid="!!err('name')"
            autocomplete="name"
            @blur="markTouched('name')"
          />
        </BaseField>

        <div class="grid-2">
          <BaseField
            label="Código de empleado"
            required
            :error="err('employeeCode')"
            :hint="codeHint"
          >
            <BaseInput
              v-model="draft.employeeCode"
              placeholder="VET-001"
              :disabled="codeDisabled"
              :invalid="!!err('employeeCode')"
              @blur="markTouched('employeeCode')"
            />
          </BaseField>

          <BaseField label="Correo" required :error="err('email')">
            <BaseInput
              v-model="draft.email"
              type="email"
              placeholder="mariana.soto@vetrina.com"
              :invalid="!!err('email')"
              autocomplete="email"
              @blur="markTouched('email')"
            />
          </BaseField>
        </div>

        <BaseField
          v-if="!isEditing"
          label="Contraseña inicial"
          required
          hint="Mínimo 8 caracteres."
          :error="err('password')"
        >
          <BaseInput
            v-model="draft.password"
            type="password"
            placeholder="••••••••"
            :invalid="!!err('password')"
            autocomplete="new-password"
            @blur="markTouched('password')"
          />
        </BaseField>

        <BaseField
          v-if="!isEditing"
          label="Roles"
          required
          hint="Un empleado puede tener varios roles. Debe tener al menos uno."
          :error="err('roles')"
        >
          <RoleSelectorGrid
            :available-roles="roles"
            :selected-ids="selectedRoleIds"
            @update:selected-ids="onSelectedIdsUpdate"
          />
        </BaseField>

        <BaseField v-if="isEditing" label="Estado">
          <SegmentedRadio v-model="draft.status" :options="statusOptions" />
        </BaseField>
        </div>
      </template>
    </template>

    <template #footer-actions>
      <template v-if="confirming">
        <button type="button" class="ghost" :disabled="busy" @click="confirming = false">Volver</button>
        <button type="button" class="primary" :disabled="busy" @click="doSubmit">
          Confirmar y crear
        </button>
      </template>
      <template v-else>
        <button type="button" class="ghost" :disabled="busy" @click="emit('close')">Cancelar</button>
        <button type="button" class="primary" :disabled="busy" @click="submit">
          {{ isEditing ? 'Guardar cambios' : 'Crear empleado' }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
.banner {
  background: oklch(95% 0.06 25);
  border: 1px solid oklch(85% 0.12 25);
  color: oklch(40% 0.18 25);
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  margin-bottom: 14px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.confirm p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--warm-700);
}
.confirm-note {
  margin-top: 10px !important;
  color: var(--warm-500) !important;
  font-size: 12.5px !important;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 640px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
.ghost,
.primary {
  padding: 8px 14px;
  font-size: 13px;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border: 1px solid transparent;
}
.ghost {
  background: var(--warm-50);
  color: var(--warm-700);
  border-color: var(--warm-200);
}
.ghost:hover:not(:disabled) {
  background: var(--warm-100);
}
.primary {
  background: var(--amatista-700);
  color: white;
}
.primary:hover:not(:disabled) {
  background: var(--amatista-800);
}
.ghost:disabled,
.primary:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
