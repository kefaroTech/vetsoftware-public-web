<script setup lang="ts">
import { computed } from 'vue'
import { Filter } from 'lucide-vue-next'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { useAppointments } from '../composables/useAppointments'
import { useVets } from '../composables/useVets'
import { APPT_STATUS, type AppointmentStatus } from '../types/appointment'

const { vetFilter, statusFilter, originFilter } = useAppointments()
const { vets } = useVets()

const vetOptions = computed(() => [
  { value: 'ALL', label: 'Todos los vets' },
  ...vets.value.map((v) => ({ value: String(v.id), label: v.name })),
])

const statusOptions = computed(() => [
  { value: 'ALL', label: 'Todos los estados' },
  ...(Object.entries(APPT_STATUS) as [AppointmentStatus, (typeof APPT_STATUS)[AppointmentStatus]][]).map(
    ([key, m]) => ({ value: key, label: m.label }),
  ),
])

const originOptions = [
  { value: 'ALL', label: 'Todos los orígenes' },
  { value: 'APPOINTMENTS', label: 'Citas' },
  { value: 'CLINICAL', label: 'Eventos clínicos' },
]

const vetModel = computed({
  get: () => (vetFilter.value === 'ALL' ? 'ALL' : String(vetFilter.value)),
  set: (v: string) => (vetFilter.value = v === 'ALL' ? 'ALL' : Number(v)),
})
const statusModel = computed({
  get: () => statusFilter.value,
  set: (v: string) => (statusFilter.value = v as AppointmentStatus | 'ALL'),
})
const originModel = computed({
  get: () => originFilter.value,
  set: (v: string) => (originFilter.value = v as 'ALL' | 'APPOINTMENTS' | 'CLINICAL'),
})
</script>

<template>
  <div class="filterbar">
    <Filter :size="15" :stroke-width="1.7" class="filter-icon" />
    <div class="sel"><BaseSelect v-model="vetModel" :options="vetOptions" /></div>
    <div class="sel"><BaseSelect v-model="statusModel" :options="statusOptions" /></div>
    <div class="sel"><BaseSelect v-model="originModel" :options="originOptions" /></div>
  </div>
</template>

<style scoped>
.filterbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-icon {
  color: var(--warm-500);
  flex-shrink: 0;
}
.sel {
  min-width: 170px;
}
</style>
