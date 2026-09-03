<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import {
  AVISO_TECHO,
  MAX_CANTIDAD_LINEA,
  MAX_CANTIDAD_LINEA_TXT,
  normalizarCantidad,
  seRecorta,
} from '@/constants/cantidades'

/**
 * Una cantidad del cotizador: sedes o personas.
 *
 * ── El `<input type="number">` se queda, y los botones se le SUMAN ──────────
 * `MAX_CANTIDAD_LINEA` es 10.000. Una cadena de cuarenta sedes tendría que
 * pulsar `+` treinta y nueve veces; con el campo, teclea «40». Y el campo
 * nativo con su `<label for>` da valor, nombre, rol, flechas, `min`/`max`/`step`
 * y anuncio del valor al enfocar sin escribir una línea: un `<span>` con el
 * número no anuncia nada salvo que se le monte encima un `spinbutton` ARIA
 * completo o una segunda región viva, y la única región viva de esta pantalla
 * ya está asignada al precio.
 *
 * ── `aria-disabled` en el límite, nunca `disabled` ──────────────────────────
 * `disabled` saca el botón del orden de tabulación, así que quien llega al
 * mínimo pulsando `−` con el teclado pierde el foco al vacío en ese mismo
 * instante (§3.2.1/§3.2.2). Con `aria-disabled` el botón sigue enfocado, se
 * anuncia «no disponible» y su descripción dice por qué. Los manejadores hacen
 * un no-op real: no recortan un valor en silencio.
 */
const props = defineProps<{
  modelValue: number
  etiqueta: string
  /** «sede», «persona». Compone el nombre de los dos botones y los dos motivos. */
  unidadSingular: string
  /** «sedes», «personas». Solo aparece en el motivo del máximo. */
  unidadPlural: string
  /** Unidades que la tarifa ya trae. `null` mientras el catálogo no llegue. */
  incluidas?: number | null
}>()

const emit = defineEmits<{ 'update:modelValue': [valor: number] }>()

const uid = useId()
const idCampo = `${uid}-num`
const idMin = `${uid}-min`
const idMax = `${uid}-max`

const enMinimo = computed(() => props.modelValue <= 1)
const enMaximo = computed(() => props.modelValue >= MAX_CANTIDAD_LINEA)

/** Si el último número tecleado pasaba del techo, y por tanto hay que decirlo. */
const recortado = ref(false)

function fijar(crudo: string) {
  recortado.value = seRecorta(crudo)
  emit('update:modelValue', normalizarCantidad(crudo))
}

function menos() {
  if (enMinimo.value) return
  recortado.value = false
  emit('update:modelValue', props.modelValue - 1)
}

function mas() {
  if (enMaximo.value) return
  recortado.value = false
  emit('update:modelValue', props.modelValue + 1)
}
</script>

<template>
  <div class="lct-campo">
    <label class="lct-label" :for="idCampo">
      {{ etiqueta }}
      <span v-if="incluidas != null" class="lct-inc">
        · {{ incluidas }} {{ incluidas === 1 ? 'incluida' : 'incluidas' }}
      </span>
    </label>

    <div class="lct-caja">
      <button
        type="button"
        class="lct-paso pub-focus-ring"
        :class="{ 'is-tope': enMinimo }"
        :aria-label="`Una ${unidadSingular} menos`"
        :aria-disabled="enMinimo || undefined"
        :aria-describedby="enMinimo ? idMin : undefined"
        @click="menos"
      >
        <span aria-hidden="true">&minus;</span>
      </button>

      <input
        :id="idCampo"
        class="lct-num"
        type="number"
        inputmode="numeric"
        min="1"
        :max="MAX_CANTIDAD_LINEA"
        step="1"
        :value="modelValue"
        @input="fijar(($event.target as HTMLInputElement).value)"
      />

      <button
        type="button"
        class="lct-paso pub-focus-ring"
        :class="{ 'is-tope': enMaximo }"
        :aria-label="`Una ${unidadSingular} más`"
        :aria-disabled="enMaximo || undefined"
        :aria-describedby="enMaximo ? idMax : undefined"
        @click="mas"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>

    <p :id="idMin" class="ds-sr-only">Ya estás en el mínimo: 1 {{ unidadSingular }}.</p>
    <p :id="idMax" class="ds-sr-only">
      Ya estás en el máximo: {{ MAX_CANTIDAD_LINEA_TXT }} {{ unidadPlural }}.
    </p>

    <p v-if="recortado" class="ds-banner ds-banner--warning ds-banner--sm" role="status">
      {{ AVISO_TECHO }}
    </p>
  </div>
</template>

<style scoped>
.lct-campo {
  min-width: 0;
}

.lct-label {
  display: block;
  margin: 0 0 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--pub-ink-700);
}

.lct-inc {
  font-weight: 400;
  color: var(--pub-ink-500);
}

.lct-caja {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--pub-line-strong);
  border-radius: 11px;
  background: var(--pub-surface);
}

/* 40×40 supera con holgura el mínimo de 24×24 de §2.5.8, así que el `gap` de
   2px no necesita ninguna de sus cinco excepciones. */
.lct-paso {
  inline-size: 40px;
  block-size: 40px;
  flex: none;
  border: none;
  border-radius: 8px;
  background: #f7f2fc;
  color: var(--pub-ink-700);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.lct-paso:hover:not(.is-tope) {
  background: #efe4fb;
}

/* Dos canales, relleno Y contorno, nunca solo opacidad (§1.4.1): el diseño
   pedía «sin cambio de estilo» en el límite y un botón que no responde y no lo
   parece es un botón roto. `--pub-ink-500` mide 6,12:1 sobre blanco. */
.lct-paso.is-tope {
  background: var(--pub-surface);
  border: 1px solid var(--pub-line-strong);
  color: var(--pub-ink-500);
  cursor: default;
}

.lct-num {
  flex: 1 1 auto;
  min-inline-size: 0;
  block-size: 40px;
  border: none;
  background: transparent;
  text-align: center;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--pub-ink-900);
}
</style>
