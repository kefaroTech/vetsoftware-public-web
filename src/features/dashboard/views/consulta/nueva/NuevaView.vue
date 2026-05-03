<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, X } from 'lucide-vue-next'
import WizardStepper from './components/WizardStepper.vue'
import WizardFooter from './components/WizardFooter.vue'
import DiscardConsultaDialog from './components/DiscardConsultaDialog.vue'
import PasoPropietario from './pasos/PasoPropietario.vue'
import PasoMascota from './pasos/PasoMascota.vue'
import PasoConsulta from './pasos/PasoConsulta.vue'
import PasoResumen from './pasos/PasoResumen.vue'
import { useNuevaConsultaDraft, type WizardStep } from './composables/useNuevaConsultaDraft'

const router = useRouter()
const route = useRoute()
const draft = useNuevaConsultaDraft()

const discardOpen = ref(false)
const saving = ref(false)
const submittingStep = ref(false)
const pasoRef = ref<{
  validate?: () => boolean
  submit?: () => Promise<boolean> | boolean
} | null>(null)

const step = computed<WizardStep>(() => draft.state.step)

function syncStepFromQuery() {
  const raw = Number(route.query.paso ?? 1)
  const s = ([1, 2, 3, 4].includes(raw) ? raw : 1) as WizardStep
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
  if (draft.state.ownerCreating && step.value === 1) return 'Guardar y continuar'
  if (draft.state.petCreating && step.value === 2) return 'Guardar y continuar'
  if (step.value === 3) return 'Revisar resumen'
  if (step.value === 4) return 'Guardar consulta'
  return 'Siguiente'
})

const nextVariant = computed<'primary' | 'success'>(() =>
  step.value === 4 ? 'success' : 'primary',
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
    return !s.owner
  }
  if (step.value === 2) {
    if (s.petCreating) {
      const p = s.petCreating
      return !(
        p.name.trim() &&
        p.specieId &&
        p.breedId &&
        p.gender &&
        p.bod &&
        p.weight.trim() &&
        p.reproductiveState
      )
    }
    return !s.pet
  }
  if (step.value === 3) {
    return !(s.consultation.typeId && s.consultation.anamnesis.trim())
  }
  return false
})

async function handleNext() {
  const s = step.value
  if (s === 1) {
    if (draft.state.ownerCreating) {
      submittingStep.value = true
      try {
        const ok = (await pasoRef.value?.submit?.()) ?? true
        if (!ok) return
      } finally {
        submittingStep.value = false
      }
    }
    goStep(2)
    return
  }
  if (s === 2) {
    if (draft.state.petCreating) {
      submittingStep.value = true
      try {
        const ok = (await pasoRef.value?.submit?.()) ?? true
        if (!ok) return
      } finally {
        submittingStep.value = false
      }
    }
    goStep(3)
    return
  }
  if (s === 3) {
    goStep(4)
    return
  }
  if (s === 4) {
    await saveConsultation()
  }
}

async function handleBack() {
  if (step.value === 1) return
  goStep((step.value - 1) as WizardStep)
}

async function saveConsultation(keepOwner = false) {
  saving.value = true
  await new Promise((r) => setTimeout(r, 800))
  saving.value = false
  const owner = draft.state.owner
  const pet = draft.state.pet
  const consultationType = draft.state.consultationType
  const date = draft.state.consultation.date
  if (keepOwner) {
    draft.resetKeepingOwner()
    pushStepToQuery(2)
    return
  }
  draft.reset()
  router.push({
    name: 'consulta-nueva-exito',
    state: {
      ownerName: owner?.name ?? '',
      petName: pet?.name ?? '',
      consultationType: consultationType?.name ?? '',
      date,
    },
  })
}

function handleSaveAndCreateAnother() {
  saveConsultation(true)
}

function attemptCancel() {
  if (draft.isEmpty.value) {
    confirmCancel()
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
  discardOpen.value = true
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !discardOpen.value) {
    e.preventDefault()
    attemptCancel()
    return
  }
  if (
    step.value === 4 &&
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

    <div class="stepper-row">
      <WizardStepper :active="step" @navigate="goStep" />
    </div>

    <main class="content">
      <PasoPropietario v-if="step === 1" ref="pasoRef" />
      <PasoMascota v-else-if="step === 2" ref="pasoRef" />
      <PasoConsulta v-else-if="step === 3" ref="pasoRef" />
      <PasoResumen
        v-else-if="step === 4"
        @edit-step="goStep"
      />
    </main>

    <WizardFooter
      :show-back="step > 1"
      :next-label="nextLabel"
      :next-variant="nextVariant"
      :next-disabled="nextDisabled"
      :next-loading="(saving && step === 4) || submittingStep"
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
          v-if="step === 2 && draft.state.petCreating"
          type="button"
          class="discard-extra"
          @click="draft.cancelCreatingPet()"
        >
          Descartar
        </button>
      </template>
      <template #endExtra>
        <button
          v-if="step === 4"
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
  padding: 0 28px;
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
.stepper-row {
  padding: 20px 48px 16px;
  background: var(--warm-50);
  border-bottom: 1px solid var(--warm-200);
  flex-shrink: 0;
}
.content {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
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
