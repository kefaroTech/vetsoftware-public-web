<script setup lang="ts">
import { ref } from 'vue'
import SignupForm from '../components/SignupForm.vue'
import SignupSuccessCard from '../components/SignupSuccessCard.vue'

const stage = ref<'form' | 'success'>('form')
</script>

<template>
  <v-main class="bg-background">
    <v-container class="py-10">
      <SignupForm v-if="stage === 'form'" @success="stage = 'success'" />
      <SignupSuccessCard v-else />
    </v-container>
  </v-main>
</template>
