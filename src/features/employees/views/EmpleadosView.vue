<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useEmployees } from '../composables/useEmployees'
import { useRoles } from '@/features/roles/composables/useRoles'
import EmpleadosTable from '../components/EmpleadosTable.vue'
import EmpleadoDrawer from '../components/EmpleadoDrawer.vue'
import EmployeeFormModal, {
  type EmployeeFormData,
} from '../components/EmployeeFormModal.vue'
import ChangeRolesModal, {
  type ChangeRolesConfirm,
} from '../components/ChangeRolesModal.vue'
import ConfirmDeactivateDialog from '../components/ConfirmDeactivateDialog.vue'
import { employeeRolesApi } from '../api/employeeRoles.api'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'

const ADMIN_ROLE_CODE = 'ADMIN'
function hasAdminRole(employee: Employee): boolean {
  return employee.roles.some((r) => r.code === ADMIN_ROLE_CODE)
}

const { companyId } = useAuth()
const { employees, loading, error, fetchAll, create, update, deactivate, reactivate } =
  useEmployees()
const { list: availableRoles } = useRoles()
const { can } = useAuthorization()
const toast = useToast()
const canCreate = can(PERMISSIONS.EMPLOYEE_CREATE)
const canUpdate = can(PERMISSIONS.EMPLOYEE_UPDATE)

const query = ref('')
const selectedId = ref<number | null>(null)
const formOpen = ref(false)
const formInitial = ref<Employee | null>(null)
const deactivateTarget = ref<Employee | null>(null)
const changingRolesTarget = ref<Employee | null>(null)
const busy = ref(false)
const submitError = ref<string | null>(null)

const selected = computed(() => employees.value.find((e) => e.id === selectedId.value) ?? null)

onMounted(() => {
  fetchAll().catch(() => {
    /* error ya queda en error.value */
  })
})

function onSelect(id: number) {
  selectedId.value = id
}

function closeDrawer() {
  selectedId.value = null
}

function openCreate() {
  formInitial.value = null
  submitError.value = null
  formOpen.value = true
}

function openEdit(employee: Employee) {
  formInitial.value = employee
  submitError.value = null
  formOpen.value = true
}

function openChangeRoles(employee: Employee) {
  submitError.value = null
  changingRolesTarget.value = employee
}

async function handleSubmit(data: EmployeeFormData) {
  if (busy.value) return
  busy.value = true
  submitError.value = null
  try {
    if (formInitial.value) {
      const updated = await update(formInitial.value.id, {
        employeeCode: data.employeeCode.trim(),
        name: data.name.trim(),
        email: data.email.trim(),
        status: data.status,
      })
      selectedId.value = updated.id
      toast.success('Empleado actualizado', updated.name)
    } else {
      const cid = companyId.value
      if (cid == null) {
        submitError.value = 'No se pudo determinar la empresa actual.'
        return
      }
      if (data.roleIds.length === 0) {
        submitError.value = 'Selecciona al menos un rol para el empleado.'
        return
      }
      const created = await create({
        employeeCode: data.employeeCode.trim(),
        password: data.password,
        name: data.name.trim(),
        email: data.email.trim(),
        status: 'ACTIVE',
        companyId: cid,
      })
      await Promise.all(
        data.roleIds.map((roleId) =>
          employeeRolesApi.create({ employeeId: created.id, roleId }),
        ),
      )
      await fetchAll()
      selectedId.value = created.id
      toast.success('Empleado creado', created.name)
    }
    formOpen.value = false
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'No se pudo guardar el empleado'
    submitError.value = msg
    toast.error('Ocurrió un error', msg)
  } finally {
    busy.value = false
  }
}

function askDeactivate(employee: Employee) {
  if (hasAdminRole(employee)) {
    toast.error(
      'No se puede desactivar',
      'Los empleados con rol ADMIN no pueden ser desactivados.',
    )
    return
  }
  deactivateTarget.value = employee
}

async function confirmDeactivate() {
  const target = deactivateTarget.value
  if (!target || busy.value) return
  busy.value = true
  try {
    await deactivate(target.id)
    deactivateTarget.value = null
    toast.info('Empleado desactivado', 'No podrá iniciar sesión hasta reactivarlo.')
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo desactivar al empleado')
    submitError.value = msg
    toast.error('Ocurrió un error', msg)
  } finally {
    busy.value = false
  }
}

async function handleActivate(employee: Employee) {
  if (busy.value) return
  busy.value = true
  try {
    await reactivate(employee.id)
    toast.success('Empleado activado', `${employee.name} puede iniciar sesión de nuevo.`)
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo reactivar al empleado')
    submitError.value = msg
    toast.error('Ocurrió un error', msg)
  } finally {
    busy.value = false
  }
}

async function onConfirmChangeRoles(data: ChangeRolesConfirm) {
  const target = changingRolesTarget.value
  if (!target || busy.value) return
  busy.value = true
  submitError.value = null
  try {
    await Promise.all([
      ...data.addIds.map((roleId) =>
        employeeRolesApi.create({ employeeId: target.id, roleId }),
      ),
      ...data.removeEmployeeRoleIds.map((id) => employeeRolesApi.remove(id)),
    ])
    await fetchAll()
    selectedId.value = target.id
    const label =
      data.selectedRoles.length === 1
        ? `${target.name} ahora es ${data.selectedRoles[0].name}.`
        : `${target.name} ahora tiene ${data.selectedRoles.length} roles: ${data.selectedRoles
            .map((r) => r.name)
            .join(', ')}.`
    toast.success('Roles actualizados', label)
    changingRolesTarget.value = null
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudieron actualizar los roles')
    submitError.value = msg
    toast.error('Ocurrió un error', msg)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader
      kicker="Administración · Equipo"
      title="Empleados"
      lead="Gestiona el equipo de la clínica, sus roles y accesos."
    >
      <template #action>
        <button v-if="canCreate" type="button" class="cta" :disabled="busy" @click="openCreate">
          <Plus :size="16" :stroke-width="1.8" />
          Nuevo empleado
        </button>
      </template>
    </PageHeader>

    <div v-if="error" class="banner error">{{ error }}</div>
    <div v-if="submitError" class="banner error">{{ submitError }}</div>

    <EmpleadosTable
      :employees="employees"
      :selected-id="selectedId"
      :query="query"
      :loading="loading"
      @update:query="query = $event"
      @select="onSelect"
    />

    <EmpleadoDrawer
      :employee="selected"
      :busy="busy"
      :can-update="canUpdate"
      @close="closeDrawer"
      @edit="openEdit"
      @change-roles="openChangeRoles"
      @deactivate="askDeactivate"
      @activate="handleActivate"
    />

    <EmployeeFormModal
      :open="formOpen"
      :initial="formInitial"
      :busy="busy"
      @close="formOpen = false"
      @submit="handleSubmit"
    />

    <ChangeRolesModal
      :open="changingRolesTarget !== null"
      :employee="changingRolesTarget"
      :available-roles="availableRoles"
      :busy="busy"
      @close="changingRolesTarget = null"
      @confirm="onConfirmChangeRoles"
    />

    <ConfirmDeactivateDialog
      :open="deactivateTarget !== null"
      :employee="deactivateTarget"
      :busy="busy"
      @cancel="deactivateTarget = null"
      @confirm="confirmDeactivate"
    />
  </div>
</template>

<style scoped>
.page {
  font-family: var(--font-sans);
  color: var(--warm-900);
}
.cta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13.5px;
  font-weight: 500;
  background: linear-gradient(
    135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))
  );
  color: white;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08),
    0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
  white-space: nowrap;
}
.cta:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.banner {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 14px;
}
.banner.error {
  background: oklch(95% 0.06 25);
  border: 1px solid oklch(85% 0.12 25);
  color: oklch(40% 0.18 25);
}
</style>
