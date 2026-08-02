<script setup lang="ts">
import { History, ArrowRight } from 'lucide-vue-next'
</script>

<template>
  <RouterLink :to="{ name: 'consulta-historial' }" class="cta-secondary">
    <div class="header">
      <div class="icon-wrap">
        <History :size="18" :stroke-width="1.5" />
      </div>
      <div class="title">Historial clínico</div>
    </div>
    <p class="desc">
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
  display: flex;
  flex-direction: column;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
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
  box-shadow: 0 6px 18px -10px rgb(0 0 0 / 12%);
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--amatista-100);
  color: var(--amatista-700);
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

.desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--warm-600);
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
