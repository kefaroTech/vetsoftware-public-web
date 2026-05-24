<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="add" @click="$emit('click')">
    <div class="icon">
      <Plus :size="22" :stroke-width="1.5" />
    </div>
    <div class="title">Crear nuevo rol</div>
    <div class="subtitle">Define un nuevo perfil y asígnale los permisos que necesite.</div>
  </button>
</template>

<style scoped>
.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 256px;
  padding: 24px;
  background: transparent;
  border: 1.5px dashed var(--warm-300);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  text-align: center;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.add:hover {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}
.icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
}
.title {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-700);
}
.subtitle {
  font-size: 11.5px;
  color: var(--warm-500);
  max-width: 200px;
  line-height: 1.4;
}
</style>
