<script setup lang="ts">
import { Search } from 'lucide-vue-next'

defineProps<{
  search: string
  selectedCount: number
  totalCount: number
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'expand-all': []
  'collapse-all': []
}>()
</script>

<template>
  <div class="toolbar">
    <div class="search ds-flex-row">
      <Search :size="14" :stroke-width="1.7" class="ds-icon-muted" />
      <input
        :value="search"
        type="text"
        class="search-input"
        placeholder="Buscar permiso o sub-módulo…"
        spellcheck="false"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <button type="button" class="ghost ds-hover-neutral" @click="emit('expand-all')">
      Expandir todo
    </button>
    <button type="button" class="ghost ds-hover-neutral" @click="emit('collapse-all')">
      Colapsar todo
    </button>
    <span class="bar" />
    <span class="counter ds-tone--accent"> {{ selectedCount }} de {{ totalCount }} permisos </span>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 26px;
  border-bottom: 1px solid var(--warm-200);
  background: var(--warm-50);
  position: sticky;
  top: 0;
  z-index: 1;
}

.search {
  flex: 1;
  padding: 6px 12px;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 7px;
  min-width: 180px;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
}

.search-input::placeholder {
  color: var(--warm-500);
}

/* El hover del fantasma es `.ds-hover-neutral` y el icono de búsqueda
   `.ds-icon-muted`. */
.ghost {
  background: transparent;
  border: 1px solid transparent;
  color: var(--warm-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: 7px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.bar {
  width: 1px;
  height: 22px;
  background: var(--warm-200);
}

.counter {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

@media (width <= 768px) {
  .toolbar {
    flex-wrap: wrap;
    padding: 10px 18px;
  }

  .search {
    flex-basis: 100%;
    order: -1;
  }

  .bar {
    display: none;
  }
}
</style>
