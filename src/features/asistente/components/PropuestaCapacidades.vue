<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  CAPACITY_UNIT_LABEL,
  CAPACITY_UNIT_LABEL_ONE,
  type CapacityUnit,
} from '../../landing/types/plans.types'
import type { CapacidadPropuesta } from '../types/asistente.types'

/**
 * Sedes y personas: **dato, no línea cotizada**.
 *
 * ── Por qué no son casillas ni líneas de precio ─────────────────────────────
 * Los cuatro `EXTRA_*` tienen `selfServiceEligible = false` porque no cuelgan de
 * ningún `BUNDLE` activo. Una propuesta que los cotiza produce un
 * `ARTICULO_NO_CONTRATABLE` en el paso vinculante, con un mensaje que a
 * propósito **no dice qué línea sobró** —es la defensa contra el oráculo de
 * enumeración— después de que el prospecto se haya registrado y verificado el
 * correo. Es decir: el error aparece en el peor momento posible y sin pista.
 *
 * Así que la pantalla dice la verdad completa y no cobra por ella: «3 personas:
 * 1 incluida, el resto se ajusta al contratar».
 *
 * ── Por qué NO es un `<fieldset>` ───────────────────────────────────────────
 * Un `<fieldset>` existe para que la `<legend>` complete el nombre accesible de
 * controles que por sí solos no se explican —«Sí»/«No» bajo «¿Acepta?»—. Aquí
 * cada campo ya lleva una etiqueta completa y autosuficiente: «¿Cuántas sedes
 * tienes?» se entiende sin nada más. Un `<fieldset>` solo añadiría un nivel de
 * agrupación que el lector tendría que anunciar sin aportar información.
 *
 * ── Por qué son controles y no una inferencia del modelo ────────────────────
 * El prospecto escribe «somos 2 veterinarios y una auxiliar» y el modelo puede
 * leer 2 donde son 3. Tiene que poder corregirlo, y el sitio para corregir un
 * número es un campo numérico. El modelo solo siembra el valor inicial.
 */
const props = defineProps<{ capacidades: CapacidadPropuesta[]; sedes: number; usuarios: number }>()

const emit = defineEmits<{ cambiar: [sedes: number, usuarios: number] }>()

const uid = useId()
const idSedes = `${uid}-sedes`
const idUsuarios = `${uid}-usuarios`

/** Lo incluido para un eje, o `null` si el servidor no lo ha dicho. */
function incluidas(unit: string): number | null {
  return props.capacidades.find((c) => c.unit === unit)?.incluido ?? null
}

/**
 * «3 personas: 1 incluida, el resto se ajusta al contratar.»
 *
 * <p>⚠️ Y «3 personas. Se ajusta al contratar.» cuando no hay dato de lo
 * incluido, que es **hoy siempre**: `AssistantProposalResponse` no trae bloque
 * de capacidades, así que `propuesta.capacidades` llega vacío. El `?? 0` que
 * había antes convertía esa ausencia en la afirmación «0 personas van
 * incluidas», que no es un valor por defecto inofensivo: es una frase sobre el
 * precio, en la pantalla que decide una compra, que nadie ha calculado. Sin dato
 * se dice menos, no algo falso.
 */
function frase(unit: CapacityUnit, pedidas: number): string {
  const inc = incluidas(unit)
  const etiqueta = pedidas === 1 ? CAPACITY_UNIT_LABEL_ONE[unit] : CAPACITY_UNIT_LABEL[unit]
  if (inc === null) return `${pedidas} ${etiqueta}. Se ajusta al contratar.`
  if (pedidas <= inc) return `${pedidas} ${etiqueta}: van incluidas.`
  const etiquetaInc = inc === 1 ? CAPACITY_UNIT_LABEL_ONE[unit] : CAPACITY_UNIT_LABEL[unit]
  return `${pedidas} ${etiqueta}: ${inc} ${etiquetaInc} van incluidas, el resto se ajusta al contratar.`
}

const fraseSedes = computed(() => frase('BRANCH', props.sedes))
const fraseUsuarios = computed(() => frase('USER', props.usuarios))

/** Nunca por debajo de 1: cero sedes o cero personas no es una clínica. */
function entero(valor: string): number {
  const n = Math.trunc(Number(valor))
  return Number.isFinite(n) && n >= 1 ? n : 1
}
</script>

<template>
  <section class="pcap" aria-labelledby="pcap-h3">
    <h3 id="pcap-h3" class="pcap-legend">¿De qué tamaño es tu equipo?</h3>

    <div class="pcap-grid">
      <div>
        <label :for="idSedes" class="pcap-label">¿Cuántas sedes tienes?</label>
        <input
          :id="idSedes"
          class="pcap-input"
          type="number"
          min="1"
          inputmode="numeric"
          :value="sedes"
          @change="emit('cambiar', entero(($event.target as HTMLInputElement).value), usuarios)"
        />
        <p class="pcap-dato">{{ fraseSedes }}</p>
      </div>

      <div>
        <label :for="idUsuarios" class="pcap-label">¿Cuántas personas van a usarlo?</label>
        <input
          :id="idUsuarios"
          class="pcap-input"
          type="number"
          min="1"
          inputmode="numeric"
          :value="usuarios"
          @change="emit('cambiar', sedes, entero(($event.target as HTMLInputElement).value))"
        />
        <p class="pcap-dato">{{ fraseUsuarios }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pcap-legend,
.pcap-label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--pub-ink-700);
}

.pcap-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  margin-block-start: 10px;
}

/* El borde sale de `--pub-ame-600` y no de `--pub-line`: aquel mide 1,23:1
   contra blanco y no vale como borde de control (§1.4.11, AA). */
.pcap-input {
  inline-size: 100%;
  min-block-size: 42px;
  padding: 0 12px;
  border: 2px solid var(--pub-ame-600);
  border-radius: 10px;
  background: var(--pub-surface);
  font: inherit;
  font-size: 16px;
  color: var(--pub-ink-900);
}

.pcap-dato {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--pub-ink-600);
}

@media (width <= 640px) {
  .pcap-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
