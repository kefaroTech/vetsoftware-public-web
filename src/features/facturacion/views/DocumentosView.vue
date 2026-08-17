<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, History, ChevronRight } from 'lucide-vue-next'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import { useFacturacionDocs } from '../composables/useFacturacionDocs'
import { feMoney } from '../composables/feFormat'
import {
  DOC_TYPE_LABEL,
  STATUS_META,
  type DianStatus,
  type ElectronicDocumentResponse,
  type ElectronicDocumentType,
} from '../types/facturacion'
import FeStatusPill from '../components/FeStatusPill.vue'
import FeEmitModal from '../components/FeEmitModal.vue'
import FeDocumentDetail from '../components/FeDocumentDetail.vue'
import FeUpsell from '../components/FeUpsell.vue'

const { hasModule, canEmit } = useFacturacionAccess()
const { documents, searchPage } = useFacturacionDocs()

const filterType = ref<ElectronicDocumentType | ''>('')
const filterStatus = ref<DianStatus | ''>('')
const selectedId = ref<number | null>(null)
const emitOpen = ref(false)

/**
 * BE-06: los dos selectores viajan al servidor. Filtrarlos en cliente sobre una lista paginada
 * mostraría solo los documentos de las páginas ya cargadas — y ocultar documentos fiscales en
 * silencio es exactamente lo que no puede pasar aquí.
 */
const {
  items: rows,
  loading,
  error,
  isEmpty,
  reload,
  observe,
} = useInfiniteList<ElectronicDocumentResponse>((page, pageSize, signal) =>
  searchPage(
    { documentType: filterType.value, dianStatus: filterStatus.value },
    page,
    pageSize,
    signal,
  ),
)

const sentinel = ref<HTMLElement | null>(null)

onMounted(() => void reload())
watch(sentinel, (el) => observe(el))
// Cambiar de filtro descarta lo acumulado: es otra consulta, no un subconjunto de esta.
watch([filterType, filterStatus], () => void reload())

const typeOptions = (Object.keys(DOC_TYPE_LABEL) as ElectronicDocumentType[]).map((k) => ({
  value: k,
  label: DOC_TYPE_LABEL[k],
}))
const statusOptions = (Object.keys(STATUS_META) as DianStatus[]).map((k) => ({
  value: k,
  label: STATUS_META[k].label,
}))

/**
 * El detalle lee primero la caché del store: ahí queda la versión más fresca tras transmitir o
 * emitir una nota. Si el documento no se ha tocado aún, sirve el de la página cargada.
 */
const selectedDoc = computed(() => {
  const id = selectedId.value
  if (id == null) return null
  return documents.value.find((d) => d.id === id) ?? rows.value.find((d) => d.id === id) ?? null
})

function shortId(cufe: string | null, cude: string | null): string {
  const v = cufe || cude
  return v ? v.slice(0, 16) + '…' : '—'
}
</script>

<template>
  <FeUpsell v-if="!hasModule" />
  <FeDocumentDetail v-else-if="selectedDoc" :doc="selectedDoc" @back="selectedId = null" />
  <div v-else class="ds-page ds-page--stack">
    <header class="pagehead">
      <div>
        <div class="ds-kicker">Facturación electrónica · DIAN</div>
        <h1 class="ds-display fe-title">Documentos electrónicos</h1>
      </div>
    </header>

    <div class="listhead">
      <div class="filters">
        <select v-model="filterType" class="filter-select">
          <option value="">Todos los tipos</option>
          <option v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select v-model="filterStatus" class="filter-select">
          <option value="">Todos los estados</option>
          <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <button
        v-if="canEmit"
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--snug"
        @click="emitOpen = true"
      >
        <Plus :size="16" :stroke-width="2" /> Emisión manual
      </button>
    </div>

    <div class="autobanner ds-flex-row">
      <History :size="14" :stroke-width="1.8" />
      <span>
        La emisión es <strong>automática</strong> al cerrar/cobrar una venta. Usa
        <strong>Emisión manual</strong> solo para re-emitir o casos especiales.
      </span>
    </div>

    <p v-if="error" class="error-banner">{{ error }}</p>

    <div class="ds-table-scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Tipo</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th style="text-align: right">Total</th>
            <th>Estado</th>
            <th>CUFE/CUDE</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in rows" :key="d.id" class="ds-row-clickable" @click="selectedId = d.id">
            <td>
              <span class="num">{{ d.prefix }}-{{ d.consecutive }}</span>
            </td>
            <td>{{ DOC_TYPE_LABEL[d.documentType] }}</td>
            <td class="date">{{ d.issueDate }}</td>
            <td class="ds-flex-row">
              {{ d.customer.legalName || d.customer.name }}
              <span v-if="d.reversed" class="reversed">Anulada</span>
            </td>
            <td style="text-align: right; font-variant-numeric: tabular-nums">
              {{ feMoney(d.payableAmount) }}
            </td>
            <td><FeStatusPill :status="d.dianStatus" /></td>
            <td>
              <span class="cufe ds-hint">{{ shortId(d.cufe, d.cude) }}</span>
            </td>
            <td><ChevronRight :size="15" :stroke-width="1.6" class="ds-icon-muted--dim" /></td>
          </tr>
          <tr v-if="isEmpty">
            <td colspan="8" class="ds-empty">Sin documentos para los filtros aplicados.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Centinela del scroll infinito: al entrar en viewport pide la página siguiente. -->
    <div v-if="!isEmpty" ref="sentinel" class="sentinel" aria-hidden="true">
      <span v-if="loading && rows.length > 0">Cargando más…</span>
    </div>

    <FeEmitModal
      :open="emitOpen"
      @emitted="
        (doc) => {
          emitOpen = false
          selectedId = doc.id
        }
      "
      @close="emitOpen = false"
    />
  </div>
</template>

<style scoped>
/* El layout se apoya en primitivas: `.ds-flex-row` (aviso de emisión y celda
   de cliente), `.ds-row-clickable` (fila navegable), `.ds-kicker` (rótulo),
   `.ds-hint` (CUFE/CUDE) y `.ds-empty` (estado vacío). Aquí sólo queda lo que
   no es primitiva. */
.pagehead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.listhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.filters {
  display: flex;
  gap: 10px;
}

.filter-select {
  appearance: none;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 10px 30px 10px 14px;
  font-size: 13.5px;
  color: var(--warm-800);
  font-family: inherit;
  cursor: pointer;
}

.autobanner {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-100);
  font-size: 12.5px;
  color: var(--warm-700);
}

.error-banner {
  margin: 0;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--danger-50);
  border: 1px solid var(--danger-250);
  color: oklch(45% 0.16 25deg);
  font-size: 13px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

/* Centinela del scroll infinito. Con alto propio el observer lo ve antes del borde. */
.sentinel {
  min-height: 40px;
  display: grid;
  place-items: center;
  font-size: 12.5px;
  color: var(--warm-500);
}

.table th {
  text-align: left;
  font-weight: 500;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-500);
  padding: 8px 12px;
  border-bottom: 1px solid var(--warm-200);
}

.table td {
  padding: 12px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-800);
}

.num {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--amatista-700);
  font-weight: 600;
}

.date {
  color: var(--warm-500);
  font-variant-numeric: tabular-nums;
}

.reversed {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--danger-600);
  background: var(--danger-50);
  padding: 1px 7px;
  border-radius: var(--radius-pill);
}

/* El color y el tamaño los pone `.ds-hint`; aquí sólo la familia monoespaciada. */
.cufe {
  font-family: var(--font-mono);
}

/* El titular usa `.ds-display`; sólo conserva su separación superior. */
.fe-title {
  margin-top: var(--space-6);
}

/* Override mínimo sobre `.ds-empty`. */
.ds-empty {
  padding: 28px 12px;
}
</style>
