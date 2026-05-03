<script setup lang="ts">
import LoginForm from '../components/LoginForm.vue'
</script>

<template>
  <v-main class="bg-background">
    <v-container class="py-10 d-flex justify-center">
      <v-card class="pa-6" max-width="440" width="100%">
        <v-card-title class="text-h5 mb-1">Iniciar sesión</v-card-title>
        <v-card-subtitle class="mb-4">
          Ingresa con tu código de empleado y contraseña.
        </v-card-subtitle>

        <LoginForm />

        <div class="text-body-2 text-medium-emphasis mt-6 text-center">
          ¿No tienes cuenta?
          <RouterLink to="/" class="text-primary">Regístrate</RouterLink>
        </div>
      </v-card>
    </v-container>
  </v-main>
</template>
