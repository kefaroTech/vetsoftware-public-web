<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

/**
 * Aviso de «vas a agendar en una sede distinta a la del menú». Sustituye al cuerpo
 * del modal mientras está en pie; los botones «Volver» / «Sí, agendar en esta
 * sede» siguen en el pie de `AppointmentFormModal`, que es quien decide.
 */
defineProps<{
  /** Sede elegida en el formulario. */
  branchName: string
  /** Sede por defecto (la del menú principal). */
  defaultBranchName: string
}>()
</script>

<template>
  <div class="branch-confirm">
    <AlertTriangle :size="22" :stroke-width="1.7" class="bc-ic" />
    <div>
      <p class="bc-title">Sede distinta a la del menú</p>
      <p class="bc-text">
        Vas a agendar esta cita en <b>{{ branchName }}</b
        >, que es <b>diferente</b> a la sede por defecto (<b>{{ defaultBranchName }}</b
        >). ¿Seguro que quieres agendar en esa sede?
      </p>
    </div>
  </div>
</template>

<style scoped>
.branch-confirm {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 11px;
  background: oklch(96% 0.05 80deg);
  border: 1px solid var(--warning-200);
}

.bc-ic {
  flex-shrink: 0;
  color: oklch(55% 0.14 60deg);
  margin-top: 2px;
}

.bc-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: oklch(38% 0.13 60deg);
}

.bc-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--warm-700);
}

.bc-text b {
  font-weight: 600;
}
</style>
