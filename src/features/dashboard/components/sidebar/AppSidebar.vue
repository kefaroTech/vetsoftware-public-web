<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  FileText,
  FilePlus,
  History,
  Syringe,
  Calendar,
  Package,
  BarChart3,
  Bell,
  Users,
  ShieldCheck,
  Stethoscope,
  Beaker,
  FlaskConical,
  ScanLine,
  BedDouble,
  Bug,
  Scissors,
  Sparkles,
  BadgePercent,
  ShoppingBag,
  Wallet,
  Pill,
} from 'lucide-vue-next'
import SidebarBrand from './SidebarBrand.vue'
import SidebarNavItem from './SidebarNavItem.vue'
import SidebarSubItem from './SidebarSubItem.vue'
import SidebarUserCard from './SidebarUserCard.vue'
import { mockUser } from '../../data/mock'
import { useNuevaConsultaDraft } from '../../views/consulta/nueva/composables/useNuevaConsultaDraft'
import { showResumeOrNewDialog } from '@/composables/useConsultaResumeGuard'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useFacturacionAccess } from '@/features/facturacion/composables/useFacturacionAccess'
import { useToast } from '@/composables/useToast'
import { PERMISSIONS } from '@/constants/permissions'

const route = useRoute()
const router = useRouter()
const draft = useNuevaConsultaDraft()
const { can } = useAuthorization()

const consultaSubRoutes = [
  'consulta-nueva',
  'consulta-historial',
  'consulta-historial-pet',
  'consulta-historial-detail',
  'consulta-vacunacion',
  'consulta-hospital',
] as const

const isConsultaActive = computed(() =>
  consultaSubRoutes.some((name) => route.name === name),
)

// Acordeón del sidebar: solo un desplegable abierto a la vez.
type SidebarSection = 'consulta' | 'acciones' | 'tienda'
const openSection = ref<SidebarSection | null>(null)
function toggleSection(section: SidebarSection) {
  openSection.value = openSection.value === section ? null : section
}

const canCreateConsultation = can(PERMISSIONS.CONSULTATION_CREATE)
const canVaccination = can(PERMISSIONS.VACCINATION_CREATE)
const canHospital = can(PERMISSIONS.HOSPITALIZATION_CREATE)
const canLabTest = can(PERMISSIONS.LABORATORY_TEST_CREATE)
const canImaging = can(PERMISSIONS.DIAGNOSTIC_IMAGING_CREATE)
const canDeworming = can(PERMISSIONS.DEWORMING_CREATE)
const canSurgery = can(PERMISSIONS.SURGERY_CREATE)
const canSpa = can(PERMISSIONS.SPA_CREATE)
const canEmployees = can(PERMISSIONS.EMPLOYEE_READ)
const canRoles = can(PERMISSIONS.ROLE_PERMISSIONS_READ)
const canMedicaments = can(PERMISSIONS.PRESCRIPTION_CREATE)
const canLabProcess = can(PERMISSIONS.LABORATORY_TEST_READ)
const canHospitalWard = can(PERMISSIONS.HOSPITALIZATION_READ)
const canInventory = can(PERMISSIONS.PRODUCT_READ)
const canServices = can(PERMISSIONS.SERVICE_READ)
const canPromotions = can(PERMISSIONS.PROMOTION_READ)
const canTaxes = can(PERMISSIONS.TAX_READ)
const canAccounts = can(PERMISSIONS.OPEN_ACCOUNT_READ)
const canAgenda = can(PERMISSIONS.APPOINTMENT_READ)

// Facturación electrónica (DIAN) — gateada por permisos FE.
const {
  hasModule: feHasModule,
  canDocuments: feCanDocuments,
  canReports: feCanReports,
  canConfig: feCanConfig,
} = useFacturacionAccess()
const showFacturacionSection = computed(() => canAccounts.value || feHasModule.value)

const historialActiveRoutes = [
  'consulta-historial',
  'consulta-historial-pet',
  'consulta-historial-detail',
]

const subItems = computed(() => [
  {
    label: 'Historial clínico',
    icon: History,
    to: { name: 'consulta-historial' as const },
    activeRoutes: historialActiveRoutes,
    show: true,
  },
].filter((item) => item.show))

const accionesSubRoutes = [
  'acciones-laboratorio',
  'acciones-imagen',
  'acciones-vacunacion',
  'acciones-hospitalizacion',
  'acciones-desparasitacion',
  'acciones-cirugia',
  'acciones-spa',
] as const

const isAccionesActive = computed(() =>
  accionesSubRoutes.some((name) => route.name === name),
)

const accionesItems = computed(() => [
  { label: 'Laboratorio', icon: Beaker, to: { name: 'acciones-laboratorio' as const }, show: canLabTest.value },
  { label: 'Imagen diagnóstica', icon: ScanLine, to: { name: 'acciones-imagen' as const }, show: canImaging.value },
  { label: 'Vacunación', icon: Syringe, to: { name: 'acciones-vacunacion' as const }, show: canVaccination.value },
  { label: 'Hospitalización', icon: BedDouble, to: { name: 'acciones-hospitalizacion' as const }, show: canHospital.value },
  { label: 'Desparasitación', icon: Bug, to: { name: 'acciones-desparasitacion' as const }, show: canDeworming.value },
  { label: 'Cirugía', icon: Scissors, to: { name: 'acciones-cirugia' as const }, show: canSurgery.value },
  { label: 'Spa', icon: Sparkles, to: { name: 'acciones-spa' as const }, show: canSpa.value },
].filter((item) => item.show))

const showAccionesSection = computed(() => accionesItems.value.length > 0)
const showAdminSection = computed(() => canEmployees.value || canRoles.value || canMedicaments.value)

const tiendaSubRoutes = [
  'tienda-pos',
  'tienda-inventario',
  'tienda-servicios',
  'tienda-promociones',
  'tienda-impuestos',
] as const

const isTiendaActive = computed(() =>
  tiendaSubRoutes.some((name) => route.name === name),
)

const tiendaItems = computed(() => [
  { label: 'Punto de venta', icon: ShoppingBag, to: { name: 'tienda-pos' as const }, show: canInventory.value },
  { label: 'Inventario', icon: Package, to: { name: 'tienda-inventario' as const }, show: canInventory.value },
  { label: 'Servicios', icon: Stethoscope, to: { name: 'tienda-servicios' as const }, show: canServices.value },
  { label: 'Promociones', icon: BadgePercent, to: { name: 'tienda-promociones' as const }, show: canPromotions.value },
  { label: 'Impuestos', icon: BarChart3, to: { name: 'tienda-impuestos' as const }, show: canTaxes.value },
].filter((item) => item.show))

const showTiendaSection = computed(() => tiendaItems.value.length > 0)

function goNuevaConsulta() {
  if (draft.state.owner) {
    showResumeOrNewDialog({
      ownerName: draft.state.owner.name,
      petName: draft.state.pet?.name,
      step: draft.state.step,
      onContinue: () =>
        router.push({
          name: 'consulta-nueva',
          query: { paso: String(draft.state.step) },
        }),
      onCreateNew: () => {
        draft.reset()
        router.push({ name: 'consulta-nueva', query: { paso: '1' } })
      },
    })
    return
  }
  router.push({ name: 'consulta-nueva' })
}

const toast = useToast()
const notificationCount = ref(0)

function onNotifications() {
  toast.info('Notificaciones', 'No tienes notificaciones nuevas.')
}
</script>

<template>
  <aside class="sidebar">
    <SidebarBrand app-name="Vetrina" :clinic="mockUser.clinic" />

    <div class="section-label">TRABAJO</div>
    <SidebarNavItem
      v-if="canAgenda"
      label="Agenda"
      :icon="Calendar"
      :active="route.name === 'agenda'"
      @click="router.push({ name: 'agenda' })"
    />

    <SidebarNavItem
      label="Consulta"
      :icon="FileText"
      :active="isConsultaActive"
      expandable
      :expanded="openSection === 'consulta'"
      @click="toggleSection('consulta')"
    />
    <div v-if="openSection === 'consulta'" class="sub-list">
      <button
        v-if="canCreateConsultation"
        type="button"
        class="sub-item-btn"
        :class="{ active: route.name === 'consulta-nueva' }"
        @click="goNuevaConsulta"
      >
        <FilePlus :size="14" :stroke-width="1.5" />
        <span>Nueva consulta</span>
      </button>
      <SidebarSubItem
        v-for="item in subItems"
        :key="item.label"
        :label="item.label"
        :icon="item.icon"
        :to="item.to"
        :active="item.activeRoutes.includes(String(route.name))"
      />
    </div>

    <template v-if="showAccionesSection">
      <div class="section-label">ACCIONES CLÍNICAS</div>
      <SidebarNavItem
        label="Procedimientos"
        :icon="Stethoscope"
        :active="isAccionesActive"
        expandable
        :expanded="openSection === 'acciones'"
        @click="toggleSection('acciones')"
      />
      <div v-if="openSection === 'acciones'" class="sub-list">
        <SidebarSubItem
          v-for="item in accionesItems"
          :key="item.label"
          :label="item.label"
          :icon="item.icon"
          :to="item.to"
          :active="route.name === item.to.name"
        />
      </div>
    </template>

    <template v-if="canLabProcess">
      <div class="section-label">LABORATORIO</div>
      <SidebarNavItem
        label="Bandeja de muestras"
        :icon="FlaskConical"
        :active="route.name === 'laboratorio-interno'"
        @click="router.push({ name: 'laboratorio-interno' })"
      />
    </template>

    <template v-if="canHospitalWard">
      <div class="section-label">HOSPITALIZACIÓN</div>
      <SidebarNavItem
        label="Pacientes internados"
        :icon="BedDouble"
        :active="route.name === 'hospital-ward'"
        @click="router.push({ name: 'hospital-ward' })"
      />
    </template>

    <template v-if="showTiendaSection">
      <div class="section-label">TIENDA</div>
      <SidebarNavItem
        label="Tienda"
        :icon="ShoppingBag"
        :active="isTiendaActive"
        expandable
        :expanded="openSection === 'tienda'"
        @click="toggleSection('tienda')"
      />
      <div v-if="openSection === 'tienda'" class="sub-list">
        <SidebarSubItem
          v-for="item in tiendaItems"
          :key="item.label"
          :label="item.label"
          :icon="item.icon"
          :to="item.to"
          :active="route.name === item.to.name"
        />
      </div>
    </template>

    <template v-if="showFacturacionSection">
      <div class="section-label">FACTURACIÓN</div>
      <SidebarNavItem
        v-if="canAccounts"
        label="Cuentas abiertas"
        :icon="Wallet"
        :active="route.name === 'cuentas'"
        @click="router.push({ name: 'cuentas' })"
      />
      <SidebarNavItem
        v-if="feCanConfig"
        label="Facturación electrónica"
        :icon="ShieldCheck"
        :active="route.name === 'facturacion-habilitacion'"
        @click="router.push({ name: 'facturacion-habilitacion' })"
      />
      <SidebarNavItem
        v-if="feCanDocuments"
        label="Documentos"
        :icon="FileText"
        :active="route.name === 'facturacion-documentos'"
        @click="router.push({ name: 'facturacion-documentos' })"
      />
      <SidebarNavItem
        v-if="feCanReports"
        label="Reportes"
        :icon="BarChart3"
        :active="route.name === 'facturacion-reportes'"
        @click="router.push({ name: 'facturacion-reportes' })"
      />
    </template>

    <template v-if="showAdminSection">
      <div class="section-label">ADMINISTRACIÓN</div>
      <SidebarNavItem
        v-if="canEmployees"
        label="Empleados"
        :icon="Users"
        :active="route.name === 'empleados'"
        @click="router.push({ name: 'empleados' })"
      />
      <SidebarNavItem
        v-if="canRoles"
        label="Roles y permisos"
        :icon="ShieldCheck"
        :active="route.name === 'roles'"
        @click="router.push({ name: 'roles' })"
      />
      <SidebarNavItem
        v-if="canMedicaments"
        label="Medicamentos"
        :icon="Pill"
        :active="route.name === 'medicamentos'"
        @click="router.push({ name: 'medicamentos' })"
      />
    </template>

    <div class="spacer" />

    <button type="button" class="notif-item" @click="onNotifications">
      <Bell :size="17" :stroke-width="1.6" />
      <span class="notif-label">Notificaciones</span>
      <span v-if="notificationCount > 0" class="notif-badge">{{ notificationCount }}</span>
    </button>

    <SidebarUserCard
      :first-name="mockUser.firstName"
      :last-name="mockUser.lastName"
      :role="mockUser.role"
    />
  </aside>
</template>

<style scoped>
.sidebar {
  width: 248px;
  height: 100vh;
  flex-shrink: 0;
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: linear-gradient(
    180deg,
    oklch(28% 0.10 var(--hue)) 0%,
    oklch(22% 0.08 var(--hue)) 100%
  );
  color: oklch(94% 0.02 var(--hue));
  font-family: var(--font-sans);
  overflow-y: auto;
  overflow-x: hidden;
}
.spacer {
  margin-top: auto;
}
.notif-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  margin-bottom: 4px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: oklch(88% 0.03 var(--hue) / 0.82);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}
.notif-item:hover {
  background: oklch(70% 0.04 var(--hue) / 0.1);
}
.notif-label {
  flex: 1;
}
.notif-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: oklch(58% 0.2 25);
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
}
.section-label {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(75% 0.04 var(--hue) / 0.55);
  padding: 10px 10px 5px;
  font-weight: 500;
}
.sub-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 28px;
  margin-top: 2px;
}
.sub-item-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 3px 10px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12.5px;
  color: oklch(82% 0.04 var(--hue) / 0.72);
  background: transparent;
  border: none;
  font-weight: 400;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}
.sub-item-btn:hover:not(.active) {
  background: oklch(70% 0.04 var(--hue) / 0.08);
}
.sub-item-btn.active {
  background: oklch(50% 0.10 var(--hue) / 0.25);
  color: oklch(95% 0.02 var(--hue));
  font-weight: 500;
}

@media (max-width: 1024px) {
  .sidebar {
    width: 72px;
    padding: 18px 10px;
    align-items: center;
  }

  .section-label {
    width: 32px;
    height: 1px;
    margin: 8px 0;
    padding: 0;
    overflow: hidden;
    background: oklch(75% 0.04 var(--hue) / 0.18);
    color: transparent;
    font-size: 0;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .sub-list {
    align-items: center;
    padding-left: 0;
    margin: 3px 0 0;
  }

  .sub-item-btn,
  .notif-item {
    width: 44px;
    height: 38px;
    justify-content: center;
    padding: 0;
    gap: 0;
  }

  .sub-item-btn span,
  .notif-label,
  .notif-badge {
    display: none;
  }
}
</style>
