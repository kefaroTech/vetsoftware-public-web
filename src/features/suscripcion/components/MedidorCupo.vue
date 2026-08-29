<script setup lang="ts">
import { computed, useId } from 'vue'
import { medidorTexto, sustantivo } from '../composables/cuposText'

/**
 * El medidor de un cupo: `<progress>` nativo, **cero ARIA escrito a mano**.
 *
 * <p>Un `<progress>` con su `<label>` ya expone rol, valor, mínimo y máximo al lector de
 * pantalla. Un `<div role="progressbar">` con tres `aria-value*` es más marcado para conseguir
 * menos, y además hay que mantenerlo sincronizado a mano.
 *
 * <p>Tres reglas que no se negocian:
 *
 * <p><b>1. La barra nunca va sola.</b> El texto `340 de 500 mascotas` está siempre: un 68 % no
 * se puede leer por teléfono ni contar en un correo, y por teléfono es como esto llega a
 * soporte.
 *
 * <p><b>2. Un límite ausente no es un límite de cero.</b> Sin techo declarado la barra **no se
 * pinta** —dibujarla al 100 % inventaría un límite— y el texto dice «sin límite».
 *
 * <p><b>3. El estado no se comunica por el color de la barra.</b> No hay forma portable de
 * colorear un `<progress>` por umbral, y aunque la hubiera sería color solo. Los umbrales viven
 * en el banner de al lado, con su texto.
 */
const props = defineProps<{
  dimensionCode: string | undefined
  usado: number | undefined
  limite: number | undefined
}>()

const id = useId()

const titulo = computed(() => {
  const nombre = sustantivo(props.dimensionCode)
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
})

const texto = computed(() => medidorTexto(props.usado, props.limite, props.dimensionCode))

/** El valor se acota al máximo: pasarse del tope no debe pintar una barra imposible. */
const valor = computed(() => Math.min(props.usado ?? 0, props.limite ?? 0))
</script>

<template>
  <div class="ds-stack ds-stack--8">
    <!-- Sin barra no hay control que etiquetar: un `<label for>` colgando de un id que no
         existe es peor que no ponerlo, así que el rótulo pasa a ser texto. -->
    <label v-if="limite != null" class="ds-label" :for="id">{{ titulo }}</label>
    <p v-else class="ds-label">{{ titulo }}</p>
    <progress v-if="limite != null" :id="id" class="medidor" :max="limite" :value="valor" />
    <p class="ds-meta">{{ texto }}</p>
  </div>
</template>

<style scoped>
/* Geometría y NADA más: sin color, que es lo que la haría comunicar por sí sola. */
.medidor {
  width: 100%;
  height: var(--space-8);
}
</style>
