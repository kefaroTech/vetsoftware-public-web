<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  FileText,
  FilePlus,
  History,
  Syringe,
  PawPrint,
  User,
  Calendar,
  Package,
  Receipt,
  BarChart3,
  Users,
} from 'lucide-vue-next'
import SidebarBrand from './SidebarBrand.vue'
import SidebarNavItem from './SidebarNavItem.vue'
import SidebarSubItem from './SidebarSubItem.vue'
import SidebarUserCard from './SidebarUserCard.vue'
import { mockUser } from '../../data/mock'
import { useNuevaConsultaDraft } from '../../views/consulta/nueva/composables/useNuevaConsultaDraft'
import { showResumeOrNewDialog } from '@/composables/useConsultaResumeGuard'

const route = useRoute()
const router = useRouter()
const draft = useNuevaConsultaDraft()

const consultaSubRoutes = [
  'consulta-nueva',
  'consulta-historial',
  'consulta-vacunacion',
  'consulta-hospital',
] as const

const isConsultaActive = computed(() =>
  consultaSubRoutes.some((name) => route.name === name),
)

const consultaOpen = ref(true)

const subItems = [
  { label: 'Historial clínico', icon: History, to: { name: 'consulta-historial' as const } },
  { label: 'Plan de vacunación', icon: Syringe, to: { name: 'consulta-vacunacion' as const } },
  { label: 'Hospitalización', icon: PawPrint, to: { name: 'consulta-hospital' as const } },
]

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
  { label: 'Agenda', icon: Calendar },
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
        :active="route.name === item.to.name"
      />
    </div>

    <div class="section-label">ADMINISTRACIÓN</div>
    <SidebarNavItem
      label="Empleados"
      :icon="Users"
      :active="route.name === 'empleados'"
      @click="router.push({ name: 'empleados' })"
    />

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
