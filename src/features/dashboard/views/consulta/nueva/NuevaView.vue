<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, X } from 'lucide-vue-next'
import WizardFooter from './components/WizardFooter.vue'
import DiscardConsultaDialog from './components/DiscardConsultaDialog.vue'
import SaveConsultaConfirmDialog from './components/SaveConsultaConfirmDialog.vue'
import PasoPaciente from './pasos/PasoPaciente.vue'
import PasoConsulta from './pasos/PasoConsulta.vue'
import { useNuevaConsultaDraft, type WizardStep } from './composables/useNuevaConsultaDraft'
import { showResumeOrNewDialog } from '@/composables/useConsultaResumeGuard'
import { useConsultationSave } from './composables/useConsultationSave'

const router = useRouter()
const route = useRoute()
const draft = useNuevaConsultaDraft()

const discardOpen = ref(false)
const confirmSaveOpen = ref(false)
const submittingStep = ref(false)

// La cascada de POSTs vive en su propio composable (useConsultationSave).
const { saving, saveError, saveConsultation } = useConsultationSave({
  onKeepOwner: () => pushStepToQuery(2),
})
const pasoRef = ref<{
  validate?: () => boolean
  validateSelection?: () => boolean
  submit?: () => Promise<boolean> | boolean
} | null>(null)

const step = computed<WizardStep>(() => draft.state.step)

function syncStepFromQuery() {
  // Si la URL no trae ?paso (p. ej. un reload directo), respetamos el paso
  // PERSISTIDO del draft en vez de forzar el paso 1: así el reload retoma donde
  // estabas (los datos ya persistían; ahora también la posición del wizard).
  const q = route.query.paso
  const raw = q == null ? draft.state.step : Number(q)
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

// El botón de avanzar/guardar SIEMPRE está activo (no se deshabilita por campos
// faltantes). Al hacer click, si faltan requeridos, cada paso dispara su propia
// validación animada (shake + bordes rojos + banner) y NO se avanza. Mismo patrón
// `submitted` que los modales de acciones clínicas. Solo se bloquea mientras hay
// una operación en curso (nextLoading), no por validez.

async function handleNext() {
  if (step.value === 1) {
    // En el paso 1 unificado, si el usuario está creando propietario o
    // mascota, el botón confirma esa creación (submit valida el form y, si
    // falta algo, dispara el shake). Permanecemos en el paso 1.
    if (draft.state.ownerCreating || draft.state.petCreating) {
      submittingStep.value = true
      try {
        await pasoRef.value?.submit?.()
      } finally {
        submittingStep.value = false
      }
      return
    }
    // Modo selección: exigimos propietario + mascota seleccionados. Si falta
    // alguno, validateSelection muestra el banner guía y no avanzamos.
    if (pasoRef.value?.validateSelection && !pasoRef.value.validateSelection()) {
      return
    }
    goStep(2)
    return
  }
  if (pasoRef.value?.validate && !pasoRef.value.validate()) {
    saveError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }
  // Antes de guardar, pedimos confirmación explícita (modal).
  confirmSaveOpen.value = true
}

async function confirmSave() {
  confirmSaveOpen.value = false
  await saveConsultation()
}

async function handleBack() {
  if (step.value === 1) return
  goStep((step.value - 1) as WizardStep)
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
  if (step.value === 2 && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    // Ctrl/Cmd+Enter intenta guardar; handleNext valida y dispara el shake si falta algo.
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
  // Al montar (incluye reload) la fuente de verdad es el paso PERSISTIDO en el
  // draft, no la URL: reconciliamos ?paso hacia el draft en vez de dejar que un
  // ?paso viejo (que no siempre se sincroniza al avanzar) baje el wizard al paso 1.
  // A runtime, el watch de route.query.paso sigue permitiendo back/forward del browser.
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
  <div class="wizard ds-stack">
    <header class="topbar">
      <button type="button" class="back" @click="goHome">
        <ArrowLeft :size="15" :stroke-width="1.7" />
        <span>Volver a inicio</span>
      </button>
      <span class="divider" />
      <h1 class="brand">Nueva consulta</h1>
      <span class="badge ds-tone--accent">Borrador</span>
      <button type="button" class="cancel" @click="attemptCancel">
        <X :size="14" :stroke-width="1.7" />
        <span>Cancelar</span>
      </button>
    </header>

    <main class="content ds-stack">
      <PasoPaciente v-if="step === 1" ref="pasoRef" />
      <PasoConsulta v-else ref="pasoRef" />
    </main>

    <div v-if="saveError && step === 2" class="save-error ds-flex-row">
      <X :size="14" :stroke-width="1.7" />
      <span>{{ saveError }}</span>
    </div>

    <WizardFooter
      :show-back="step > 1"
      :next-label="nextLabel"
      :next-variant="nextVariant"
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
    </WizardFooter>

    <DiscardConsultaDialog
      :open="discardOpen"
      :pet-name="draft.state.pet?.name"
      @cancel="discardOpen = false"
      @confirm="confirmCancel"
    />

    <SaveConsultaConfirmDialog
      :open="confirmSaveOpen"
      :pet-name="draft.state.pet?.name"
      :saving="saving"
      @cancel="confirmSaveOpen = false"
      @confirm="confirmSave"
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

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
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

@media (width <= 720px) {
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
}

.save-error {
  font-size: 13px;
  padding: 12px 18px;
  background: var(--danger-150);
  border-top: 1px solid var(--danger-300);
  color: oklch(35% 0.15 25deg);
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
</style>
