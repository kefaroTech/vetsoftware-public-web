<script setup lang="ts">
import { ref } from 'vue'
import { FileText, Plus, Pencil } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useBranches } from '@/features/branches/composables/useBranches'
import { useFacturacionEnablement } from '../../composables/useFacturacionEnablement'
import {
  DOC_TYPE_LABEL,
  type ElectronicDocumentType,
  type NumberingResolutionResponse,
  type SaveNumberingResolutionRequest,
} from '../../types/facturacion'
import SectionHead from './SectionHead.vue'
import WizardFooter from './WizardFooter.vue'
import ResolutionFormModal from './ResolutionFormModal.vue'

const emit = defineEmits<{ back: []; next: [] }>()

const { resolutionByType, invoiceResolutionOk, upsertResolution } = useFacturacionEnablement()
const { options: branchOptions } = useBranches()
const toast = useToast()

/** Nombre de la sede de una resolución (B-6). null → resolución de empresa (no se etiqueta). */
function branchName(branchId: number | null): string | null {
  if (branchId == null) return null
  return branchOptions.value.find((o) => o.value === String(branchId))?.label ?? `Sede #${branchId}`
}

// Orden de tipos: FEV primero (obligatoria), luego notas y POS.
const REQUIRED_TYPES: ElectronicDocumentType[] = [
  'FE_VENTA',
  'NOTA_CREDITO',
  'NOTA_DEBITO',
  'DOC_EQUIV_POS',
]

const formOpen = ref(false)
const editing = ref<NumberingResolutionResponse | null>(null)
const presetType = ref<ElectronicDocumentType | undefined>()

function openAdd(type: ElectronicDocumentType) {
  editing.value = null
  presetType.value = type
  formOpen.value = true
}
function openEdit(res: NumberingResolutionResponse) {
  editing.value = res
  presetType.value = res.documentType
  formOpen.value = true
}

function consumo(r: NumberingResolutionResponse) {
  const total = r.rangeTo - r.rangeFrom + 1
  const used = r.currentNumber - r.rangeFrom
  const left = r.rangeTo - r.currentNumber
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const low = total > 0 && left / total < 0.1
  return { left, pct, low }
}

async function onSave(payload: { id: number | null; body: SaveNumberingResolutionRequest }) {
  try {
    await upsertResolution(payload.id, payload.body)
    toast.success(
      payload.id ? 'Resolución actualizada' : 'Resolución creada',
      payload.body.resolutionNumber,
    )
    formOpen.value = false
  } catch {
    toast.error('No se pudo guardar', 'Revisa los datos de la resolución.')
  }
}
</script>

<template>
  <div class="ds-stack ds-stack--18">
    <SectionHead
      :icon="FileText"
      title="Resoluciones de numeración"
      sub="Rangos de consecutivos autorizados por la DIAN. Deben coincidir exactamente con las registradas ante el proveedor."
    />

    <div class="resgrid">
      <div
        v-for="dt in REQUIRED_TYPES"
        :key="dt"
        class="rescard ds-stack ds-stack--8"
        :class="{ set: !!resolutionByType[dt] }"
      >
        <div class="rescard-top">
          <div class="rescard-type ds-flex-row ds-strong">
            {{ DOC_TYPE_LABEL[dt] }}
            <span v-if="dt === 'FE_VENTA'" class="keyreq ds-tone--accent-soft">clave técnica</span>
          </div>
          <span v-if="resolutionByType[dt]" class="badge ok">Configurada</span>
          <span v-else class="badge ds-tone--neutral">Pendiente</span>
        </div>

        <template v-if="resolutionByType[dt]">
          <div
            v-if="branchName(resolutionByType[dt]!.branchId)"
            class="branchtag ds-tone--accent-soft"
          >
            {{ branchName(resolutionByType[dt]!.branchId) }}
          </div>
          <div class="rescard-meta">
            Res. {{ resolutionByType[dt]!.resolutionNumber }} ·
            <strong>{{ resolutionByType[dt]!.prefix }}</strong>
            {{ resolutionByType[dt]!.rangeFrom.toLocaleString('es') }}–{{
              resolutionByType[dt]!.rangeTo.toLocaleString('es')
            }}
          </div>
          <div class="rescard-meta">
            Vigencia {{ resolutionByType[dt]!.validFrom }} → {{ resolutionByType[dt]!.validTo }}
          </div>
          <div class="consumo">
            <div class="bar">
              <span
                :style="{
                  width: consumo(resolutionByType[dt]!).pct + '%',
                  background: consumo(resolutionByType[dt]!).low
                    ? 'var(--danger-border)'
                    : 'var(--amatista-500)',
                }"
              />
            </div>
            <div class="barlbl">
              {{ consumo(resolutionByType[dt]!).left.toLocaleString('es') }} disponibles
              <span v-if="consumo(resolutionByType[dt]!).low" class="warn"> · por agotarse</span>
            </div>
          </div>
          <button
            type="button"
            class="rescard-btn rescard-btn-off"
            @click="openEdit(resolutionByType[dt]!)"
          >
            <Pencil :size="13" :stroke-width="1.8" /> Editar
          </button>
        </template>
        <template v-else>
          <div class="rescard-empty">Sin resolución activa para este tipo.</div>
          <button type="button" class="rescard-btn ds-tone--accent-border" @click="openAdd(dt)">
            <Plus :size="13" :stroke-width="2" /> Agregar
          </button>
        </template>
      </div>
    </div>

    <p class="help">
      La factura electrónica de venta (FEV) es <strong>obligatoria</strong> para activar; los demás
      tipos son opcionales según lo que vayas a emitir.
    </p>

    <WizardFooter
      show-back
      next-label="Continuar a revisión"
      :next-disabled="!invoiceResolutionOk"
      :draft-note="!invoiceResolutionOk ? 'La factura electrónica (FEV) es obligatoria' : null"
      @back="emit('back')"
      @next="emit('next')"
    />

    <ResolutionFormModal
      :open="formOpen"
      :initial="editing"
      :preset-type="presetType"
      @save="onSave"
      @close="formOpen = false"
    />
  </div>
</template>

<style scoped>
/* Layout: `.ds-stack--18/--8`, `.ds-flex-row` + `.ds-strong` (cabecera de
   tarjeta) y `.ds-tone--accent-soft` / `--neutral` (etiquetas). `.resgrid`
   sigue local: su columna mínima de 260px no la replica ninguna primitiva. */
.resgrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.rescard {
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  padding: 18px;
  background: var(--warm-50);
}

.rescard.set {
  border-color: var(--amatista-450);
}

.rescard-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.rescard-type {
  font-size: 14px;
}

.keyreq {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 5px;
  font-weight: 600;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
}

.badge.ok {
  background: var(--success-50);
  color: var(--compras-ok-fg);
}

.rescard-meta {
  font-size: 12px;
  color: var(--warm-600);
}

.branchtag {
  align-self: flex-start;
  font-size: 10.5px;
  font-weight: 600;
  border: 1px solid var(--amatista-200);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.rescard-empty {
  font-size: 12.5px;
  color: var(--warm-500);
  padding: 6px 0;
}

.consumo {
  margin-top: 2px;
}

.bar {
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--warm-200);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
}

.barlbl {
  margin-top: 5px;
  font-size: 11px;
  color: var(--warm-500);
}

.warn {
  color: var(--danger-500);
  font-weight: 600;
}

/* El borde y el texto del botón "Agregar" los pone `.ds-tone--accent-border`
   desde el template, y los del botón "Editar" su pareja `.rescard-btn-off`. Si
   la base declarara `border-color`/`color` pesaría (0,2,0) por el `[data-v-…]`
   del scope y la primitiva (0,1,0) no llegaría nunca a pintar. */
.rescard-btn {
  align-self: flex-start;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  border-width: 1px;
  border-style: solid;
  background: var(--warm-50);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.rescard-btn-off {
  border-color: var(--warm-450);
  color: var(--warm-700);
}

.rescard-btn:hover {
  background: var(--warm-100);
}

.help {
  margin: 0;
  font-size: 12px;
  color: var(--warm-600);
  border-left: 3px solid var(--amatista-300);
  padding-left: 10px;
  line-height: 1.5;
}
</style>
