<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="add ds-stack ds-stack--10 ds-tone--accent-outline"
    @click="$emit('click')"
  >
    <div class="icon ds-tone--accent">
      <Plus :size="22" :stroke-width="1.6" />
    </div>
    <div class="ds-item-label ds-item-label--lg">Crear rol</div>
    <div class="subtitle ds-meta">Define un rol personalizado para tu equipo.</div>
  </button>
</template>

<style scoped>
.add {
  align-items: center;
  justify-content: center;
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

/* El estado `:hover` lo pinta `.ds-tone--accent-outline:hover:not(:disabled)`
   (primitives.css) — aplicada desde el marcado, ver arriba. */

/* El tono es `.ds-tone--accent`. */
.icon {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  display: grid;
  place-items: center;
}

.subtitle {
  max-width: 200px;
  line-height: 1.45;
}
</style>
