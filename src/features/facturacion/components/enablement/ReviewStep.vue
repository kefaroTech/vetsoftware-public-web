<script setup lang="ts">
import { computed } from 'vue'
import { ShieldCheck, Check, ChevronRight, ArrowRight } from 'lucide-vue-next'
import { useFacturacionEnablement } from '../../composables/useFacturacionEnablement'
import { COMPANY_DOCTYPE_LABEL, DOC_TYPE_LABEL, TAX_REGIME_LABEL } from '../../types/facturacion'
import SectionHead from './SectionHead.vue'

const emit = defineEmits<{ editStep: [step: number]; exit: [] }>()

const { profile, enabledResolutions, profileOk, invoiceResolutionOk, ready } =
  useFacturacionEnablement()

interface ReviewRow {
  label: string
  value: string
}

const sections = computed(() => {
  const p = profile.value
  const identityRows: ReviewRow[] = p
    ? [
        { label: 'Razón social', value: p.legalName },
        {
          label: 'Documento',
          value: `${(COMPANY_DOCTYPE_LABEL[p.companyDocumentType] ?? '').split(' ')[0]} ${p.companyDocumentId}${
            p.companyDocumentVerificationDigit ? '-' + p.companyDocumentVerificationDigit : ''
          }`,
        },
        { label: 'Régimen', value: TAX_REGIME_LABEL[p.taxRegime] },
        { label: 'Correo fiscal', value: p.fiscalEmail },
        { label: 'Responsabilidades', value: (p.responsibilities ?? []).join(', ') || '—' },
      ]
    : []
  const resolutionRows: ReviewRow[] = enabledResolutions.value.map((r) => ({
    label: DOC_TYPE_LABEL[r.documentType],
    value:
      `${r.prefix ?? ''} ${r.rangeFrom.toLocaleString('es')}–${r.rangeTo.toLocaleString('es')}`.trim(),
  }))
  return [
    { step: 1, ok: profileOk.value, title: 'Identidad fiscal', rows: identityRows },
    { step: 2, ok: invoiceResolutionOk.value, title: 'Resoluciones', rows: resolutionRows },
  ]
})

const missing = computed(() => {
  const m: string[] = []
  if (!profileOk.value) m.push('Identidad fiscal incompleta')
  if (!invoiceResolutionOk.value) m.push('Falta la resolución de factura electrónica (FEV)')
  return m
})
</script>

<template>
  <div class="formcol">
    <SectionHead
      :icon="ShieldCheck"
      title="Revisión"
      sub="Verifica que la configuración esté completa. La emisión real se habilita por permisos del plan Premium."
    />

    <div v-for="s in sections" :key="s.step" class="card reviewcard">
      <div class="review-head">
        <div class="review-title">
          <span class="review-badge" :class="s.ok ? 'ok' : 'pend'">
            <Check v-if="s.ok" :size="12" :stroke-width="2.6" />
            <template v-else>!</template>
          </span>
          {{ s.title }}
        </div>
        <button type="button" class="editlink" @click="emit('editStep', s.step)">
          Editar <ChevronRight :size="13" :stroke-width="1.8" />
        </button>
      </div>
      <div v-if="s.rows.length" class="review-rows">
        <div v-for="(r, i) in s.rows" :key="i">
          <span>{{ r.label }}</span
          ><strong>{{ r.value || '—' }}</strong>
        </div>
      </div>
      <div v-else class="review-empty">Sin datos todavía.</div>
    </div>

    <div v-if="ready" class="successbox">
      <div class="success-ic"><ShieldCheck :size="24" :stroke-width="1.8" /></div>
      <div class="success-text">
        <div class="success-title">Lista para facturar</div>
        <div class="success-sub">
          La configuración fiscal está completa. Las ventas y cierres de cuenta generan documentos
          electrónicos automáticamente.
        </div>
      </div>
      <button type="button" class="cta" @click="emit('exit')">
        Ir al estado <ArrowRight :size="15" :stroke-width="1.9" />
      </button>
    </div>
    <div v-else class="blockbox">
      <div class="block-title">Configuración pendiente</div>
      <ul class="blocklist">
        <li v-for="m in missing" :key="m">{{ m }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.formcol {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  padding: 20px 22px;
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.review-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
  color: var(--warm-900);
}

.review-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.review-badge.ok {
  background: oklch(55% 0.15 150deg);
}

.review-badge.pend {
  background: oklch(70% 0.14 75deg);
}

.editlink {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: transparent;
  border: none;
  color: var(--amatista-700);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.review-rows {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px 22px;
}

.review-rows > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.review-rows span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-500);
}

.review-rows strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--warm-900);
  overflow-wrap: anywhere;
}

.review-empty {
  font-size: 12.5px;
  color: var(--warm-500);
}

.successbox {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 14px;
  background: linear-gradient(135deg, oklch(95% 0.05 150deg), var(--warm-50));
  border: 1px solid oklch(80% 0.09 150deg);
}

.success-ic {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: oklch(92% 0.08 150deg);
  color: oklch(40% 0.13 150deg);
  flex-shrink: 0;
}

.success-text {
  flex: 1;
  min-width: 0;
}

.success-title {
  font-family: var(--font-serif);
  font-size: 19px;
  color: var(--warm-900);
}

.success-sub {
  font-size: 12.5px;
  color: var(--warm-600);
  line-height: 1.45;
  margin-top: 2px;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 9px;
  border: none;
  background: linear-gradient(
    135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))
  );
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.blockbox {
  padding: 18px 22px;
  border-radius: 14px;
  border: 1px solid oklch(88% 0.06 80deg);
  background: oklch(97% 0.03 80deg);
}

.block-title {
  font-weight: 600;
  font-size: 13.5px;
  color: oklch(45% 0.13 70deg);
  margin-bottom: 8px;
}

.blocklist {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--warm-700);
  line-height: 1.7;
}
</style>
