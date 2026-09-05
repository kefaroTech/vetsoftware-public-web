<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ArticuloCatalogo, CatalogoComercial } from '@/features/asistente/types/catalogo.types'
import AreaPlegable from './AreaPlegable.vue'
import { importeEstimado } from '../composables/planPricing'

/**
 * El selector de módulos del cotizador: el núcleo fijo y las áreas plegables.
 *
 * ── Casilla nativa, y el `<label>` envuelve la fila entera ──────────────────
 * Nada de `<button aria-pressed>`. Un `aria-pressed` se anuncia «botón,
 * pulsado» y eso es una **acción con efecto inmediato**; aquí el estado es un
 * **valor de formulario** que se envía después con consecuencia económica, y su
 * semántica es `checkbox` —«casilla, marcada»—, que además se enumera en el
 * modo de formularios del lector, donde un `button` no aparece. Es la misma
 * decisión ya medida en `CatalogoGrupo.vue` para este mismo dato.
 *
 * <p>Con el `<label>` envolvente el objetivo táctil es la fila entera (§2.5.8);
 * con la casilla suelta serían 20px y fallaría. El nombre y el precio van
 * DENTRO: el nombre accesible es «Agenda de citas $ 29.000», que es lo que hace
 * falta oír para decidir.
 *
 * <p>Y el cuadro apagado lo dibuja el agente de usuario, que es lo que hace
 * desaparecer —en vez de parchear— el borde de 1,77:1 que §1.4.11 rechazaba.
 *
 * ── El núcleo NO es un control ─────────────────────────────────────────────
 * Es un `<p>`, no una casilla `disabled checked`: una casilla que no se puede
 * desmarcar y no dice por qué es §3.3.2 sin etiqueta de restricción.
 *
 * ── Con precio y sin precio ────────────────────────────────────────────────
 * En `/planes` la fila lleva su importe, porque ahí se decide pieza a pieza qué
 * se contrata. En la portada lleva su DESCRIPCIÓN en vez del importe: es la
 * primera vez que alguien lee estos trece nombres y lo que hace falta para
 * marcar es saber qué es cada uno. La cifra que allí importa es el total, y esa
 * la mantiene el carril.
 */
const props = withDefaults(
  defineProps<{
    catalogo: CatalogoComercial | null
    /** Códigos marcados. El núcleo no está aquí: entra siempre. */
    modulos: string[]
    conPrecio?: boolean
    /** Códigos que el texto del visitante mencionó, para explicar por qué están marcados. */
    detectados?: readonly string[]
    /** Códigos que la pantalla marcó por su cuenta antes de que nadie tocara nada. */
    premarcados?: readonly string[]
  }>(),
  { conPrecio: true, detectados: () => [], premarcados: () => [] },
)

defineEmits<{ alternar: [code: string, marcado: boolean] }>()

/** Qué áreas están desplegadas. Estado de ESTA instancia, no un singleton. */
const abiertas = ref<string[]>([])
let sembrada = false

const areas = computed(() => props.catalogo?.areas ?? [])

const nucleo = computed<ArticuloCatalogo[]>(
  () => props.catalogo?.articulos.filter((a) => a.obligatorio) ?? [],
)

function modulosDe(areaCode: string): ArticuloCatalogo[] {
  return (props.catalogo?.articulos ?? []).filter(
    (a) => !a.obligatorio && a.vendible && a.areaCode === areaCode,
  )
}

function marcadosDe(areaCode: string): number {
  return modulosDe(areaCode).filter((a) => props.modulos.includes(a.code)).length
}

/** Los rótulos cortos, que es lo que cabe en la cabecera. */
function resumenDe(areaCode: string): string {
  return modulosDe(areaCode)
    .map((a) => a.shortLabel ?? a.nombre)
    .join(' · ')
}

/**
 * La nota solo se gana su sitio donde explica una marca que el visitante no
 * hizo. Va DENTRO del `<label>`, así que el nombre accesible de la casilla pasa
 * a ser «Agenda de citas Porque lo mencionaste», que es lo que hace falta oír.
 */
function porqueSeMenciono(code: string): boolean {
  return props.detectados.includes(code) && props.modulos.includes(code)
}

function alternarArea(code: string) {
  abiertas.value = abiertas.value.includes(code)
    ? abiertas.value.filter((c) => c !== code)
    : [...abiertas.value, code]
}

/**
 * Se abren las áreas que traen alguna marca que el visitante NO hizo, y solo
 * esas: abrir las cuatro son trece paradas de tabulación antes del CTA, y en el
 * caso típico eso cae en una o dos.
 *
 * <p>Son marcas de dos procedencias. La detección del texto, que cambia cada vez
 * que se reescribe el relato. Y el premarcado, que solo cuenta en la primera
 * pintada: un módulo premarcado dentro de un área plegada se cobraría sin que
 * nadie lo haya visto, y eso deja el premarcado sin la divulgación proactiva que
 * lo hace legítimo; pasada esa primera vez, volver a imponerlo replegaría lo que
 * el visitante hubiera abierto por su cuenta.
 *
 * <p>Sin ninguna de las dos se abre una sola, la primera del orden del servidor,
 * y se siembra una vez: recargar el catálogo al cambiar de ciclo no puede volver
 * a plegar lo que el visitante abrió.
 */
watch(
  [areas, () => props.detectados],
  ([lista, detectados]) => {
    const primera = lista[0]
    if (!primera) return
    const automaticos = sembrada ? detectados : [...detectados, ...props.premarcados]
    const conMarcaAutomatica = lista
      .map((a) => a.code)
      .filter((code) => modulosDe(code).some((m) => automaticos.includes(m.code)))
    if (conMarcaAutomatica.length > 0) {
      sembrada = true
      abiertas.value = conMarcaAutomatica
      return
    }
    if (sembrada) return
    sembrada = true
    abiertas.value = [primera.code]
  },
  { immediate: true },
)
</script>

<template>
  <div class="lsm">
    <p v-for="a in nucleo" :key="a.code" class="lsm-nucleo pub-tinted">
      <span class="lsm-nucleo-pt" aria-hidden="true">✓</span>
      <span class="lsm-nucleo-txt">
        <span class="lsm-nucleo-nom">
          {{ conPrecio ? `${a.nombre} — incluido siempre` : a.nombre }}
        </span>
        <!-- La descripción la publica el catálogo: escribirla aquí sería una
             segunda verdad sobre lo que entra en el núcleo. -->
        <span v-if="!conPrecio && a.descripcion" class="lsm-nucleo-desc">{{ a.descripcion }}</span>
      </span>
      <span v-if="conPrecio" class="lsm-nucleo-pre">{{ importeEstimado(a.importe) }}</span>
    </p>

    <p v-if="catalogo && areas.length === 0" class="lsm-vacio" role="status">
      Todavía no hay módulos publicados para armar un plan a medida. Escríbenos a
      <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a> y te decimos qué podemos montarte
      hoy.
    </p>

    <AreaPlegable
      v-for="area in areas"
      :key="area.code"
      :nombre="area.nombre"
      :resumen="resumenDe(area.code)"
      :abierta="abiertas.includes(area.code)"
      :marcados="marcadosDe(area.code)"
      :total="modulosDe(area.code).length"
      @alternar="alternarArea(area.code)"
    >
      <label
        v-for="m in modulosDe(area.code)"
        :key="m.code"
        class="lsm-fila"
        :class="{ 'is-on': modulos.includes(m.code) }"
      >
        <input
          type="checkbox"
          :checked="modulos.includes(m.code)"
          :value="m.code"
          @change="$emit('alternar', m.code, ($event.target as HTMLInputElement).checked)"
        />
        <span class="lsm-nombre">
          {{ m.nombre }}
          <!-- La descripción la publica el catálogo, igual que en la fila del
               núcleo: escribirla aquí sería una segunda verdad sobre lo que hace
               cada módulo. -->
          <span v-if="!conPrecio && m.descripcion" class="lsm-desc">{{ m.descripcion }}</span>
          <span v-if="porqueSeMenciono(m.code)" class="lsm-porque">Porque lo mencionaste</span>
        </span>
        <span v-if="conPrecio" class="lsm-precio">{{ importeEstimado(m.importe) }}</span>
      </label>
    </AreaPlegable>
  </div>
</template>

<style scoped>
.lsm {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lsm-nucleo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 14px 16px;
  border-radius: 12px;
}

.lsm-nucleo-pt {
  display: grid;
  place-items: center;
  inline-size: 20px;
  block-size: 20px;
  flex: none;
  border-radius: 50%;
  background: var(--pub-ame-700);
  color: var(--pub-surface);
  font-size: 11px;
}

.lsm-nucleo-txt {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-inline-size: 0;
}

.lsm-nucleo-nom {
  font-size: 14px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lsm-nucleo-desc,
.lsm-desc {
  font-size: 12.5px;
  line-height: 1.5;
  font-weight: 400;
  color: var(--pub-ink-600);
}

.lsm-nucleo-pre {
  margin-left: auto;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--pub-ink-900);
  font-variant-numeric: tabular-nums;
}

.lsm-vacio {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--pub-ink-500);
}

/* La fila entera es el objetivo: 46px de alto, muy por encima del 24×24 de
   §2.5.8. Sin el `<label>` envolvente el objetivo sería la casilla de 20px. */
.lsm-fila {
  display: flex;
  align-items: center;
  gap: 12px;
  min-block-size: 46px;
  padding: 11px 0;
  border-top: 1px solid var(--pub-tint-sep);
  cursor: pointer;
}

.lsm-fila.is-on {
  border-color: var(--pub-ame-600);
}

.lsm-fila input {
  accent-color: var(--pub-ame-600);
  inline-size: 20px;
  block-size: 20px;
  flex: none;
}

.lsm-nombre {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-inline-size: 0;
  font-size: 14px;
  font-weight: 400;
  color: var(--pub-ink-600);
}

.lsm-porque {
  font-size: 12px;
  font-weight: 600;
  color: var(--pub-ame-700);
}

.lsm-fila.is-on .lsm-nombre {
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lsm-precio {
  margin-left: auto;
  flex: none;
  font-size: 13.5px;
  font-weight: 400;
  color: var(--pub-ink-500);
  font-variant-numeric: tabular-nums;
}

.lsm-fila.is-on .lsm-precio {
  font-weight: 600;
  color: var(--pub-ink-900);
}
</style>
