<script setup lang="ts">
import { RouterView } from 'vue-router'
import PageLoader from '@/components/ui/PageLoader.vue'
import ConsultaActiveBanner from '@/components/ui/ConsultaActiveBanner.vue'
import ResumeOrNewConsultaDialog from '@/features/dashboard/views/consulta/nueva/components/ResumeOrNewConsultaDialog.vue'
import { useConsultaResumeGuard } from '@/composables/useConsultaResumeGuard'

const guard = useConsultaResumeGuard()
</script>

<template>
  <v-app>
    <RouterView />
    <ConsultaActiveBanner />
    <PageLoader />
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
