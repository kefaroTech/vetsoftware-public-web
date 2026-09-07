<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UserPlus, Pencil, TriangleAlert } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import OwnerForm from '@/features/dashboard/views/consulta/nueva/components/OwnerForm.vue'
import { ownerApi } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import type {
  OwnerResponse,
  CreateOwnerRequest,
  UpdateOwnerRequest,
} from '@/features/dashboard/views/consulta/nueva/types/owner.types'
import type { OwnerDraft } from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { OwnerDocumentType } from '@/features/facturacion/composables/feFiscalChecklist'
import type { PersonType } from '@/features/facturacion/types/facturacion'

const props = defineProps<{
  open: boolean
  ownerId: number | null
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { id: number | null; body: CreateOwnerRequest | UpdateOwnerRequest }]
}>()

const isEditing = computed(() => props.ownerId !== null)

function emptyDraft(): OwnerDraft {
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
  }
}

const draft = ref<OwnerDraft>(emptyDraft())
const formRef = ref<{ validate: () => boolean } | null>(null)
const loadingOwner = ref(false)
const loadError = ref<string | null>(null)
const submitError = ref<string | null>(null)

// El propietario cargado al abrir en edición: guarda los campos fiscales que OwnerForm no
// edita pero que UpdateOwnerRequest exige tal cual. Si se omiten, UpdateOwnerService los
// reinfiere desde documentType/personType y pisa lo que el propietario tenía configurado
// (agente retenedor, régimen tributario, DV del NIT).
const loadedOwner = ref<OwnerResponse | null>(null)

watch(
  () => [props.open, props.ownerId] as const,
  async ([open, ownerId]) => {
    if (!open) return
    submitError.value = null
    loadError.value = null
    loadedOwner.value = null
    if (ownerId == null) {
      draft.value = emptyDraft()
      return
    }
    loadingOwner.value = true
    draft.value = emptyDraft()
    try {
      const o = await ownerApi.findById(ownerId)
      loadedOwner.value = o
      draft.value = {
        name: o.name,
        document: o.document,
        phone: o.phone,
        email: o.email,
        documentType: o.documentType,
        personType: o.personType,
        countryId: '',
        stateId: '',
        cityId: String(o.city.id),
        address: o.address,
      }
    } catch (e) {
      loadError.value = getProblemDetailMessage(e, 'No se pudo cargar el cliente.')
    } finally {
      loadingOwner.value = false
    }
  },
  { immediate: true },
)

function submit() {
  if (props.busy || loadingOwner.value) return
  if (formRef.value && !formRef.value.validate()) {
    submitError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }
  const d = draft.value
  const cityIdNum = Number(d.cityId)
  if (!Number.isFinite(cityIdNum)) {
    submitError.value = 'Selecciona una ciudad válida.'
    return
  }
  submitError.value = null
  const base: CreateOwnerRequest = {
    name: d.name.trim(),
    document: d.document.trim(),
    phone: d.phone.trim(),
    email: d.email.trim(),
    documentType: d.documentType as OwnerDocumentType,
    personType: d.personType as PersonType,
    address: d.address.trim(),
    cityId: cityIdNum,
  }
  const owner = loadedOwner.value
  const body: CreateOwnerRequest | UpdateOwnerRequest = owner
    ? {
        ...base,
        verificationDigit: owner.verificationDigit,
        legalName: owner.legalName,
        withholdingAgent: owner.withholdingAgent,
        taxRegime: owner.taxRegime,
        fiscalResponsibility: owner.fiscalResponsibility,
      }
    : base
  emit('save', { id: props.ownerId, body })
}

const titleText = computed(() => (isEditing.value ? 'Editar cliente' : 'Nuevo cliente'))
const currentCityName = computed(() => loadedOwner.value?.city.name ?? null)
</script>

<template>
  <ModalShell
    :open="open"
    :title="titleText"
    :subtitle="
      isEditing ? 'Actualiza los datos del cliente.' : 'Registra un nuevo cliente de la empresa.'
    "
    :icon="isEditing ? Pencil : UserPlus"
    accent="amatista"
    :width="680"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="loadError" class="form-banner ds-flex-row" role="alert">
        <TriangleAlert :size="14" :stroke-width="1.7" />
        <span>{{ loadError }}</span>
      </div>
      <div v-else-if="loadingOwner" class="loading-note">Cargando datos del cliente…</div>
      <template v-else>
        <div v-if="submitError" class="form-banner ds-flex-row" role="alert">
          <TriangleAlert :size="14" :stroke-width="1.7" />
          <span>{{ submitError }}</span>
        </div>
        <p v-if="isEditing && currentCityName" class="hint">
          Ciudad actual: <strong>{{ currentCityName }}</strong
          >. Elige país, departamento y ciudad solo si quieres cambiarla.
        </p>
        <OwnerForm ref="formRef" v-model="draft" />
      </template>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="busy" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--solid"
        :disabled="busy || loadingOwner || !!loadError"
        @click="submit"
      >
        {{ busy ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear cliente' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form-banner {
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  background: var(--danger-150);
  border: 1px solid var(--danger-border);
  color: var(--danger-950);
  margin-bottom: 14px;
}

.loading-note {
  padding: 24px 0;
  text-align: center;
  color: var(--warm-500);
  font-size: 13px;
}

.hint {
  margin: 0 0 14px;
  font-size: 12.5px;
  color: var(--warm-600);
}
</style>
