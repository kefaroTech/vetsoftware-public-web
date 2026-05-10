<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, type Component } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    icon?: Component
    width?: number
    accent?: 'amatista' | 'danger' | 'warn'
    closeOnBackdrop?: boolean
  }>(),
  {
    width: 720,
    accent: 'amatista',
    closeOnBackdrop: true,
  },
)

const emit = defineEmits<{ close: [] }>()

const closeBtn = ref<HTMLButtonElement | null>(null)

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

function onBackdrop() {
  if (props.closeOnBackdrop) emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) requestAnimationFrame(() => closeBtn.value?.focus())
  },
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title"
        @click.self="onBackdrop"
      >
        <div
          class="card"
          :class="`accent-${accent}`"
          :style="{ width: `${width}px`, maxWidth: 'calc(100vw - 32px)' }"
        >
          <header class="head">
            <div v-if="icon" class="icon-box">
              <component :is="icon" :size="20" :stroke-width="1.7" />
            </div>
            <div class="head-text">
              <h2 class="title">{{ title }}</h2>
              <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
            </div>
            <button
              ref="closeBtn"
              type="button"
              class="close"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <X :size="18" :stroke-width="1.7" />
            </button>
          </header>

          <div class="body">
            <slot name="body" />
          </div>

          <footer v-if="$slots['footer-left'] || $slots['footer-actions']" class="foot">
            <div class="foot-left">
              <slot name="footer-left" />
            </div>
            <div class="foot-actions">
              <slot name="footer-actions" />
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 15, 30, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  z-index: 1500;
  font-family: var(--font-sans);
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.card {
  background: var(--warm-50);
  border-radius: 16px;
  box-shadow: 0 30px 80px rgba(20, 15, 30, 0.35);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  overflow: hidden;
}
.head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: clamp(18px, 1.5vw + 8px, 28px) clamp(20px, 2vw + 12px, 36px) clamp(14px, 1vw + 8px, 20px);
  border-bottom: 1px solid var(--warm-200);
  background: var(--warm-50);
  position: sticky;
  top: 0;
  z-index: 1;
}
.icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.accent-amatista .icon-box {
  background: var(--amatista-100);
  color: var(--amatista-700);
}
.accent-danger .icon-box {
  background: oklch(94% 0.06 25);
  color: oklch(50% 0.18 25);
}
.accent-warn .icon-box {
  background: oklch(95% 0.06 80);
  color: oklch(45% 0.13 80);
}
.head-text {
  flex: 1;
  min-width: 0;
}
.title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  line-height: 1.15;
}
.subtitle {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
  line-height: 1.4;
}
.close {
  background: transparent;
  border: none;
  color: var(--warm-500);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s ease;
}
.close:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}
.body {
  flex: 1;
  overflow: auto;
  padding: clamp(20px, 1.6vw + 10px, 32px) clamp(20px, 2vw + 12px, 36px);
}
.foot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: clamp(12px, 1vw + 4px, 18px) clamp(20px, 2vw + 12px, 36px);
  border-top: 1px solid var(--warm-200);
  background: var(--warm-50);
  position: sticky;
  bottom: 0;
}
.foot-left {
  flex: 1;
  font-size: 12.5px;
  color: var(--warm-500);
}
.foot-actions {
  display: flex;
  gap: 8px;
}
</style>
