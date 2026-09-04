<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Check, MapPin, Plus, Receipt, Search } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { useQuerySync } from '@/composables/useQuerySync'
import OpenAccountModal from '../components/OpenAccountModal.vue'
import AccountCard from '../components/AccountCard.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import BaseTabPanel from '@/components/ui/BaseTabPanel.vue'
import type { TabItem } from '@/components/ui/tabs'
import type { OpenAccountResponse, OpenAccountStatus } from '../types/cuentas'

const store = useCuentas()
const router = useRouter()
const branchStore = useBranchStore()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.OPEN_ACCOUNT_CREATE)

/**
 * EST-07: la pestaña y el buscador viven en la URL, no en dos `ref` sueltos.
 * Antes, cambiar de pestaña y volver perdía la búsqueda, y no había forma de
 * pasarle a un compañero «las cuentas cerradas de Milo». El debounce es el mismo
 * que ya tenía el buscador (300 ms): aquí retrasa la escritura de la URL, y
 * abajo, la consulta al servidor.
 */
const { state: filtros } = useQuerySync({ q: '', estado: 'activas' }, { debounceMs: 300 })
/** Se normaliza porque el valor entra por la URL y puede venir escrito a mano. */
const tab = computed<'activas' | 'cerradas'>(() =>
  filtros.estado === 'cerradas' ? 'cerradas' : 'activas',
)

const openAccountOpen = ref(false)

// Activas = cuentas abiertas (OPEN); Cerradas = cobradas (CLOSE) o canceladas (CANCEL).
// La pestaña es un filtro del servidor, no un `filter` sobre el array: con la lista paginada
// filtrar en cliente solo vería las páginas ya cargadas (BE-06).
const STATUSES_BY_TAB: Record<'activas' | 'cerradas', OpenAccountStatus[]> = {
  activas: ['OPEN'],
  cerradas: ['CLOSE', 'CANCEL'],
}

const {
  items: accounts,
  loading,
  error: listError,
  isEmpty,
  reload: reloadList,
  observe,
} = useInfiniteList<OpenAccountResponse>((page, pageSize, signal) =>
  store.searchPage({ statuses: STATUSES_BY_TAB[tab.value], q: filtros.q, page, pageSize }, signal),
)

const sentinel = ref<HTMLElement | null>(null)
onMounted(() => {
  void reloadList()
  void store.loadSummary()
})
// El centinela se monta con la lista, así que se (re)observa cuando aparece.
watch(sentinel, (el) => observe(el))

// Cambiar de pestaña descarta lo acumulado: son dos listados distintos del servidor.
watch(tab, () => void reloadList())

// El buscador va al servidor con debounce; sin él se dispararía una consulta por tecla.
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => filtros.q,
  () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => void reloadList(), 300)
  },
)
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

watch(
  () => branchStore.selectedBranchId,
  () => {
    openAccountOpen.value = false
    void reloadList()
  },
)

const isSearching = computed(() => filtros.q.trim().length > 0)

const errorDeCarga = computed(() => store.error.value ?? listError.value)

// Contadores y saldo pendiente vienen del servidor: sumarlos sobre la página cargada daría
// el total de lo que se ha scrolleado, no el de la empresa.
const summary = store.summary
const totalPending = computed(() => summary.value.totalOutstanding)

/**
 * Los iconos viajan en el descriptor: `BaseTabs` los pinta delante del rótulo.
 * El contador de activas sigue apareciendo solo cuando hay alguna, como antes.
 */
const tabs = computed<TabItem<'activas' | 'cerradas'>[]>(() => [
  {
    value: 'activas',
    label: 'Activas',
    icon: Receipt,
    badge: summary.value.openCount > 0 ? summary.value.openCount : undefined,
  },
  { value: 'cerradas', label: 'Cerradas', icon: Check, badge: summary.value.closedCount },
])

/** El detalle es una RUTA: así «atrás» vuelve aquí y el enlace es compartible. */
function selectAccount(acc: OpenAccountResponse) {
  void router.push({ name: 'cuentas-detalle', params: { accountId: String(acc.id) } })
}

// ── Abrir cuenta ─────────────────────────────────────────────────────────────
function openCreateModal() {
  openAccountOpen.value = true
}

function onAccountCreated(account: OpenAccountResponse) {
  openAccountOpen.value = false
  void store.loadSummary()
  selectAccount(account)
}
</script>

<template>
  <PageHeader
    kicker="Facturación"
    title="Cuentas"
    lead="Cuentas a crédito administradas por sede. Los cargos se agrupan por mascota."
  >
    <template #action>
      <button
        v-if="canCreate && branchStore.selectedBranchId != null"
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated ds-btn--nowrap"
        @click="openCreateModal"
      >
        <Plus :size="16" :stroke-width="1.8" /> Abrir cuenta
      </button>
    </template>
  </PageHeader>

  <!-- EST-01: la rama de error va ANTES que la de vacío; las de abajo se
       apagan mientras esté puesta, o la pantalla que falló afirma que la
       empresa no tiene cuentas. -->
  <div v-if="errorDeCarga" class="ds-banner ds-banner--error" role="alert">
    {{ errorDeCarga }}
  </div>
  <div
    v-if="canCreate && branchStore.selectedBranchId == null"
    class="banner branch-warning ds-flex-row"
  >
    <MapPin :size="15" :stroke-width="1.8" />
    Selecciona una sede para abrir o agregar cargos a una cuenta.
  </div>

  <BaseTabs
    :model-value="tab"
    :tabs="tabs"
    name="cuentas"
    tablist-label="Estado de las cuentas"
    class="tabs"
    @update:model-value="filtros.estado = $event"
  />

  <BaseTabPanel name="cuentas" :value="tab">
    <div v-if="tab === 'activas' && summary.openCount > 0" class="alert">
      <Receipt :size="15" :stroke-width="1.8" />
      <span>
        <strong>{{ summary.openCount }}</strong>
        {{ summary.openCount === 1 ? 'cuenta abierta' : 'cuentas abiertas' }}
        · saldo acumulado pendiente <strong>{{ formatMoney(totalPending) }}</strong>
      </span>
    </div>

    <input
      v-model="filtros.q"
      type="text"
      class="search ds-focus-ring"
      placeholder="Buscar por propietario o documento…"
    />

    <!-- EST-05: la primera carga pinta el hueco de las tarjetas, no un velo que
         tapa la pantalla entera. Cabecera, pestañas y buscador siguen usables, y
         el usuario ve dónde va a aparecer el contenido. `aria-hidden` porque el
         esqueleto no dice nada: el anuncio lo da el `role="status"` de abajo. -->
    <div v-if="loading && accounts.length === 0" class="cards" aria-hidden="true">
      <div v-for="n in 4" :key="n" class="sk-card">
        <div class="ds-skeleton ds-skeleton--text sk-title"></div>
        <div class="ds-skeleton ds-skeleton--text sk-line"></div>
        <div class="ds-skeleton ds-skeleton--text sk-line sk-line--short"></div>
      </div>
    </div>
    <div v-else-if="!errorDeCarga && isEmpty && isSearching" class="empty-state">
      <div class="empty-ic ds-tone--accent-soft"><Search :size="28" :stroke-width="1.5" /></div>
      <div class="empty-title">Sin resultados</div>
      <p class="empty-desc ds-meta-dark">
        Ninguna cuenta {{ tab === 'activas' ? 'activa' : 'cerrada' }} coincide con tu búsqueda.
      </p>
    </div>
    <div v-else-if="!errorDeCarga && isEmpty" class="empty-state">
      <div class="empty-ic ds-tone--accent-soft"><Receipt :size="28" :stroke-width="1.5" /></div>
      <div class="empty-title">
        {{ tab === 'activas' ? 'Sin cuentas activas' : 'Sin cuentas cerradas' }}
      </div>
      <p class="empty-desc ds-meta-dark">
        {{
          tab === 'activas'
            ? 'Abre una cuenta para acumular cargos.'
            : 'Las cuentas cobradas o canceladas aparecerán aquí.'
        }}
      </p>
    </div>
    <div v-else class="cards">
      <AccountCard
        v-for="acc in accounts"
        :key="acc.id"
        :account="acc"
        @click="selectAccount(acc)"
      />
    </div>

    <!-- WCAG 2.2 §4.1.3: el cambio de estado se anuncia sin mover el foco.
         `status` (polite) y no `alert`: es una carga, no una interrupción. -->
    <p class="ds-sr-only" role="status">{{ loading ? 'Cargando cuentas…' : '' }}</p>

    <!-- Centinela del scroll infinito: al entrar en viewport pide la página siguiente. -->
    <div v-if="!isEmpty" ref="sentinel" class="sentinel" aria-hidden="true">
      <span v-if="loading && accounts.length > 0">Cargando más…</span>
    </div>
  </BaseTabPanel>

  <!-- ABRIR CUENTA -->
  <OpenAccountModal
    :open="openAccountOpen"
    @close="openAccountOpen = false"
    @created="onAccountCreated"
  />
</template>

<style scoped>
/* El contenedor y los botones usan `.ds-page` / `.ds-btn` (primitives.css). */

/* El banner de error usa `.ds-banner--error` (primitives.css). Este otro tiene
   tonos propios (hue 70/80 distintos a los del sistema) y se deja como está. */
.banner.branch-warning {
  background: oklch(96% 0.04 80deg);
  border: 1px solid oklch(88% 0.08 80deg);
  color: oklch(42% 0.09 70deg);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}

/* Tabs Activas / Cerradas. La pestaña entera —icono, rótulo, contador y estado
   activo— la pinta `BaseTabs`; aquí queda solo la caja de la tira, que es de
   esta pantalla. Esta regla es justo la que se habría perdido en silencio con
   la raíz `display: contents` de la primera versión de la primitiva: el
   `data-v-…` de esta vista viaja a la raíz del hijo, y esa raíz tiene que
   existir como caja para que el margen signifique algo. */
.tabs {
  border-bottom: 1px solid var(--warm-200);
  margin-bottom: 16px;
}

/* Estado vacío por tab */
.empty-state {
  padding: 56px 20px;
  text-align: center;
  background: var(--warm-50);
  border: 1px dashed var(--warm-300);
  border-radius: 14px;
}
.empty-ic {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
.empty-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}
.empty-desc {
  margin: 0;
}
.alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  margin-bottom: 16px;
  background: var(--warning-50);
  border: 1px solid var(--warning-border);
  border-radius: 10px;
  font-size: 13px;
  color: oklch(40% 0.1 70deg);
}
.alert strong {
  color: oklch(35% 0.13 70deg);
}

.search {
  width: 100%;
  max-width: 360px;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 10px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
  margin-bottom: 16px;
}

/* Centinela del scroll infinito. Ocupa alto para que el observer lo detecte antes del borde. */
.sentinel {
  min-height: 40px;
  display: grid;
  place-items: center;
  font-size: 12.5px;
  color: var(--warm-500);
}

/* Tarjetas de lista: `auto-fill` con mínimo de 300px para que una sola cuenta
   no ocupe todo el ancho. */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

/* Hueco de una tarjeta durante la primera carga. Las mismas medidas que
   `AccountCard` para que el contenido real no dé un salto al llegar. */
.sk-card {
  padding: 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  display: grid;
  gap: 10px;
}
.sk-title {
  width: 62%;
  height: 15px;
}
.sk-line {
  width: 100%;
}
.sk-line--short {
  width: 40%;
}

/* La tarjeta de cuenta y sus 11 reglas viven en `AccountCard.vue`. */
</style>
