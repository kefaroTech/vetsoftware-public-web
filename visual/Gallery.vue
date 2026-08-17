<script setup lang="ts">
import { ref } from 'vue'
import { History, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-vue-next'
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
          <!-- Las clases de celda (`.num`, `.branch-name`, `.empty-row`) las
               pone el consumidor y el armazón las alcanza con `:deep()`. Esta
               captura es la única prueba de que ese cruce de ámbitos sigue
               funcionando: la cabecera va a la IZQUIERDA aunque la columna sea
               numérica, que es el empate de especificidad que se replicó a
               propósito al extraer el componente. -->
          <CashTable :min-width="520">
            <thead>
              <tr>
                <th>Sede</th>
                <th>Terminal</th>
                <th>Estado</th>
                <th class="num">Base</th>
                <th class="num">Arqueo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sesiones" :key="s.id">
                <td class="branch-name">{{ s.sede }}</td>
                <td class="employee">{{ s.terminal }}</td>
                <td><CashStatusPill :status="s.estado" /></td>
                <td class="num">$ 100.000</td>
                <td class="num">
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

/* Lo ÚNICO que la galería le pone a las tablas es un ancho fijo, para que la
   captura no dependa de cuánto ocupe el texto. Ni padding, ni color, ni
   `text-align`: todo eso tiene que venir de `primitives.css`, porque es
   justamente lo que este bloque mide. Una regla local sobre `td` aquí falsearía
   el empate — que es el error que este bloque ya cometió una vez. */
.ds-table {
  width: 860px;
}
</style>
