<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useEmployees } from '../composables/useEmployees'
import EmpleadosTable from '../components/EmpleadosTable.vue'
import EmpleadoDrawer from '../components/EmpleadoDrawer.vue'
import EmployeeFormModal, {
  type EmployeeFormData,
} from '../components/EmployeeFormModal.vue'
import ConfirmDeactivateDialog from '../components/ConfirmDeactivateDialog.vue'
import { employeeRolesApi } from '../api/employeeRoles.api'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'

const { companyId } = useAuth()
const { employees, loading, error, fetchAll, create, update, setStatus } = useEmployees()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.EMPLOYEE_CREATE)
const canUpdate = can(PERMISSIONS.EMPLOYEE_UPDATE)

const query = ref('')
const selectedId = ref<number | null>(null)
const formOpen = ref(false)
const formInitial = ref<Employee | null>(null)
const deactivateTarget = ref<Employee | null>(null)
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
    } else {
      const cid = companyId.value
      if (cid == null) {
        submitError.value = 'No se pudo determinar la empresa actual.'
        return
      }
      if (data.roleId == null) {
        submitError.value = 'Selecciona un rol para el empleado.'
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
      await employeeRolesApi.create({ employeeId: created.id, roleId: data.roleId })
      await fetchAll()
      selectedId.value = created.id
    }
    formOpen.value = false
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'No se pudo guardar el empleado'
  } finally {
    busy.value = false
  }
}

function askDeactivate(employee: Employee) {
  deactivateTarget.value = employee
}

async function confirmDeactivate() {
  const target = deactivateTarget.value
  if (!target || busy.value) return
  busy.value = true
  try {
    await setStatus(target, 'INACTIVE')
    deactivateTarget.value = null
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'No se pudo desactivar al empleado'
  } finally {
    busy.value = false
  }
}

async function handleActivate(employee: Employee) {
  if (busy.value) return
  busy.value = true
  try {
    await setStatus(employee, 'ACTIVE')
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'No se pudo reactivar al empleado'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <div class="kicker">Administración · Equipo</div>
        <h1 class="title">Empleados</h1>
        <div class="lead">Gestiona el equipo de la clínica, sus roles y accesos.</div>
      </div>
      <button v-if="canCreate" type="button" class="cta" :disabled="busy" @click="openCreate">
        <Plus :size="16" :stroke-width="1.8" />
        Nuevo empleado
      </button>
    </div>

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
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}
.kicker {
  font-size: 12px;
  color: var(--warm-500);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 38px;
  line-height: 1.05;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
}
.lead {
  font-size: 14px;
  color: var(--warm-600);
  margin-top: 6px;
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
