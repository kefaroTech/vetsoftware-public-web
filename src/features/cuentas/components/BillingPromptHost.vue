<script setup lang="ts">
import ConsultaBillingModal from './ConsultaBillingModal.vue'
import { useBillingPrompt } from '../composables/useBillingPrompt'

const { state, closeBilling, finishBilling } = useBillingPrompt()
</script>

<template>
  <ConsultaBillingModal
    :open="state.open"
    :owner-id="state.ownerId"
    :owner-name="state.ownerName"
    :animal-id="state.animalId"
    :animal-name="state.animalName"
    :heading="state.heading"
    :subtitle="state.subtitle"
    :auto-consulta="state.autoConsulta"
    :dismissible="state.dismissible"
    @finish="finishBilling"
    @close="closeBilling"
  />
</template>
