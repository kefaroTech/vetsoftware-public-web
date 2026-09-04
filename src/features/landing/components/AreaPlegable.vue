<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'

/**
 * Una cabecera de área del selector de módulos, con su cuerpo plegable.
 *
 * ── `<h3>` envolviendo el `<button>`, y `<fieldset>` para el cuerpo ─────────
 * Con trece casillas abiertas, quien navega con lector salta **por encabezado**,
 * no tabulando: el `<h3>` es lo que de verdad resuelve el orden de tabulación,
 * y por eso no hay roving `tabindex` (un grupo de casillas no es un widget
 * compuesto; el APG reserva el roving para *toolbar*, *tablist*, *grid* y
 * *radiogroup*). El cuerpo agrupa casillas, así que su agrupación correcta es
 * `<fieldset>`+`<legend>` —que ya *es* un grupo con nombre— y no un
 * `role="group"` postizo.
 *
 * ── La insignia forma parte del nombre accesible, a propósito ───────────────
 * Con el área plegada, la insignia es la única información que existe sobre lo
 * que hay dentro: «Atención a los pacientes, botón, contraído» no diría que ahí
 * dentro hay tres módulos comprados. Lo que sí sale del nombre es el resumen de
 * rótulos cortos, que se repite íntegro dentro del cuerpo y baja a
 * `aria-describedby`, donde se anuncia después y es interrumpible.
 *
 * <p>Y el cambio de la insignia **no se anuncia**: lo dispara marcar una casilla,
 * que ya se anuncia sola. Una región viva aquí daría tres locuciones por un
 * clic. La única de la pantalla es la del precio.
 */
defineProps<{
  nombre: string
  /** Los rótulos cortos de los módulos del área, unidos. Solo descripción. */
  resumen: string
  abierta: boolean
  marcados: number
  total: number
}>()

defineEmits<{ alternar: [] }>()

const uid = useId()
const idCuerpo = `${uid}-cuerpo`
const idNombre = `${uid}-nombre`
const idResumen = `${uid}-resumen`
const idConteo = `${uid}-conteo`

const boton = useTemplateRef<HTMLButtonElement>('boton')

/**
 * El cuerpo se desmonta al plegar, así que una siembra programática que cierre
 * un área con el foco dentro lo dejaría huérfano. No puede ocurrir por
 * interacción del usuario —el único disparador es esta cabecera, que está fuera
 * del cuerpo—, pero quien cierre desde fuera tiene que poder recogerlo.
 */
defineExpose({ enfocar: () => boton.value?.focus() })
</script>

<template>
  <div class="lsm-area">
    <h3 class="lsm-area-h">
      <button
        ref="boton"
        type="button"
        class="lsm-area-btn pub-focus-ring"
        :aria-expanded="abierta"
        :aria-controls="idCuerpo"
        :aria-labelledby="`${idNombre} ${idConteo}`"
        :aria-describedby="idResumen"
        @click="$emit('alternar')"
      >
        <span class="lsm-chevron" :class="{ 'is-abierta': abierta }" aria-hidden="true">›</span>
        <span class="lsm-area-txt">
          <span :id="idNombre" class="lsm-area-nom">{{ nombre }}</span>
          <span :id="idResumen" class="lsm-area-res">{{ resumen }}</span>
        </span>
        <span
          :id="idConteo"
          class="lsm-badge pub-badge"
          :class="marcados > 0 ? 'pub-badge--on' : 'pub-badge--off'"
        >
          <template v-if="marcados > 0">
            {{ marcados }} de {{ total }}<span class="ds-sr-only"> módulos marcados</span>
          </template>
          <template v-else>
            ninguno<span class="ds-sr-only"> de {{ total }} módulos marcados</span>
          </template>
        </span>
      </button>
    </h3>

    <fieldset v-if="abierta" :id="idCuerpo" class="lsm-area-body">
      <legend class="ds-sr-only">{{ nombre }}</legend>
      <slot />
    </fieldset>
  </div>
</template>

<style scoped>
.lsm-area {
  border: 1px solid var(--pub-line-strong);
  border-radius: 12px;
  background: var(--pub-surface);
  overflow: hidden;
}

.lsm-area-h {
  margin: 0;
  font: inherit;
}

.lsm-area-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  inline-size: 100%;
  min-block-size: 56px;
  padding: 14px 16px;
  border: none;
  background: var(--pub-surface);
  text-align: left;
  cursor: pointer;
}

.lsm-area-btn:hover {
  background: var(--pub-tint-50);
}

/* El color del chevron no es el único canal del estado —lo son `aria-expanded`
   y la presencia del cuerpo—, así que §1.4.1 queda cubierto. */
.lsm-chevron {
  display: grid;
  place-items: center;
  inline-size: 20px;
  block-size: 20px;
  flex: none;
  font-size: 17px;
  color: var(--pub-ink-400);
  transition: transform 0.15s;
}

.lsm-chevron.is-abierta {
  transform: rotate(90deg);
}

.lsm-area-txt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-inline-size: 0;
}

.lsm-area-nom {
  font-size: 14px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lsm-area-res {
  font-size: 12px;
  color: var(--pub-ink-500);
}

.lsm-badge {
  margin-left: auto;
  flex: none;
}

.lsm-area-body {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 2px 16px 12px;
  border: none;
  min-inline-size: 0;
}
</style>
