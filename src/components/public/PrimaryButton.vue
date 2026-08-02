<script setup lang="ts">
/** Botón primario con gradiente amatista (handoff §10). Soporta estado loading. */
withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    loading?: boolean
    loadingText?: string
  }>(),
  { type: 'button', loading: false, loadingText: 'Cargando…' },
)
const emit = defineEmits<(e: 'click') => void>()
</script>

<template>
  <button
    :type="type"
    class="pub-btn"
    :class="{ 'pub-btn--loading': loading }"
    :disabled="loading"
    @click="emit('click')"
  >
    <template v-if="loading"> <span class="pub-btn-spin" /> {{ loadingText }} </template>
    <template v-else>
      <slot />
    </template>
  </button>
</template>

<style scoped>
.pub-btn {
  width: 100%;
  padding: 13px 16px;
  border-radius: 9px;
  background: linear-gradient(180deg, #9333ea, #7e22ce);
  color: #fff;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--pub-btn-shadow);
  transition:
    transform 0.12s,
    box-shadow 0.15s,
    background 0.15s;
}

.pub-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--pub-btn-shadow-hover);
}

.pub-btn--loading {
  background: #a78bce;
  box-shadow: none;
  cursor: wait;
}

.pub-btn-spin {
  width: 15px;
  height: 15px;
  border: 2px solid rgb(255 255 255 / 40%);
  border-top-color: #fff;
  border-radius: 50%;
  display: block;
  animation: pub-spin 0.7s linear infinite;
}
</style>
