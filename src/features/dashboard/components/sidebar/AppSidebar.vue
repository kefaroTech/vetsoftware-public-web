<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  FileText,
  FilePlus,
  History,
  Syringe,
  User,
  Calendar,
  Package,
  Receipt,
  BarChart3,
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
} from 'lucide-vue-next'
import SidebarBrand from './SidebarBrand.vue'
import SidebarNavItem from './SidebarNavItem.vue'
import SidebarSubItem from './SidebarSubItem.vue'
import SidebarUserCard from './SidebarUserCard.vue'
import { mockUser } from '../../data/mock'
import { useNuevaConsultaDraft } from '../../views/consulta/nueva/composables/useNuevaConsultaDraft'
import { showResumeOrNewDialog } from '@/composables/useConsultaResumeGuard'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
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

const consultaOpen = ref(false)
const accionesOpen = ref(false)

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
const canLabProcess = can(PERMISSIONS.LABORATORY_TEST_READ)
const canHospitalWard = can(PERMISSIONS.HOSPITALIZATION_READ)

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
const showAdminSection = computed(() => canEmployees.value || canRoles.value)

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

const upcomingItems = [
  { label: 'Pacientes', icon: User },
  { label: 'Inventario', icon: Package },
  { label: 'Facturación', icon: Receipt },
  { label: 'Reportes', icon: BarChart3 },
]
</script>

<template>
  <aside class="sidebar">
    <SidebarBrand app-name="Vetrina" :clinic="mockUser.clinic" />

    <div class="section-label">TRABAJO</div>
    <SidebarNavItem
      label="Consulta"
      :icon="FileText"
      :active="isConsultaActive"
      expandable
      :expanded="consultaOpen"
      @click="consultaOpen = !consultaOpen"
    />
    <div v-if="consultaOpen" class="sub-list">
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

    <SidebarNavItem
      label="Agenda"
      :icon="Calendar"
      :active="route.name === 'agenda'"
      @click="router.push({ name: 'agenda' })"
    />

    <template v-if="showAccionesSection">
      <div class="section-label">ACCIONES CLÍNICAS</div>
      <SidebarNavItem
        label="Procedimientos"
        :icon="Stethoscope"
        :active="isAccionesActive"
        expandable
        :expanded="accionesOpen"
        @click="accionesOpen = !accionesOpen"
      />
      <div v-if="accionesOpen" class="sub-list">
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
    </template>

    <div class="section-label">PRÓXIMAMENTE</div>
    <SidebarNavItem
      v-for="item in upcomingItems"
      :key="item.label"
      :label="item.label"
      :icon="item.icon"
      disabled
      badge="Pronto"
    />

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
  gap: 2px;
  background: linear-gradient(
    180deg,
    oklch(28% 0.10 var(--hue)) 0%,
    oklch(22% 0.08 var(--hue)) 100%
  );
  color: oklch(94% 0.02 var(--hue));
  font-family: var(--font-sans);
  overflow: hidden;
}
.section-label {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(75% 0.04 var(--hue) / 0.55);
  padding: 14px 10px 8px;
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
  padding: 7px 10px;
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
</style>
