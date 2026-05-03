<script setup lang="ts">
</script>

<template>
  <v-card class="pa-8 text-center mx-auto" max-width="540">
    <v-icon icon="mdi-check-circle" color="success" size="80" class="mb-4" />
    <v-card-title class="text-h5 mb-2">¡Cuenta creada!</v-card-title>
    <v-card-text class="text-body-1 mb-4">
      Tu empresa fue registrada y tu código de empleado se generó automáticamente.
      Ya puedes iniciar sesión con tu email y contraseña.
    </v-card-text>
    <v-btn :to="{ name: 'login' }" color="primary" size="large" append-icon="mdi-arrow-right">
      Ir a iniciar sesión
    </v-btn>
  </v-card>
</template>
