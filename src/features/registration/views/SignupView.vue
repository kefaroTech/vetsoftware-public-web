<script setup lang="ts">
import SignupForm from '../components/SignupForm.vue'
</script>

<template>
  <v-main class="vet-auth-shell">
    <v-container class="py-16 d-flex justify-center">
      <!-- Tras registrarse, SignupForm establece la sesión (auto-login) y navega al
           dashboard; ya no hay pantalla intermedia de éxito. -->
      <SignupForm />
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
</style>
