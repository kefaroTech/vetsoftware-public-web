<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PublicLayout from '@/components/public/PublicLayout.vue'
import { SESSION_REPLACED_NOTICE_KEY } from '@/services/http/http.client'
import LoginForm from '../components/LoginForm.vue'

const sessionNotice = ref('')

onMounted(() => {
  sessionNotice.value = sessionStorage.getItem(SESSION_REPLACED_NOTICE_KEY) ?? ''
  sessionStorage.removeItem(SESSION_REPLACED_NOTICE_KEY)
})
</script>

<template>
  <PublicLayout>
    <template #topRight>
      ¿Eres nuevo? <RouterLink :to="{ name: 'signup' }">Crea una cuenta</RouterLink>
    </template>

    <div class="pub-card pub-reveal">
      <div class="pub-eyebrow">Panel administrativo</div>
      <h1 class="pub-title">Inicia sesión</h1>
      <p class="pub-sub">Accede al panel para administrar VetSoftware.</p>
      <v-alert v-if="sessionNotice" class="mb-5" type="warning" variant="tonal" density="compact">
        {{ sessionNotice }}
      </v-alert>
      <LoginForm />
    </div>
  </PublicLayout>
</template>

<style scoped>
/* Estas dos pantallas llevan el titular un punto más grande. */
.pub-title {
  font-size: 34px;
  line-height: 1.05;
}

.pub-sub {
  margin: 10px 0 28px;
  line-height: 1.5;
}
</style>
