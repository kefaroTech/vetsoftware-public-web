<script setup lang="ts">
import type { Ciclo } from '../../landing/types/plans.types'
import type { PropuestaLinea as Linea } from '../types/asistente.types'
import PropuestaLinea from './PropuestaLinea.vue'

/**
 * Las líneas, en **dos subsecciones con `<h3>`**.
 *
 * <p>La agrupación estructural es la señal más fuerte de procedencia y la única
 * que sobrevive en el resumen de encabezados de un lector de pantalla: quien
 * navegue por encabezados oye «Lo que te proponemos» y «Lo que añadiste tú» sin
 * tener que leer una sola línea. Un borde de color no aparece en ese resumen.
 *
 * <p>La segunda subsección **no existe** si está vacía. Un `<h3>` con una lista
 * de cero elementos es una promesa incumplida en el índice del documento.
 */
defineProps<{
  sugeridas: Linea[]
  manuales: Linea[]
  ciclo: Ciclo
  /** Códigos que entraron en el último recálculo. */
  nuevos: string[]
}>()

defineEmits<{ quitar: [code: string] }>()
</script>

<template>
  <div class="ptab">
    <!-- La atribución va UNA vez por pantalla, no colgada de cada fila. Una
         afirmación estructural se pinta donde es verdad —una vez— y no en cada
         línea, donde se convierte en ruido y deja de leerse. Es el mismo
         razonamiento con el que la moneda se rotula una vez por pantalla. -->
    <div class="ds-banner ds-banner--info ptab-atribucion">
      <p class="ptab-atrib-t">Por qué te proponemos esto</p>
      <p class="ptab-atrib-p">
        Lo escribió un asistente automático a partir de lo que nos contaste. Puede equivocarse:
        revísalo y quita lo que no uses.
      </p>
    </div>

    <section v-if="sugeridas.length > 0" aria-labelledby="prop-h3-ia">
      <h3 id="prop-h3-ia" class="ptab-h3">Lo que te proponemos</h3>
      <ul class="ds-list-reset">
        <PropuestaLinea
          v-for="l in sugeridas"
          :key="l.code"
          :linea="l"
          :ciclo="ciclo"
          :nuevo="nuevos.includes(l.code)"
          @quitar="$emit('quitar', $event)"
        />
      </ul>
    </section>

    <section v-if="manuales.length > 0" aria-labelledby="prop-h3-manual">
      <h3 id="prop-h3-manual" class="ptab-h3">Lo que añadiste tú</h3>
      <ul class="ds-list-reset">
        <PropuestaLinea
          v-for="l in manuales"
          :key="l.code"
          :linea="l"
          :ciclo="ciclo"
          @quitar="$emit('quitar', $event)"
        />
      </ul>
    </section>
  </div>
</template>

<style scoped>
.ptab-atribucion {
  margin-block-end: 14px;
}

.ptab-atrib-t {
  margin: 0;
  font-weight: 700;
  font-size: 13px;
}

.ptab-atrib-p {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
}

.ptab-h3 {
  margin: 16px 0 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pub-ink-600);
}
</style>
