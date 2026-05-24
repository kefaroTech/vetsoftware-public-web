<script setup lang="ts">
import LoginForm from '../components/LoginForm.vue'
</script>

<template>
  <v-main class="vet-auth-shell">
    <v-container class="py-10 d-flex justify-center">
      <v-card class="vet-auth-card" max-width="440" width="100%" :elevation="0">
        <h1 class="vet-auth-title">Iniciar sesión</h1>
        <p class="vet-auth-sub">
          Ingresa con tu código de empleado y contraseña.
        </p>

        <LoginForm />

        <div class="vet-auth-footer text-body-2 mt-6 text-center">
          ¿No tienes cuenta?
          <RouterLink :to="{ name: 'signup' }">Regístrate</RouterLink>
        </div>
      </v-card>
    </v-container>
  </v-main>
</template>

<style scoped>
.vet-auth-shell {
  background:
    radial-gradient(at 25% 0%, oklch(95% 0.04 var(--hue)) 0%, transparent 50%),
    radial-gradient(at 75% 100%, oklch(95% 0.03 calc(var(--hue) - 20)) 0%, transparent 50%),
    var(--warm-100);
  min-height: 100vh;
}

.vet-auth-card {
  border: 1px solid var(--warm-200) !important;
  border-radius: 16px !important;
  padding: 36px !important;
  background: #ffffff;
  box-shadow:
    0 1px 2px rgba(50, 20, 80, 0.04),
    0 12px 40px -16px oklch(40% 0.18 var(--hue) / 0.18) !important;
}

.vet-auth-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  line-height: 1.1;
}

.vet-auth-sub {
  margin: 4px 0 24px;
  color: var(--warm-600);
  font-size: 14px;
  line-height: 1.5;
}

.vet-auth-footer {
  color: var(--warm-600);
}
.vet-auth-footer :deep(a) {
  color: var(--amatista-700);
  text-decoration: none;
  font-weight: 500;
}
.vet-auth-footer :deep(a:hover) {
  color: var(--amatista-600);
  text-decoration: underline;
}
</style>
</content>
</invoke>