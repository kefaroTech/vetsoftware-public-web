<script setup lang="ts">
import { importeEstimado, sufijoCiclo } from '../../landing/composables/planPricing'
import type { Ciclo } from '../../landing/types/plans.types'
import type { ArticuloCatalogo } from '../types/catalogo.types'

/**
 * Un grupo del catálogo manual: `<fieldset>` + `<legend>` + casillas reales.
 *
 * ── Casillas nativas, y el `<label>` envuelve la fila entera ────────────────
 * Nada de `div` con `role="checkbox"`. Con un `<input type="checkbox">` dentro
 * de un `<label>` que envuelve toda la fila, el objetivo táctil es la fila —muy
 * por encima del mínimo de §2.5.8— y el teclado, el anuncio del estado y la
 * asociación etiqueta-control salen gratis y correctos.
 *
 * ── Sin acordeón, y es una decisión medida ──────────────────────────────────
 * Un acordeón añade un clic por grupo, **esconde el precio** —que es el dato por
 * el que esta sección existe— y para un lector de pantalla convierte trece
 * elementos en cuatro botones que hay que abrir uno a uno. El agrupado en cuatro
 * bloques ya domina la ley de Hick; el coste del acordeón supera con creces al
 * del scroll.
 *
 * <p>Cada fila muestra **sus días de prueba**, no solo su precio: es la mitad de
 * la información que hace comparable un módulo suelto con un paquete.
 */
defineProps<{
  titulo: string
  articulos: ArticuloCatalogo[]
  seleccionados: string[]
  ciclo: Ciclo
  /** Con un paquete en el carrito no se puede marcar nada: el servidor lo rechaza. */
  bloqueado?: boolean
}>()

defineEmits<{ alternar: [code: string, marcado: boolean] }>()
</script>

<template>
  <fieldset class="cgr">
    <legend class="cgr-legend">{{ titulo }}</legend>

    <label
      v-for="a in articulos"
      :key="a.code"
      class="cgr-fila"
      :class="{ 'is-on': seleccionados.includes(a.code) }"
    >
      <input
        type="checkbox"
        :checked="seleccionados.includes(a.code)"
        :disabled="bloqueado"
        @change="$emit('alternar', a.code, ($event.target as HTMLInputElement).checked)"
      />
      <span class="cgr-cuerpo">
        <span class="cgr-nombre">{{ a.nombre }}</span>
        <span class="cgr-desc">{{ a.descripcion }}</span>
      </span>
      <span class="cgr-precio">
        {{ importeEstimado(a.importe) }} {{ sufijoCiclo(ciclo) }}
        <span class="cgr-prueba">{{
          a.trialDays ? `${a.trialDays} días gratis` : 'sin prueba'
        }}</span>
      </span>
    </label>
  </fieldset>
</template>

<style scoped>
.cgr {
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.cgr-legend {
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pub-ink-600);
}

.cgr-fila {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin-block-start: 8px;
  padding: 12px 14px;
  border: 1px solid var(--pub-line-strong);
  border-radius: 12px;
  background: var(--pub-surface);
  cursor: pointer;
}

/* El borde de la fila marcada sale de `--pub-ame-600` (5,38:1 sobre blanco) y
   no de `--pub-line`, que mide 1,23:1 y no vale como borde de control
   (§1.4.11, AA). */
.cgr-fila.is-on {
  border-color: var(--pub-ame-600);
}

.cgr-fila input {
  accent-color: var(--pub-ame-600);
  inline-size: 18px;
  block-size: 18px;
  margin-block-start: 2px;
  flex: none;
}

.cgr-cuerpo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}

.cgr-nombre {
  font-size: 14px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.cgr-desc {
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--pub-ink-600);
}

.cgr-precio {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.cgr-prueba {
  font-weight: 400;
  font-size: 12px;
  color: var(--pub-ink-600);
}
</style>
