<script setup lang="ts">
import { ref } from 'vue'
import {
  BarChart3,
  Check,
  History,
  PawPrint,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-vue-next'
import ExistingItemsSection from '../src/features/dashboard/views/consulta/nueva/components/ExistingItemsSection.vue'

// ── Los 16 componentes que FE-08 extrajo ──────────────────────────────────
// Antes eran marcado copiado dentro de cada vista, así que su aspecto lo
// protegía (mal) la captura de cada pantalla. Ahora son UNA pieza de la que
// dependen el POS, la caja y los siete modales de acciones: un cambio aquí no
// se nota en una pantalla, se nota en todas a la vez, y por eso entran a la
// galería. Lo que la red vigila no es que existan, sino que sigan pintando
// exactamente lo que pintaban las copias que sustituyeron.
import PatientFixedCard from '../src/features/acciones/components/PatientFixedCard.vue'
import CajaPanel from '../src/features/caja/components/CajaPanel.vue'
import CashTable from '../src/features/caja/components/CashTable.vue'
import CashStatusPill from '../src/features/caja/components/CashStatusPill.vue'
import CashTotalsGrid from '../src/features/caja/components/CashTotalsGrid.vue'
import CashLinkButton from '../src/features/caja/components/CashLinkButton.vue'
import SearchField from '../src/features/tienda/components/SearchField.vue'
import FilterSelect from '../src/features/tienda/components/FilterSelect.vue'
import SegTabs from '../src/features/tienda/components/SegTabs.vue'
import PagerBar from '../src/features/tienda/components/PagerBar.vue'
import AccentButton from '../src/features/tienda/components/AccentButton.vue'
import CategoryPill from '../src/features/tienda/components/CategoryPill.vue'
import TonePill from '../src/features/tienda/components/TonePill.vue'
import ExportBar from '../src/features/tienda/components/ExportBar.vue'
import DiffCell from '../src/features/tienda/components/DiffCell.vue'
import LinkButton from '../src/features/tienda/components/LinkButton.vue'

// ── La superficie de formulario (A11Y-09 / A11Y-10) ───────────────────────
// Se montan los componentes REALES y no marcado con clases `ds-*`: en esta
// familia el color vive en las primitivas (`.ds-field-invalid`,
// `.ds-field-disabled`, `.ds-focus-ring`) pero la GEOMETRÍA —borde, radio,
// padding— vive en el CSS scoped de cada SFC. Un campo dibujado a mano en la
// galería tendría los colores buenos y ninguna forma, y la línea base
// retrataría algo que la aplicación no pinta en ninguna pantalla.
import BaseField from '../src/components/ui/BaseField.vue'
import BaseInput from '../src/components/ui/BaseInput.vue'
import BaseSelect from '../src/components/ui/BaseSelect.vue'
import BaseTextarea from '../src/components/ui/BaseTextarea.vue'

// ── La tira de pestañas (issue #198) ──────────────────────────────────────
// `BaseTabs` gobierna caja, cuentas y reportes: un cambio suyo repinta tres
// pantallas a la vez y hasta ahora ningún gate lo veía. Mismo motivo por el que
// entraron los campos y el texto tenue — una primitiva compartida sin captura
// es una primitiva sin red.
// ── El resumen de errores y los cuatro `.ds-dialog-*` ──────────────────
// Los dos huecos que quedaban de la tanda de modales de hoy. `ErrorSummary`
// es gemelo TR-02 y su color lo hereda de `.ds-banner--error`, así que un
// retoque de ese banner lo repinta sin tocarlo; los `.ds-dialog-*` los
// comparten TODOS los diálogos desde que se retiraron los siete a medida, y sus
// dos únicos consumidores vivos teleportan a `body`, fuera del alcance de
// cualquier captura recortada por `data-shot`.
import ErrorSummary from '../src/components/feedback/ErrorSummary.vue'

// ── La zona pública (landing + las 7 pantallas de sesión) ─────────────────
// `AuthField` es el componente que la reparación de nivel A cambió entero: el
// `<label>` ganó `for`, el error pasó de `<span role="alert">` suelto a un `<p>`
// con icono dentro de una región viva persistente, y dos colores cambiaron de
// token por contraste (`--pub-err-tx` → `--pub-err-tx-2` en el error,
// `--pub-ink-400` → `--pub-ink-500` en la pista). Nada de eso lo veía ninguna
// captura: la galería no cargaba `public-auth.css`.
//
// Se monta el componente REAL, por el mismo motivo que los campos de la app: el
// color vive en la hoja, pero la geometría —hueco, tamaños, el icono del
// error— vive en su `<style scoped>`, y un campo dibujado a mano aquí tendría
// los colores buenos y ninguna forma.
//
// `AuthInput` se usa SIN `icon` y sin `type="password"` a propósito: los dos
// caminos pintan `<v-icon>`, y esta galería no monta Vuetify (no monta ningún
// plugin, que es lo que la mantiene determinista).
import AuthField from '../src/components/public/AuthField.vue'
import AuthInput from '../src/components/public/AuthInput.vue'
import type { ErrorSummaryItem } from '../src/components/feedback/ErrorSummary.vue'
import BaseTabs from '../src/components/ui/BaseTabs.vue'
import type { TabItem } from '../src/components/ui/tabs'
import { productCategoryTone } from '../src/features/tienda/composables/categoryTone'
import type { AnimalResponse } from '../src/features/dashboard/views/consulta/nueva/types/animal.types'
import type { CashSessionStatus, MethodTotal } from '../src/features/caja/types/caja'

/**
 * Catálogo de todo lo que la capa visual promete.
 *
 * Cada bloque lleva `data-shot`: es la unidad que Playwright captura. Se
 * fotografía bloque a bloque y no la página entera porque una diferencia en el
 * primero desplazaría todo lo de abajo y una sola regresión saldría como
 * quince — el informe dejaría de decir DÓNDE está el cambio.
 *
 * Al añadir una primitiva a `primitives.css`, añádela también aquí: lo que no
 * está en la galería no tiene red.
 */

/** Valores fijos para los campos públicos: la captura no puede depender de nada vivo. */
const pubTexto = ref('Clínica Veterinaria Guau')
const pubConError = ref('')
const pubConPista = ref('900123456')

const doses = [
  { savedId: undefined, date: '2026-08-12', label: 'Drontal Plus', sub: '1 comp. / 10 kg' },
  { savedId: 41, date: '2026-08-01', label: 'Bravecto', sub: 'Dosis única' },
]

// ── Datos fijos ───────────────────────────────────────────────────────────
// Todo lo que la galería pinta está escrito aquí: ni red, ni store, ni reloj.
// Una fecha calculada con `new Date()` bastaría para que la captura cambiara
// mañana y la suite se volviera ruido.

/** El `v-model` de los controles de filtro, con texto para que se vea escrito. */
const query = ref('Amoxicilina')
const queryVacia = ref('')
const categoria = ref('alimento')
const pestana = ref<'active' | 'paused'>('active')
const tipoMov = ref<'in' | 'out'>('in')

const PESTANAS = [
  { value: 'active', label: 'Activos' },
  { value: 'paused', label: 'Pausados' },
] as const

const TIPOS_MOV = [
  { value: 'in', label: 'Entrada' },
  { value: 'out', label: 'Salida' },
] as const

/** Solo se leen `name`, `specie`, `breed` y `owner`: el resto es relleno del tipo. */
const animal = {
  id: 7,
  name: 'Kira',
  code: 'A-0007',
  specie: { id: 1, name: 'Canino' },
  breed: { id: 3, name: 'Beagle' },
  owner: { id: 11, name: 'Ana Restrepo', document: '1017254398' },
} as AnimalResponse

const animalSinDueno = { ...animal, owner: null } as unknown as AnimalResponse

const totales: MethodTotal[] = [
  { method: 'CASH', expectedAmount: 250_000 },
  { method: 'CARD', expectedAmount: 90_000 },
  { method: 'TRANSFER', expectedAmount: 35_000 },
]

const sesiones: { id: number; sede: string; terminal: string; estado: CashSessionStatus }[] = [
  { id: 12, sede: 'Sede Norte', terminal: 'Caja 1', estado: 'OPEN' },
  { id: 11, sede: 'Sede Centro', terminal: 'Caja 2', estado: 'CLOSED' },
]

// ── Valores de los campos ─────────────────────────────────────────────────
// Escritos, no vacíos, salvo donde el estado que se retrata ES el hueco: un
// campo con texto y uno con placeholder pintan colores distintos y los dos
// tienen que entrar en la misma imagen.
const campoTexto = ref('Kira')
const campoVacio = ref('')
const campoPeso = ref('12.4')
const campoInvalido = ref('ana.restrepo')
const campoBloqueado = ref('A-0007')
const campoNotas = ref('Paciente estable; sin hallazgos relevantes en la exploración.')
const campoEspecie = ref('canino')

const ESPECIES = [
  { value: 'canino', label: 'Canino' },
  { value: 'felino', label: 'Felino' },
]

// ── Las cuatro tiras de pestañas ──────────────────────────────────────────
// Una por firma real, porque lo que distingue a estas tiras no es la pestaña
// suelta sino el CONJUNTO: contador contra punto de estado, con icono contra sin
// icono, y el desbordamiento horizontal, que es la única propiedad de la
// primitiva que solo se ve cuando la tira no cabe.
//
// El raíl inferior y los márgenes NO se pintan aquí a propósito: son chrome del
// anfitrión (`.cash-tabs` en `CajaView`, `.tabs` en `CuentasListaView`) y en
// `ReportesView` ni siquiera existen. Dibujarlos en la galería sería fotografiar
// una decisión que la primitiva no toma.
type TabCaja = 'mine' | 'open' | 'history'
const tabCaja = ref<TabCaja>('open')
const TABS_CAJA: TabItem<TabCaja>[] = [
  { value: 'mine', label: 'Mi caja abierta', dot: true },
  { value: 'open', label: 'Cajas abiertas', badge: 2 },
  { value: 'history', label: 'Historial', badge: 128 },
]

type TabCuentas = 'activas' | 'cerradas'
const tabCuentas = ref<TabCuentas>('activas')
const TABS_CUENTAS: TabItem<TabCuentas>[] = [
  { value: 'activas', label: 'Activas', icon: Receipt, badge: 3 },
  { value: 'cerradas', label: 'Cerradas', icon: Check, badge: 41 },
]

type TabReportes = 'libro' | 'concil'
const tabReportes = ref<TabReportes>('libro')
const TABS_REPORTES: TabItem<TabReportes>[] = [
  { value: 'libro', label: 'Libro de ventas', icon: BarChart3 },
  { value: 'concil', label: 'Conciliación DIAN', icon: ShieldCheck },
]

/** Más pestañas de las que caben en 860 px: retrata el desbordamiento. */
const tabLarga = ref('a')
// Dos resúmenes y no uno: el encabezado se declina en singular y plural, y esa
// rama sólo se ve con un item frente a varios.
const ERRORES: ErrorSummaryItem[] = [
  { id: 'g-err-nombre', text: 'El nombre es obligatorio' },
  { id: 'g-err-doc', text: 'El documento debe tener entre 6 y 15 dígitos' },
  { id: 'g-err-correo', text: 'El correo no tiene un formato válido' },
]
const ERROR_UNICO: ErrorSummaryItem[] = [{ id: 'g-err-nombre', text: 'El nombre es obligatorio' }]

const TABS_LARGA: TabItem<string>[] = [
  { value: 'a', label: 'Libro de ventas' },
  { value: 'b', label: 'Conciliación DIAN' },
  { value: 'c', label: 'Documentos emitidos', badge: 1204 },
  { value: 'd', label: 'Notas crédito', badge: 12 },
  { value: 'e', label: 'Resoluciones vigentes' },
  { value: 'f', label: 'Contingencia' },
]
</script>

<template>
  <main class="gallery">
    <!-- ── Botones ────────────────────────────────────────────────────── -->
    <section data-shot="botones">
      <h2>Botones</h2>
      <div class="row">
        <button class="ds-btn ds-btn--primary">Guardar</button>
        <button class="ds-btn ds-btn--ghost">Cancelar</button>
        <button class="ds-btn ds-btn--neutral">Neutro</button>
        <button class="ds-btn ds-btn--danger">Eliminar</button>
        <button class="ds-btn ds-btn--danger-solid">Anular</button>
        <button class="ds-btn ds-btn--plain">Plano</button>
      </div>
      <div class="row">
        <button class="ds-btn ds-btn--primary ds-btn--sm">Pequeño</button>
        <button class="ds-btn ds-btn--primary ds-btn--lg">Grande</button>
        <button class="ds-btn ds-btn--primary" disabled>Deshabilitado</button>
      </div>
    </section>

    <!-- ── Botón de icono ─────────────────────────────────────────────── -->
    <section data-shot="icon-btn">
      <h2>Botón de icono</h2>
      <div class="row">
        <button class="ds-icon-btn" aria-label="Editar"><Pencil :size="14" /></button>
        <button class="ds-icon-btn ds-icon-btn--danger" aria-label="Eliminar">
          <Trash2 :size="14" />
        </button>
        <button class="ds-icon-btn" aria-label="Deshabilitado" disabled>
          <Pencil :size="14" />
        </button>
      </div>
    </section>

    <!-- ── Avisos ─────────────────────────────────────────────────────── -->
    <section data-shot="banners">
      <h2>Avisos</h2>
      <div class="ds-banner ds-banner--info">Selecciona una sede para ver su stock.</div>
      <div class="ds-banner ds-banner--success">Consulta guardada correctamente.</div>
      <div class="ds-banner ds-banner--warning">Hay 3 lotes por vencer este mes.</div>
      <div class="ds-banner ds-banner--error">No se pudo conectar con el servidor.</div>
      <div class="ds-banner ds-banner--info ds-banner--sm">Variante compacta.</div>
      <p class="ds-server-error">El documento ya fue anulado (409).</p>
    </section>

    <!-- ── Tarjetas y paneles ─────────────────────────────────────────── -->
    <section data-shot="tarjetas">
      <h2>Tarjetas y paneles</h2>
      <div class="row">
        <div class="ds-card">
          <h3 class="ds-title">Tarjeta</h3>
          <p class="ds-subtitle">Con título y subtítulo.</p>
        </div>
        <div class="ds-card ds-card--flat">
          <h3 class="ds-title">Plana</h3>
        </div>
        <div class="ds-card ds-card--tight">
          <h3 class="ds-title">Compacta</h3>
        </div>
      </div>
      <div class="ds-panel">Panel</div>
    </section>

    <!-- ── Tipografía ─────────────────────────────────────────────────── -->
    <section data-shot="tipografia">
      <h2>Tipografía</h2>
      <p class="ds-display">Display</p>
      <p class="ds-display ds-display--sm">Display pequeño</p>
      <p class="ds-title">Título</p>
      <p class="ds-subtitle">Subtítulo</p>
      <p class="ds-label">Etiqueta</p>
      <p class="ds-truncate" style="width: 180px">
        Texto muy largo que se debe cortar con puntos suspensivos al final
      </p>
    </section>

    <!-- ── Estados vacíos ─────────────────────────────────────────────── -->
    <section data-shot="vacios">
      <h2>Estados vacíos</h2>
      <div class="ds-empty">Sin resultados.</div>
      <div class="ds-empty ds-empty--boxed">Sin resultados, con caja.</div>
      <div class="ds-empty ds-empty--lg">Sin resultados, grande.</div>
    </section>

    <!-- ── Rejillas ───────────────────────────────────────────────────── -->
    <section data-shot="rejillas">
      <h2>Rejillas</h2>
      <div class="ds-grid-2">
        <div class="ds-card ds-card--tight">Uno</div>
        <div class="ds-card ds-card--tight">Dos</div>
        <div class="ds-card ds-card--tight ds-grid-span">Ancho completo</div>
      </div>
      <dl class="ds-detail-grid">
        <dt>Propietario</dt>
        <dd>Ana Restrepo</dd>
        <dt>Documento</dt>
        <dd>1017254398</dd>
      </dl>
    </section>

    <!-- ── Campos de formulario ───────────────────────────────────────── -->
    <!--
      A11Y-09 / A11Y-10. Hasta aquí la galería no fotografiaba NI UN campo:
      cubría botones, avisos, tarjetas, tipografía, vacíos y rejillas, y la
      superficie de formulario —siete primitivas por cuatro estados, el borde de
      control, el texto tenue del placeholder y el anillo de foco— se podía
      romper entera sin que una sola línea base se moviera.

      Los estados van en UN bloque y no en seis a propósito: lo que hay que
      poder comparar de un vistazo es el borde de reposo contra el de error
      contra el deshabilitado. En capturas separadas esa comparación se pierde,
      y es justo la que decide si un cambio de token es correcto.

      El foco NO cabe aquí porque exige interacción; vive en sus propios casos
      del spec, igual que el hover del botón de icono.
    -->
    <section data-shot="campos">
      <h2>Campos de formulario</h2>

      <!-- Reposo. Es el PRIMER tabulable del bloque: el caso del anillo de
           foco del disparador de select parte de aquí y tabula una vez. -->
      <BaseField v-slot="{ id }" label="Nombre del paciente" required>
        <BaseInput :id="id" v-model="campoTexto" data-testid="campo-texto" />
      </BaseField>

      <!-- Disparador de select en reposo: mismo borde, otro control. -->
      <BaseField v-slot="{ id }" label="Especie">
        <BaseSelect
          :id="id"
          v-model="campoEspecie"
          :options="ESPECIES"
          data-testid="campo-select"
        />
      </BaseField>

      <!-- Placeholder: texto tenue DENTRO del control (`--warm-500`). -->
      <BaseField v-slot="{ id }" label="Microchip">
        <BaseInput :id="id" v-model="campoVacio" placeholder="15 dígitos, sin espacios" />
      </BaseField>

      <!-- Pista: `.ds-hint`, texto tenue FUERA del control. Va con sufijo
           porque el sufijo también es `.ds-hint` y comparte el mismo tono. -->
      <BaseField v-slot="{ id }" label="Peso" hint="En kilogramos, con un decimal.">
        <BaseInput :id="id" v-model="campoPeso" suffix="kg" />
      </BaseField>

      <!-- Inválido + mensaje de error: `.ds-field-invalid` (borde y fondo) más
           el rojo del mensaje. El temblor lo apaga el spec. -->
      <BaseField v-slot="{ id }" label="Correo" error="Falta el signo @.">
        <BaseInput :id="id" v-model="campoInvalido" invalid data-testid="campo-invalido" />
      </BaseField>

      <!-- Deshabilitado: `.ds-field-disabled` cambia fondo y texto pero
           CONSERVA el borde neutro, así que retrata el token de borde. -->
      <BaseField v-slot="{ id }" label="Código">
        <BaseInput :id="id" v-model="campoBloqueado" disabled />
      </BaseField>

      <!-- Área de texto: la tercera geometría de la familia. -->
      <BaseField v-slot="{ id }" label="Observaciones">
        <BaseTextarea :id="id" v-model="campoNotas" :rows="2" />
      </BaseField>
    </section>

    <!-- ── Texto tenue por superficie ─────────────────────────────────── -->
    <!--
      A11Y-10 se midió sobre blanco y esta aplicación no tiene ni una superficie
      blanca: el texto tenue se apoya sobre `--warm-50` (página y campo),
      `--warm-100` (`.ds-panel`), `--warm-150` (hundido) y `--amatista-50`
      (seleccionado), y el contraste real es distinto en cada una. Ese es el
      caso que se midió mal, y hasta ahora no había forma de VERLO.

      Las cuatro tarjetas son la MISMA `.ds-panel` y sólo se les sustituye el
      fondo en línea, así que lo único que varía entre ellas —y por tanto lo
      único que un diff puede señalar— es la superficie. Aquí sí se usan tokens
      a propósito: la superficie no es la regla con la que se mide, es lo medido.
    -->
    <section data-shot="texto-tenue">
      <h2>Texto tenue por superficie</h2>

      <div class="ds-panel ds-stack ds-stack--8" style="background: var(--warm-50)">
        <span>Sobre --warm-50 · superficie de página y de campo</span>
        <span class="ds-meta">.ds-meta · dato de apoyo bajo un título</span>
        <span class="ds-hint">.ds-hint · nota de ayuda, el tamaño más pequeño</span>
        <span class="ds-meta-dark">.ds-meta-dark · un tono más oscuro</span>
        <span class="ds-label">.ds-label · etiqueta en versalitas</span>
      </div>

      <div class="ds-panel ds-stack ds-stack--8">
        <span>Sobre --warm-100 · `.ds-panel` sin sustituir el fondo</span>
        <span class="ds-meta">.ds-meta · dato de apoyo bajo un título</span>
        <span class="ds-hint">.ds-hint · nota de ayuda, el tamaño más pequeño</span>
        <span class="ds-meta-dark">.ds-meta-dark · un tono más oscuro</span>
        <span class="ds-label">.ds-label · etiqueta en versalitas</span>
      </div>

      <div class="ds-panel ds-stack ds-stack--8" style="background: var(--warm-150)">
        <span>Sobre --warm-150 · superficie hundida</span>
        <span class="ds-meta">.ds-meta · dato de apoyo bajo un título</span>
        <span class="ds-hint">.ds-hint · nota de ayuda, el tamaño más pequeño</span>
        <span class="ds-meta-dark">.ds-meta-dark · un tono más oscuro</span>
        <span class="ds-label">.ds-label · etiqueta en versalitas</span>
      </div>

      <div class="ds-panel ds-stack ds-stack--8" style="background: var(--amatista-50)">
        <span>Sobre --amatista-50 · fila y opción seleccionadas</span>
        <span class="ds-meta">.ds-meta · dato de apoyo bajo un título</span>
        <span class="ds-hint">.ds-hint · nota de ayuda, el tamaño más pequeño</span>
        <span class="ds-meta-dark">.ds-meta-dark · un tono más oscuro</span>
        <span class="ds-label">.ds-label · etiqueta en versalitas</span>
      </div>
    </section>

    <!-- ── Componentes reales ─────────────────────────────────────────── -->
    <section data-shot="existing-items">
      <h2>Lista de ítems ya agregados</h2>
      <ExistingItemsSection
        :items="doses"
        title="Ya agregadas"
        noun="desparasitación"
        :editing-index="null"
      >
        <template #main="{ item }">{{ item.date }} · {{ item.label }}</template>
        <template #sub="{ item }">{{ item.sub }}</template>
      </ExistingItemsSection>
    </section>

    <!-- ══ FE-08 · los 16 componentes extraídos ═══════════════════════════
         No son bloques de primitivas: son las piezas compartidas del POS, de
         la caja y de los modales de acciones. Se agrupan por la pantalla de la
         que salieron, y no una por componente, porque lo que hay que vigilar
         es cómo quedan JUNTOS —el alto de la barra de filtros, la alineación
         de la columna numérica—, que es justo lo que se pierde al repartir un
         marcado copiado entre varios componentes. -->

    <!-- ── POS · barra de filtros ─────────────────────────────────────── -->
    <section data-shot="pos-filtros">
      <h2>Tienda · barra de filtros</h2>
      <!-- La composición real de `InventoryProductsTable`: buscador que crece
           hasta su tope, dos desplegables y el conmutador de pestañas. -->
      <div class="bar">
        <SearchField v-model="query" fill placeholder="Buscar nombre, SKU o proveedor…" />
        <FilterSelect v-model="categoria">
          <option value="alimento">Alimento</option>
          <option value="higiene">Higiene</option>
        </FilterSelect>
        <SegTabs v-model="pestana" :options="PESTANAS" />
      </div>
      <!-- Y la métrica de modal, que es la otra mitad del par de tamaños: si
           las dos convergieran, esta fila delataría el cambio. -->
      <div class="bar">
        <SearchField v-model="queryVacia" size="sm" placeholder="Buscar producto…" />
        <FilterSelect v-model="categoria" size="sm">
          <option value="alimento">Alimento</option>
        </FilterSelect>
        <SegTabs v-model="tipoMov" :options="TIPOS_MOV" size="md" />
      </div>
    </section>

    <!-- ── POS · celdas y acciones de tabla ───────────────────────────── -->
    <section data-shot="pos-celdas">
      <h2>Tienda · celdas y acciones</h2>
      <div class="row">
        <CategoryPill :tone="productCategoryTone({ id: 1, name: 'Alimento' })" label="Alimento" />
        <CategoryPill :tone="productCategoryTone({ id: 2, name: 'Higiene' })" label="Higiene" />
        <CategoryPill
          :tone="productCategoryTone({ id: 99, name: 'Personalizada' })"
          label="Personalizada"
        />
      </div>
      <div class="row">
        <TonePill
          :tone="{
            bg: 'oklch(94% 0.06 150)',
            fg: 'oklch(40% 0.12 150)',
            dot: 'oklch(60% 0.15 150)',
          }"
        >
          En stock
        </TonePill>
        <TonePill
          :tone="{ bg: 'oklch(94% 0.07 80)', fg: 'oklch(45% 0.13 70)', dot: 'oklch(65% 0.15 70)' }"
        >
          Stock bajo
        </TonePill>
        <TonePill
          :tone="{ bg: 'oklch(94% 0.06 25)', fg: 'oklch(48% 0.18 25)', dot: 'oklch(60% 0.2 25)' }"
        >
          Agotado
        </TonePill>
      </div>
      <!-- Los tres estados de la diferencia de un conteo, juntos: el color es
           la señal que el operador mira, y tienen que distinguirse entre sí. -->
      <div class="row">
        <DiffCell :value="0" />
        <DiffCell :value="-4" />
        <DiffCell :value="7" />
      </div>
      <div class="row">
        <AccentButton><RotateCcw :size="13" /> Reactivar</AccentButton>
        <AccentButton size="md"><Plus :size="14" /> Nueva categoría</AccentButton>
        <LinkButton>Historial</LinkButton>
      </div>
    </section>

    <!-- ── POS · pies de tabla ────────────────────────────────────────── -->
    <section data-shot="pos-pies">
      <h2>Tienda · exportación y paginación</h2>
      <div class="ancho">
        <ExportBar label="Descargar kardex" />
        <ExportBar label="Descargar libro de compras" disabled />
        <PagerBar
          label="134 productos · página 2 de 7"
          :prev-disabled="false"
          :next-disabled="false"
          size="md"
        />
        <PagerBar label="1–20 de 45" prev-disabled :next-disabled="false" />
      </div>
    </section>

    <!-- ── Caja · panel con tabla ─────────────────────────────────────── -->
    <section data-shot="caja-panel">
      <h2>Caja · panel e historial</h2>
      <div class="ancho">
        <CajaPanel title="Historial de cajas" :icon="History">
          <template #count>2 sesiones</template>
          <!-- Las clases de celda (`.ds-num`, `.branch-name`, `.empty-row`) las
               pone el consumidor y el armazón las alcanza con `:deep()`. Esta
               captura es la única prueba de que ese cruce de ámbitos sigue
               funcionando: la cabecera va a la IZQUIERDA aunque la columna sea
               numérica, que es el empate de especificidad que se replicó a
               propósito al extraer el componente.

               La cifra viaja en `.ds-num` (primitives.css) y ya no en un `.num`
               local: `CashTable` dejó de declararlo cuando FE-08 lo subió al
               sistema de diseño, y los tres paneles reales de caja
               (`CajaHistoryPanel`, `CajaOpenSessionsPanel`, `CashMovementsTable`)
               marcan así sus celdas. La galería tiene que pedir lo mismo que
               pide la aplicación o deja de probar nada. -->
          <CashTable :min-width="520">
            <thead>
              <tr>
                <th>Sede</th>
                <th>Terminal</th>
                <th>Estado</th>
                <th class="ds-num">Base</th>
                <th class="ds-num">Arqueo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sesiones" :key="s.id">
                <td class="branch-name">{{ s.sede }}</td>
                <td class="employee">{{ s.terminal }}</td>
                <td><CashStatusPill :status="s.estado" /></td>
                <td class="ds-num">$ 100.000</td>
                <td class="ds-num">
                  <CashLinkButton>CSV</CashLinkButton>
                  <CashLinkButton>PDF</CashLinkButton>
                </td>
              </tr>
            </tbody>
          </CashTable>
        </CajaPanel>

        <!-- `tight` es la única diferencia real entre las dos copias que
             `CajaPanel` fundió: dos píxeles de padding, deliberados. -->
        <CajaPanel title="Cajas abiertas" tight>
          <template #count>1 abierta</template>
          <CashTable :min-width="320">
            <tbody>
              <tr>
                <td class="empty-row">No hay cajas abiertas.</td>
              </tr>
            </tbody>
          </CashTable>
        </CajaPanel>
      </div>
    </section>

    <!-- ── Caja · rejilla de totales ──────────────────────────────────── -->
    <section data-shot="caja-totales">
      <h2>Caja · totales de la sesión</h2>
      <div class="ancho">
        <CashTotalsGrid :opening-float="100000" :totals="totales" />
        <!-- La misma rejilla en el arqueo, donde cada rótulo lleva
             "(esperado)". El sufijo alarga el texto y es donde se vería un
             desbordamiento si la tarjeta encogiera. -->
        <CashTotalsGrid :opening-float="100000" :totals="totales" expected />
      </div>
    </section>

    <!-- ── Acciones · ficha del paciente fijado ───────────────────────── -->
    <section data-shot="acciones-paciente">
      <h2>Acciones · paciente fijado</h2>
      <div class="ancho">
        <!-- Las dos ramas y la precedencia, en el orden en que las resuelve el
             componente. La tercera es la de arriba con los dos datos: debe
             salir idéntica a la primera. -->
        <PatientFixedCard :summary="{ name: 'Maple', code: 'A-0099' }" />
        <PatientFixedCard :animal="animal" />
        <PatientFixedCard :animal="animalSinDueno" />
        <PatientFixedCard :summary="{ name: 'Maple', code: 'A-0099' }" :animal="animal" />
      </div>
    </section>

    <!-- ── Estado vacío DENTRO de una tabla ───────────────────────────── -->
    <section data-shot="vacios-en-tabla">
      <h2>Estado vacío dentro de una tabla</h2>
      <!-- El bloque «vacios» captura `.ds-empty` SUELTA, donde nadie le disputa
           nada. Pero la familia `.ds-empty*` casi siempre vive en un
           `<td colspan>`, y ahí siempre ha tenido rival: primero
           `.table td` (0,2,1) de la hoja scoped de cada vista, y hoy
           `.ds-table td` (0,1,1) de la primitiva. Contra `.ds-empty` (0,1,0)
           ganaban los dos, así que la primitiva estuvo INERTE en la celda
           durante meses sin que ninguna captura lo notara.

           Estas dos tablas reproducen el marcado REAL de los 8 archivos ya
           migrados, y lo que fijan es que las excepciones acotadas
           `.ds-table td.ds-empty*` (0,2,1) siguen ganando. Si alguien las
           quitara, o `.ds-table td` subiera de peso, la celda vacía volvería a
           confundirse con una fila de datos y este bloque sería el único que
           lo diría.

           Ojo al escribirlo: el marcado tiene que ser el de la aplicación. Este
           bloque nació copiando a mano el `.table td` de las vistas, y cuando
           esas vistas migraron a `.ds-table` se quedó midiendo una competencia
           que ya no existía en ningún archivo. -->

      <!-- Firma "pantalla": InventoryProductsTable, InventoryPausedTable,
           ImpuestosView y MedicamentosView. La fila vacía usa `--lg`. -->
      <table class="ds-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>SKU</th>
            <th class="ds-num">Precio</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Amoxicilina 500 mg</td>
            <td>Medicamento</td>
            <td>MED-0031</td>
            <td class="ds-num">$ 18.500</td>
          </tr>
          <tr>
            <td colspan="4" class="ds-empty ds-empty--lg">Sin productos para el filtro.</td>
          </tr>
        </tbody>
      </table>

      <!-- Firma "modal" (`--dense`): CountsHistoryModal, StockDetailModal y
           PurchasesModal. Sin `--lg`. La excepción no se repite para `--dense`
           porque esta variante siempre viaja junto a `.ds-table` en el mismo
           elemento, y este bloque es lo que comprueba que esa suposición se
           sostiene. -->
      <table class="ds-table ds-table--dense">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Vence</th>
            <th class="ds-num">Existencia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="3" class="ds-empty">Sin lotes con existencia.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ── Tira de pestañas ───────────────────────────────────────────── -->
    <!--
      Issue #198. `BaseTabs` es la primitiva que menos se parece a lo que la
      galería tenía: no es una clase de `primitives.css` que se pueda dibujar a
      mano, sino un componente con estado —cuál está activa— del que dependen
      caja, cuentas y reportes. Cambiar su `padding`, su `border-bottom` o el
      tono del contador repinta las tres pantallas de golpe y ninguna captura lo
      veía, porque las tres pantallas piden backend y sesión y por eso no están
      en la galería.

      Las cuatro tiras cubren, entre todas, lo que la primitiva SÍ decide:
      tipografía y caja de la pestaña, estado activo (`.ds-tab--active` contra
      `.tab-off`), contador (`.count` con `.ds-tone--accent` en la activa y
      `.ds-tone--neutral` en las demás), punto de estado (`.ds-status-dot`),
      icono delante del rótulo y desbordamiento horizontal con la barra oculta.

      No se monta `BaseTabPanel`: no tiene `<style>` propio —su caja se la pone
      el anfitrión por `class`— así que no hay un solo píxel suyo que un diff
      pueda proteger. Cada tira lleva su `name` para que los ids no colisionen
      entre bloques de esta misma página.
    -->
    <section data-shot="tabs">
      <h2>Tira de pestañas</h2>
      <div class="ancho">
        <!-- Firma «caja»: punto de estado en la primera y contadores en las
             otras dos. Es la única de las tres con `dot`. -->
        <BaseTabs
          v-model="tabCaja"
          :tabs="TABS_CAJA"
          name="galeria-caja"
          tablist-label="Secciones de caja"
        />

        <!-- Firma «cuentas»: icono + rótulo + contador, con la activa en
             `--accent` y la de reposo en `--neutral`. -->
        <BaseTabs
          v-model="tabCuentas"
          :tabs="TABS_CUENTAS"
          name="galeria-cuentas"
          tablist-label="Estado de las cuentas"
        />

        <!-- Firma «reportes»: icono sin contador. La combinación más escueta,
             donde se ve el hueco entre icono y rótulo sin nada que lo tape. -->
        <BaseTabs
          v-model="tabReportes"
          :tabs="TABS_REPORTES"
          name="galeria-reportes"
          tablist-label="Reportes de facturación electrónica"
        />

        <!-- Desbordamiento: más pestañas de las que caben en el ancho fijo del
             bloque. `overflow-x: auto` con `scrollbar-width: none` es propiedad
             de la primitiva, y sin una tira que no quepa no se retrata nunca. -->
        <BaseTabs
          v-model="tabLarga"
          :tabs="TABS_LARGA"
          name="galeria-larga"
          tablist-label="Tira que no cabe"
        />
      </div>
    </section>

    <!-- ── Resumen de errores (FORM-05) ──────────────────────────────── -->
    <!--
      Se monta `ErrorSummary.vue` y no marcado con clases sueltas: el
      componente aplica `.ds-banner`, `.ds-banner--error` y
      `.ds-error-summary` JUNTAS, y el color de la primitiva del resumen es
      heredado a propósito del banner. Redibujarlo a mano aquí fotografiaría una
      herencia que la aplicación no monta así.
    -->
    <section data-shot="resumen-de-errores">
      <h2>Resumen de errores</h2>
      <div class="ancho-medio">
        <ErrorSummary :items="ERRORES" />
        <ErrorSummary :items="ERROR_UNICO" />
      </div>
    </section>

    <!-- ── Diálogos ──────────────────────────────────────────────────── -->
    <!--
      Las cuatro `.ds-dialog-*` cambiaron en la tanda de modales y ninguna
      captura las veía. No se montan sus consumidores (`AppConfirmDialog`,
      `ResumeOrNewConsultaDialog`) porque los dos teleportan a `body`:
      saldrían del `section` y el recorte por `data-shot` los perdería.

      El escenario NO redeclara nada de la primitiva. `.ds-dialog-overlay` es
      `position: fixed`, así que se le da un bloque contenedor con
      `transform: translateZ(0)` — el truco estándar — y el overlay resuelve
      su `inset: 0` contra la caja del escenario en vez de contra el viewport.
      Así el fondo translúcido y el `backdrop-filter` que declara la primitiva
      se retratan tal cual, y por eso el escenario lleva texto detrás: sin algo que
      desenfocar, un cambio en el desenfoque no movería un solo píxel.
    -->
    <section data-shot="dialogos">
      <h2>Diálogos</h2>

      <!-- Ancho normal (440 px) con icono teñido, cuerpo y par de acciones. -->
      <div class="dialog-stage">
        <p class="dialog-fondo">
          Contenido de la pantalla que queda detrás del velo. Está aquí para que el desenfoque del
          overlay tenga algo que desenfocar.
        </p>
        <div class="ds-dialog-overlay">
          <div class="ds-dialog-card">
            <div class="ds-dialog-icon ds-tone--accent">
              <PawPrint :size="22" :stroke-width="1.8" />
            </div>
            <h3 class="ds-title">¿Eliminar la vacuna?</h3>
            <p class="ds-dialog-body">
              Se borrará el registro de <strong class="ds-text-strong">Rabia trivalente</strong>
              del historial de Canela. Esta acción no se puede deshacer.
            </p>
            <div class="ds-actions">
              <button type="button" class="ds-btn ds-btn--ghost">Cancelar</button>
              <button type="button" class="ds-btn ds-btn--primary">Eliminar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- La variante ancha (480 px). Es la única diferencia declarada entre
           las dos, así que van seguidas: lo que hay que poder comparar es el
           salto de ancho, no cada tarjeta por su cuenta. -->
      <div class="dialog-stage">
        <p class="dialog-fondo">
          Contenido de la pantalla que queda detrás del velo. Está aquí para que el desenfoque del
          overlay tenga algo que desenfocar.
        </p>
        <div class="ds-dialog-overlay">
          <div class="ds-dialog-card ds-dialog-card--wide">
            <div class="ds-dialog-icon ds-tone--accent">
              <History :size="22" :stroke-width="1.8" />
            </div>
            <h3 class="ds-title">Tienes una consulta en marcha</h3>
            <p class="ds-dialog-body">
              Estás registrando una consulta para
              <strong class="ds-text-strong">Ana Restrepo</strong> y su mascota
              <strong class="ds-text-strong">Canela</strong>. ¿Quieres retomarla donde la dejaste o
              empezar una nueva desde cero?
            </p>
            <div class="ds-actions">
              <button type="button" class="ds-btn ds-btn--ghost">Crear una nueva</button>
              <button type="button" class="ds-btn ds-btn--primary">Retomar</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Tonos ──────────────────────────────────────────────────────── -->
    <!--
      La familia `.ds-tone--*` completa. Entra ahora porque `.ds-tone--warning`
      es primitiva NUEVA (petición de la especificación de suscripción §9.2: el
      catálogo cubría éxito, peligro, neutro y acento, y no aviso) y la regla de
      esta galería es que lo que no está aquí no tiene red.

      Se pinta sobre `.ds-pill`, que es como la consumen sus dos usos reales —el
      «Datos con retraso» de un cupo y el estado de una cuenta de cobro—: un tono
      suelto sin forma no retrata el contraste real del texto sobre su fondo.
    -->
    <section data-shot="tonos">
      <h2>Tonos</h2>
      <div class="row">
        <span class="ds-pill ds-tone--accent">Acento</span>
        <span class="ds-pill ds-tone--success">Al día</span>
        <span class="ds-pill ds-tone--warning">Datos con retraso</span>
        <span class="ds-pill ds-tone--danger">Vencida</span>
        <span class="ds-pill ds-tone--neutral">Borrador</span>
      </div>
    </section>

    <!-- ── Zona pública: campos ───────────────────────────────────────── -->
    <!--
      Los cuatro estados de `AuthField` + `AuthInput`. El envoltorio `.pub-scope`
      no es decorativo: `public-auth.css` declara sus variables AHÍ y no en
      `:root`, así que un campo montado fuera de él saldría con los colores de
      respaldo y la captura no retrataría nada.
    -->
    <section data-shot="publico-campos">
      <h2>Zona pública · campos</h2>
      <div class="pub-scope pub-campos">
        <AuthField label="Nombre de la clínica" required>
          <AuthInput v-model="pubTexto" placeholder="Clínica Veterinaria" />
        </AuthField>

        <AuthField label="NIT" required hint="Sin dígito de verificación ni puntos.">
          <AuthInput v-model="pubConPista" placeholder="900123456" />
        </AuthField>

        <AuthField label="Correo" required error="Ese correo ya está registrado.">
          <AuthInput v-model="pubConError" placeholder="clinica@correo.com" invalid />
        </AuthField>

        <AuthField label="Comentario" counter="120 / 500">
          <AuthInput v-model="pubTexto" placeholder="Opcional" />
        </AuthField>

        <p class="pub-error">No pudimos crear la cuenta. Vuelve a intentarlo en un minuto.</p>
      </div>
    </section>

    <!-- ── Zona pública: la tarjeta de plan ───────────────────────────── -->
    <!--
      `.pub-plan-card`, `.pub-badge` y `.pub-price` en marcado, no montando
      `PlanCard.vue`: ese componente contiene un `RouterLink` y aquí no hay
      router. La sustitución es fiel porque estas tres formas declaran TODA su
      geometría y su color en `public-auth.css` — borde, radio, sombra, fondo,
      tipografía—, a diferencia de los campos, cuya forma vive en el SFC.

      Lo que este bloque vigila es el borde de 2 px de la recomendada: es el
      indicador de estado de §1.4.11, y `--pub-line` (1,23:1) no llega al 3:1
      que exige. Un retoque que lo devolviera al borde tenue se ve aquí.
    -->
    <section data-shot="publico-plan">
      <h2>Zona pública · tarjeta de plan</h2>
      <div class="pub-scope pub-planes">
        <article class="pub-plan-card">
          <h3 class="pub-plan-h3">Esencial</h3>
          <p class="pub-price">$89.000</p>
        </article>
        <article class="pub-plan-card pub-plan-card--featured">
          <p class="pub-badge">La que más eligen</p>
          <h3 class="pub-plan-h3">Clínica</h3>
          <p class="pub-price">$179.000</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Andamiaje de la galería. Deliberadamente mínimo y sin tokens: si esta hoja
   usara variables del design system, un cambio en los tokens movería a la vez
   lo medido y la regla con la que se mide. */
.gallery {
  padding: 24px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #666;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

section > .ds-banner,
section > .ds-server-error,
section > .ds-empty,
section > .ds-grid-2,
section > .ds-panel,
section > [data-shot],
section > div:not(.row, .bar, .ancho) {
  width: 560px;
}

/* ── Andamiaje de los bloques de FE-08 ───────────────────────────────────
   Los componentes extraídos son piel, no layout: su colocación y su ancho se
   los pone el anfitrión, así que aquí hay que dárselos igual que se los daría
   una pantalla. Un ancho fijo, además, es lo que hace la captura repetible:
   con ancho automático, cambiar una etiqueta movería el bloque entero. */
.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 860px;
}

.ancho {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  width: 860px;
}

/* Andamiaje del bloque de diálogos. Sólo caja: ni un color, ni un radio, ni una
   sombra — todo eso es lo que el bloque mide y tiene que venir de
   `primitives.css`. El `transform` no es decorativo: es lo que convierte
   al escenario en bloque contenedor de un descendiente `position: fixed`. */
.dialog-stage {
  position: relative;
  transform: translateZ(0);
  /* El ancho NO se declara aquí: lo pone la regla común de bloques sueltos
     (560 px), y la tarjeta ancha mide 480, así que cabe con margen. */
  height: 340px;
  overflow: hidden;
  background: #fff;
}

.dialog-fondo {
  margin: 0;
  padding: 20px;
  font-size: 15px;
  line-height: 1.5;
  color: #444;
}

/* Andamiaje de los dos bloques de la zona pública. Solo caja: ni un color, ni un
   radio, ni una tipografía — todo eso es lo que estos bloques miden y tiene que
   venir de `public-auth.css`. */
.pub-campos {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 420px;
  padding: 20px;
  background: #fff;
}

.pub-planes {
  display: flex;
  align-items: stretch;
  gap: 18px;
  width: 620px;
  padding: 20px;
  background: #fff;
}

.pub-planes .pub-plan-card {
  flex: 1;
}

/* El `<h3>` de la tarjeta lo estila `PlanCard.vue` en su `<style scoped>`, que
   aquí no aplica. Se le da solo tamaño y peso para que la caja tenga el alto
   que tiene en producción; lo que este bloque mide es el borde y la sombra. */
.pub-plan-h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
}

/* Mismo ancho que el resto de bloques sueltos, en columna para que los dos
   resúmenes se comparen uno encima del otro. */
.ancho-medio {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 560px;
}

/* Lo ÚNICO que la galería le pone a las tablas es un ancho fijo, para que la
   captura no dependa de cuánto ocupe el texto. Ni padding, ni color, ni
   `text-align`: todo eso tiene que venir de `primitives.css`, porque es
   justamente lo que este bloque mide. Una regla local sobre `td` aquí falsearía
   el empate — que es el error que este bloque ya cometió una vez. */
.ds-table {
  width: 860px;
}
</style>
