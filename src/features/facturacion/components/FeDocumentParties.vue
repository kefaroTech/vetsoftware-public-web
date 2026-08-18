<script setup lang="ts">
import { computed } from 'vue'
import {
  COMPANY_DOCTYPE_LABEL,
  type CompanyDocumentType,
  type CustomerSnapshot,
  type IssuerSnapshot,
} from '../types/facturacion'

/**
 * Las dos tarjetas de partes del documento electrónico: emisor y adquiriente.
 *
 * Sale de `FeDocumentDetail` con sus mapeadores y sus 7 reglas de CSS. Los dos
 * snapshots son fotos inmutables guardadas con el documento (no la ficha viva
 * del cliente), así que aquí sólo se leen.
 */
const props = defineProps<{ issuer: IssuerSnapshot; customer: CustomerSnapshot }>()

function docTypeLabel(dt: string): string {
  return COMPANY_DOCTYPE_LABEL[dt as CompanyDocumentType]?.split(' ')[0] ?? dt
}

const issuerParty = computed(() => ({
  name: props.issuer.legalName ?? '—',
  docType: docTypeLabel(props.issuer.documentType),
  docId: props.issuer.documentId,
  dv: props.issuer.verificationDigit,
  regime: props.issuer.taxRegime,
  personType: null as string | null,
  email: props.issuer.email,
}))

const customerParty = computed(() => ({
  name: props.customer.legalName || props.customer.name || '—',
  docType: docTypeLabel(props.customer.documentType),
  docId: props.customer.documentId,
  dv: props.customer.verificationDigit,
  regime: null as string | null,
  personType: props.customer.personType,
  email: props.customer.email,
}))
</script>

<template>
  <div class="grid">
    <div class="ds-card">
      <div class="card-title">Emisor</div>
      <div class="party">
        <div class="party-name ds-strong">{{ issuerParty.name }}</div>
        <div class="party-rows ds-stack">
          <div>
            <span>Documento</span
            ><span
              >{{ issuerParty.docType }} {{ issuerParty.docId
              }}<template v-if="issuerParty.dv">-{{ issuerParty.dv }}</template></span
            >
          </div>
          <div v-if="issuerParty.regime">
            <span>Régimen</span><span>{{ issuerParty.regime }}</span>
          </div>
          <div>
            <span>Correo</span><span>{{ issuerParty.email || '—' }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="ds-card">
      <div class="card-title">Adquiriente</div>
      <div class="party">
        <div class="party-name ds-strong">{{ customerParty.name }}</div>
        <div class="party-rows ds-stack">
          <div>
            <span>Documento</span
            ><span
              >{{ customerParty.docType }} {{ customerParty.docId
              }}<template v-if="customerParty.dv">-{{ customerParty.dv }}</template></span
            >
          </div>
          <div v-if="customerParty.personType">
            <span>Tipo</span
            ><span>{{ customerParty.personType === 'JURIDICA' ? 'Jurídica' : 'Natural' }}</span>
          </div>
          <div>
            <span>Correo</span><span>{{ customerParty.email || '—' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Layout via primitivas: `.ds-card`, `.ds-stack` y `.ds-strong`. */

/* Rejilla intrínseca propia: mínimo de columna 260px. */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.card-title {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
  margin-bottom: 10px;
}

.party-name {
  font-size: 14.5px;
  margin-bottom: 8px;
}

.party-rows {
  gap: 5px;
}

.party-rows > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
}

.party-rows span:first-child {
  color: var(--warm-500);
}

.party-rows span:last-child {
  color: var(--warm-800);
  text-align: right;
  overflow-wrap: anywhere;
}

/* Override mínimo sobre `.ds-card`. */
.ds-card {
  padding: 18px 20px;
}
</style>
