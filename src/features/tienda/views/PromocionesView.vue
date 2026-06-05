<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import ListBody from '@/features/acciones/components/ListBody.vue'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import PromoStatusPill from '../components/PromoStatusPill.vue'
import PromoFormModal from '../components/PromoFormModal.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney, promoStatus } from '../composables/pricing'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { ApplicationType, PromotionResponse } from '../types/tienda'

const store = useTienda()
const toast = useToast()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.PROMOTION_CREATE)
const canUpdate = can(PERMISSIONS.PROMOTION_UPDATE)
const canDelete = can(PERMISSIONS.PROMOTION_DELETE)

const modalOpen = ref(false)
const editing = ref<PromotionResponse | null>(null)
const deleting = ref<PromotionResponse | null>(null)
const deletingBusy = ref(false)

const today = todayISO()

onMounted(() => store.ensureLoaded())

const APP_LABEL: Record<ApplicationType, string> = {
  PRODUCT: 'Producto',
  SERVICE: 'Servicio',
  CATEGORY: 'Categoría',
}

function targetName(promo: PromotionResponse): string {
  if (promo.applicationType === 'PRODUCT') {
    return store.products.value.find((p) => p.id === promo.applicationItem)?.name ?? `#${promo.applicationItem}`
  }
  if (promo.applicationType === 'SERVICE') {
    return store.services.value.find((s) => s.id === promo.applicationItem)?.name ?? `#${promo.applicationItem}`
  }
  const cat =
    store.productCategories.value.find((c) => c.id === promo.applicationItem) ??
    store.serviceCategories.value.find((c) => c.id === promo.applicationItem)
  return cat?.name ?? `#${promo.applicationItem}`
}

function valueLabel(promo: PromotionResponse): string {
  if (promo.promotionType === 'SPECIAL_PRICE') return formatMoney(promo.value)
  return promo.valueType === 'PERCENTAGE' ? `${promo.value}%` : formatMoney(promo.value)
}

function searchFn(item: PromotionResponse, q: string) {
  return item.name.toLowerCase().includes(q) || targetName(item).toLowerCase().includes(q)
}

function openNew() {
  editing.value = null
  modalOpen.value = true
}
function onSaved(item: PromotionResponse) {
  const wasEdit = editing.value !== null
  toast.success('Promoción guardada', wasEdit ? 'Los cambios se guardaron.' : `${item.name} se creó.`)
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
    await store.removePromotion(target.id)
    toast.info('Promoción eliminada', 'La promoción fue removida.')
    deleting.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo eliminar'))
  } finally {
    deletingBusy.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader
      kicker="Tienda"
      title="Promociones"
      lead="Descuentos y precios especiales sobre productos, servicios o categorías."
    >
      <template #action>
        <button v-if="canCreate" type="button" class="cta" @click="openNew">
          <Plus :size="16" :stroke-width="1.8" /> Nueva promoción
        </button>
      </template>
    </PageHeader>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <ListBody
      :items="store.promotions.value"
      :loading="store.loading.value"
      :search-fn="searchFn"
      placeholder="Buscar por nombre o destino…"
      empty-text="Aún no hay promociones."
    >
      <template #header>
        <tr>
          <th>Promoción</th>
          <th>Aplica a</th>
          <th>Destino</th>
          <th>Valor</th>
          <th>Vigencia</th>
          <th>Estado</th>
          <th v-if="canUpdate || canDelete" class="actions-col">Acciones</th>
        </tr>
      </template>
      <template #row="{ item }">
        <tr>
          <td>{{ item.name }}</td>
          <td>{{ APP_LABEL[item.applicationType] }}</td>
          <td class="truncate">{{ targetName(item) }}</td>
          <td>{{ valueLabel(item) }}</td>
          <td class="dates">{{ item.startDate.slice(0, 10) }} → {{ item.endDate.slice(0, 10) }}</td>
          <td><PromoStatusPill :status="promoStatus(item, today)" /></td>
          <td v-if="canUpdate || canDelete" class="actions">
            <button v-if="canUpdate" type="button" class="icon-btn" title="Editar" @click="editing = item">
              <Pencil :size="15" :stroke-width="1.7" />
            </button>
            <button v-if="canDelete" type="button" class="icon-btn danger" title="Eliminar" @click="deleting = item">
              <Trash2 :size="15" :stroke-width="1.7" />
            </button>
          </td>
        </tr>
      </template>
    </ListBody>

    <PromoFormModal
      :open="modalOpen || editing !== null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />

    <ConfirmDeleteDialog
      :open="deleting !== null"
      title="Eliminar promoción"
      :message="deleting ? `Se eliminará ${deleting.name}. Esta acción no se puede deshacer.` : ''"
      :busy="deletingBusy"
      @cancel="deleting = null"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.cta {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px; font-size: 13.5px; font-weight: 500;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: white; border: none; border-radius: 9px; cursor: pointer; font-family: inherit; white-space: nowrap;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
}
.banner { border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); }
.truncate { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dates { font-size: 12px; color: var(--warm-600); white-space: nowrap; }
.actions-col { width: 88px; text-align: right; }
.actions { display: flex; gap: 6px; justify-content: flex-end; }
.icon-btn {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px;
  border: 1px solid var(--warm-200); background: transparent; color: var(--warm-700); cursor: pointer;
}
.icon-btn:hover { background: var(--warm-100); }
.icon-btn.danger:hover { background: oklch(95% 0.06 25); color: oklch(40% 0.18 25); border-color: oklch(85% 0.12 25); }
</style>
