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
  <div v-else class="page ds-stack">
    <header class="pagehead">
      <div>
        <div class="ds-kicker ds-flex-row">
          Facturación electrónica · DIAN <span class="premium ds-tone--accent">Premium</span>
        </div>
        <h1 class="ds-display fe-title">Facturación electrónica</h1>
      </div>
    </header>

    <div v-if="error" class="ds-banner ds-banner--error" role="alert">{{ error }}</div>

    <EnablementWizard v-if="mode === 'wizard'" :initial-step="wizardStep" @exit="mode = 'panel'" />
    <StatusPanel v-else @open-wizard="openWizard" @open-retenciones="retencionesOpen = true" />

    <RetencionesModal :open="retencionesOpen" @close="retencionesOpen = false" />
  </div>
</template>

<style scoped>
/* El layout se apoya en primitivas: `.ds-stack` (columna de la página),
   `.ds-kicker` + `.ds-flex-row` (rótulo con la píldora Premium) y
   `.ds-display` (titular). Aquí sólo queda lo que no es primitiva. */

/* `gap: 22px` no está en el catálogo de `.ds-stack--*`, así que queda aquí. */
.page {
  gap: 22px;
}

.pagehead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.premium {
  text-transform: none;
  letter-spacing: 0;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

/* El titular usa `.ds-display`; sólo conserva su separación superior. */
.fe-title {
  margin-top: var(--space-6);
}
</style>
