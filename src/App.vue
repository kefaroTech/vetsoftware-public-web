<script setup lang="ts">
import { RouterView } from 'vue-router'
import PageLoader from '@/components/feedback/PageLoader.vue'
import ConsultaActiveBanner from '@/components/feedback/ConsultaActiveBanner.vue'
import ToastStack from '@/components/feedback/ToastStack.vue'
import ResumeOrNewConsultaDialog from '@/features/dashboard/views/consulta/nueva/components/ResumeOrNewConsultaDialog.vue'
import BillingPromptHost from '@/features/cuentas/components/BillingPromptHost.vue'
import { useConsultaResumeGuard } from '@/composables/useConsultaResumeGuard'

const guard = useConsultaResumeGuard()
</script>

<template>
  <v-app>
    <RouterView />
    <ConsultaActiveBanner />
    <PageLoader />
    <ToastStack />
    <BillingPromptHost />
    <ResumeOrNewConsultaDialog
      :open="guard.state.open"
      :owner-name="guard.state.ownerName"
      :pet-name="guard.state.petName"
      :step="guard.state.step"
      @continue="guard.handleContinue"
      @create-new="guard.handleCreateNew"
      @cancel="guard.close"
    />
  </v-app>
</template>
