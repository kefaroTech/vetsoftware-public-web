<script setup lang="ts">
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import { PERMISSIONS } from '@/constants/permissions'
import TaxProfileCard from '../components/config/TaxProfileCard.vue'
import ProviderConfigCard from '../components/config/ProviderConfigCard.vue'
import NumberingResolutionsCard from '../components/config/NumberingResolutionsCard.vue'
import WithholdingCard from '../components/config/WithholdingCard.vue'

const { can } = useFacturacionAccess()

const showTaxProfile = can(PERMISSIONS.COMPANY_TAX_PROFILE_READ) || can(PERMISSIONS.COMPANY_TAX_PROFILE_MANAGE)
const showProvider = can(PERMISSIONS.DIAN_PROVIDER_CONFIG_READ) || can(PERMISSIONS.DIAN_PROVIDER_CONFIG_MANAGE)
const showResolutions = can(PERMISSIONS.NUMBERING_RESOLUTION_READ)
const showWithholding = can(PERMISSIONS.WITHHOLDING_CONFIG_READ) || can(PERMISSIONS.WITHHOLDING_CONFIG_MANAGE)
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="kicker">Facturación electrónica</div>
      <h1 class="title">Configuración DIAN</h1>
      <p class="lead">Identidad fiscal, proveedor, numeración autorizada y retenciones.</p>
    </header>

    <div class="cards">
      <TaxProfileCard v-if="showTaxProfile" />
      <ProviderConfigCard v-if="showProvider" />
      <NumberingResolutionsCard v-if="showResolutions" />
      <WithholdingCard v-if="showWithholding" />
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.kicker { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-500); font-weight: 500; }
.title { margin: 4px 0 0; font-family: var(--font-serif); font-size: 34px; font-weight: 400; letter-spacing: -0.015em; color: var(--warm-900); line-height: 1.05; }
.lead { margin: 6px 0 0; font-size: 13.5px; color: var(--warm-600); }
.cards { display: flex; flex-direction: column; gap: 18px; }
</style>
