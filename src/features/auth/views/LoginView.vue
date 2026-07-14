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

    <div class="login-card pub-reveal">
      <div class="login-eyebrow">Panel administrativo</div>
      <h1 class="login-title">Inicia sesión</h1>
      <p class="login-sub">Accede al panel para administrar VetSoftware.</p>
      <v-alert
        v-if="sessionNotice"
        class="mb-5"
        type="warning"
        variant="tonal"
        density="compact"
      >
        {{ sessionNotice }}
      </v-alert>
      <LoginForm />
    </div>
  </PublicLayout>
</template>

<style scoped>
.login-card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--pub-line);
  box-shadow: var(--pub-card-shadow);
  padding: 40px 44px;
}
.login-eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: var(--pub-ame-700);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.login-title {
  font-family: 'Instrument Serif', serif;
  font-size: 34px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
.login-sub {
  font-size: 13px;
  color: var(--pub-ink-500);
  margin: 10px 0 28px;
  line-height: 1.5;
}
@media (max-width: 520px) {
  .login-card {
    padding: 32px 24px;
  }
}
</style>
