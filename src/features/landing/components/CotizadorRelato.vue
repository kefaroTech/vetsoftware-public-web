<script setup lang="ts">
import { nextTick, ref, useId, useTemplateRef } from 'vue'
import { MAX_DESCRIPCION } from '@/features/asistente/content/copy.content'
import { EJEMPLO_DE_NEGOCIO } from '../content/cotizador.content'

/**
 * El relato del negocio, plegado detrás de su disparador, para quien no sepa qué
 * módulos marcar.
 *
 * ── El disparador va pegado al selector, y no en el carril ──────────────────
 * Por debajo de 900 px el carril se apila DEBAJO de la columna de las casillas,
 * así que ahí el disparador quedaría después del botón de avanzar.
 *
 * ── El ejemplo se enseña, no se siembra ─────────────────────────────────────
 * Va como texto de la pantalla y no como valor del campo ni como `placeholder`:
 * el placeholder no sobrevive al primer carácter (§3.3.2), y un campo que llega
 * con texto ajeno obliga a borrarlo antes de poder escribir el propio.
 *
 * ── Qué NO sale del navegador ───────────────────────────────────────────────
 * Lo que se escribe aquí no viaja a ninguna parte: la propuesta se calcula en el
 * propio navegador (`deteccionModulos`). Mandarlo al encargado de EE. UU. exige
 * las dos autorizaciones separadas (Ley 1581, art. 9 y art. 26 lit. a) que
 * implementa `AsistenteEntrada`, y ese muro de consentimiento no cabe en el
 * primer pliegue.
 */
const props = defineProps<{ texto: string; error: string | null }>()

const emit = defineEmits<{ 'update:texto': [valor: string] }>()

const uid = useId()
const idTexto = `${uid}-texto`
const idAyuda = `${uid}-ayuda`
const idError = `${uid}-error`
const idPanel = `${uid}-panel`

const campo = useTemplateRef<HTMLTextAreaElement>('campo')

/**
 * Quien vuelve con un relato ya escrito lo encuentra abierto: plegado parecería
 * que se perdió, y es lo más caro que produce esta pantalla.
 */
const abierto = ref(props.texto.trim().length > 0)

function enfocar(): void {
  void nextTick(() => campo.value?.focus())
}

function abrir(): void {
  abierto.value = true
  enfocar()
}

function alternar(): void {
  if (abierto.value) abierto.value = false
  else abrir()
}

defineExpose({ abrir })
</script>

<template>
  <div class="lcr" :class="{ 'is-abierto': abierto }">
    <button
      type="button"
      class="lcr-abrir pub-focus-ring"
      :aria-expanded="abierto"
      :aria-controls="idPanel"
      @click="alternar"
    >
      <span class="lcr-ico" aria-hidden="true">?</span>
      <span class="lcr-txt">
        <span class="lcr-t">¿No sabes cuáles necesitas?</span>
        <span class="lcr-d">Cuéntanos qué hace tu negocio y te marcamos los que encajen.</span>
      </span>
      <span class="lcr-chev" aria-hidden="true">›</span>
    </button>

    <div v-if="abierto" :id="idPanel" class="lcr-panel">
      <label :for="idTexto" class="lcr-label">¿Qué hace tu negocio?</label>
      <p :id="idAyuda" class="lcr-ayuda">
        Clínica, spa, guardería, petshop o todo a la vez: escríbelo con tus palabras y te proponemos
        los módulos que encajan.
      </p>
      <textarea
        :id="idTexto"
        ref="campo"
        class="pub-campo lcr-texto"
        :class="error ? 'ds-field-invalid' : 'pub-campo-rest'"
        rows="6"
        :value="texto"
        :maxlength="MAX_DESCRIPCION"
        :aria-describedby="error ? `${idAyuda} ${idError}` : idAyuda"
        :aria-invalid="error ? 'true' : undefined"
        @input="emit('update:texto', ($event.target as HTMLTextAreaElement).value)"
      />
      <p v-if="error" :id="idError" class="lcr-error" role="alert">{{ error }}</p>
      <p class="lcr-ejemplo">Por ejemplo: «{{ EJEMPLO_DE_NEGOCIO }}»</p>
    </div>
  </div>
</template>

<style scoped>
.lcr {
  margin-block-start: 20px;
  border: 1px solid color-mix(in oklch, var(--pub-ame-600) 34%, transparent);
  border-radius: 14px;
  background: color-mix(in oklch, var(--pub-ame-600) 4%, transparent);
}

.lcr.is-abierto {
  border-color: var(--pub-ame-600);
}

.lcr-abrir {
  display: flex;
  align-items: center;
  gap: 12px;
  inline-size: 100%;
  padding: 14px 16px;
  border: 0;
  border-radius: 13px;
  background: none;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
}

.lcr-ico {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 30px;
  block-size: 30px;
  border-radius: 50%;
  background: var(--pub-ame-700);
  color: var(--pub-surface);
  font-size: 15px;
  font-weight: 700;
}

.lcr-txt {
  min-inline-size: 0;
  display: grid;
  gap: 2px;
}

.lcr-t {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--pub-ame-700);
}

.lcr-d {
  font-size: 13px;
  line-height: 1.45;
  color: var(--pub-ink-600);
}

.lcr-abrir:hover .lcr-t {
  text-decoration: underline;
}

.lcr-chev {
  flex: none;
  margin-inline-start: auto;
  font-size: 22px;
  line-height: 1;
  color: var(--pub-ame-700);
  transition: transform 0.15s ease;
}

.lcr.is-abierto .lcr-chev {
  transform: rotate(90deg);
}

@media (prefers-reduced-motion: reduce) {
  .lcr-chev {
    transition: none;
  }
}

.lcr-panel {
  padding: 2px 16px 16px;
}

.lcr-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lcr-ayuda {
  margin: 5px 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-500);
}

.lcr-texto {
  resize: vertical;
  min-block-size: 150px;
}

.lcr-error {
  margin: 6px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pub-err-tx-2);
}

.lcr-ejemplo {
  margin: 10px 0 0;
  font-size: 12.5px;
  font-style: italic;
  line-height: 1.55;
  color: var(--pub-ink-500);
}
</style>
