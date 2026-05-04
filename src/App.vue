<script setup lang="ts">
import { RouterView } from 'vue-router'
import PageLoader from '@/components/ui/PageLoader.vue'
</script>

<template>
  <v-app>
    <RouterView />
    <PageLoader />
  </v-app>
</template>
