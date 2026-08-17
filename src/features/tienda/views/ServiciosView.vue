<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Package, PauseCircle, Pencil, Plus, RotateCcw } from 'lucide-vue-next'
import ConfirmDeleteDialog from '@/components/feedback/ConfirmDeleteDialog.vue'
import ServiceFormModal from '../components/ServiceFormModal.vue'
import CategoryManagerModal from '../components/CategoryManagerModal.vue'
import AccentButton from '../components/AccentButton.vue'
import CategoryPill from '../components/CategoryPill.vue'
import FilterSelect from '../components/FilterSelect.vue'
import SearchField from '../components/SearchField.vue'
import SegTabs from '../components/SegTabs.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney } from '../composables/pricing'
import { serviceCategoryTone } from '../composables/categoryTone'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import type { ServiceResponse } from '../types/tienda'

const CONFLICT_MESSAGE =
  'El registro fue modificado por otra operación; se recargó la información. Revisa y reintenta.'

const store = useTienda()
const toast = useToast()
const { can, canAny } = useAuthorization()
const canCreate = can(PERMISSIONS.SERVICE_CREATE)
const canUpdate = can(PERMISSIONS.SERVICE_UPDATE)
const canDelete = can(PERMISSIONS.SERVICE_DELETE)
const canCatCreate = can(PERMISSIONS.SERVICE_CATEGORY_CREATE)
const canCatUpdate = can(PERMISSIONS.SERVICE_CATEGORY_UPDATE)
const canCatDelete = can(PERMISSIONS.SERVICE_CATEGORY_DELETE)
const canManageCategories = canAny(
  PERMISSIONS.SERVICE_CATEGORY_CREATE,
  PERMISSIONS.SERVICE_CATEGORY_UPDATE,
  PERMISSIONS.SERVICE_CATEGORY_DELETE,
)

/** 'active' = catálogo vivo; 'paused' = servicios pausados (enabled=false) para reactivar. */
const mode = ref<'active' | 'paused'>('active')

const query = ref('')
const cat = ref('')
const modalOpen = ref(false)
const editing = ref<ServiceResponse | null>(null)
const pausing = ref<ServiceResponse | null>(null)
const pausingBusy = ref(false)
const pausedLoading = ref(false)
const categoriesOpen = ref(false)

onMounted(() => store.reload())

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return store.services.value.filter((s) => {
    if (cat.value && String(s.serviceCategory.id) !== cat.value) return false
    if (q && !s.name.toLowerCase().includes(q)) return false
    return true
  })
})

const groups = computed(() => {
  const map = new Map<number, { id: number; name: string; items: ServiceResponse[] }>()
  for (const s of filtered.value) {
    const g = map.get(s.serviceCategory.id) ?? {
      id: s.serviceCategory.id,
      name: s.serviceCategory.name,
      items: [],
    }
    g.items.push(s)
    map.set(s.serviceCategory.id, g)
  }
  return Array.from(map.values())
})

const categoryCounts = computed<Record<number, number>>(() => {
  const counts: Record<number, number> = {}
  for (const s of store.services.value)
    counts[s.serviceCategory.id] = (counts[s.serviceCategory.id] ?? 0) + 1
  return counts
})

async function switchMode(m: 'active' | 'paused') {
  if (mode.value === m) return
  mode.value = m
  if (m === 'paused') {
    pausedLoading.value = true
    try {
      await store.loadPausedServices()
    } catch (e) {
      toast.error(
        'Ocurrió un error',
        getProblemDetailMessage(e, 'No se pudieron cargar los pausados'),
      )
    } finally {
      pausedLoading.value = false
    }
  }
}

function openNew() {
  editing.value = null
  modalOpen.value = true
}
function onRowClick(s: ServiceResponse) {
  // Fila editable solo con permiso de actualización.
  if (canUpdate.value) editing.value = s
}
function onSaved(item: ServiceResponse) {
  const wasEdit = editing.value !== null
  toast.success(
    'Servicio guardado',
    wasEdit ? 'Los cambios se guardaron.' : `${item.name} se añadió.`,
  )
}
function onFormClose() {
  modalOpen.value = false
  editing.value = null
}

/** Pausar = soft-delete (DELETE → enabled=false). Recuperable desde "Pausados". */
async function onConfirmPause() {
  const target = pausing.value
  if (!target) return
  pausingBusy.value = true
  try {
    await store.removeService(target.id)
    toast.info('Servicio pausado', `${target.name} dejó de aparecer en el punto de venta.`)
    pausing.value = null
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo pausar')
  } finally {
    pausingBusy.value = false
  }
}

async function onReactivate(s: ServiceResponse) {
  try {
    await store.enableService(s.id)
    toast.success('Servicio reactivado', `${s.name} volvió al catálogo activo.`)
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo reactivar')
  }
}

async function onCategoryUpsert(p: {
  id: number | null
  name: string
  description: string
  version?: number
}) {
  try {
    if (p.id) await store.updateServiceCategory(p.id, p.name, p.description, p.version ?? 0)
    else await store.createServiceCategory(p.name, p.description)
    toast.success('Categoría guardada')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      await store.refresh()
      toast.warn('Conflicto de concurrencia', CONFLICT_MESSAGE)
    } else {
      toast.errorFrom('Ocurrió un error', e, 'No se pudo guardar la categoría')
    }
  }
}
async function onCategoryRemove(id: number) {
  try {
    await store.removeServiceCategory(id)
    toast.info('Categoría eliminada')
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo eliminar la categoría')
  }
}
</script>

<template>
  <div class="ds-page">
    <header class="ds-head">
      <div>
        <div class="kicker">Tienda · Servicios</div>
        <h1 class="ds-display">Servicios ofrecidos</h1>
      </div>
      <div class="head-actions">
        <SegTabs
          :model-value="mode"
          :options="[
            { value: 'active', label: 'Activos' },
            { value: 'paused', label: 'Pausados' },
          ]"
          @update:model-value="switchMode"
        />
        <button
          v-if="canManageCategories"
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--nowrap"
          @click="categoriesOpen = true"
        >
          <Package :size="14" :stroke-width="1.8" /> Categorías
        </button>
        <button
          v-if="canCreate && mode === 'active'"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--elevated ds-btn--nowrap"
          @click="openNew"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nuevo servicio
        </button>
      </div>
    </header>

    <div v-if="store.error.value" class="ds-banner ds-banner--error">{{ store.error.value }}</div>

    <!-- ─────────── Modo ACTIVOS ─────────── -->
    <template v-if="mode === 'active'">
      <div class="filters">
        <SearchField v-model="query" fill placeholder="Buscar servicio…" />
        <FilterSelect v-model="cat">
          <option value="">Todas las categorías</option>
          <option v-for="c in store.serviceCategories.value" :key="c.id" :value="String(c.id)">
            {{ c.name }}
          </option>
        </FilterSelect>
      </div>

      <div v-if="store.loading.value" class="state ds-empty">Cargando…</div>
      <div v-else-if="groups.length === 0" class="state ds-empty">
        Sin servicios para el filtro.
      </div>

      <section v-for="g in groups" v-else :key="g.id" class="svc-group">
        <div class="svc-group-head">
          <CategoryPill :tone="serviceCategoryTone(g)" :label="g.name" />
          <span class="ds-meta">{{ g.items.length }}</span>
        </div>
        <div class="svc-list">
          <div v-for="s in g.items" :key="s.id" class="svc-row" @click="onRowClick(s)">
            <div class="ds-flex-fill">
              <div class="svc-name">{{ s.name }}</div>
              <div v-if="s.notes" class="svc-sub ds-meta">{{ s.notes }}</div>
            </div>
            <div class="svc-price ds-strong">{{ formatMoney(s.price) }}</div>
            <div class="svc-actions" @click.stop>
              <button
                v-if="canUpdate"
                type="button"
                class="ds-icon-btn"
                title="Editar"
                @click="editing = s"
              >
                <Pencil :size="14" :stroke-width="1.7" />
              </button>
              <button
                v-if="canDelete"
                type="button"
                class="ds-icon-btn"
                title="Pausar"
                @click="pausing = s"
              >
                <PauseCircle :size="14" :stroke-width="1.7" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- ─────────── Modo PAUSADOS ─────────── -->
    <template v-else>
      <p class="paused-hint">
        Servicios pausados (ocultos del punto de venta). Reactívalos para volver a ofrecerlos.
      </p>
      <div v-if="pausedLoading" class="state ds-empty">Cargando…</div>
      <div v-else-if="store.pausedServices.value.length === 0" class="state ds-empty">
        No hay servicios pausados.
      </div>
      <div v-else class="svc-list">
        <div v-for="s in store.pausedServices.value" :key="s.id" class="svc-row static">
          <div class="ds-flex-fill">
            <div class="svc-name">{{ s.name }}</div>
            <div class="svc-sub ds-meta">{{ s.serviceCategory.name }}</div>
          </div>
          <div class="svc-price ds-strong">{{ formatMoney(s.price) }}</div>
          <div class="svc-actions">
            <AccentButton v-if="canDelete" @click="onReactivate(s)">
              <RotateCcw :size="14" :stroke-width="1.7" /> Reactivar
            </AccentButton>
          </div>
        </div>
      </div>
    </template>

    <ServiceFormModal
      :open="modalOpen || editing !== null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />
    <CategoryManagerModal
      :open="categoriesOpen"
      title="Categorías de servicio"
      :categories="store.serviceCategories.value"
      :counts="categoryCounts"
      :can-create="canCatCreate"
      :can-update="canCatUpdate"
      :can-delete="canCatDelete"
      @close="categoriesOpen = false"
      @upsert="onCategoryUpsert"
      @remove="onCategoryRemove"
    />
    <ConfirmDeleteDialog
      :open="pausing !== null"
      title="Pausar servicio"
      action-label="Pausar"
      :message="
        pausing
          ? `${pausing.name} dejará de aparecer en el punto de venta. Podrás reactivarlo desde la pestaña “Pausados”. Las ventas ya registradas no se modifican.`
          : ''
      "
      :busy="pausingBusy"
      @cancel="pausing = null"
      @confirm="onConfirmPause"
    />
  </div>
</template>

<style scoped>
/* El contenedor usa `.ds-page` y la cabecera `.ds-head` (primitives.css). */
.kicker {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  font-weight: 500;
  margin-bottom: 6px;
}
.head-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
}
.paused-hint {
  margin: 0 0 14px;
  font-size: 12.5px;
  color: var(--warm-500);
}
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

/* `.state` es `.ds-empty` con más aire: solo sobrevive lo que se desvía. */
.state {
  padding: 48px;
  font-size: 13px;
}
.svc-group {
  margin-bottom: 18px;
}
.svc-group-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 8px;
}
.svc-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.svc-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 11px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.12s ease;
}
.svc-row:hover {
  border-color: var(--amatista-300);
}
.svc-row.static {
  cursor: default;
}
.svc-row.static:hover {
  border-color: var(--warm-200);
}
.svc-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
}

/* La nota del servicio activo y la categoría del pausado eran dos reglas con el
   mismo cuerpo: `.ds-meta` más el aire de la línea de arriba. */
.svc-sub {
  margin-top: 2px;
}
.svc-price {
  font-size: 15px;
  white-space: nowrap;
}
.svc-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
}

@media (width <= 760px) {
  .ds-head {
    align-items: stretch;
    flex-direction: column;
  }

  .head-actions,
  .filters {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  /* Los antiguos `.cta`/`.ghost-cta` son ahora `.ds-btn`; todos viven dentro
     de `.head-actions`, así que el selector sigue acotado a ellos. `.seg`,
     `.search` y `.fsel` son raíces de componente: conservan el `data-v` de esta
     vista, así que el ancho se sigue decidiendo aquí. */
  .seg,
  .head-actions .ds-btn,
  .search,
  .fsel {
    width: 100%;
    max-width: none;
  }

  .head-actions .ds-btn {
    justify-content: center;
  }

  .svc-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .svc-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
