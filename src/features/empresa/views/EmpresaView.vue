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
import type { BranchResponse, SaveBranchRequest } from '@/features/branches/api/branch.api'
import BranchCard from '../components/BranchCard.vue'
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
const initial = computed(() => legalName.value.trim()[0]?.toUpperCase() || 'E')
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
    toast.error('No se pudo guardar', getProblemDetailMessage(e, 'Revisa los datos de la sede.'))
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
        <div class="kicker">Administración · Empresa</div>
        <h1 class="title">Empresa</h1>
        <div class="lead">Datos fiscales, ubicación y sedes de tu empresa.</div>
      </div>
      <button v-if="feCanConfig" type="button" class="editbtn" @click="goEditFiscal">
        <Pencil :size="15" :stroke-width="1.8" /> Editar datos fiscales
      </button>
    </div>

    <!-- Hero -->
    <div class="hero">
      <div class="mark">{{ initial }}</div>
      <div class="heroinfo">
        <div class="heroname">{{ legalName }}</div>
        <div class="herotags">
          <span v-if="docTypeLabel && idDisplay" class="tag mono"
            >{{ docTypeLabel }} · {{ idDisplay }}</span
          >
          <span v-else-if="idDisplay" class="tag mono">{{ idDisplay }}</span>
          <span v-if="taxRegimeLabel" class="tag amatista">{{ taxRegimeLabel }}</span>
          <span v-if="personType" class="tag">{{ personType }}</span>
          <span v-if="!taxProfile && !loading" class="tag warn">Perfil fiscal sin configurar</span>
        </div>
      </div>
      <div v-if="createdDate" class="herometa">
        <span class="herometa-label">Activa desde</span>
        <span class="herometa-value">{{ createdDate }}</span>
      </div>
    </div>

    <!-- Info cards -->
    <div class="cards">
      <section class="ds-card">
        <header class="cardhead">
          <span class="cardic"><ShieldCheck :size="16" :stroke-width="1.7" /></span>
          <h3>Identidad fiscal</h3>
        </header>
        <div v-if="taxProfile" class="rows">
          <div class="row">
            <span class="row-label">Razón social</span
            ><span class="row-value">{{ legalName }}</span>
          </div>
          <div class="row">
            <span class="row-label">Tipo de documento</span
            ><span class="row-value">{{ docTypeLabel }}</span>
          </div>
          <div class="row">
            <span class="row-label">Número de documento</span
            ><span class="row-value mono">{{ idDisplay }}</span>
          </div>
          <div class="row">
            <span class="row-label">Régimen tributario</span
            ><span class="row-value">{{ taxRegimeLabel }}</span>
          </div>
          <div class="row">
            <span class="row-label">Tipo de persona</span
            ><span class="row-value">{{ personType }}</span>
          </div>
        </div>
        <div v-else class="empty-card">
          <Building2 :size="18" :stroke-width="1.6" />
          <p>Aún no has configurado el perfil fiscal de la empresa.</p>
          <button v-if="feCanConfig" type="button" class="empty-cta" @click="goEditFiscal">
            Configurar
          </button>
        </div>
      </section>

      <section class="ds-card">
        <header class="cardhead">
          <span class="cardic"><MapPin :size="16" :stroke-width="1.7" /></span>
          <h3>Contacto y ubicación</h3>
        </header>
        <div class="rows">
          <div class="row">
            <span class="row-label">Correo fiscal</span
            ><span class="row-value">{{ taxProfile?.fiscalEmail || '—' }}</span>
          </div>
          <div class="row">
            <span class="row-label">Teléfono</span
            ><span class="row-value">{{ company?.contactNumber || '—' }}</span>
          </div>
          <div class="row">
            <span class="row-label">Dirección</span
            ><span class="row-value">{{ company?.address || '—' }}</span>
          </div>
          <div class="row">
            <span class="row-label">Ciudad</span
            ><span class="row-value">{{ company?.city?.name || '—' }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- Sedes -->
    <div class="sedes">
      <div class="sedeshead">
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
      <div v-else-if="!loading" class="sedes-empty">
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

.kicker {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--amatista-600);
  font-weight: 600;
}

.title {
  margin: 6px 0 4px;
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
  line-height: 1.05;
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

/* Hero */
.hero {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--amatista-50), var(--warm-50));
  border: 1px solid var(--amatista-100);
  margin-bottom: 20px;
}

.mark {
  width: 58px;
  height: 58px;
  border-radius: 15px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--amatista-500), var(--amatista-700));
  color: white;
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  font-size: 30px;
  box-shadow: 0 6px 16px -6px oklch(45% 0.18 var(--hue) / 50%);
}

.heroinfo {
  flex: 1;
  min-width: 0;
}

.heroname {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
  line-height: 1.1;
}

.herotags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--warm-150);
  color: var(--warm-700);
  font-weight: 500;
}

.tag.mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
}

.tag.amatista {
  background: var(--amatista-100);
  color: var(--amatista-700);
}

.tag.warn {
  background: var(--warning-50);
  color: oklch(45% 0.13 80deg);
}

.herometa {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
  flex-shrink: 0;
}

.herometa-label {
  font-size: 11px;
  color: var(--warm-500);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.herometa-value {
  font-size: 14px;
  color: var(--warm-800);
  font-weight: 500;
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}

/* Info cards */
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.cardic {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--amatista-100);
  color: var(--amatista-700);
  flex-shrink: 0;
}

.rows {
  display: flex;
  flex-direction: column;
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
  font-size: 13px;
  color: var(--warm-900);
  font-weight: 500;
  text-align: right;
  min-width: 0;
}

.row-value.mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  color: var(--warm-500);
  font-size: 12.5px;
}

.empty-card p {
  margin: 0;
}

.empty-cta {
  margin-top: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--amatista-300);
  background: var(--amatista-50);
  color: var(--amatista-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

/* Sedes */
.sedes {
  margin-top: 4px;
}

.sedeshead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--warm-500);
  font-size: 13px;
}

.sedes-empty p {
  margin: 0;
}

@media (width <= 900px) {
  .cards {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-wrap: wrap;
  }
}
</style>
