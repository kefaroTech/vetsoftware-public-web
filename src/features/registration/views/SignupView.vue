<script setup lang="ts">
import { ref } from 'vue'
import SignupForm from '../components/SignupForm.vue'
import SignupSuccessCard from '../components/SignupSuccessCard.vue'

const stage = ref<'form' | 'success'>('form')
</script>

<template>
  <v-main class="vet-auth-shell">
    <v-container class="py-16 d-flex justify-center">
      <SignupForm v-if="stage === 'form'" @success="stage = 'success'" />
      <SignupSuccessCard v-else />
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
