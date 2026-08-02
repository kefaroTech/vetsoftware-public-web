<script setup lang="ts">
defineProps<{
  label: string
  value?: string | null
  empty?: boolean
  last?: boolean
}>()
</script>

<template>
  <div class="row" :class="{ last }">
    <div class="lab">{{ label }}</div>
    <div class="val" :class="{ muted: empty }">
      <slot>
        <em v-if="empty">Sin completar</em>
        <span v-else>{{ value || '—' }}</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--warm-200);
}

.row.last {
  border-bottom: none;
}

.lab {
  font-size: 11.5px;
  color: var(--warm-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-top: 2px;
}

.val {
  font-size: 13px;
  color: var(--warm-900);
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.val.muted em {
  color: var(--warm-500);
  font-style: italic;
  font-weight: 400;
}

@media (width <= 640px) {
  .row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
