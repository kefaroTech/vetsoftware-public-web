<script setup lang="ts" generic="T extends string">
/**
 * Conmutador segmentado de dos posiciones (Activos/Pausados, Lotes/Movimientos,
 * Entrada/Salida). Estaba copiado en cinco archivos con el mismo marcado y el
 * mismo cuerpo CSS; solo cambiaba el padding horizontal del botón.
 *
 * `NoInfer` en `options` ata el genérico al `modelValue`: así el `@update` sigue
 * devolviendo la unión del padre (`'active' | 'paused'`) y no `string`.
 */
withDefaults(
  defineProps<{
    modelValue: T
    options: readonly { value: NoInfer<T>; label: string }[]
    /** `sm` = 6/12 (cabeceras de vista); `md` = 6/14 (modales). */
    size?: 'sm' | 'md'
  }>(),
  { size: 'sm' },
)

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div class="seg" :class="`seg--${size}`" role="tablist">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :class="{ on: modelValue === o.value }"
      @click="emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
/* La raíz conserva el `data-v` del padre: los `@media` que ensanchan el
   conmutador y el `margin`/`align-self` de cada anfitrión siguen viviendo allí. */
.seg {
  display: inline-flex;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 2px;
}
.seg button {
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--warm-600);
  border-radius: 7px;
  cursor: pointer;
}
.seg--sm button {
  padding: 6px 12px;
}
.seg--md button {
  padding: 6px 14px;
}
.seg button.on {
  background: var(--warm-50);
  color: var(--amatista-700);
  box-shadow: var(--shadow-xs);
}
</style>
