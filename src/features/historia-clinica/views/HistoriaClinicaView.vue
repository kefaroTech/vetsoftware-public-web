<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BreadcrumbStep from '../components/BreadcrumbStep.vue'
import { useHistoriaSelection } from '../composables/useHistoriaSelection'

const route = useRoute()
const router = useRouter()
const { state } = useHistoriaSelection()

const step = computed<1 | 2 | 3>(() => {
  if (route.name === 'consulta-historial-detail') return 3
  if (route.name === 'consulta-historial-pet') return 2
  return 1
})

function jumpTo(target: 1 | 2) {
  if (target === 1) {
    router.push({ name: 'consulta-historial' })
    return
  }
  if (target === 2 && state.owner) {
    router.push({
      name: 'consulta-historial-pet',
      params: { ownerId: state.owner.id },
    })
  }
}
</script>

<template>
  <div class="historia-shell ds-stack">
    <header class="crumbs ds-flex-row">
      <BreadcrumbStep
        :index="1"
        label="Propietario"
        :active="step === 1"
        :done="step > 1"
        :value="state.owner?.name ?? null"
        @click="jumpTo(1)"
      />
      <span class="sep">›</span>
      <BreadcrumbStep
        :index="2"
        label="Mascota"
        :active="step === 2"
        :done="step > 2"
        :disabled="!state.owner"
        :value="state.pet?.name ?? null"
        @click="jumpTo(2)"
      />
      <span class="sep">›</span>
      <BreadcrumbStep
        :index="3"
        label="Historia clínica"
        :active="step === 3"
        :done="false"
        :disabled="!state.pet"
      />
    </header>
    <RouterView />
  </div>
</template>

<style scoped>
.historia-shell {
  flex: 1;
  min-height: 0;
  background: var(--warm-100);
}

.crumbs {
  height: 56px;
  padding: 0 var(--space-28);
  border-bottom: 1px solid var(--warm-200);
  background: var(--warm-50);
  flex-shrink: 0;
}

.sep {
  color: var(--warm-300);
  font-size: 11px;
}
</style>
