<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, X } from 'lucide-vue-next'
import WizardFooter from './components/WizardFooter.vue'
import DiscardConsultaDialog from './components/DiscardConsultaDialog.vue'
import PasoPaciente from './pasos/PasoPaciente.vue'
import PasoConsulta from './pasos/PasoConsulta.vue'
import { useNuevaConsultaDraft, type WizardStep } from './composables/useNuevaConsultaDraft'
import { showResumeOrNewDialog } from '@/composables/useConsultaResumeGuard'
import { consultationApi } from './api/consultation.api'
import { prescriptionApi } from './api/prescription.api'
import { medicamentPrescriptionApi } from './api/medicamentPrescription.api'
import { laboratoryTestApi } from './api/laboratoryTest.api'
import { diagnosticImagingApi } from './api/diagnosticImaging.api'
import { vaccinationApi } from './api/vaccination.api'
import { hospitalizationApi } from './api/hospitalization.api'
import { dewormingApi } from './api/deworming.api'
import { surgeryApi } from './api/surgery.api'
import { useAuth } from '@/features/auth/composables/useAuth'
import { openBilling } from '@/features/cuentas/composables/useBillingPrompt'
import { getProblemDetailMessage } from '@/services/http/http.client'

const router = useRouter()
const route = useRoute()
const draft = useNuevaConsultaDraft()
const auth = useAuth()

const discardOpen = ref(false)
const saving = ref(false)
const submittingStep = ref(false)
const saveError = ref<string | null>(null)
const pasoRef = ref<{
  validate?: () => boolean
  submit?: () => Promise<boolean> | boolean
} | null>(null)

const step = computed<WizardStep>(() => draft.state.step)

function syncStepFromQuery() {
  const raw = Number(route.query.paso ?? 1)
  const s = ([1, 2].includes(raw) ? raw : 1) as WizardStep
  if (s !== draft.state.step) draft.setStep(s)
}

function pushStepToQuery(s: WizardStep) {
  if (Number(route.query.paso ?? 0) !== s) {
    router.replace({ query: { ...route.query, paso: String(s) } })
  }
}

watch(step, (s) => pushStepToQuery(s))
watch(() => route.query.paso, syncStepFromQuery)

function goStep(s: WizardStep) {
  draft.setStep(s)
}

const nextLabel = computed(() => {
  if (step.value === 1) {
    if (draft.state.ownerCreating) return 'Guardar propietario'
    if (draft.state.petCreating) return 'Guardar mascota'
    return 'Continuar a la consulta'
  }
  return 'Guardar consulta'
})

const nextVariant = computed<'primary' | 'success'>(() =>
  step.value === 2 ? 'success' : 'primary',
)

const nextDisabled = computed(() => {
  const s = draft.state
  if (step.value === 1) {
    if (s.ownerCreating) {
      const o = s.ownerCreating
      return !(
        o.name.trim() &&
        o.document.trim() &&
        o.phone.trim() &&
        o.countryId &&
        o.stateId &&
        o.cityId
      )
    }
    if (s.petCreating) {
      const p = s.petCreating
      return !(
        p.name.trim() &&
        p.specieId &&
        p.breedId &&
        p.colorId &&
        p.gender &&
        p.bod &&
        p.weight.trim() &&
        p.reproductiveState
      )
    }
    return !(s.owner && s.pet)
  }
  // paso 2: datos de la consulta
  return !(s.consultation.typeId && s.consultation.anamnesis.trim())
})

async function handleNext() {
  if (step.value === 1) {
    // En el paso 1 unificado, si el usuario está creando propietario o
    // mascota, el botón confirma esa creación y permanecemos en el paso 1
    // (ahora con el propietario/mascota ya seleccionado). Solo avanzamos a
    // la consulta cuando ambos están seleccionados.
    if (draft.state.ownerCreating || draft.state.petCreating) {
      submittingStep.value = true
      try {
        await pasoRef.value?.submit?.()
      } finally {
        submittingStep.value = false
      }
      return
    }
    goStep(2)
    return
  }
  if (pasoRef.value?.validate && !pasoRef.value.validate()) {
    saveError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }
  await saveConsultation()
}

async function handleBack() {
  if (step.value === 1) return
  goStep((step.value - 1) as WizardStep)
}

async function persistConsultationItems(consultationId: number, animalId: number, companyId: number) {
  const s = draft.state

  // Recetas: cabecera + medicamentos en cascada. Items con savedId se saltan.
  for (let i = 0; i < s.prescriptions.length; i++) {
    const p = s.prescriptions[i]
    let prescriptionId = p.savedId
    if (!prescriptionId) {
      const created = await prescriptionApi.create({
        date: p.date,
        diagnosis: p.diagnosis,
        observations: p.observations,
        animalId,
        consultationId,
        companyId,
      })
      prescriptionId = created.id
      draft.markPrescriptionSaved(i, prescriptionId)
    }
    for (let j = 0; j < p.medicaments.length; j++) {
      const m = p.medicaments[j]
      if (m.savedId) continue
      const createdMed = await medicamentPrescriptionApi.create({
        name: m.name,
        presentation: m.presentation,
        quantity: m.quantity,
        posology: m.posology,
        prescriptionId,
      })
      draft.markMedicamentSaved(i, j, createdMed.id)
    }
  }

  for (let i = 0; i < s.laboratoryTests.length; i++) {
    const t = s.laboratoryTests[i]
    if (t.savedId) continue
    const created = await laboratoryTestApi.create({
      date: t.date,
      testTypeId: Number(t.testTypeId),
      quantity: t.quantity,
      diagnosis: t.diagnosis,
      animalId,
      consultationId,
      companyId,
    })
    draft.markLaboratoryTestSaved(i, created.id)
  }

  for (let i = 0; i < s.diagnosticImagings.length; i++) {
    const img = s.diagnosticImagings[i]
    if (img.savedId) continue
    const created = await diagnosticImagingApi.create({
      date: img.date,
      diagnosticImagingTypeId: Number(img.diagnosticImagingTypeId),
      clinicalSigns: img.clinicalSigns,
      studyType: img.studyType,
      diagnosis: img.diagnosis,
      observations: img.observations,
      animalId,
      consultationId,
      companyId,
    })
    draft.markDiagnosticImagingSaved(i, created.id)
  }

  for (let i = 0; i < s.vaccinations.length; i++) {
    const v = s.vaccinations[i]
    if (v.savedId) continue
    const created = await vaccinationApi.create({
      date: v.date,
      vaccinationTypeId: Number(v.vaccinationTypeId),
      lot: v.lot,
      notes: v.notes,
      nextVaccination: v.nextVaccination || null,
      animalId,
      consultationId,
      companyId,
    })
    draft.markVaccinationSaved(i, created.id)
  }

  for (let i = 0; i < s.hospitalizations.length; i++) {
    const h = s.hospitalizations[i]
    if (h.savedId) continue
    const created = await hospitalizationApi.create({
      date: h.date,
      startDate: h.startDate,
      endDate: h.endDate || null,
      type: h.type,
      reasonLeaving: h.reasonLeaving || null,
      reason: h.reason,
      observations: h.observations,
      animalId,
      consultationId,
      companyId,
      weight: h.weight?.trim()
        ? Number(h.weight.trim().replace(',', '.'))
        : null,
      weightUnit: h.weight?.trim() ? draft.state.pet?.weightType ?? null : null,
    })
    draft.markHospitalizationSaved(i, created.id)
  }

  for (let i = 0; i < s.dewormings.length; i++) {
    const d = s.dewormings[i]
    if (d.savedId) continue
    const created = await dewormingApi.create({
      date: d.date,
      lastDeworming: d.lastDeworming || null,
      type: d.type,
      product: d.product,
      dosage: d.dosage,
      nextControl: d.nextControl || null,
      observations: d.observations,
      animalId,
      consultationId,
      companyId,
    })
    draft.markDewormingSaved(i, created.id)
  }

  for (let i = 0; i < s.surgeries.length; i++) {
    const sg = s.surgeries[i]
    if (sg.savedId) continue
    const created = await surgeryApi.create({
      date: sg.date,
      surgeryTypeId: Number(sg.surgeryTypeId),
      description: sg.description,
      medicament: sg.medicament,
      observations: sg.observations,
      complications: sg.complications,
      animalId,
      consultationId,
      companyId,
    })
    draft.markSurgerySaved(i, created.id)
  }
}

async function saveConsultation(keepOwner = false) {
  saveError.value = null
  const pet = draft.state.pet
  const owner = draft.state.owner
  const consultationType = draft.state.consultationType
  const cDraft = draft.state.consultation
  const companyId = auth.companyId.value

  if (!pet || !consultationType || !companyId) {
    saveError.value = 'Faltan datos para guardar la consulta.'
    return
  }

  saving.value = true
  try {
    // 1. Crear o reutilizar consulta. Si un intento anterior creó la
    //    consulta pero falló al guardar items, reutilizamos el id para
    //    no duplicarla — diagnosis/therapeuticPlan/diagnosisPlan son
    //    opcionales en backend, por eso van como null cuando vacíos.
    let consultationId = draft.state.consultationCreatedId
    if (!consultationId) {
      const consultation = await consultationApi.create({
        date: cDraft.date,
        consultationTypeId: Number(consultationType.id),
        anamnesis: cDraft.anamnesis.trim(),
        diagnosis: cDraft.diagnosis.trim() || null,
        therapeuticPlan: cDraft.therapeuticPlan.trim() || null,
        diagnosisPlan: cDraft.diagnosticPlan.trim() || null,
        nextControl: cDraft.nextControlDate || null,
        animalId: Number(pet.id),
        weight: cDraft.weight.trim()
          ? Number(cDraft.weight.trim().replace(',', '.'))
          : null,
        weightUnit: cDraft.weight.trim() ? pet.weightType : null,
      })
      consultationId = consultation.id
      draft.markConsultationCreated(consultationId)
    }

    // 2. Crear los items vinculados que no se hayan guardado aún
    await persistConsultationItems(consultationId, Number(pet.id), companyId)

    // 3. Reset y navegación
    const date = cDraft.date
    if (keepOwner) {
      draft.resetKeepingOwner()
      pushStepToQuery(2)
      return
    }
    const successState = {
      ownerName: owner?.name ?? '',
      petName: pet.name,
      consultationType: consultationType.name,
      date,
    }
    const billOwnerId = owner ? Number(owner.id) : null
    const billAnimalId = Number(pet.id)
    const billPetName = pet.name
    draft.reset()
    // Tras guardar, ofrecer facturación a cuenta (§18.2). Al cerrar el modal
    // (facturar o "solo guardar"), navegar a la pantalla de éxito.
    openBilling({
      ownerId: billOwnerId,
      ownerName: successState.ownerName,
      animalId: billAnimalId,
      animalName: billPetName,
      heading: 'Facturación · Consulta',
      autoConsulta: true,
      onClose: () => {
        router.push({ name: 'consulta-nueva-exito', state: successState })
      },
    })
  } catch (e) {
    saveError.value = getProblemDetailMessage(
      e,
      'No se pudo guardar la consulta. Intenta de nuevo.',
    )
  } finally {
    saving.value = false
  }
}

function handleSaveAndCreateAnother() {
  saveConsultation(true)
}

function attemptCancel() {
  if (draft.isEmpty.value) {
    confirmCancel()
    return
  }
  if (draft.state.owner) {
    promptResumeOrRestart()
    return
  }
  discardOpen.value = true
}

function confirmCancel() {
  discardOpen.value = false
  draft.reset()
  router.push({ name: 'home' })
}

function goHome() {
  if (draft.isEmpty.value) {
    router.push({ name: 'home' })
    return
  }
  if (draft.state.owner) {
    promptResumeOrRestart()
    return
  }
  discardOpen.value = true
}

function promptResumeOrRestart() {
  const owner = draft.state.owner
  if (!owner) return
  showResumeOrNewDialog({
    ownerName: owner.name,
    petName: draft.state.pet?.name,
    step: draft.state.step,
    onContinue: () => {
      // El usuario decide quedarse en la consulta actual; no salimos.
    },
    onCreateNew: () => {
      draft.reset()
      pushStepToQuery(1)
    },
  })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !discardOpen.value) {
    e.preventDefault()
    attemptCancel()
    return
  }
  if (
    step.value === 2 &&
    (e.metaKey || e.ctrlKey) &&
    e.key === 'Enter' &&
    !nextDisabled.value
  ) {
    e.preventDefault()
    handleNext()
  }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!draft.isEmpty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  syncStepFromQuery()
  pushStepToQuery(step.value)
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<template>
  <div class="wizard">
    <header class="topbar">
      <button type="button" class="back" @click="goHome">
        <ArrowLeft :size="15" :stroke-width="1.7" />
        <span>Volver a inicio</span>
      </button>
      <span class="divider" />
      <h1 class="brand">Nueva consulta</h1>
      <span class="badge">Borrador</span>
      <button type="button" class="cancel" @click="attemptCancel">
        <X :size="14" :stroke-width="1.7" />
        <span>Cancelar</span>
      </button>
    </header>

    <main class="content">
      <PasoPaciente v-if="step === 1" ref="pasoRef" />
      <PasoConsulta v-else ref="pasoRef" />
    </main>

    <div v-if="saveError && step === 2" class="save-error">
      <X :size="14" :stroke-width="1.7" />
      <span>{{ saveError }}</span>
    </div>

    <WizardFooter
      :show-back="step > 1"
      :next-label="nextLabel"
      :next-variant="nextVariant"
      :next-disabled="nextDisabled"
      :next-loading="(saving && step === 2) || submittingStep"
      @back="handleBack"
      @next="handleNext"
    >
      <template #extra>
        <button
          v-if="step === 1 && draft.state.ownerCreating"
          type="button"
          class="discard-extra"
          @click="draft.cancelCreatingOwner()"
        >
          Descartar
        </button>
        <button
          v-if="step === 1 && draft.state.petCreating"
          type="button"
          class="discard-extra"
          @click="draft.cancelCreatingPet()"
        >
          Descartar
        </button>
      </template>
      <template #endExtra>
        <button
          v-if="step === 2"
          type="button"
          class="btn-keep-owner"
          :disabled="saving"
          @click="handleSaveAndCreateAnother"
        >
          Guardar y crear otra
        </button>
      </template>
    </WizardFooter>

    <DiscardConsultaDialog
      :open="discardOpen"
      :pet-name="draft.state.pet?.name"
      @cancel="discardOpen = false"
      @confirm="confirmCancel"
    />
  </div>
</template>

<style scoped>
.wizard {
  flex: 1;
  min-height: 0;
  background: var(--warm-100);
  font-family: var(--font-sans);
  color: var(--warm-900);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topbar {
  height: 60px;
  padding: 0 clamp(14px, 3vw, 32px);
  background: var(--warm-50);
  border-bottom: 1px solid var(--warm-200);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.back {
  background: transparent;
  border: none;
  padding: 6px 8px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-600);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.back:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}
.divider {
  width: 1px;
  height: 22px;
  background: var(--warm-200);
}
.brand {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 22px;
  letter-spacing: -0.01em;
  font-weight: 400;
  color: var(--warm-900);
}
.badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
  margin-left: 4px;
}
.cancel {
  margin-left: auto;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-600);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
}
.cancel:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}
@media (max-width: 720px) {
  .topbar .brand {
    font-size: 18px;
  }
  .topbar .back span,
  .topbar .cancel span,
  .topbar .badge {
    display: none;
  }
}
.content {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.save-error {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 12px 18px;
  background: oklch(94% 0.06 25);
  border-top: 1px solid oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
}
.discard-extra {
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-600);
  cursor: pointer;
  padding: 9px 10px;
  border-radius: 8px;
}
.discard-extra:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}
.btn-keep-owner {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  padding: 9px 14px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
  cursor: pointer;
}
.btn-keep-owner:hover:not(:disabled) {
  background: var(--warm-100);
}
.btn-keep-owner:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
