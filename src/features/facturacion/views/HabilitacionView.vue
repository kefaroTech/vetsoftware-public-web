<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import { useFacturacionEnablement } from '../composables/useFacturacionEnablement'
import StatusPanel from '../components/enablement/StatusPanel.vue'
import EnablementWizard from '../components/enablement/EnablementWizard.vue'
import RetencionesModal from '../components/enablement/RetencionesModal.vue'
import FeUpsell from '../components/FeUpsell.vue'

const { hasModule } = useFacturacionAccess()
const { reload, error } = useFacturacionEnablement()

const mode = ref<'panel' | 'wizard'>('panel')
const wizardStep = ref(1)
const retencionesOpen = ref(false)

onMounted(() => {
  // El error se refleja en el ref `error`; ignoramos el rechazo de la promesa.
  void reload().catch(() => undefined)
})

function openWizard(step: number) {
  wizardStep.value = step
  mode.value = 'wizard'
}
</script>

<template>
  <FeUpsell v-if="!hasModule" />
  <div v-else class="page">
    <header class="pagehead">
      <div>
        <div class="kicker">
          Facturación electrónica · DIAN <span class="premium">Premium</span>
        </div>
        <h1 class="ds-display fe-title">Facturación electrónica</h1>
      </div>
    </header>

    <p v-if="error" class="error-banner">{{ error }}</p>

    <EnablementWizard v-if="mode === 'wizard'" :initial-step="wizardStep" @exit="mode = 'panel'" />
    <StatusPanel v-else @open-wizard="openWizard" @open-retenciones="retencionesOpen = true" />

    <RetencionesModal :open="retencionesOpen" @close="retencionesOpen = false" />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.pagehead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  font-weight: 500;
}

.premium {
  text-transform: none;
  letter-spacing: 0;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  color: var(--amatista-700);
  background: var(--amatista-100);
}

.error-banner {
  margin: 0;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--danger-50);
  border: 1px solid var(--danger-250);
  color: oklch(45% 0.16 25deg);
  font-size: 13px;
}

/* El titular usa `.ds-display`; sólo conserva su separación superior. */
.fe-title {
  margin-top: var(--space-6);
}
</style>
