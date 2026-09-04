<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { BarChart3, ShieldCheck } from 'lucide-vue-next'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useScrollableRegion } from '@/composables/useScrollableRegion'
import { useBranches } from '@/features/branches/composables/useBranches'
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import { salesReportApi } from '../api/salesReport.api'
import { feMoney } from '../composables/feFormat'
import {
  DOC_TYPE_LABEL,
  PAYMENT_MEANS_LABEL,
  type ElectronicDocumentType,
  type PaymentMeans,
  type ReconciliationResponse,
  type SalesBookResponse,
} from '../types/facturacion'
import FeStatusPill from '../components/FeStatusPill.vue'
import FeUpsell from '../components/FeUpsell.vue'
import DateInput from '@/components/ui/DateInput.vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import BaseTabPanel from '@/components/ui/BaseTabPanel.vue'
import type { TabItem } from '@/components/ui/tabs'

const { hasModule } = useFacturacionAccess()
const { selectedBranchId } = useBranches()

type Tab = 'libro' | 'concil'
const tab = ref<Tab>('libro')

/** Los iconos son parte de la pestaña y viajan en el descriptor (issue #185). */
const tabs: TabItem<Tab>[] = [
  { value: 'libro', label: 'Libro de ventas', icon: BarChart3 },
  { value: 'concil', label: 'Conciliación DIAN', icon: ShieldCheck },
]

function firstOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const from = ref(firstOfMonth())
const to = ref(today())

const book = ref<SalesBookResponse | null>(null)
const recon = ref<ReconciliationResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    if (tab.value === 'libro') book.value = await salesReportApi.salesBook(from.value, to.value)
    else recon.value = await salesReportApi.reconciliation(from.value, to.value)
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo cargar el reporte')
  } finally {
    loading.value = false
  }
}

function setTab(t: Tab) {
  tab.value = t
  void load()
}

function docTypeLabel(dt: string): string {
  return DOC_TYPE_LABEL[dt as ElectronicDocumentType] ?? dt
}
function meansLabel(m: string): string {
  return PAYMENT_MEANS_LABEL[m as PaymentMeans] ?? m
}

const porTarifa = useTemplateRef<HTMLElement>('porTarifa')
const porTarifaDesborda = useScrollableRegion(porTarifa)
const porMedio = useTemplateRef<HTMLElement>('porMedio')
const porMedioDesborda = useScrollableRegion(porMedio)
const documentos = useTemplateRef<HTMLElement>('documentos')
const documentosDesborda = useScrollableRegion(documentos)
const atencion = useTemplateRef<HTMLElement>('atencion')
const atencionDesborda = useScrollableRegion(atencion)

// Multi-sucursal: recargar el reporte al cambiar la sede seleccionada.
watch(selectedBranchId, () => {
  if (hasModule) void load()
})

onMounted(() => {
  if (hasModule) void load()
})
</script>

<template>
  <FeUpsell v-if="!hasModule" />
  <div v-else class="ds-page ds-page--stack">
    <header class="pagehead">
      <div>
        <div class="ds-kicker">Facturación electrónica · DIAN</div>
        <h1 class="ds-display fe-title">Reportes</h1>
      </div>
    </header>

    <div class="repfilters">
      <BaseTabs
        :model-value="tab"
        :tabs="tabs"
        name="reportes"
        tablist-label="Reportes de facturación electrónica"
        @update:model-value="setTab"
      />
      <div class="daterange ds-flex-row">
        <DateInput v-model="from" :max="to" @update:model-value="load" />
        <span class="ds-icon-muted--dim">→</span>
        <DateInput v-model="to" :min="from" @update:model-value="load" />
      </div>
    </div>

    <BaseTabPanel name="reportes" :value="tab" class="ds-stack ds-stack--18">
      <div v-if="error" class="ds-banner ds-banner--error" role="alert">{{ error }}</div>
      <div v-if="loading" class="loading">Cargando reporte…</div>

      <!-- Libro de ventas -->
      <template v-else-if="tab === 'libro' && book">
        <div class="cards">
          <div class="rep-card ds-stack">
            <span>Documentos</span><strong>{{ book.totals.documentCount }}</strong>
          </div>
          <div class="rep-card ds-stack">
            <span>Base</span><strong>{{ feMoney(book.totals.base) }}</strong>
          </div>
          <div class="rep-card ds-stack">
            <span>IVA</span><strong>{{ feMoney(book.totals.iva) }}</strong>
          </div>
          <div class="rep-card hl ds-stack">
            <span>Total</span><strong>{{ feMoney(book.totals.total) }}</strong>
          </div>
        </div>

        <div class="cols">
          <div class="ds-card">
            <div class="card-title">Impuestos por tarifa</div>
            <div
              ref="porTarifa"
              class="ds-table-scroll ds-focus-ring"
              role="region"
              aria-label="Impuestos por tarifa"
              :tabindex="porTarifaDesborda ? 0 : undefined"
            >
              <table class="minitable">
                <thead>
                  <tr>
                    <th>Esquema</th>
                    <th>Tarifa</th>
                    <th class="ds-num">Base</th>
                    <th class="ds-num">Impuesto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in book.taxByRate" :key="i">
                    <td>{{ r.taxScheme }}</td>
                    <td>{{ r.taxRate }}%</td>
                    <td class="ds-num">{{ feMoney(r.taxableAmount) }}</td>
                    <td class="ds-num">{{ feMoney(r.taxAmount) }}</td>
                  </tr>
                  <tr v-if="book.taxByRate.length === 0">
                    <td colspan="4" class="ds-empty">Sin datos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="ds-card">
            <div class="card-title">Recaudo por medio de pago</div>
            <div
              ref="porMedio"
              class="ds-table-scroll ds-focus-ring"
              role="region"
              aria-label="Recaudo por medio de pago"
              :tabindex="porMedioDesborda ? 0 : undefined"
            >
              <table class="minitable">
                <thead>
                  <tr>
                    <th>Medio</th>
                    <th class="ds-num">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in book.recaudoByMeans" :key="i">
                    <td>{{ meansLabel(r.paymentMeans) }}</td>
                    <td class="ds-num">{{ feMoney(r.amount) }}</td>
                  </tr>
                  <tr v-if="book.recaudoByMeans.length === 0">
                    <td colspan="2" class="ds-empty">Sin datos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="ds-card">
          <div class="card-title">Documentos del periodo</div>
          <div
            ref="documentos"
            class="ds-table-scroll ds-focus-ring"
            role="region"
            aria-label="Documentos del periodo"
            :tabindex="documentosDesborda ? 0 : undefined"
          >
            <table class="minitable">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th class="ds-num">Base</th>
                  <th class="ds-num">IVA</th>
                  <th class="ds-num">Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in book.entries" :key="e.id">
                  <td>
                    <span class="num">{{ e.prefix }}-{{ e.consecutive }}</span>
                  </td>
                  <td>{{ docTypeLabel(e.documentType) }}</td>
                  <td class="date">{{ e.issueDate }}</td>
                  <td>{{ e.customerName || '—' }}</td>
                  <td class="ds-num">{{ feMoney(e.base) }}</td>
                  <td class="ds-num">{{ feMoney(e.iva) }}</td>
                  <td class="ds-num ds-strong">{{ feMoney(e.total) }}</td>
                  <td><FeStatusPill :status="e.dianStatus" /></td>
                </tr>
                <tr v-if="book.entries.length === 0">
                  <td colspan="8" class="ds-empty">Sin documentos en el rango.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Conciliación -->
      <template v-else-if="tab === 'concil' && recon">
        <div class="cards">
          <div class="rep-card ds-stack">
            <span>Validados</span
            ><strong style="color: var(--success-dot)">{{ recon.validados }}</strong>
          </div>
          <div class="rep-card ds-stack">
            <span>Pendientes</span
            ><strong style="color: oklch(50% 0.16 240deg)">{{ recon.pendientes }}</strong>
          </div>
          <div class="rep-card ds-stack">
            <span>En contingencia</span
            ><strong style="color: var(--warning-border)">{{ recon.contingencia }}</strong>
          </div>
          <div class="rep-card ds-stack">
            <span>Rechazados</span
            ><strong style="color: var(--danger-500)">{{ recon.rechazados }}</strong>
          </div>
        </div>

        <div class="ds-card">
          <div class="card-title">Requieren atención ({{ recon.needsAttention.length }})</div>
          <div v-if="recon.needsAttention.length === 0" class="ds-empty pad">
            Todos los documentos del periodo están validados.
          </div>
          <div
            v-else
            ref="atencion"
            class="ds-table-scroll ds-focus-ring"
            role="region"
            aria-label="Documentos que requieren atención"
            :tabindex="atencionDesborda ? 0 : undefined"
          >
            <table class="minitable">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in recon.needsAttention" :key="d.id">
                  <td>
                    <span class="num">{{ d.prefix }}-{{ d.consecutive }}</span>
                  </td>
                  <td>{{ docTypeLabel(d.documentType) }}</td>
                  <td class="date">{{ d.issueDate }}</td>
                  <td><FeStatusPill :status="d.dianStatus" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </BaseTabPanel>
  </div>
</template>

<style scoped>
/* El layout se apoya en primitivas: `.ds-stack` (cuerpo de cada tarjeta),
   `.ds-flex-row` (rango de fechas), `.ds-kicker` (rótulo de sección),
   `.ds-card` (superficie de los bloques) y `.ds-empty` (estado vacío).
   Aquí sólo queda lo que no es primitiva. */

/* Rejilla propia: 4 columnas con un escalón intermedio de 2 en 1024px. */
.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

@media (width <= 1024px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 760px) {
  .cards {
    grid-template-columns: 1fr;
  }
}

.pagehead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.repfilters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

/* La tira de pestañas es `BaseTabs` y no lleva caja propia aquí: va DENTRO de
   `.repfilters`, como un elemento más de la fila de filtros, y por eso —a
   diferencia de caja y cuentas— no se le cuelga ni raíl ni margen. El panel es
   su hermano `BaseTabPanel`, fuera de la fila, que es exactamente lo que el
   slot `panel` de la primitiva no permitía expresar. */

.daterange :deep(.date-wrap) {
  width: 170px;
}

.loading {
  padding: 30px;
  text-align: center;
  color: var(--warm-500);
  font-size: 13px;
}

/* `gap: 6px` no está en el catálogo de `.ds-stack--*`, así que queda aquí. */
.rep-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  padding: 16px 18px;
  gap: 6px;
}

.rep-card span {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
}

.rep-card strong {
  font-size: 24px;
  font-family: var(--font-display);
  font-weight: 400;
  color: var(--warm-900);
}

.rep-card.hl {
  background: linear-gradient(135deg, var(--amatista-50), var(--warm-50));
  border-color: var(--amatista-200);
}

.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.card-title {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
  margin-bottom: 10px;
}

.minitable {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.minitable th {
  text-align: left;
  font-weight: 500;
  color: var(--warm-500);
  padding: 6px 8px;
  border-bottom: 1px solid var(--warm-200);
}

/* `.minitable th` (0,2,1) le gana a `.ds-num` (0,1,0): la excepción nombra la
   clase para pesar (0,2,2) y que la cabecera caiga sobre sus cifras. */
.minitable th.ds-num {
  text-align: right;
}

.minitable td {
  padding: 8px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-800);
}

.num {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--amatista-700);
  font-weight: 600;
}

.date {
  color: var(--warm-500);
  font-variant-numeric: tabular-nums;
}

.pad {
  padding: 24px 12px;
}

/* El titular usa `.ds-display`; sólo conserva su separación superior. */
.fe-title {
  margin-top: var(--space-6);
}

/* Override mínimo sobre `.ds-card`. */
.ds-card {
  padding: 18px 20px;
}

/* Los estados vacíos de esta vista no llevan padding de base; `.pad` lo añade
   donde hace falta. */
.ds-empty {
  padding: 0;
}
</style>
