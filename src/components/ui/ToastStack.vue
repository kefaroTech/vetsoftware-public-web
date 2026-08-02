<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-vue-next'
import { useToast, type ToastKind } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const iconFor = computed(() => (kind: ToastKind) => {
  switch (kind) {
    case 'success':
      return CheckCircle2
    case 'info':
      return Info
    case 'warn':
      return AlertTriangle
    case 'error':
      return XCircle
  }
})
</script>

<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="true">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast-${t.kind}`" role="status">
      <div class="toast-icon">
        <component :is="iconFor(t.kind)" :size="16" :stroke-width="2" />
      </div>
      <div class="toast-body">
        <div class="toast-title">{{ t.title }}</div>
        <div v-if="t.message" class="toast-message">{{ t.message }}</div>
      </div>
      <button
        type="button"
        class="toast-close"
        aria-label="Cerrar notificación"
        @click="dismiss(t.id)"
      >
        <X :size="14" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: calc(100vw - 36px);
}

.toast {
  pointer-events: auto;
  min-width: 280px;
  max-width: 380px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 11px;
  box-shadow: 0 12px 36px -8px rgb(20 15 30 / 18%);
  font-family: var(--font-sans);
  animation: vet-toast-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes vet-toast-in {
  from {
    transform: translateY(-8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.toast-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: white;
}
.toast-success .toast-icon {
  background: oklch(55% 0.16 145deg);
}
.toast-info .toast-icon {
  background: oklch(55% 0.16 240deg);
}
.toast-warn .toast-icon {
  background: oklch(65% 0.16 75deg);
}
.toast-error .toast-icon {
  background: oklch(55% 0.18 25deg);
}

.toast-success {
  border-left: 3px solid oklch(55% 0.16 145deg);
}
.toast-info {
  border-left: 3px solid oklch(55% 0.16 240deg);
}
.toast-warn {
  border-left: 3px solid oklch(65% 0.16 75deg);
}
.toast-error {
  border-left: 3px solid oklch(55% 0.18 25deg);
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
  line-height: 1.3;
}

.toast-message {
  font-size: 12.5px;
  color: var(--warm-600);
  margin-top: 2px;
  line-height: 1.4;
}

.toast-close {
  background: transparent;
  border: none;
  color: var(--warm-500);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.toast-close:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}
</style>
