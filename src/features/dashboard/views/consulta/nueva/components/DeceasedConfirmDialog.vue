<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'

defineProps<{ open: boolean; petName: string }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" role="alertdialog" aria-modal="true">
      <div class="card">
        <div class="icon">
          <TriangleAlert :size="22" :stroke-width="1.8" />
        </div>
        <h2 class="title">¿Crear consulta para una mascota fallecida?</h2>
        <p class="desc">
          {{ petName }} aparece marcada como fallecida. Esta consulta quedará registrada como
          necropsia o registro post-mortem.
        </p>
        <div class="actions">
          <button type="button" class="btn ghost" @click="$emit('cancel')">Cancelar</button>
          <button type="button" class="btn primary" @click="$emit('confirm')">Continuar</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(30 20 50 / 45%);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  z-index: 100;
}

.card {
  width: 440px;
  max-width: calc(100vw - 32px);
  background: var(--warm-50);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 20px 60px rgb(40 20 80 / 30%);
  font-family: var(--font-sans);
}

.icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: oklch(94% 0.05 80deg);
  color: oklch(40% 0.12 80deg);
  display: grid;
  place-items: center;
  margin-bottom: 14px;
}

.title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 500;
  color: var(--warm-900);
  letter-spacing: -0.01em;
}

.desc {
  margin: 0 0 22px;
  font-size: 13.5px;
  color: var(--warm-600);
  line-height: 1.55;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn.ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-900);
}

.btn.ghost:hover {
  background: var(--warm-100);
}

.btn.primary {
  background: var(--amatista-700);
  color: white;
}

.btn.primary:hover {
  filter: brightness(1.05);
}
</style>
