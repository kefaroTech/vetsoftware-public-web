<script setup lang="ts">
import { History, ArrowRight } from 'lucide-vue-next'
</script>

<template>
  <RouterLink :to="{ name: 'consulta-historial' }" class="cta-secondary ds-stack">
    <div class="header ds-flex-row ds-flex-row--12">
      <div class="icon-wrap ds-tone--accent">
        <History :size="18" :stroke-width="1.5" />
      </div>
      <div class="title">Historial clínico</div>
    </div>
    <p class="desc ds-meta-dark ds-meta-dark--sm">
      Busca consultas previas por paciente, dueño o fecha. Exporta resúmenes en PDF.
    </p>
    <div class="link">
      Abrir historial
      <ArrowRight :size="14" :stroke-width="1.5" />
    </div>
  </RouterLink>
</template>

<style scoped>
.cta-secondary {
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 16px;
  padding: 24px;
  color: inherit;
  text-decoration: none;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.cta-secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px -10px color-mix(in oklch, var(--warm-900) 12%, transparent);
}

/* Único añadido sobre `.ds-flex-row--12`: el hueco hacia la descripción. */
.header {
  margin-bottom: 12px;
}

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.title {
  font-size: 15px;
  font-weight: 500;
  color: var(--warm-900);
}

/* Residuo sobre `.ds-meta-dark` + `--sm` (warm-600 / 12,5px). */
.desc {
  margin: 0;
  line-height: 1.5;
  flex: 1;
}

.link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--amatista-700);
}
</style>
