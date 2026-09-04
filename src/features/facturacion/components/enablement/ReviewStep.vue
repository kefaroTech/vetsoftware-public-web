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
  <div class="ds-stack ds-stack--16">
    <SectionHead
      :icon="ShieldCheck"
      title="Revisión"
      sub="Verifica que la configuración esté completa. La emisión real se habilita por permisos del plan Premium."
    />

    <div v-for="s in sections" :key="s.step" class="ds-card reviewcard">
      <div class="review-head">
        <div class="review-title ds-strong">
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
        <div v-for="(r, i) in s.rows" :key="i" class="ds-stack">
          <span>{{ r.label }}</span
          ><strong>{{ r.value || '—' }}</strong>
        </div>
      </div>
      <div v-else class="ds-meta ds-meta--sm">Sin datos todavía.</div>
    </div>

    <div v-if="ready" class="successbox">
      <div class="success-ic"><ShieldCheck :size="24" :stroke-width="1.8" /></div>
      <div class="ds-flex-fill">
        <div class="success-title">Lista para facturar</div>
        <div class="success-sub ds-meta-dark ds-meta-dark--sm">
          La configuración fiscal está completa. Las ventas y cierres de cuenta generan documentos
          electrónicos automáticamente.
        </div>
      </div>
      <button type="button" class="ds-btn ds-btn--primary ds-btn--strong" @click="emit('exit')">
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
/* Layout: `.ds-stack--16` + `.ds-stack` (columnas), `.ds-strong` (título de sección)
   y `.ds-flex-fill` (texto del recuadro de éxito). Aquí sólo lo propio. */
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
  font-size: 14px;
}

.review-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--warm-50);
}

.review-badge.ok {
  background: var(--success-dot);
}

.review-badge.pend {
  background: var(--warning-border);
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

.successbox {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--success-50), var(--warm-50));
  border: 1px solid var(--compras-ok-bg);
}

.success-ic {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--compras-ok-bg);
  color: var(--compras-ok-fg);
  flex-shrink: 0;
}

.success-title {
  font-family: var(--font-display);
  font-size: 19px;
  color: var(--warm-900);
}

.success-sub {
  line-height: 1.45;
  margin-top: 2px;
}

.blockbox {
  padding: 18px 22px;
  border-radius: 14px;
  border: 1px solid var(--warning-200);
  background: var(--warning-50);
}

.block-title {
  font-weight: 600;
  font-size: 13.5px;
  color: var(--warning-900);
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
