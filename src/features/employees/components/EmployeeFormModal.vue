<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { UserPlus, Pencil } from 'lucide-vue-next'
import type { Employee, EmployeeStatus } from '@/types/domain'
import { useRoles } from '@/features/roles/composables/useRoles'
import { useBranches } from '@/features/branches/composables/useBranches'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import RoleSelectorGrid from './RoleSelectorGrid.vue'
import BranchSelectorGrid from './BranchSelectorGrid.vue'
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
  branchIds: number[]
}

type FieldKey = 'employeeCode' | 'name' | 'email' | 'password' | 'roles' | 'branches'

const isEditing = computed(() => props.initial !== null)

const { list: roles } = useRoles()
// Sedes ASIGNABLES por el usuario actual: admin ve todas las activas; un no-admin solo sus sedes.
const { visibleBranches } = useBranches()

const draft = ref<EmployeeFormData>({
  employeeCode: '',
  name: '',
  email: '',
  status: 'ACTIVE',
  password: '',
  roleIds: [],
  branchIds: [],
})

const selectedRoleIds = ref<Set<number>>(new Set())
const selectedBranchIds = ref<Set<number>>(new Set())

// --- Autogeneración del código (solo alta): bloqueado hasta escribir el nombre, editable, disp. en vivo ---
type CodeStatus = 'idle' | 'checking' | 'available' | 'taken'
const codeStatus = ref<CodeStatus>('idle')
let codeAuto = true // true hasta que el usuario edite el código a mano
let applyingSuggestion = false
let suggestTimer: ReturnType<typeof setTimeout> | undefined
let availTimer: ReturnType<typeof setTimeout> | undefined

// En edición el código NO se puede modificar; en alta se bloquea mientras no haya nombre.
const codeDisabled = computed(() => isEditing.value || !draft.value.name.trim())
const codeHint = computed<string | undefined>(() => {
  if (isEditing.value) return 'El código no se puede modificar una vez creado el empleado.'
  if (codeDisabled.value)
    return 'Escribe el nombre y se genera automáticamente. Luego puedes editarlo.'
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
  branches: false,
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
      branchIds: [],
    }
    selectedRoleIds.value = new Set()
    selectedBranchIds.value = new Set()
  } else {
    draft.value = {
      employeeCode: '',
      name: '',
      email: '',
      status: 'ACTIVE',
      password: '',
      roleIds: [],
      branchIds: [],
    }
    selectedRoleIds.value = new Set()
    selectedBranchIds.value = new Set()
  }
  touched.employeeCode = false
  touched.name = false
  touched.email = false
  touched.password = false
  touched.roles = false
  touched.branches = false
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
  else if (!isEditing.value && codeStatus.value === 'taken')
    e.employeeCode = 'Ese código ya está en uso'

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
    if (selectedBranchIds.value.size === 0) e.branches = 'Selecciona al menos una sede'
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
    branchIds: [...selectedBranchIds.value],
  })
}

function onSelectedIdsUpdate(next: Set<number>) {
  selectedRoleIds.value = next
  markTouched('roles')
}

function onSelectedBranchIdsUpdate(next: Set<number>) {
  selectedBranchIds.value = next
  markTouched('branches')
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
          Se creará la cuenta de <strong>{{ draft.name || 'este empleado' }}</strong> y se enviará
          una invitación a <strong>{{ draft.email }}</strong> con su usuario (<strong>{{
            draft.employeeCode
          }}</strong
          >) y la contraseña para el primer ingreso.
        </p>
        <p class="confirm-note">
          Al iniciar sesión por primera vez, el sistema le pedirá crear una contraseña nueva.
        </p>
      </div>

      <template v-else>
        <div v-if="banner" class="ds-banner ds-banner--sm ds-banner--error">
          Revisa los campos marcados antes de continuar.
        </div>
        <div class="ds-stack ds-stack--14">
          <BaseField label="Nombre completo" required :error="err('name')">
            <BaseInput
              v-model="draft.name"
              placeholder="Mariana Soto Quispe"
              :invalid="!!err('name')"
              autocomplete="name"
              @blur="markTouched('name')"
            />
          </BaseField>

          <div class="grid-2 ds-grid-2">
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

          <BaseField
            v-if="!isEditing"
            label="Sedes"
            required
            hint="El empleado solo podrá operar en las sedes que asignes. Debe tener al menos una."
            :error="err('branches')"
          >
            <BranchSelectorGrid
              :available-branches="visibleBranches"
              :selected-ids="selectedBranchIds"
              @update:selected-ids="onSelectedBranchIdsUpdate"
            />
          </BaseField>
        </div>
      </template>
    </template>

    <template #footer-actions>
      <template v-if="confirming">
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="busy"
          @click="confirming = false"
        >
          Volver
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="busy"
          @click="doSubmit"
        >
          Confirmar y crear
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="busy"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="busy"
          @click="submit"
        >
          {{ isEditing ? 'Guardar cambios' : 'Crear empleado' }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
/* La trampa de especificidad de AGENTS.md, en su forma más tonta: `.confirm p`
   pesa (0,2,1) con el atributo del scoped y `.confirm-note` solo (0,2,0), así
   que la nota perdía el tono y el tamaño contra la regla de arriba y alguien lo
   resolvió con tres `!important`. Se retiran excluyendo la nota de la regla
   base en vez de ganarle por fuerza bruta: la descendencia se queda con lo que
   comparten los dos párrafos y el resto viaja por clase. */
.confirm p {
  line-height: 1.55;
}

.confirm p:not(.confirm-note) {
  margin: 0;
  font-size: 13.5px;
  color: var(--warm-700);
}

.confirm-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
}

/* `.ds-grid-2` ya trae las 2 columnas y el colapso a 640px; aquí solo el gap,
   que es uniforme (14px) en vez del 14/16 de la primitiva. */
.grid-2 {
  gap: 14px;
}
</style>
