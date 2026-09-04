<script setup lang="ts" generic="T extends { savedId?: number }">
import { computed } from 'vue'
import { Pencil, X } from 'lucide-vue-next'
import { rowUidOf } from '@/composables/rowUid'

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

/**
 * Los dos predicados que alimentan el atributo `disabled` nativo. Se nombran
 * porque `.ds-is-disabled` se aplica con `:class` (no se deriva del atributo),
 * así que la condición tiene que estar disponible en el template.
 */
function editDisabled(idx: number): boolean {
  return props.editingIndex !== null && props.editingIndex !== idx
}
const removeDisabled = computed(() => props.editingIndex !== null)

function disabledClass(disabled: boolean): string | undefined {
  return disabled ? 'ds-is-disabled ds-is-disabled--40' : undefined
}

/**
 * VUE-08: clave estable por fila, no el índice.
 *
 * Estas listas se editan y se borran por el medio (`@remove` manda el índice al
 * borrador, que hace `splice`). Con el índice como clave, al quitar la fila 2 la
 * 3 pasa a ser la «2» y hereda su nodo: se queda con el `<slot>` renderizado de
 * la que se acaba de eliminar, así que la lista muestra un elemento que ya no
 * está y esconde otro que sí. El `as object` es solo para el compilador: la
 * restricción del genérico ya garantiza que cada fila es un objeto.
 */
function keyOf(item: T): number {
  return rowUidOf(item as object)
}
</script>

<template>
  <section v-if="props.items.length > 0 && props.editingIndex === null" class="existing-section">
    <h4 class="existing-title">{{ props.title }} ({{ props.items.length }})</h4>
    <ul class="ds-list-reset ds-stack ds-stack--8">
      <li
        v-for="(item, idx) in props.items"
        :key="keyOf(item)"
        class="existing-card ds-flex-row ds-flex-row--12"
      >
        <div class="ds-flex-fill">
          <div class="existing-main ds-truncate ds-text-strong">
            <slot name="main" :item="item" />
          </div>
          <div class="existing-sub ds-truncate ds-meta-dark"><slot name="sub" :item="item" /></div>
        </div>
        <span v-if="item.savedId" class="saved-chip">✓ Guardado</span>
        <template v-else>
          <button
            type="button"
            class="edit-existing"
            :class="[{ active: props.editingIndex === idx }, disabledClass(editDisabled(idx))]"
            :aria-label="`Editar ${props.noun}`"
            :disabled="editDisabled(idx)"
            @click="emit('edit', idx)"
          >
            <Pencil :size="14" :stroke-width="1.7" />
          </button>
          <button
            type="button"
            class="remove-existing"
            :class="disabledClass(removeDisabled)"
            :aria-label="`Eliminar ${props.noun}`"
            :disabled="removeDisabled"
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

.existing-card {
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}

/* El recorte lo pone `.ds-truncate` y el par color+peso `.ds-text-strong`. */
.existing-main {
  font-size: 14.5px;
  line-height: 1.4;
}

/* Residuo sobre `.ds-meta-dark` (warm-600 / 13px). */
.existing-sub {
  margin-top: 4px;
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
  border: 1px solid var(--warm-450);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--warm-600);
  flex-shrink: 0;
}

/* `cursor` NO va en la regla base: con el atributo de scope ésta pesa (0,2,0) y
   le ganaría al `cursor: not-allowed` de `.ds-is-disabled` (0,1,0). Acotarla al
   estado habilitado deja el estado apagado enteramente en manos de la
   primitiva, que es el contrato que pide `primitives.css`. */
.edit-existing:not(:disabled),
.remove-existing:not(:disabled) {
  cursor: pointer;
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
  border-color: var(--danger-border);
  color: oklch(35% 0.15 25deg);
}
</style>
