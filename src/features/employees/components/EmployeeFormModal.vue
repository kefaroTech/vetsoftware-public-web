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
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
  { immediate: true },
)

const errors = computed(() => {
  const e: Partial<Record<FieldKey, string>> = {}
  const code = draft.value.employeeCode.trim()
  if (!code) e.employeeCode = 'El código es requerido'
  else if (code.length > 50) e.employeeCode = 'Máximo 50 caracteres'

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

function submit() {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  const ok = Object.keys(errors.value).length === 0
  if (!ok) {
    scrollToFirstError()
    banner.value = true
    return
  }
  banner.value = false
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
          <BaseField label="Código de empleado" required :error="err('employeeCode')">
            <BaseInput
              v-model="draft.employeeCode"
              placeholder="VET-001"
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

    <template #footer-actions>
      <button type="button" class="ghost" :disabled="busy" @click="emit('close')">Cancelar</button>
      <button type="button" class="primary" :disabled="busy" @click="submit">
        {{ isEditing ? 'Guardar cambios' : 'Crear empleado' }}
      </button>
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
