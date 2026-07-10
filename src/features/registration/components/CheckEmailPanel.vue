<script setup lang="ts">
import { useRouter } from 'vue-router'
import PrimaryButton from '@/components/public/PrimaryButton.vue'

/** Pantalla 2 del registro — "Revisa tu correo" (handoff §7.2). Sin auto-login. */
defineProps<{ email: string }>()

const router = useRouter()
</script>

<template>
  <div class="check-card pub-reveal">
    <div class="check-icon">
      <v-icon size="36">mdi-email-check-outline</v-icon>
    </div>
    <h1 class="check-title">Revisa tu correo</h1>
    <p class="check-text">
      Te enviamos un enlace de verificación a <strong>{{ email }}</strong>. Ábrelo para activar tu
      cuenta; después podrás iniciar sesión.
    </p>
    <p class="check-note">¿No lo ves? Revisa la carpeta de spam. El enlace vence en unas horas.</p>
    <div class="check-actions">
      <PrimaryButton @click="router.push({ name: 'login' })">Ir a iniciar sesión</PrimaryButton>
    </div>
  </div>
</template>

<style scoped>
.check-card {
  width: 100%;
  max-width: 560px;
  text-align: center;
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--pub-line);
  box-shadow: var(--pub-card-shadow);
  padding: clamp(30px, 5vw, 46px) clamp(26px, 5vw, 44px);
}
.check-icon {
  width: 74px;
  height: 74px;
  margin: 0 auto;
  border-radius: 18px;
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
  border: 1px solid #ecd9fb;
  display: grid;
  place-items: center;
  color: var(--pub-ame-700);
}
.check-title {
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  font-weight: 400;
  margin: 18px 0 0;
  letter-spacing: -0.02em;
  line-height: 1.08;
}
.check-text {
  font-size: 14.5px;
  color: var(--pub-ink-600);
  line-height: 1.6;
  margin: 12px auto 0;
  max-width: 420px;
}
.check-text strong {
  color: var(--pub-ink-900);
}
.check-note {
  font-size: 12.5px;
  color: var(--pub-ink-400);
  line-height: 1.55;
  margin: 14px auto 0;
  max-width: 400px;
}
.check-actions {
  margin-top: 26px;
}
</style>
