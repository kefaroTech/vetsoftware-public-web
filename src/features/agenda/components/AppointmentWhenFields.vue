<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import DateInput from '@/components/ui/DateInput.vue'
import TimeInput from './TimeInput.vue'
import AppointmentNoticeBanner from './AppointmentNoticeBanner.vue'
import { useVets } from '../composables/useVets'
import { useAppointmentDuration } from '../composables/useAppointmentDuration'
import {
  APPT_TYPES,
  apptClashes,
  apptEndTime,
  apptTimeRange,
  type AppointmentResponse,
  type AppointmentType,
} from '../types/appointment'
import type { AppointmentForm } from '../composables/useAppointmentForm'

/**
 * Primera mitad del formulario de cita: CUÁNDO (fecha, hora, duración), CON QUIÉN
 * (veterinario/a), DÓNDE (sede), de qué tipo, y el aviso de choque de horario.
 *
 * Se extrajo de `AppointmentFormModal.vue` porque era el mayor SFC del repo (807
 * líneas). El corte es el que ya tenía el formulario: esta sección y la del sujeto
 * de la cita están separadas por un `<div class="divider">` y no comparten estado
 * más allá del borrador, que llega entero en `form` — las mismas refs de
 * `useAppointmentForm`, así que ni la reactividad ni el momento de escritura
 * cambian. La lógica de duración y de solape (BE-17) viaja intacta.
 */
const props = defineProps<{
  form: AppointmentForm
  appointment: AppointmentResponse | null
  existing: AppointmentResponse[]
  vetOptions: { value: string; label: string }[]
  branchOptions: { value: string; label: string }[]
  showBranchField: boolean
}>()

const branchId = defineModel<number | null>('branchId', { required: true })

const { date, time, durationMinutes, type, employeeId, submitted, isReschedule, startAtIso } =
  props.form

// Sólo se lee la lista ya cargada: el `load(true)` al abrir lo dispara el modal.
const { vets } = useVets(false)
const { defaultDurationMinutes, options: durationOptions } = useAppointmentDuration()

const typeEntries = Object.entries(APPT_TYPES) as [
  AppointmentType,
  (typeof APPT_TYPES)[AppointmentType],
][]

// ── Duración ─────────────────────────────────────────────────────────
/**
 * El valor `''` es «por defecto». Su etiqueta cambia con el modo porque el backend le da dos
 * significados: en crear/editar (PUT) `null` devuelve la cita a la duración de la empresa;
 * en reprogramar (PATCH) `null` deja la que ya tenía.
 */
const defaultDurationLabel = computed(() => {
  const current = props.appointment?.durationMinutes
  if (isReschedule.value && current != null) return `Sin cambios (${current} min)`
  return `Por defecto de la empresa (${defaultDurationMinutes.value} min)`
})
const durationSelectOptions = computed(() => [
  { value: '', label: defaultDurationLabel.value },
  ...durationOptions(props.appointment?.durationMinutes ?? null),
])
/** Fin calculado, para que el usuario vea el hueco que está reservando. */
const endTime = computed(() =>
  apptEndTime(startAtIso.value, durationMinutes.value, defaultDurationMinutes.value),
)

// ── Clash preview ────────────────────────────────────────────────────
const clashing = computed(() => {
  if (employeeId.value == null || !startAtIso.value) return []
  return apptClashes(
    props.existing,
    {
      id: props.appointment?.id,
      employeeId: employeeId.value,
      startAt: startAtIso.value,
      durationMinutes: durationMinutes.value,
      status: props.appointment?.status ?? 'REQUESTED',
    },
    defaultDurationMinutes.value,
  )
})
const clashVetName = computed(
  () => vets.value.find((v) => v.id === employeeId.value)?.name ?? 'El veterinario/a',
)
/** "09:00–09:45" de cada cita en conflicto, para que el aviso diga qué hueco choca. */
function clashRange(appt: AppointmentResponse): string {
  return apptTimeRange(appt.startAt, appt.durationMinutes, defaultDurationMinutes.value)
}
</script>

<template>
  <!-- Cuándo + vet -->
  <div class="cols ds-grid-2">
    <div class="col ds-stack ds-stack--16">
      <div class="field-row">
        <div class="field ds-stack">
          <label class="flabel ds-label">Fecha <span class="req">*</span></label>
          <DateInput v-model="date" :invalid="submitted && !date" placeholder="Selecciona fecha" />
        </div>
        <div class="field ds-stack">
          <label class="flabel ds-label">Hora de inicio <span class="req">*</span></label>
          <TimeInput v-model="time" :invalid="submitted && !time" />
        </div>
      </div>
      <!--
        La duración NO cabe como tercera columna de la fila de arriba: con el modal a
        640px y la rejilla a dos columnas, `Fecha | Hora | Duración` deja ~86px por
        control y la fecha ("dd MMM yyyy") no entra. Va debajo, ocupando el ancho de la
        media columna, que además la empareja visualmente con la hora de inicio.
      -->
      <div class="field ds-stack">
        <label class="flabel ds-label">Duración</label>
        <BaseSelect
          :model-value="durationMinutes != null ? String(durationMinutes) : ''"
          :options="durationSelectOptions"
          @update:model-value="(v: string) => (durationMinutes = v ? Number(v) : null)"
        />
        <div v-if="endTime" class="fhint ds-hint">Termina a las {{ endTime }}.</div>
      </div>
    </div>
    <div class="col ds-stack ds-stack--16">
      <div class="field ds-stack">
        <label class="flabel ds-label">Veterinario/a asignado <span class="req">*</span></label>
        <BaseSelect
          :model-value="employeeId != null ? String(employeeId) : null"
          :options="vetOptions"
          :invalid="submitted && employeeId == null"
          placeholder="Selecciona un veterinario/a"
          @update:model-value="(v: string) => (employeeId = Number(v))"
        />
      </div>
      <div v-if="showBranchField" class="field ds-stack">
        <label class="flabel ds-label">Sede <span class="req">*</span></label>
        <BaseSelect
          :model-value="branchId != null ? String(branchId) : null"
          :options="branchOptions"
          placeholder="Selecciona una sede"
          @update:model-value="(v: string) => (branchId = Number(v))"
        />
        <div class="fhint ds-hint">Por defecto, la sede seleccionada en el menú principal.</div>
      </div>
    </div>
  </div>

  <!-- Tipo (oculto en reprogramación) -->
  <div v-if="!isReschedule" class="field ds-stack">
    <label class="flabel ds-label">Tipo de cita <span class="req">*</span></label>
    <div class="typegrid">
      <button
        v-for="[key, m] in typeEntries"
        :key="key"
        type="button"
        class="typebtn"
        :class="{ sel: type === key }"
        @click="type = key"
      >
        <span class="typebtn-ic" aria-hidden="true">{{ m.icon }}</span
        >{{ m.label }}
      </button>
    </div>
  </div>

  <!-- Aviso de choque -->
  <AppointmentNoticeBanner v-if="clashing.length > 0" tone="warn" :icon="AlertTriangle">
    <span>
      <b>Choque de horario.</b> {{ clashVetName }} ya tiene
      {{ clashing.length === 1 ? 'otra cita' : `${clashing.length} citas` }} que se cruzan con
      {{ time }}–{{ endTime }} ({{ clashing.map(clashRange).join(', ') }}). Si el hueco sigue
      ocupado al guardar, la cita se rechazará.
    </span>
  </AppointmentNoticeBanner>
</template>

<style scoped>
/* Resto sobre `.ds-grid-2`: gap propio y alineación superior. La primitiva
   conserva las 2 columnas exactas; sólo mueve el colapso de 720px a 640px. */
.cols {
  gap: var(--space-24);
  align-items: start;
}

/* Resto sobre `.ds-stack --16` / `.ds-stack`. */
.col {
  min-width: 0;
}

.field {
  gap: var(--space-6);
  min-width: 0;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Resto sobre `.ds-label`: el rótulo de este formulario va en semibold. */
.flabel {
  font-weight: var(--weight-semibold);
}

.req {
  color: oklch(60% 0.2 25deg);
}

.fhint {
  line-height: 1.45;
}

.typegrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 6px;
}

.typebtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 9px 6px;
  border: 1px solid var(--warm-450);
  border-radius: 9px;
  background: var(--warm-50);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  color: var(--warm-700);
  transition: all 0.1s;
}

/* A11Y-09: `--amatista-300` daba 2,02:1, por debajo del reposo ya migrado a
   `--warm-450` (3,55:1) — el hover apagaba el borde. `--amatista-450` da 3,77:1
   y se queda por debajo del `--amatista-500` de `.sel`, que sigue siendo el
   estado más evidente. */
.typebtn:hover {
  border-color: var(--amatista-450);
}

.typebtn.sel {
  border-color: var(--amatista-500);
  background: var(--amatista-50);
  color: var(--amatista-700);
  box-shadow: 0 0 0 1px var(--amatista-400) inset;
}

.typebtn-ic {
  font-size: 18px;
}
</style>
