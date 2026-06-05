<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import TaxFormModal from '../components/TaxFormModal.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney } from '../composables/pricing'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { TaxResponse } from '../types/tienda'

const store = useTienda()
const toast = useToast()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.TAX_CREATE)
const canUpdate = can(PERMISSIONS.TAX_UPDATE)
const canDelete = can(PERMISSIONS.TAX_DELETE)

const modalOpen = ref(false)
const editing = ref<TaxResponse | null>(null)
const deleting = ref<TaxResponse | null>(null)
const deletingBusy = ref(false)

onMounted(() => store.ensureLoaded())

function openNew() {
  editing.value = null
  modalOpen.value = true
}
function onRowClick(item: TaxResponse) {
  if (canUpdate.value) editing.value = item
}
function onSaved() {
  const wasEdit = editing.value !== null
  toast.success('Impuesto guardado', wasEdit ? 'Los cambios se guardaron.' : 'Se creó el impuesto.')
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
    await store.removeTax(target.id)
    toast.info('Impuesto eliminado', 'El impuesto fue removido.')
    deleting.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo eliminar'))
  } finally {
    deletingBusy.value = false
  }
}
</script>

<template>
  <div class="inv">
    <header class="head">
      <div>
        <div class="kicker">Tienda · Impuestos</div>
        <h1 class="title">Administración de impuestos</h1>
      </div>
      <button v-if="canCreate" type="button" class="cta" @click="openNew">
        <Plus :size="16" :stroke-width="1.8" /> Nuevo impuesto
      </button>
    </header>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <table class="table">
      <thead>
        <tr>
          <th>Impuesto</th>
          <th>Porcentaje</th>
          <th>Ejemplo sobre $100.000</th>
          <th v-if="canUpdate || canDelete"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="store.loading.value">
          <td colspan="4" class="empty">Cargando…</td>
        </tr>
        <tr v-else-if="store.taxes.value.length === 0">
          <td colspan="4" class="empty">Sin impuestos. Crea el primero.</td>
        </tr>
        <tr v-for="t in store.taxes.value" v-else :key="t.id" class="trow" @click="onRowClick(t)">
          <td class="tname">{{ t.name }}</td>
          <td class="tstock">{{ t.percentage }}%</td>
          <td>{{ formatMoney(Math.round(100000 * (t.percentage / 100))) }}</td>
          <td v-if="canUpdate || canDelete" @click.stop>
            <div class="actions">
              <button v-if="canUpdate" type="button" class="icon-btn" title="Editar" @click="editing = t">
                <Pencil :size="14" :stroke-width="1.7" />
              </button>
              <button v-if="canDelete" type="button" class="icon-btn danger" title="Eliminar" @click="deleting = t">
                <Trash2 :size="14" :stroke-width="1.7" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <p class="note">
      Cada producto y servicio tiene asignado un impuesto (campo "Impuesto" en su ficha). En el
      punto de venta el impuesto se calcula por línea y se agrupa por tasa en la factura.
    </p>

    <TaxFormModal :open="modalOpen || editing !== null" :initial="editing" @close="onFormClose" @saved="onSaved" />

    <ConfirmDeleteDialog
      :open="deleting !== null"
      title="Eliminar impuesto"
      :message="deleting ? `${deleting.name} dejará de estar disponible. Los productos/servicios que lo tenían deberán actualizarse a otra tasa.` : ''"
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
.cta {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: #fff; border: none; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.45);
}
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 12px; overflow: hidden; }
.table th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--warm-500); font-weight: 600; padding: 11px 14px; background: var(--warm-100); border-bottom: 1px solid var(--warm-200); }
.table td { padding: 11px 14px; border-bottom: 1px solid var(--warm-150); color: var(--warm-800); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.trow { cursor: pointer; }
.trow:hover { background: var(--warm-100); }
.empty { text-align: center; padding: 40px; color: var(--warm-500); }
.tname { font-weight: 500; color: var(--warm-900); }
.tstock { font-weight: 600; }
.actions { display: flex; gap: 4px; align-items: center; }
.icon-btn { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--warm-200); background: transparent; color: var(--warm-700); cursor: pointer; }
.icon-btn:hover { background: var(--warm-100); }
.icon-btn.danger:hover { background: oklch(95% 0.06 25); color: oklch(40% 0.18 25); border-color: oklch(85% 0.12 25); }
.note { margin: 16px 0 0; font-size: 12.5px; color: var(--warm-500); line-height: 1.55; max-width: 640px; }
</style>
