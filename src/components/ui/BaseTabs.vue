<script setup lang="ts" generic="V extends string">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { panelId, tabId, type TabItem } from './tabs'

/**
 * A11Y-07 — pestañas de verdad (las de `CajaView`, `CuentasListaView` y
 * `ReportesView`), a diferencia de `SegTabs`, que declaraba `role="tablist"`
 * sin panel ni hijos con `role="tab"` y por eso lo perdió (issue #161).
 *
 * Lo que faltaba en las tres y aporta esta primitiva: los ids, `aria-controls`
 * contra el panel, `aria-labelledby` del panel contra su pestaña, tabindex
 * móvil y flechas. En el censo del repositorio `aria-controls` y
 * `role="tabpanel"` estaban a CERO ocurrencias.
 *
 * ── Esto es la TIRA, no la pantalla ─────────────────────────────────────────
 * El panel es su componente hermano, `BaseTabPanel`, y no un slot de aquí. La
 * primera versión lo ofrecía como `<slot name="panel" :panel :tab>`, y con eso
 * no se pudo migrar ninguna de las tres pantallas (issue #186): el panel solo
 * podía aterrizar donde estuviera la tira, y en `ReportesView` la tira vive
 * DENTRO de la fila que comparte con el rango de fechas — el panel habría
 * quedado dentro de esa fila. Separarlos deja al anfitrión poner cada pieza
 * donde le toca; el enlace ARIA lo sostiene el `name` (ver `tabs.ts`).
 *
 * ── La raíz SÍ es una caja ──────────────────────────────────────────────────
 * La primera versión envolvía tira + panel en un `.tabs-root { display:
 * contents }` para «no desplazar nada». El efecto real era el contrario: la
 * única caja que el anfitrión alcanza con su CSS scoped es la raíz del hijo
 * —es la que hereda su `data-v-…`—, así que borrarla tiraba en silencio todo lo
 * que el anfitrión declarase sobre ella. `CuentasListaView` ya traía
 * `margin-bottom: 16px` sobre `.tabs` y lo habría perdido sin un solo aviso.
 * Ahora la raíz ES el `role="tablist"`: un elemento, con caja, que el anfitrión
 * clasifica y coloca. Mismo criterio que `SegTabs`.
 *
 * La primitiva se queda con lo que es la pestaña (tipografía, estado activo,
 * contador, punto, desplazamiento horizontal) y NO con el raíl inferior ni con
 * los márgenes: eso es chrome del anfitrión y difiere entre pantallas — en
 * `ReportesView` no hay raíl porque la tira va dentro de una fila de filtros.
 */
const props = defineProps<{
  modelValue: V
  /** `NoInfer` ata el genérico al `modelValue`, como en `SegTabs`. */
  tabs: readonly TabItem<NoInfer<V>>[]
  /**
   * Nombre accesible de la TIRA — se pinta como `aria-label` sobre el
   * `role="tablist"` de la raiz. Obligatorio: un tablist sin nombre es
   * justo el defecto que esta primitiva vino a cerrar (A11Y-07).
   *
   * NO se llama `ariaLabel` a proposito. Volar excluye `aria-*` de la
   * conversion a camelCase (`vueCompilerOptions.htmlAttributes`, por
   * defecto `['aria-*', 'data-*']`), asi que un `aria-label="..."` escrito
   * en el anfitrion NUNCA satisface a un prop `ariaLabel` ante `vue-tsc`:
   * solo casa en tiempo de EJECUCION, por el `camelize` de Vue. Un prop
   * `ariaLabel` obligatorio es, por tanto, imposible de cumplir sin romper
   * `vue/attribute-hyphenation` (aviso, y `lint:strict` corre con
   * `--max-warnings=0`). Con un nombre sin prefijo `aria-` el anfitrion
   * escribe `tablist-label="..."`, en kebab como el resto, y el compilador
   * si comprueba que esta.
   */
  tablistLabel: string
  /** Namespace de los ids; el mismo que reciba su `BaseTabPanel`. */
  name: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: V] }>()

const buttons = useTemplateRef<HTMLButtonElement[]>('buttons')

const selectedIndex = computed(() => {
  const i = props.tabs.findIndex((t) => t.value === props.modelValue)
  return i >= 0 ? i : 0
})

/**
 * ACTIVACIÓN MANUAL, no automática. El APG contempla las dos, y aquí la
 * automática sería un error medible: la pestaña «Historial» de caja dispara una
 * carga al servidor, así que atravesarla con la flecha lanzaría una petición por
 * pestaña. Por eso el tabindex móvil sigue al FOCO —no al valor seleccionado— y
 * hace falta Enter o Espacio para activar.
 */
const focusIndex = ref(selectedIndex.value)
watch(selectedIndex, (i) => (focusIndex.value = i))

/**
 * El foco se acota al número de pestañas VIVAS. La tira de `CajaView` encoge
 * («Mi caja abierta» desaparece al cerrar la caja, «Historial» no existe sin
 * permiso): con el índice crudo, un `focusIndex` que quedase fuera de rango
 * dejaba a TODAS las pestañas con `tabindex="-1"` y sacaba la tira entera del
 * orden de tabulación, sin forma de volver a entrar con el teclado.
 */
const rovingIndex = computed(() => Math.min(focusIndex.value, props.tabs.length - 1))

function move(index: number) {
  focusIndex.value = index
  void nextTick(() => buttons.value?.[index]?.focus())
}

function activate(index: number) {
  const tab = props.tabs[index]
  if (!tab) return
  focusIndex.value = index
  emit('update:modelValue', tab.value)
}

function onKeydown(event: KeyboardEvent, index: number) {
  const n = props.tabs.length
  if (n === 0) return
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault()
      move((index + 1) % n)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault()
      move((index - 1 + n) % n)
      break
    case 'Home':
      event.preventDefault()
      move(0)
      break
    case 'End':
      event.preventDefault()
      move(n - 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      activate(index)
      break
  }
}
</script>

<template>
  <div class="tabstrip" role="tablist" :aria-label="tablistLabel">
    <button
      v-for="(tab, i) in tabs"
      :id="tabId(name, tab.value)"
      :key="tab.value"
      ref="buttons"
      type="button"
      class="tab"
      :class="tab.value === modelValue ? 'ds-tab--active' : 'tab-off'"
      role="tab"
      :aria-selected="tab.value === modelValue"
      :aria-controls="tab.value === modelValue ? panelId(name, tab.value) : undefined"
      :tabindex="i === rovingIndex ? 0 : -1"
      @click="activate(i)"
      @keydown="onKeydown($event, i)"
    >
      <!--
        Contenido libre por pestaña (issue #185): el slot recibe el descriptor y
        su estado, y el CONTENIDO POR DEFECTO pinta icono + rótulo +
        contador/punto, que es lo que necesitan las tres pantallas. Solo
        sobrescribe quien pida algo que el descriptor no sepa expresar.
      -->
      <slot name="tab" :tab="tab" :selected="tab.value === modelValue">
        <component :is="tab.icon" v-if="tab.icon" :size="15" :stroke-width="1.7" />
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.badge !== undefined"
          class="count"
          :class="tab.value === modelValue ? 'ds-tone--accent' : 'ds-tone--neutral'"
          >{{ tab.badge }}</span
        >
        <span v-if="tab.dot" class="ds-status-dot dot" aria-hidden="true"></span>
      </slot>
    </button>
  </div>
</template>

<style scoped>
/* El raíl inferior y los márgenes los pone el anfitrión sobre esta misma raíz:
   difieren por pantalla y son su caja, no la de la pestaña. */
.tabstrip {
  display: flex;
  gap: var(--space-4);
  overflow-x: auto;
  scrollbar-width: none;
}

.tabstrip::-webkit-scrollbar {
  display: none;
}

/* El estado activo lo pinta `.ds-tab--active` (primitives.css) y el de reposo su
   pareja `.tab-off`, las dos enganchadas con `:class`. La base NO declara
   `color` ni `border-bottom-color` a propósito: con el `[data-v-…]` del scope
   pesarían (0,2,0) y la primitiva (0,1,0) nunca ganaría. El `border-width` en
   forma larga evita el `border-color: currentcolor` del atajo `border: none`. */
.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 10px 16px;
  margin-bottom: -1px;
  border-width: 0 0 2px;
  border-style: solid;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.tab-off {
  border-bottom-color: transparent;
  color: var(--warm-600);
}

/* El hover se acota al reposo: la activa conserva su amatista y no compite. */
.tab-off:hover {
  color: var(--warm-900);
}

/* Mismo reparto que en `.tab`/`.tab-off`: la base se queda solo con la caja y
   NO declara `background` ni `color`, porque con el `[data-v-…]` del scope
   pesarían (0,2,0) y las primitivas de tono (0,1,0) nunca ganarían. El tono lo
   engancha el template: `.ds-tone--accent` en la pestaña activa,
   `.ds-tone--neutral` en las demás. */
.count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  font-size: 10.5px;
  line-height: 18px;
  text-align: center;
}

/* Punto de estado. El tamaño y la forma los pone `.ds-status-dot`
   (primitives.css); aquí solo el color y el halo. Va `aria-hidden` en el
   template: lo que dice está en el rótulo de la pestaña, no en el color. */
.dot {
  background: var(--success-dot);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--success-dot) 14%, transparent);
}
</style>
