<script setup lang="ts" generic="T extends { savedId?: number }">
import { Pencil, X } from 'lucide-vue-next'

/**
 * La lista de «ya agregadas» de los siete modales de acciones clínicas.
 *
 * Los siete la tenían copiada entera —mismo marcado y las mismas once reglas
 * de CSS, byte a byte— y solo cambiaban tres cosas: el título, el sustantivo de
 * las etiquetas accesibles y qué se pinta en las dos líneas de cada fila. Eso es
 * lo que aquí son props y slots; el resto deja de existir siete veces.
 *
 * Los `disabled` y el modificador `active` se conservan tal cual estaban. Hoy
 * son inertes, porque el `v-if` de la sección ya exige `editingIndex === null`
 * y bajo esa condición ninguna de las tres expresiones puede ser cierta. Se
 * mantienen porque describen la intención del componente —no se edita una fila
 * mientras hay otra en edición— y porque quitarlas habría cambiado el
 * comportamiento en una extracción que debía ser equivalente.
 */
const props = defineProps<{
  items: readonly T[]
  /** Encabezado sin el contador: «Ya agregadas», «Ya solicitados», «Ya aplicadas»… */
  title: string
  /** Sustantivo para las etiquetas accesibles: «Editar {noun}», «Eliminar {noun}». */
  noun: string
  editingIndex: number | null
}>()

const emit = defineEmits<{ edit: [number]; remove: [number] }>()
</script>

<template>
  <section v-if="props.items.length > 0 && props.editingIndex === null" class="existing-section">
    <h4 class="existing-title">{{ props.title }} ({{ props.items.length }})</h4>
    <ul class="existing-list">
      <li v-for="(item, idx) in props.items" :key="idx" class="existing-card">
        <div class="existing-summary">
          <div class="existing-main"><slot name="main" :item="item" /></div>
          <div class="existing-sub"><slot name="sub" :item="item" /></div>
        </div>
        <span v-if="item.savedId" class="saved-chip">✓ Guardado</span>
        <template v-else>
          <button
            type="button"
            class="edit-existing"
            :class="{ active: props.editingIndex === idx }"
            :aria-label="`Editar ${props.noun}`"
            :disabled="props.editingIndex !== null && props.editingIndex !== idx"
            @click="emit('edit', idx)"
          >
            <Pencil :size="14" :stroke-width="1.7" />
          </button>
          <button
            type="button"
            class="remove-existing"
            :aria-label="`Eliminar ${props.noun}`"
            :disabled="props.editingIndex !== null"
            @click="emit('remove', idx)"
          >
            <X :size="14" :stroke-width="1.7" />
          </button>
        </template>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.existing-section {
  margin-bottom: 22px;
  padding: 14px 16px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-200);
  border-radius: 12px;
}

.existing-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--amatista-700);
  margin: 0 0 10px;
}

.existing-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.existing-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}

.existing-summary {
  min-width: 0;
  flex: 1;
}

.existing-main {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--warm-900);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.existing-sub {
  font-size: 13px;
  color: var(--warm-600);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.saved-chip {
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--success-50);
  color: oklch(40% 0.15 150deg);
  border: 1px solid oklch(85% 0.1 150deg);
  white-space: nowrap;
}

.edit-existing,
.remove-existing {
  background: transparent;
  border: 1px solid var(--warm-200);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-600);
  flex-shrink: 0;
}

.edit-existing:hover:not(:disabled) {
  background: var(--amatista-50);
  border-color: var(--amatista-500);
  color: var(--amatista-700);
}

.edit-existing.active {
  background: var(--amatista-700);
  border-color: var(--amatista-700);
  color: white;
}

.remove-existing:hover:not(:disabled) {
  background: var(--danger-150);
  border-color: var(--danger-300);
  color: oklch(35% 0.15 25deg);
}

.edit-existing:disabled,
.remove-existing:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
