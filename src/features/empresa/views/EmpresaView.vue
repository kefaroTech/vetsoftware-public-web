<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Building2, ShieldCheck, MapPin, Plus, Pencil } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useFacturacionAccess } from '@/features/facturacion/composables/useFacturacionAccess'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { PERMISSIONS } from '@/constants/permissions'
import { COMPANY_DOCTYPE_LABEL, TAX_REGIME_LABEL } from '@/features/facturacion/types/facturacion'
import { useEmpresa } from '../composables/useEmpresa'
import { useSedes } from '@/features/branches/composables/useSedes'
import type { BranchResponse, SaveBranchRequest } from '@/features/branches/types/branch.types'
import BranchCard from '../components/BranchCard.vue'
import EmpresaHero from '../components/EmpresaHero.vue'
import SedeFormModal from '../components/SedeFormModal.vue'
import CashTerminalsPanel from '@/features/caja/components/CashTerminalsPanel.vue'

const router = useRouter()
const toast = useToast()
const { can } = useAuthorization()
const { canConfig: feCanConfig } = useFacturacionAccess()

const { company, taxProfile, loading, load } = useEmpresa()
const { sedes, activeCount, isPrincipal, create, update, setActive } = useSedes()

const canManageSedes = computed(
  () => can(PERMISSIONS.BRANCH_CREATE).value || can(PERMISSIONS.BRANCH_UPDATE).value,
)

// ── Datos derivados de la empresa (perfil fiscal + base) ─────────────────────
const legalName = computed(() => taxProfile.value?.legalName || company.value?.name || 'Tu empresa')
const docTypeLabel = computed(() =>
  taxProfile.value ? COMPANY_DOCTYPE_LABEL[taxProfile.value.companyDocumentType] : null,
)
const idDisplay = computed(() => {
  const tp = taxProfile.value
  if (tp) {
    return tp.companyDocumentVerificationDigit
      ? `${tp.companyDocumentId}-${tp.companyDocumentVerificationDigit}`
      : tp.companyDocumentId
  }
  return company.value?.identifier ?? null
})
const taxRegimeLabel = computed(() =>
  taxProfile.value ? TAX_REGIME_LABEL[taxProfile.value.taxRegime] : null,
)
const personType = computed(() =>
  taxProfile.value
    ? taxProfile.value.companyDocumentType === 'NIT'
      ? 'Jurídica'
      : 'Natural'
    : null,
)
const createdDate = computed(() =>
  (taxProfile.value?.createdDate || company.value?.createdDate || '').slice(0, 10),
)

// ── Modal de sede ────────────────────────────────────────────────────────────
const sedeModalOpen = ref(false)
const editingSede = ref<BranchResponse | null>(null)

function openAdd() {
  editingSede.value = null
  sedeModalOpen.value = true
}
function openEdit(branch: BranchResponse) {
  editingSede.value = branch
  sedeModalOpen.value = true
}

async function onSaveSede(payload: { id: number | null; body: SaveBranchRequest }) {
  try {
    if (payload.id != null) {
      await update(payload.id, payload.body)
      toast.success('Sede actualizada', `Los cambios de ${payload.body.name} se guardaron.`)
    } else {
      await create(payload.body)
      toast.success('Sede creada', `${payload.body.name} se añadió a la empresa.`)
    }
    sedeModalOpen.value = false
  } catch (e) {
    toast.errorFrom('No se pudo guardar', e, 'Revisa los datos de la sede.')
  }
}

async function onToggleActive(branch: BranchResponse) {
  try {
    const saved = await setActive(branch.id, !branch.active)
    toast.success(
      saved.active ? 'Sede activada' : 'Sede desactivada',
      `${branch.name} quedó ${saved.active ? 'operativa' : 'fuera de operación'}.`,
    )
  } catch (e) {
    toast.error(
      'No se pudo cambiar el estado',
      getProblemDetailMessage(e, 'No es posible desactivar la última sede activa.'),
    )
  }
}

function goEditFiscal() {
  router.push({ name: 'facturacion-habilitacion' })
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="emp-page">
    <div class="emp-header">
      <div>
        <div class="ds-kicker-accent ds-kicker-accent--snug">Administración · Empresa</div>
        <h1 class="title ds-display">Empresa</h1>
        <div class="lead">Datos fiscales, ubicación y sedes de tu empresa.</div>
      </div>
      <button v-if="feCanConfig" type="button" class="editbtn" @click="goEditFiscal">
        <Pencil :size="15" :stroke-width="1.8" /> Editar datos fiscales
      </button>
    </div>

    <EmpresaHero
      :legal-name="legalName"
      :doc-type-label="docTypeLabel"
      :id-display="idDisplay"
      :tax-regime-label="taxRegimeLabel"
      :person-type="personType"
      :created-date="createdDate"
      :profile-missing="!taxProfile && !loading"
    />

    <!-- Info cards -->
    <div class="cards ds-grid-2">
      <section class="ds-card">
        <header class="cardhead">
          <span class="cardic ds-tone--accent"><ShieldCheck :size="16" :stroke-width="1.7" /></span>
          <h3>Identidad fiscal</h3>
        </header>
        <div v-if="taxProfile" class="ds-stack">
          <div class="row">
            <span class="row-label">Razón social</span
            ><span class="row-value ds-item-label">{{ legalName }}</span>
          </div>
          <div class="row">
            <span class="row-label">Tipo de documento</span
            ><span class="row-value ds-item-label">{{ docTypeLabel }}</span>
          </div>
          <div class="row">
            <span class="row-label">Número de documento</span
            ><span class="row-value mono ds-item-label">{{ idDisplay }}</span>
          </div>
          <div class="row">
            <span class="row-label">Régimen tributario</span
            ><span class="row-value ds-item-label">{{ taxRegimeLabel }}</span>
          </div>
          <div class="row">
            <span class="row-label">Tipo de persona</span
            ><span class="row-value ds-item-label">{{ personType }}</span>
          </div>
        </div>
        <div v-else class="empty-card ds-stack ds-stack--8">
          <Building2 :size="18" :stroke-width="1.6" />
          <p>Aún no has configurado el perfil fiscal de la empresa.</p>
          <button
            v-if="feCanConfig"
            type="button"
            class="empty-cta ds-tone--accent-soft"
            @click="goEditFiscal"
          >
            Configurar
          </button>
        </div>
      </section>

      <section class="ds-card">
        <header class="cardhead">
          <span class="cardic ds-tone--accent"><MapPin :size="16" :stroke-width="1.7" /></span>
          <h3>Contacto y ubicación</h3>
        </header>
        <div class="ds-stack">
          <div class="row">
            <span class="row-label">Correo fiscal</span
            ><span class="row-value ds-item-label">{{ taxProfile?.fiscalEmail || '—' }}</span>
          </div>
          <div class="row">
            <span class="row-label">Teléfono</span
            ><span class="row-value ds-item-label">{{ company?.contactNumber || '—' }}</span>
          </div>
          <div class="row">
            <span class="row-label">Dirección</span
            ><span class="row-value ds-item-label">{{ company?.address || '—' }}</span>
          </div>
          <div class="row">
            <span class="row-label">Ciudad</span
            ><span class="row-value ds-item-label">{{ company?.city?.name || '—' }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- Sedes -->
    <div class="sedes">
      <div class="ds-head">
        <div class="sedestitle">
          <h3>Sedes</h3>
          <span class="sedescount">
            {{ sedes.length }} {{ sedes.length === 1 ? 'sede' : 'sedes' }} · {{ activeCount }}
            {{ activeCount === 1 ? 'activa' : 'activas' }}
          </span>
        </div>
        <button
          v-if="canManageSedes"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--strong ds-btn--elevated"
          @click="openAdd"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nueva sede
        </button>
      </div>

      <div v-if="sedes.length" class="sedesgrid">
        <BranchCard
          v-for="b in sedes"
          :key="b.id"
          :branch="b"
          :principal="isPrincipal(b.code)"
          :can-manage="canManageSedes"
          @edit="openEdit"
          @toggle-active="onToggleActive"
        />
      </div>
      <div v-else-if="!loading" class="sedes-empty ds-stack ds-stack--8">
        <MapPin :size="20" :stroke-width="1.5" />
        <p>Aún no hay sedes registradas.</p>
      </div>
    </div>

    <CashTerminalsPanel :branches="sedes" />

    <SedeFormModal
      :open="sedeModalOpen"
      :initial="editingSede"
      @save="onSaveSede"
      @close="sedeModalOpen = false"
    />
  </div>
</template>

<style scoped>
.emp-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 4px 4px 40px;
}

.emp-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

/* El rótulo usa `.ds-kicker-accent` + `--snug`. Antes declaraba amatista-600 /
   peso 600: era deriva, no variante — es el ÚNICO amatista-600 del archivo
   (los otros tres acentos de texto son amatista-700) y la familia del rótulo
   de marca (PosCashGate, MyCashPanel) es 700/700. Se alinea. */
.title {
  margin: 6px 0 4px;
  font-size: 30px;
}

.lead {
  font-size: 13.5px;
  color: var(--warm-600);
}

.editbtn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  border-radius: 9px;
  border: 1px solid var(--warm-300);
  background: var(--warm-50);
  color: var(--warm-800);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  height: fit-content;
  white-space: nowrap;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;
}

.editbtn:hover {
  background: var(--warm-100);
  border-color: var(--warm-400);
}

/* La cabecera de identidad vive en `EmpresaHero.vue` con su propio CSS. */

/* Info cards */
.cards {
  gap: 16px;
  margin-bottom: 28px;
}

.cardhead {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.cardhead h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--warm-800);
}

/* El tono es `.ds-tone--accent` (en las dos cabeceras de tarjeta). */
.cardic {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px solid var(--warm-150);
}

.row:last-child {
  border-bottom: none;
}

.row-label {
  font-size: 12.5px;
  color: var(--warm-500);
  flex-shrink: 0;
}

.row-value {
  min-width: 0;
  text-align: right;
}

.row-value.mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.empty-card {
  align-items: flex-start;
  color: var(--warm-500);
  font-size: 12.5px;
}

.empty-card p {
  margin: 0;
}

/* Fondo y color son `.ds-tone--accent-soft`. */
.empty-cta {
  margin-top: 4px;
  padding: 6px 12px;
  border-radius: 8px;

  /* A11Y-09: `--amatista-300` daba 1,90:1 sobre el `--amatista-50` que pone
     `.ds-tone--accent-soft`. `--amatista-500` da 4,24:1. */
  border: 1px solid var(--amatista-500);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

/* Sedes */
.sedes {
  margin-top: 4px;
}

.sedestitle h3 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
}

.sedescount {
  font-size: 12.5px;
  color: var(--warm-500);
  margin-top: 2px;
  display: block;
}

.sedesgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.sedes-empty {
  align-items: center;
  padding: 40px 0;
  color: var(--warm-500);
  font-size: 13px;
}

.sedes-empty p {
  margin: 0;
}
</style>
