<script setup lang="ts">
</script>

<template>
  <v-card class="vet-auth-card text-center mx-auto" max-width="540" :elevation="0">
    <v-icon icon="mdi-check-circle" color="success" size="80" class="mb-4" />
    <h1 class="vet-auth-title">¡Cuenta creada!</h1>
    <p class="vet-auth-sub">
      Tu empresa fue registrada y tu código de empleado se generó automáticamente.
      Ya puedes iniciar sesión con tu email y contraseña.
    </p>
    <v-btn
      :to="{ name: 'login' }"
      color="primary"
      size="large"
      append-icon="mdi-arrow-right"
      class="vet-auth-submit"
    >
      Ir a iniciar sesión
    </v-btn>
  </v-card>
</template>

<style scoped>
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
  margin: 8px 0 24px;
  color: var(--warm-600);
  font-size: 14px;
  line-height: 1.5;
}

.vet-auth-submit {
  background: linear-gradient(135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 9px !important;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 500;
  box-shadow:
    0 1px 2px rgba(50, 20, 80, 0.08),
    0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.4) !important;
  transition: filter 0.15s ease;
}
.vet-auth-submit:hover:not(:disabled) {
  filter: brightness(1.05);
}
</style>
</content>
</invoke>