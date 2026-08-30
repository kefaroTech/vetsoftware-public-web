<script setup lang="ts">
import type { LineaRetirada } from '../stores/propuesta.store'

/**
 * «No volvimos a añadir lo que quitaste».
 *
 * <p>Es la contrapartida visible de la regla de soberanía, y sin ella la regla
 * sería invisible: el usuario quitó Facturación electrónica, escribió «también
 * hacemos peluquería», y la propuesta volvió **sin** facturación. Perfecto — pero
 * si nada lo dice, el usuario no sabe si le hicimos caso o si se nos olvidó, y
 * en la duda vuelve a mirar las ocho líneas una por una.
 *
 * <p>Va con `ds-banner` **neutro**: ni advertencia ni error. No ha pasado nada
 * malo; al contrario, ha pasado exactamente lo que el usuario pidió.
 *
 * <p>Y es reversible en la dirección barata: «Añadir de nuevo» es un clic.
 * «Darse cuenta de que volvió a colarse» no tiene coste, tiene consecuencia.
 */
defineProps<{ retirados: LineaRetirada[] }>()

defineEmits<{ restaurar: [code: string] }>()
</script>

<template>
  <div v-if="retirados.length > 0" class="ds-banner pres">
    <p class="pres-t">No volvimos a añadir lo que quitaste</p>
    <ul class="ds-list-reset">
      <li v-for="r in retirados" :key="r.code" class="pres-fila">
        <span class="pres-nombre">{{ r.nombre }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost pres-boton"
          :aria-label="`Añadir de nuevo ${r.nombre}`"
          @click="$emit('restaurar', r.code)"
        >
          Añadir de nuevo
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pres {
  margin-block-start: 14px;
}

.pres-t {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
}

.pres-fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-block: 4px;
}

.pres-nombre {
  font-size: 13.5px;
}

.pres-boton {
  flex: none;
  min-block-size: 44px;
}
</style>
