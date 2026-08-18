<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import OwnerSearchAutocomplete from './OwnerSearchAutocomplete.vue'
import AppointmentNoticeBanner from './AppointmentNoticeBanner.vue'
import { APPT_NOTES_MAX } from '../types/appointment'
import type { AppointmentForm } from '../composables/useAppointmentForm'
import type { Animal, Owner } from '@/types/domain'

/**
 * Segunda mitad del formulario de cita: A QUIÉN es (cliente registrado o contacto
 * libre) y las notas de recepción. Sección hermana de `AppointmentWhenFields`, con
 * el mismo corte: en el formulario ya iban separadas por un `<div class="divider">`.
 *
 * La carga de mascotas del dueño se queda en `AppointmentFormModal`: la dispara
 * también `resetFrom` al ABRIR en modo edición, cuando este componente todavía no
 * está montado. Aquí sólo se pinta la lista que llega por props.
 */
const props = defineProps<{
  form: AppointmentForm
  pets: Animal[]
  petsLoading: boolean
}>()

const emit = defineEmits<{ 'owner-select': [owner: Owner | null] }>()

const {
  subjectMode,
  ownerId,
  ownerName,
  animalId,
  notes,
  submitted,
  notesModel,
  clientNameModel,
  clientPhoneModel,
  clientEmailModel,
  missingSubject,
  clientEmailInvalid,
} = props.form

const petOptions = computed(() => [
  { value: '', label: ownerId.value ? '— Por confirmar —' : 'Elige un dueño primero' },
  ...props.pets.map((p) => ({
    value: p.id,
    label: `${p.name} · ${p.specie.name}, ${p.breed.name}`,
  })),
])
</script>

<template>
  <!-- Sujeto + notas -->
  <div class="cols ds-grid-2">
    <div class="col ds-stack ds-stack--16">
      <div class="field ds-stack">
        <label class="flabel ds-label">¿A quién es la cita?</label>
        <div class="subject-toggle">
          <button
            type="button"
            :class="{ active: subjectMode === 'registered' }"
            @click="subjectMode = 'registered'"
          >
            Cliente registrado
          </button>
          <button
            type="button"
            :class="{ active: subjectMode === 'free' }"
            @click="subjectMode = 'free'"
          >
            Contacto libre
          </button>
        </div>
        <div class="fhint ds-hint">
          {{
            subjectMode === 'registered'
              ? 'Busca el dueño por nombre, ID o documento; luego elige su mascota.'
              : 'Para quien aún no está registrado. Basta con el nombre.'
          }}
        </div>
      </div>

      <template v-if="subjectMode === 'registered'">
        <div class="field ds-stack">
          <label class="flabel ds-label">Propietario</label>
          <OwnerSearchAutocomplete
            v-model="ownerId"
            :initial-name="ownerName"
            :invalid="submitted && missingSubject"
            @select="emit('owner-select', $event)"
          />
        </div>
        <div class="field ds-stack">
          <label class="flabel ds-label">Mascota</label>
          <BaseSelect
            v-model="animalId"
            :options="petOptions"
            :disabled="!ownerId || petsLoading"
            :placeholder="petsLoading ? 'Cargando…' : 'Selecciona una mascota'"
          />
        </div>
      </template>

      <template v-else>
        <div class="field ds-stack">
          <label class="flabel ds-label">Nombre del contacto</label>
          <BaseInput
            v-model="clientNameModel"
            :invalid="submitted && missingSubject"
            placeholder="Ej. María Pérez"
          />
        </div>
        <div class="field ds-stack">
          <label class="flabel ds-label">Teléfono</label>
          <BaseInput v-model="clientPhoneModel" placeholder="Ej. 300 123 4567" />
        </div>
        <div class="field ds-stack">
          <label class="flabel ds-label">Correo <span class="opt">(opcional)</span></label>
          <BaseInput
            v-model="clientEmailModel"
            type="email"
            :invalid="submitted && clientEmailInvalid"
            placeholder="Ej. maria@correo.com"
          />
          <div class="fhint ds-hint">Si lo indicas, le enviaremos la confirmación de la cita.</div>
        </div>
      </template>

      <AppointmentNoticeBanner v-if="submitted && missingSubject" tone="err" :icon="AlertTriangle">
        <span>Indica al menos <b>mascota, propietario o nombre de contacto</b>.</span>
      </AppointmentNoticeBanner>
    </div>

    <div class="col ds-stack ds-stack--16">
      <div class="field ds-stack ds-flex-fill">
        <label class="flabel ds-label">Motivo / notas de recepción</label>
        <BaseTextarea v-model="notesModel" :rows="7" placeholder="Ej. Control post-cirugía" />
        <div class="charcount">{{ notes.length }}/{{ APPT_NOTES_MAX }}</div>
      </div>
    </div>
  </div>
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

/* Resto sobre `.ds-label`: el rótulo de este formulario va en semibold. */
.flabel {
  font-weight: var(--weight-semibold);
}

.opt {
  color: var(--warm-400);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.fhint {
  line-height: 1.45;
}

.charcount {
  font-size: 11px;
  color: var(--warm-400);
  text-align: right;
}

.subject-toggle {
  display: inline-flex;
  background: var(--warm-150);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.subject-toggle button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--warm-600);
  padding: 6px 12px;
  border-radius: 6px;
}

.subject-toggle button.active {
  background: var(--warm-50);
  color: var(--warm-900);
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}
</style>
