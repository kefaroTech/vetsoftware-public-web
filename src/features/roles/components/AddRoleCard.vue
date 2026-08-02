<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="add" @click="$emit('click')">
    <div class="icon">
      <Plus :size="22" :stroke-width="1.6" />
    </div>
    <div class="title">Crear rol</div>
    <div class="subtitle">Define un rol personalizado para tu equipo.</div>
  </button>
</template>

<style scoped>
.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 230px;
  padding: 22px 18px;
  background: transparent;
  border: 1.5px dashed var(--warm-300);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  color: var(--warm-600);
  text-align: center;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.add:hover {
  border-color: var(--amatista-500);
  background: var(--amatista-50);
}

.icon {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
}

.title {
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
}

.subtitle {
  font-size: 12px;
  color: var(--warm-500);
  max-width: 200px;
  line-height: 1.45;
}
</style>
