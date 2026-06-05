<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import ServiceFormModal from '../components/ServiceFormModal.vue'
import CategoryManagerModal from '../components/CategoryManagerModal.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney } from '../composables/pricing'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { ServiceResponse } from '../types/tienda'

const store = useTienda()
const toast = useToast()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.SERVICE_CREATE)
const canUpdate = can(PERMISSIONS.SERVICE_UPDATE)
const canDelete = can(PERMISSIONS.SERVICE_DELETE)

const query = ref('')
const cat = ref('')
const modalOpen = ref(false)
const editing = ref<ServiceResponse | null>(null)
const deleting = ref<ServiceResponse | null>(null)
const deletingBusy = ref(false)
const categoriesOpen = ref(false)

onMounted(() => store.ensureLoaded())

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return store.services.value.filter((s) => {
    if (cat.value && String(s.serviceCategory.id) !== cat.value) return false
    if (q && !s.name.toLowerCase().includes(q)) return false
    return true
  })
})

const groups = computed(() => {
  const map = new Map<number, { name: string; items: ServiceResponse[] }>()
  for (const s of filtered.value) {
    const g = map.get(s.serviceCategory.id) ?? { name: s.serviceCategory.name, items: [] }
    g.items.push(s)
    map.set(s.serviceCategory.id, g)
  }
  return Array.from(map.values())
})

const categoryCounts = computed<Record<number, number>>(() => {
  const counts: Record<number, number> = {}
  for (const s of store.services.value) counts[s.serviceCategory.id] = (counts[s.serviceCategory.id] ?? 0) + 1
  return counts
})

function openNew() {
  editing.value = null
  modalOpen.value = true
}
function onSaved(item: ServiceResponse) {
  const wasEdit = editing.value !== null
  toast.success('Servicio guardado', wasEdit ? 'Los cambios se guardaron.' : `${item.name} se añadió.`)
}
function onFormClose() {
  modalOpen.value = false
  editing.value = null
}

async function onConfirmDelete() {
  const target = deleting.value
  if (!target) return
  deletingBusy.value = true
  try {
    await store.removeService(target.id)
    toast.info('Servicio eliminado', 'El servicio fue removido.')
    deleting.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo eliminar'))
  } finally {
    deletingBusy.value = false
  }
}

async function onCategoryUpsert(p: { id: number | null; name: string; description: string }) {
  try {
    if (p.id) await store.updateServiceCategory(p.id, p.name, p.description)
    else await store.createServiceCategory(p.name, p.description)
    toast.success('Categoría guardada')
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo guardar la categoría'))
  }
}
async function onCategoryRemove(id: number) {
  try {
    await store.removeServiceCategory(id)
    toast.info('Categoría eliminada')
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo eliminar la categoría'))
  }
}
</script>

<template>
  <div class="inv">
    <header class="head">
      <div>
        <div class="kicker">Tienda · Servicios</div>
        <h1 class="title">Servicios ofrecidos</h1>
      </div>
      <div class="head-actions">
        <button type="button" class="ghost-cta" @click="categoriesOpen = true">
          <Package :size="14" :stroke-width="1.8" /> Categorías
        </button>
        <button v-if="canCreate" type="button" class="cta" @click="openNew">
          <Plus :size="16" :stroke-width="1.8" /> Nuevo servicio
        </button>
      </div>
    </header>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <div class="filters">
      <div class="search">
        <Search :size="15" :stroke-width="1.7" class="s-icon" />
        <input v-model="query" type="search" placeholder="Buscar servicio…" />
      </div>
      <select v-model="cat" class="fsel">
        <option value="">Todas las categorías</option>
        <option v-for="c in store.serviceCategories.value" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
      </select>
    </div>

    <div v-if="store.loading.value" class="state">Cargando…</div>
    <div v-else-if="groups.length === 0" class="state">Sin servicios para el filtro.</div>

    <section v-for="g in groups" v-else :key="g.name" class="svc-group">
      <div class="svc-group-head">
        <span class="catpill">{{ g.name }}</span>
        <span class="svc-group-count">{{ g.items.length }}</span>
      </div>
      <div class="svc-list">
        <div v-for="s in g.items" :key="s.id" class="svc-row" @click="editing = s">
          <div class="svc-info">
            <div class="svc-name">{{ s.name }}</div>
            <div v-if="s.notes" class="svc-notes">{{ s.notes }}</div>
          </div>
          <div class="svc-price">{{ formatMoney(s.price) }}</div>
          <div class="svc-actions" @click.stop>
            <button v-if="canUpdate" type="button" class="icon-btn" title="Editar" @click="editing = s">
              <Pencil :size="14" :stroke-width="1.7" />
            </button>
            <button v-if="canDelete" type="button" class="icon-btn danger" title="Eliminar" @click="deleting = s">
              <Trash2 :size="14" :stroke-width="1.7" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <ServiceFormModal :open="modalOpen || editing !== null" :initial="editing" @close="onFormClose" @saved="onSaved" />
    <CategoryManagerModal
      :open="categoriesOpen"
      title="Categorías de servicio"
      :categories="store.serviceCategories.value"
      :counts="categoryCounts"
      @close="categoriesOpen = false"
      @upsert="onCategoryUpsert"
      @remove="onCategoryRemove"
    />
    <ConfirmDeleteDialog
      :open="deleting !== null"
      title="Eliminar servicio"
      :message="deleting ? `${deleting.name} dejará de aparecer en el punto de venta. Las ventas ya registradas no se modifican.` : ''"
      :busy="deletingBusy"
      @cancel="deleting = null"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<style scoped>
.inv { font-family: var(--font-sans); color: var(--warm-900); }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.kicker { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-500); font-weight: 500; margin-bottom: 6px; }
.title { margin: 0; font-family: var(--font-serif); font-size: 36px; font-weight: 400; letter-spacing: -0.015em; line-height: 1.05; color: var(--warm-900); }
.head-actions { display: flex; gap: 8px; flex-shrink: 0; }
.cta {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: #fff; border: none; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.45);
}
.ghost-cta {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 9px;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700); font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.ghost-cta:hover { background: var(--warm-100); }
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.filters { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.search { display: flex; align-items: center; gap: 9px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 9px; padding: 10px 13px; max-width: 340px; flex: 1; }
.search:focus-within { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.s-icon { color: var(--warm-500); flex-shrink: 0; }
.search input { flex: 1; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--warm-900); min-width: 0; }
.fsel {
  appearance: none; border: 1px solid var(--warm-200); background: var(--warm-50); border-radius: 9px;
  padding: 9px 30px 9px 12px; font-family: inherit; font-size: 13px; color: var(--warm-800); cursor: pointer;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23999' stroke-width='1.5' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 11px center;
}
.fsel:focus { outline: none; border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.state { padding: 48px; text-align: center; color: var(--warm-500); font-size: 13px; }
.svc-group { margin-bottom: 18px; }
.svc-group-head { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; }
.svc-group-count { font-size: 12px; color: var(--warm-500); }
.catpill { display: inline-flex; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 500; white-space: nowrap; background: var(--warm-150); color: var(--warm-700); }
.svc-list { display: flex; flex-direction: column; gap: 6px; }
.svc-row { display: flex; align-items: center; gap: 14px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 11px; padding: 12px 14px; cursor: pointer; transition: border-color 0.12s ease; }
.svc-row:hover { border-color: var(--amatista-300); }
.svc-info { flex: 1; min-width: 0; }
.svc-name { font-size: 14px; font-weight: 500; color: var(--warm-900); }
.svc-notes { font-size: 12px; color: var(--warm-500); margin-top: 2px; }
.svc-price { font-size: 15px; font-weight: 600; color: var(--warm-900); white-space: nowrap; }
.svc-actions { display: flex; gap: 4px; flex-shrink: 0; align-items: center; }
.icon-btn { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--warm-200); background: transparent; color: var(--warm-700); cursor: pointer; }
.icon-btn:hover { background: var(--warm-100); }
.icon-btn.danger:hover { background: oklch(95% 0.06 25); color: oklch(40% 0.18 25); border-color: oklch(85% 0.12 25); }
</style>
