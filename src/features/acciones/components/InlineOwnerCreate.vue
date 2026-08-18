<script setup lang="ts">
/**
 * Alta de propietario dentro del selector de paciente.
 *
 * Es una costura completa del `PatientCascadePicker`: el borrador, la
 * validación del formulario, el POST y su mensaje de error no los comparte con
 * el resto del selector, que sólo necesita saber cuándo termina. Sale entera y
 * el picker se queda con la búsqueda y la selección.
 */
import { ref } from 'vue'
import { ArrowLeft, TriangleAlert } from 'lucide-vue-next'
import OwnerForm from '@/features/dashboard/views/consulta/nueva/components/OwnerForm.vue'
import { ownerApi } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import { mapOwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.mapper'
import type { OwnerDraft } from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'
import { useAuth } from '@/features/auth/composables/useAuth'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { OwnerDocumentType } from '@/features/facturacion/composables/feFiscalChecklist'
import type { PersonType } from '@/features/facturacion/types/facturacion'
import type { Owner } from '@/types/domain'

const props = defineProps<{
  /** Texto tecleado en el buscador, que precarga el nombre. */
  initialName?: string
}>()

const emit = defineEmits<{
  created: [owner: Owner]
  cancel: []
}>()

const { companyId } = useAuth()

/** Espejo de `nuevaConsultaDraft.store`: el picker no persiste su borrador. */
function emptyOwnerDraft(prefill?: Partial<OwnerDraft>): OwnerDraft {
  return {
    name: '',
    document: '',
    phone: '',
    email: '',
    documentType: '',
    personType: '',
    countryId: '',
    stateId: '',
    cityId: '',
    address: '',
    ...(prefill ?? {}),
  }
}

const draft = ref<OwnerDraft>(emptyOwnerDraft({ name: props.initialName?.trim() ?? '' }))
const formRef = ref<{ validate: () => boolean } | null>(null)
const submitError = ref<string | null>(null)
const saving = ref(false)

async function save() {
  if (formRef.value && !formRef.value.validate()) {
    submitError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }
  if (companyId.value == null) {
    submitError.value = 'No se pudo identificar la empresa actual. Vuelve a iniciar sesión.'
    return
  }
  const o = draft.value
  const cityIdNum = Number(o.cityId)
  if (!Number.isFinite(cityIdNum)) {
    submitError.value = 'Selecciona una ciudad válida.'
    return
  }
  saving.value = true
  submitError.value = null
  try {
    const created = await ownerApi.create({
      name: o.name.trim(),
      document: o.document.trim(),
      phone: o.phone.trim(),
      email: o.email.trim(),
      documentType: o.documentType as OwnerDocumentType,
      personType: o.personType as PersonType,
      address: o.address.trim(),
      cityId: cityIdNum,
    })
    emit('created', mapOwnerResponse(created))
  } catch (e: unknown) {
    submitError.value = getProblemDetailMessage(
      e,
      'No se pudo crear el propietario. Intenta nuevamente.',
    )
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="form-head">
    <button type="button" class="back" @click="emit('cancel')">
      <ArrowLeft :size="14" :stroke-width="1.9" /> Volver a la búsqueda
    </button>
  </div>
  <div v-if="submitError" class="form-banner ds-flex-row" role="alert">
    <TriangleAlert :size="14" :stroke-width="1.7" />
    <span>{{ submitError }}</span>
  </div>
  <OwnerForm ref="formRef" v-model="draft" />
  <div class="form-actions ds-actions">
    <button type="button" class="ds-btn ds-btn--ghost" @click="emit('cancel')">Cancelar</button>
    <button type="button" class="ds-btn ds-btn--solid" :disabled="saving" @click="save">
      {{ saving ? 'Creando…' : 'Crear y seleccionar' }}
    </button>
  </div>
</template>

<style scoped>
.form-head {
  display: flex;
  align-items: center;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--amatista-700);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}

.back:hover {
  background: var(--amatista-50);
}

.form-banner {
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  background: var(--danger-150);
  border: 1px solid var(--danger-300);
  color: oklch(35% 0.15 25deg);
}

/* Único añadido sobre `.ds-actions`: estos dos botones respiran algo más. */
.form-actions {
  gap: 10px;
}
</style>
