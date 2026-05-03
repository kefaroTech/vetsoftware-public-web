<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  firstName: string
  lastName: string
  role: string
}>()

const initials = computed(() =>
  `${props.firstName.charAt(0)}${props.lastName.charAt(0)}`.toUpperCase(),
)
const fullName = computed(() => `${props.firstName} ${props.lastName}`)
</script>

<template>
  <button type="button" class="user-card">
    <div class="avatar">{{ initials }}</div>
    <div class="info">
      <div class="name">{{ fullName }}</div>
      <div class="role">{{ role }}</div>
    </div>
    <ChevronRight :size="14" :stroke-width="1.5" class="chev" />
  </button>
</template>

<style scoped>
.user-card {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: oklch(35% 0.10 var(--hue) / 0.4);
  color: oklch(94% 0.02 var(--hue));
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: 100%;
  transition: background 0.12s ease;
}
.user-card:hover {
  background: oklch(40% 0.10 var(--hue) / 0.5);
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.role {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 1px;
}
.chev {
  opacity: 0.5;
  flex-shrink: 0;
}
</style>
