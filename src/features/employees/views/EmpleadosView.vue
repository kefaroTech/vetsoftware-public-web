<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
import ChangeBranchesModal, {
  type ChangeBranchesConfirm,
} from '../components/ChangeBranchesModal.vue'
import ConfirmDeactivateDialog from '../components/ConfirmDeactivateDialog.vue'
import ResendInvitationModal from '../components/ResendInvitationModal.vue'
import { employeeRolesApi } from '../api/employeeRoles.api'
import { employeeBranchesApi } from '../api/employeeBranches.api'
import { useBranches } from '@/features/branches/composables/useBranches'
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
const {
  employees,
  loading,
  error,
  page,
  pageSize,
  totalElements,
  totalPages,
  search,
  setQuery,
  setPage,
  refresh,
  reset,
  create,
  update,
  deactivate,
  reactivate,
  resendInvitation,
} = useEmployees()
const { list: availableRoles } = useRoles()
// Sedes ASIGNABLES por el usuario actual: admin ve todas las activas; un no-admin solo sus sedes.
const { visibleBranches } = useBranches()
const { can } = useAuthorization()
const toast = useToast()
const canCreate = can(PERMISSIONS.EMPLOYEE_CREATE)
const canUpdate = can(PERMISSIONS.EMPLOYEE_UPDATE)

// Valor inmediato del input; se aplica al servicio con debounce para no disparar una petición por tecla.
const query = ref('')
const SEARCH_DEBOUNCE_MS = 300
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(query, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void setQuery(q)
  }, SEARCH_DEBOUNCE_MS)
})
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

const selectedId = ref<number | null>(null)
const formOpen = ref(false)
const formInitial = ref<Employee | null>(null)
const deactivateTarget = ref<Employee | null>(null)
const changingRolesTarget = ref<Employee | null>(null)
const changingBranchesTarget = ref<Employee | null>(null)
const resendTarget = ref<Employee | null>(null)
const busy = ref(false)
const submitError = ref<string | null>(null)

const selected = computed(() => employees.value.find((e) => e.id === selectedId.value) ?? null)

onMounted(() => {
  // El store sobrevive a la navegación: al entrar limpiamos el filtro previo para no arrastrarlo.
  query.value = ''
  reset()
  search().catch(() => {
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

function openChangeBranches(employee: Employee) {
  // El rol ADMIN mantiene cobertura total mediante asignaciones explícitas de sede.
  if (hasAdminRole(employee)) {
    toast.info(
      'Sin sedes que asignar',
      'Un administrador tiene acceso a todas las sedes de la empresa.',
    )
    return
  }
  submitError.value = null
  changingBranchesTarget.value = employee
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
      if (data.branchIds.length === 0) {
        submitError.value = 'Selecciona al menos una sede para el empleado.'
        return
      }
      // El backend crea el empleado, le asigna roles y sedes, y le envía la invitación por correo (1 transacción).
      // `create` refresca la página actual internamente (la fila nueva llega con sus roles/sedes).
      const created = await create({
        employeeCode: data.employeeCode.trim(),
        password: data.password,
        name: data.name.trim(),
        email: data.email.trim(),
        companyId: cid,
        roleIds: data.roleIds,
        branchIds: data.branchIds,
      })
      selectedId.value = created.id
      toast.success('Empleado invitado', `Se envió la invitación a ${created.email}`)
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
    // Estado del front posiblemente desincronizado (empleado ya inexistente/desactivado): resincronizamos.
    deactivateTarget.value = null
    await refresh().catch(() => {})
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

function openResend(employee: Employee) {
  submitError.value = null
  resendTarget.value = employee
}

async function onConfirmResend(password: string) {
  const target = resendTarget.value
  if (!target || busy.value) return
  busy.value = true
  submitError.value = null
  try {
    const updated = await resendInvitation(target.id, password)
    resendTarget.value = null
    selectedId.value = updated.id
    toast.success('Invitación reenviada', `Se envió una nueva invitación a ${updated.email}`)
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo reenviar la invitación')
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
    await refresh()
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

async function onConfirmChangeBranches(data: ChangeBranchesConfirm) {
  const target = changingBranchesTarget.value
  if (!target || busy.value) return
  busy.value = true
  submitError.value = null
  try {
    await employeeBranchesApi.set(target.id, { allBranches: false, branchIds: data.branchIds })
    // Refrescamos para que la columna/detalle de sedes reflejen el cambio (la respuesta del set no las devuelve).
    await refresh()
    selectedId.value = target.id
    const n = data.branchIds.length
    toast.success('Sedes actualizadas', `${target.name} opera ahora en ${n} ${n === 1 ? 'sede' : 'sedes'}.`)
    changingBranchesTarget.value = null
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudieron actualizar las sedes')
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
      :page="page"
      :page-size="pageSize"
      :total-elements="totalElements"
      :total-pages="totalPages"
      @update:query="query = $event"
      @update:page="setPage"
      @select="onSelect"
    />

    <EmpleadoDrawer
      :employee="selected"
      :busy="busy"
      :can-update="canUpdate"
      @close="closeDrawer"
      @edit="openEdit"
      @change-roles="openChangeRoles"
      @change-branches="openChangeBranches"
      @resend-invitation="openResend"
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

    <ChangeBranchesModal
      :open="changingBranchesTarget !== null"
      :employee="changingBranchesTarget"
      :available-branches="visibleBranches"
      :busy="busy"
      @close="changingBranchesTarget = null"
      @confirm="onConfirmChangeBranches"
    />

    <ConfirmDeactivateDialog
      :open="deactivateTarget !== null"
      :employee="deactivateTarget"
      :busy="busy"
      @cancel="deactivateTarget = null"
      @confirm="confirmDeactivate"
    />

    <ResendInvitationModal
      :open="resendTarget !== null"
      :employee="resendTarget"
      :busy="busy"
      @close="resendTarget = null"
      @confirm="onConfirmResend"
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
