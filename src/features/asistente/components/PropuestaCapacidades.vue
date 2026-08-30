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
 * ── LA FRASE QUE ESTE BLOQUE TENÍA Y ERA FALSA ──────────────────────────────
 * Decía «Se ajusta al contratar», y nada se ajusta al contratar. Estos dos
 * números no salen del navegador: {@link useAsistente.fijarCapacidades} los
 * guarda en el store, viajan a la intención y de ahí solo los lee la banda de
 * continuación de la landing («para 2 sedes y 5 personas»). La oferta que se
 * manda en el paso 6 son **las líneas de la propuesta y nada más**
 * (`lineasDePropuesta`), y `SelfServeQuoteRequest` no tiene ningún campo de
 * capacidad donde meterlos: el único canal es `lines[].code` + `quantity`.
 *
 * <p>Y la propuesta puede traer su PROPIA línea de capacidad —el servidor
 * devuelve `EXTRA_USER × 3` si el modelo leyó tres personas en el texto libre—,
 * que sí se cotiza y sí se cobra. Con la frase vieja, escribir 8 aquí dejaba al
 * prospecto creyendo que había contratado ocho plazas mientras la oferta pedía
 * tres. La cantidad cobrada solo la mueve el servidor: se cambia refinando la
 * propuesta con palabras, que es lo que hace `RefinarCuadro`.
 *
 * <p>Así que el bloque dice lo que hace y lo que no: recoge el tamaño del equipo
 * y **no toca el precio**. Sin dato de lo incluido no se afirma nada sobre él.
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
/**
 * La nota está ENLAZADA a los dos campos, no solo puesta encima.
 *
 * <p>«No cambia el precio» es la información que decide si merece la pena tocar
 * el control, y quien lo alcanza con el tabulador nunca ha visto el párrafo de
 * arriba. Sin `aria-describedby` el lector anuncia «¿Cuántas personas van a
 * usarlo?, campo numérico» y el aviso se queda fuera (§3.3.2).
 */
const idNota = `${uid}-nota`

/** Lo incluido para un eje, o `null` si el servidor no lo ha dicho. */
function incluidas(unit: string): number | null {
  return props.capacidades.find((c) => c.unit === unit)?.incluido ?? null
}

/**
 * «3 personas: van incluidas.» / «8 personas: 2 van incluidas.»
 *
 * <p>⚠️ Y **nada** cuando no hay dato de lo incluido, que es hoy siempre:
 * `AssistantProposalResponse` no trae bloque de capacidades, así que
 * `propuesta.capacidades` llega vacío. El `?? 0` que hubo aquí convertía esa
 * ausencia en «0 personas van incluidas» —una frase sobre el precio que nadie
 * había calculado—, y el «Se ajusta al contratar» que lo sustituyó era la misma
 * clase de invención: prometía un ajuste que no ocurre en ninguna parte del
 * código. Sin dato se dice menos, no algo falso; lo que sí se puede afirmar
 * siempre —que esto no mueve el precio— lo dice la nota del bloque.
 *
 * <p>Y cuando el contrato publique las capacidades, la rama de arriba tampoco
 * promete el ajuste: dice cuántas van incluidas, que es un hecho del catálogo, y
 * se para ahí.
 */
function frase(unit: CapacityUnit, pedidas: number): string | null {
  const inc = incluidas(unit)
  if (inc === null) return null
  const etiqueta = pedidas === 1 ? CAPACITY_UNIT_LABEL_ONE[unit] : CAPACITY_UNIT_LABEL[unit]
  // «1 sede va incluida» / «2 van incluidas». La versión anterior concordaba con
  // la cantidad pedida y no con la incluida, y escribía «3 sedes: 1 sede van
  // incluidas».
  const cuantas = pedidas <= inc ? pedidas : inc
  const verbo = cuantas === 1 ? 'va incluida' : 'van incluidas'
  if (pedidas <= inc) return `${pedidas} ${etiqueta}: ${verbo}.`
  return `${pedidas} ${etiqueta}: ${inc} ${verbo}.`
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

    <!-- Lo que este bloque hace y lo que NO hace, antes de los campos. Un control
         numérico junto a un total se lee como si moviera el total; decirlo
         después de que el usuario haya tecleado llega tarde. -->
    <p :id="idNota" class="pcap-nota" data-testid="pcap-nota">
      Nos dice el tamaño de tu equipo y viaja con tu selección.
      <strong>No cambia el precio de esta propuesta:</strong> las sedes y las personas que pasen de
      lo incluido todavía no se pueden contratar por tu cuenta. Si necesitas más, escríbenos y lo
      cotizamos contigo. Para cambiar lo que ya está cotizado arriba, cuéntanoslo en «¿Se nos olvidó
      algo?».
    </p>

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
          :aria-describedby="idNota"
          @change="emit('cambiar', entero(($event.target as HTMLInputElement).value), usuarios)"
        />
        <p v-if="fraseSedes" class="pcap-dato">{{ fraseSedes }}</p>
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
          :aria-describedby="idNota"
          @change="emit('cambiar', sedes, entero(($event.target as HTMLInputElement).value))"
        />
        <p v-if="fraseUsuarios" class="pcap-dato">{{ fraseUsuarios }}</p>
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

.pcap-nota {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
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
