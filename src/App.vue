<script setup lang="ts">
import { RouterView } from 'vue-router'
import PageLoader from '@/components/feedback/PageLoader.vue'
import ConsultaActiveBanner from '@/components/feedback/ConsultaActiveBanner.vue'
import ToastStack from '@/components/feedback/ToastStack.vue'
import AppConfirmDialog from '@/components/feedback/AppConfirmDialog.vue'
import ResumeOrNewConsultaDialog from '@/features/dashboard/views/consulta/nueva/components/ResumeOrNewConsultaDialog.vue'
import BillingPromptHost from '@/features/cuentas/components/BillingPromptHost.vue'
import { useConsultaResumeGuard } from '@/composables/useConsultaResumeGuard'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const guard = useConsultaResumeGuard()
const auth = useAuthStore()
</script>

<template>
  <v-app>
    <RouterView />
    <!--
      El banner vive FUERA del RouterView, así que se pinta también sobre /login.
      Sin este `v-if` anunciaba «Consulta en curso — {mascota} · {propietario}» con
      los datos del turno anterior a quien todavía no había iniciado sesión. Es un
      `v-if` y no un `v-show` a propósito: así el store del borrador ni siquiera se
      construye mientras no hay sesión, y nada puede leer ni pisar lo guardado.
    -->
    <ConsultaActiveBanner v-if="auth.isAuthenticated" />
    <PageLoader />
    <ToastStack />
    <BillingPromptHost />
    <!-- Único diálogo de confirmación de la app: lo abre cualquier vista con
         `useConfirmDialog().confirm(...)` y solo existe esta instancia. -->
    <AppConfirmDialog />
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
