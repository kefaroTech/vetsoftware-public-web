<script setup lang="ts">
import { ref } from 'vue'
import PublicLayout from '@/components/public/PublicLayout.vue'
import RegisterForm from '../components/RegisterForm.vue'
import CheckEmailPanel from '../components/CheckEmailPanel.vue'

// Flujo Opción B: form → check (sin auto-login). El email pasa a la pantalla 2.
const screen = ref<'form' | 'check'>('form')
const email = ref('')

function onSuccess(em: string) {
  email.value = em
  screen.value = 'check'
}
</script>

<template>
  <PublicLayout :footer-center="screen === 'check'">
    <template #topRight>
      ¿Ya tienes cuenta? <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
    </template>

    <RegisterForm v-if="screen === 'form'" class="pub-reveal" @success="onSuccess" />
    <CheckEmailPanel v-else :email="email" />
  </PublicLayout>
</template>
