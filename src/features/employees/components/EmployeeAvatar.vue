<script setup lang="ts">
import { computed } from 'vue'
import { colorsForCode } from '../constants/employee-roles'

const props = withDefaults(
  defineProps<{
    initials: string
    size?: number
    active?: boolean
    roleCode?: string
  }>(),
  { size: 36, active: true, roleCode: '' },
)

const tokens = computed(() => colorsForCode(props.roleCode))
const bg = computed(() => (props.active ? tokens.value.bg : 'var(--warm-200)'))
const fg = computed(() => (props.active ? tokens.value.fg : 'var(--warm-500)'))
const fontSize = computed(() => `${Math.round(props.size * 0.34)}px`)
</script>

<template>
  <div
    class="avatar"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      background: bg,
      color: fg,
      fontSize: fontSize,
    }"
  >
    {{ initials }}
    <span v-if="!active" class="dot" />
  </div>
</template>

<style scoped>
.avatar {
  position: relative;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 600;
  letter-spacing: 0.01em;
  flex-shrink: 0;
}
.dot {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--warm-400);
  border: 2px solid var(--warm-50);
}
</style>
