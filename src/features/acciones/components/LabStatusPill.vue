<script setup lang="ts">
import type { LaboratoryTestStatus } from '@/types/domain'

defineProps<{ status: LaboratoryTestStatus }>()

const STATUS_LABEL: Record<LaboratoryTestStatus, string> = {
  PENDING_COLLECTION: 'Pendiente por recolectar',
  PENDING_PROCESSING: 'Pendiente por procesar',
  IN_PROGRESS: 'En proceso',
  PENDING_VALIDATION: 'Por validar',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

const STATUS_TONE: Record<LaboratoryTestStatus, { bg: string; fg: string; dot: string }> = {
  PENDING_COLLECTION: {
    bg: 'var(--warm-200)',
    fg: 'var(--warm-700)',
    dot: 'var(--warm-500)',
  },
  PENDING_PROCESSING: {
    bg: 'var(--warning-50)',
    fg: 'var(--warning-900)',
    dot: 'var(--warning-border)',
  },
  IN_PROGRESS: {
    bg: 'var(--navy-100, var(--amatista-50))',
    fg: 'var(--navy-700, var(--amatista-600))',
    dot: 'var(--navy-600, var(--amatista-500))',
  },
  PENDING_VALIDATION: {
    bg: 'var(--violet-100, var(--amatista-200))',
    fg: 'var(--violet-700, var(--amatista-900))',
    dot: 'var(--violet-600, var(--amatista-700))',
  },
  COMPLETED: {
    bg: 'var(--success-bg)',
    fg: 'var(--success-fg)',
    dot: 'var(--success-dot)',
  },
  CANCELLED: {
    bg: 'var(--danger-150)',
    fg: 'var(--danger-700)',
    dot: 'var(--danger-border)',
  },
}
</script>

<template>
  <span
    class="ds-pill"
    :style="{ background: STATUS_TONE[status].bg, color: STATUS_TONE[status].fg }"
  >
    <span class="ds-status-dot" :style="{ background: STATUS_TONE[status].dot }" />
    {{ STATUS_LABEL[status] }}
  </span>
</template>
