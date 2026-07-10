<script setup lang="ts">
/** Banner cerrable error/warning (handoff reg-fields `Banner`). */
withDefaults(
  defineProps<{
    tone?: 'error' | 'warning'
    closable?: boolean
  }>(),
  { tone: 'error', closable: true },
)
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <div class="pub-banner" :class="`pub-banner--${tone}`" role="alert">
    <v-icon size="17" class="pub-banner-ico">
      {{ tone === 'warning' ? 'mdi-alert-outline' : 'mdi-alert-circle-outline' }}
    </v-icon>
    <div class="pub-banner-body"><slot /></div>
    <button
      v-if="closable"
      type="button"
      class="pub-banner-close"
      aria-label="Cerrar"
      @click="emit('close')"
    >
      <v-icon size="15">mdi-close</v-icon>
    </button>
  </div>
</template>

<style scoped>
.pub-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 13px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.45;
  border: 1px solid;
}
.pub-banner--error {
  background: var(--pub-err-bg);
  border-color: var(--pub-err-bd);
  color: var(--pub-err-tx-2);
}
.pub-banner--warning {
  background: var(--pub-warn-bg);
  border-color: var(--pub-warn-bd);
  color: var(--pub-warn-tx);
}
.pub-banner-ico {
  flex-shrink: 0;
  margin-top: 1px;
}
.pub-banner-body {
  flex: 1;
}
.pub-banner-body :deep(a) {
  color: inherit;
  font-weight: 600;
}
.pub-banner-close {
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.pub-banner-close:hover {
  opacity: 1;
}
</style>
