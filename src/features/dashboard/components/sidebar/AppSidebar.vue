<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  Calendar,
  FilePlus,
  FileText,
  FlaskConical,
  Pill,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Truck,
  Users,
  Wallet,
} from 'lucide-vue-next'
import SidebarBrand from './SidebarBrand.vue'
import SidebarNavItem from './SidebarNavItem.vue'
import SidebarSubItem from './SidebarSubItem.vue'
import SidebarUserCard from './SidebarUserCard.vue'
import BranchSelector from '@/features/branches/components/BranchSelector.vue'
import { mockUser } from '../../data/mock'
import { useNuevaConsultaDraft } from '../../views/consulta/nueva/composables/useNuevaConsultaDraft'
import { showResumeOrNewDialog } from '@/composables/useConsultaResumeGuard'
import { useToast } from '@/composables/useToast'
import { useSidebarNav } from './useSidebarNav'

const route = useRoute()
const router = useRouter()
const draft = useNuevaConsultaDraft()

// Permisos, rutas activas y listas de entradas: ver useSidebarNav.ts
const {
  canCreateConsultation,
  canEmployees,
  canRoles,
  canEmpresa,
  canMedicaments,
  canLabProcess,
  canHospitalWard,
  canAccounts,
  canAgenda,
  feCanDocuments,
  feCanReports,
  feCanConfig,
  showFacturacionSection,
  isConsultaActive,
  isAccionesActive,
  isTiendaActive,
  isComprasActive,
  subItems,
  accionesItems,
  tiendaItems,
  comprasItems,
  showAccionesSection,
  showAdminSection,
  showTiendaMenu,
  showComprasSection,
  showTiendaSection,
} = useSidebarNav()

// Acordeón del sidebar: solo un desplegable abierto a la vez.
type SidebarSection = 'consulta' | 'acciones' | 'tienda' | 'compras'
const openSection = ref<SidebarSection | null>(null)
function toggleSection(section: SidebarSection) {
  openSection.value = openSection.value === section ? null : section
}

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

    <BranchSelector />

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
      <template v-if="showTiendaMenu">
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

      <template v-if="showComprasSection">
        <SidebarNavItem
          label="Compras"
          :icon="Truck"
          :active="isComprasActive"
          expandable
          :expanded="openSection === 'compras'"
          @click="toggleSection('compras')"
        />
        <div v-if="openSection === 'compras'" class="sub-list">
          <SidebarSubItem
            v-for="item in comprasItems"
            :key="item.label"
            :label="item.label"
            :icon="item.icon"
            :to="item.to"
            :active="route.name === item.to.name"
          />
        </div>
      </template>
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
        v-if="canEmpresa"
        label="Empresa"
        :icon="Building2"
        :active="route.name === 'empresa'"
        @click="router.push({ name: 'empresa' })"
      />
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
    oklch(28% 0.1 var(--hue)) 0%,
    oklch(22% 0.08 var(--hue)) 100%
  );
  color: oklch(94% 0.02 var(--hue));
  font-family: var(--font-sans);
  overflow: hidden auto;
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
  color: oklch(88% 0.03 var(--hue) / 82%);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}

.notif-item:hover {
  background: oklch(70% 0.04 var(--hue) / 10%);
}

.notif-label {
  flex: 1;
}

.notif-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--radius-pill);
  background: oklch(58% 0.2 25deg);
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
  color: oklch(75% 0.04 var(--hue) / 55%);
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
  color: oklch(82% 0.04 var(--hue) / 72%);
  background: transparent;
  border: none;
  font-weight: 400;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}

.sub-item-btn:hover:not(.active) {
  background: oklch(70% 0.04 var(--hue) / 8%);
}

.sub-item-btn.active {
  background: oklch(50% 0.1 var(--hue) / 25%);
  color: oklch(95% 0.02 var(--hue));
  font-weight: 500;
}

@media (width <= 1024px) {
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
    background: oklch(75% 0.04 var(--hue) / 18%);
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
