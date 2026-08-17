<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bell, Check, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import ListBody from '@/features/acciones/components/ListBody.vue'
import ConfirmDeleteDialog from '@/components/feedback/ConfirmDeleteDialog.vue'
import PromoStatusPill from '../components/PromoStatusPill.vue'
import PromoFormModal from '../components/PromoFormModal.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney, promoStatus } from '../composables/pricing'
import { todayISO } from '@/composables/format'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import type {
  ApplicationType,
  PromotionPayload,
  PromotionResponse,
  PromotionType,
} from '../types/tienda'

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

onMounted(() => store.reload())

const activeCount = computed(
  () => store.promotions.value.filter((p) => promoStatus(p, today) === 'ACTIVA').length,
)

function toPayload(p: PromotionResponse, active: boolean): PromotionPayload {
  return {
    name: p.name,
    promotionType: p.promotionType,
    applicationType: p.applicationType,
    applicationItem: p.applicationItem,
    valueType: p.valueType,
    value: p.value,
    startDate: p.startDate,
    endDate: p.endDate,
    promotionStatus: active ? 'ACTIVE' : 'INACTIVE',
  }
}

async function togglePromo(p: PromotionResponse) {
  const next = p.promotionStatus !== 'ACTIVE'
  try {
    await store.updatePromotion(p.id, toPayload(p, next))
    toast.success(next ? 'Promoción activada' : 'Promoción desactivada')
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo cambiar el estado')
  }
}

const APP_LABEL: Record<ApplicationType, string> = {
  PRODUCT: 'Producto',
  SERVICE: 'Servicio',
  CATEGORY: 'Categoría',
}

const TYPE_LABEL: Record<PromotionType, string> = {
  DISCOUNT: 'Descuento',
  SPECIAL_PRICE: 'Precio especial',
}

function vigencia(promo: PromotionResponse): string {
  if (!promo.startDate && !promo.endDate) return 'Permanente'
  return `${promo.startDate?.slice(0, 10) ?? '—'} → ${promo.endDate?.slice(0, 10) ?? '—'}`
}

function targetName(promo: PromotionResponse): string {
  if (promo.applicationType === 'PRODUCT') {
    return (
      store.products.value.find((p) => p.id === promo.applicationItem)?.name ??
      `#${promo.applicationItem}`
    )
  }
  if (promo.applicationType === 'SERVICE') {
    return (
      store.services.value.find((s) => s.id === promo.applicationItem)?.name ??
      `#${promo.applicationItem}`
    )
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
  toast.success(
    'Promoción guardada',
    wasEdit ? 'Los cambios se guardaron.' : `${item.name} se creó.`,
  )
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
    toast.errorFrom('Ocurrió un error', e, 'No se pudo eliminar')
  } finally {
    deletingBusy.value = false
  }
}
</script>

<template>
  <div class="ds-page">
    <PageHeader
      kicker="Tienda"
      title="Promociones"
      lead="Descuentos y precios especiales sobre productos, servicios o categorías."
    >
      <template #action>
        <button
          v-if="canCreate"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated ds-btn--nowrap"
          @click="openNew"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nueva promoción
        </button>
      </template>
    </PageHeader>

    <div v-if="store.error.value" class="ds-banner ds-banner--error">{{ store.error.value }}</div>

    <div v-if="activeCount > 0" class="alert">
      <Bell :size="15" :stroke-width="1.8" />
      <span>
        <strong>{{ activeCount }}</strong>
        {{ activeCount === 1 ? 'promoción activa aplicándose' : 'promociones activas aplicándose' }}
        en el punto de venta.
      </span>
    </div>

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
          <th>Tipo</th>
          <th>Aplica a</th>
          <th>Destino</th>
          <th>Valor</th>
          <th>Vigencia</th>
          <th>Estado</th>
          <th v-if="canUpdate || canDelete" class="ds-col-actions">Acciones</th>
        </tr>
      </template>
      <template #row="{ item }">
        <tr>
          <td>{{ item.name }}</td>
          <td>
            <span class="typepill">{{ TYPE_LABEL[item.promotionType] }}</span>
          </td>
          <td>{{ APP_LABEL[item.applicationType] }}</td>
          <td class="truncate ds-truncate">{{ targetName(item) }}</td>
          <td>{{ valueLabel(item) }}</td>
          <td class="dates">{{ vigencia(item) }}</td>
          <td><PromoStatusPill :status="promoStatus(item, today)" /></td>
          <td v-if="canUpdate || canDelete" class="ds-actions">
            <button
              v-if="canUpdate"
              type="button"
              class="switch"
              :class="{ on: item.promotionStatus === 'ACTIVE' }"
              :title="item.promotionStatus === 'ACTIVE' ? 'Desactivar' : 'Activar'"
              role="switch"
              :aria-checked="item.promotionStatus === 'ACTIVE'"
              @click="togglePromo(item)"
            >
              <span class="knob"
                ><Check v-if="item.promotionStatus === 'ACTIVE'" :size="10" :stroke-width="3"
              /></span>
            </button>
            <button
              v-if="canUpdate"
              type="button"
              class="ds-icon-btn"
              title="Editar"
              @click="editing = item"
            >
              <Pencil :size="15" :stroke-width="1.7" />
            </button>
            <button
              v-if="canDelete"
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              title="Eliminar"
              @click="deleting = item"
            >
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
/* El contenedor es `.ds-page` (primitives.css): coincidía en sus dos
   declaraciones. */
.alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  margin-bottom: 16px;
  background: oklch(95% 0.05 150deg);
  border: 1px solid oklch(86% 0.07 150deg);
  border-radius: 10px;
  font-size: 13px;
  color: oklch(38% 0.13 150deg);
}
.alert strong {
  color: oklch(34% 0.14 150deg);
}
.switch {
  width: 34px;
  height: 20px;
  border-radius: var(--radius-pill);
  border: none;
  background: var(--warm-300);
  position: relative;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.15s ease;
}
.switch.on {
  background: oklch(55% 0.16 150deg);
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  color: oklch(45% 0.15 150deg);
  transition: left 0.15s ease;
  box-shadow: 0 1px 2px rgb(0 0 0 / 20%);
}
.switch.on .knob {
  left: 16px;
}
.typepill {
  display: inline-flex;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--amatista-100);
  color: var(--amatista-700);
}

/* El recorte es `.ds-truncate`; sólo queda el ancho máximo de esta columna. */
.truncate {
  max-width: 200px;
}
.dates {
  font-size: 12px;
  color: var(--warm-600);
  white-space: nowrap;
}

/* `.actions-col` desapareció entera: es `.ds-col-actions`. Ojo, su
   `text-align: right` ya era código muerto antes de migrar y lo sigue siendo:
   `ListBody` declara `.table :deep(th) { text-align: left }`, que pesa (0,2,1)
   y le gana. Lo que se ve —el ancho de 88px— no cambia. */
</style>
