<script setup lang="ts">
import { computed } from 'vue'
import { Mail, IdCard, Calendar, Building2 } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'

const props = defineProps<{ employee: Employee }>()

const branches = computed(() => props.employee.branches)

const fields = computed(() => [
  { icon: Mail, label: 'Correo', value: props.employee.email || '—' },
  { icon: IdCard, label: 'Código de empleado', value: props.employee.employeeCode || '—' },
  { icon: Calendar, label: 'Fecha de ingreso', value: formatDate(props.employee.createdDate) },
])

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}
</script>

<template>
  <div class="fields">
    <div v-for="(f, i) in fields" :key="i" class="row" :class="{ first: i === 0 }">
      <div class="ic">
        <component :is="f.icon" :size="15" :stroke-width="1.7" />
      </div>
      <div class="data">
        <div class="label">{{ f.label }}</div>
        <div class="value">{{ f.value }}</div>
      </div>
    </div>

    <div class="row">
      <div class="ic">
        <Building2 :size="15" :stroke-width="1.7" />
      </div>
      <div class="data">
        <div class="label">Sedes</div>
        <div v-if="branches.length > 0" class="chips">
          <span v-for="b in branches" :key="b.id" class="chip">{{ b.name }}</span>
        </div>
        <div v-else class="value muted">Sin sedes asignadas</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fields {
  display: flex;
  flex-direction: column;
}
.row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 0;
  border-top: 1px solid var(--warm-150);
}
.row.first {
  border-top: none;
  padding-top: 0;
}
.ic {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--warm-100);
  color: var(--warm-600);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.data {
  flex: 1;
  min-width: 0;
}
.label {
  font-size: 11.5px;
  color: var(--warm-500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 3px;
}
.value {
  font-size: 14px;
  color: var(--warm-900);
  word-break: break-word;
}
.value.muted {
  color: var(--warm-500);
  font-style: italic;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  padding: 3px 10px;
  font-size: 12.5px;
  color: var(--warm-700);
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 999px;
  white-space: nowrap;
}
</style>
