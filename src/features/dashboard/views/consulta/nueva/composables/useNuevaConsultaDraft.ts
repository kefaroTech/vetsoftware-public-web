import { computed, reactive, watch } from 'vue'
import type {
  Animal,
  Consultation,
  ConsultationType,
  Owner,
} from '@/types/domain'

export type WizardStep = 1 | 2 | 3 | 4

export interface OwnerDraft {
  name: string
  document: string
  phone: string
  email: string
  countryId: string
  stateId: string
  cityId: string
  address: string
}

export interface PetDraft {
  name: string
  code: string
  specieId: string
  breedId: string
  gender: 'F' | 'M' | ''
  color: string
  bod: string
  animalType: 'pet' | 'farm' | 'exotic' | ''
  weight: string
  weightType: 'kg' | 'g' | 'lb'
  size: string
  reproductiveState: 'sterilized' | 'unsterilized' | 'unknown' | ''
}

export interface ConsultationDraft {
  date: string
  typeId: string
  anamnesis: string
  diagnosis: string
  diagnosticPlan: string
  therapeuticPlan: string
  nextControlDate: string
  nextControlNotes: string
}

export interface NuevaConsultaDraft {
  step: WizardStep
  owner: Owner | null
  ownerCreating: OwnerDraft | null
  pet: Animal | null
  petCreating: PetDraft | null
  consultation: ConsultationDraft
  consultationType: ConsultationType | null
}

const STORAGE_KEY = 'vetrina:nueva-consulta-draft'

function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function emptyConsultation(): ConsultationDraft {
  return {
    date: todayISO(),
    typeId: '',
    anamnesis: '',
    diagnosis: '',
    diagnosticPlan: '',
    therapeuticPlan: '',
    nextControlDate: '',
    nextControlNotes: '',
  }
}

function defaultDraft(): NuevaConsultaDraft {
  return {
    step: 1,
    owner: null,
    ownerCreating: null,
    pet: null,
    petCreating: null,
    consultation: emptyConsultation(),
    consultationType: null,
  }
}

function load(): NuevaConsultaDraft {
  if (typeof window === 'undefined') return defaultDraft()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultDraft()
    const parsed = JSON.parse(raw) as Partial<NuevaConsultaDraft>
    return { ...defaultDraft(), ...parsed }
  } catch {
    return defaultDraft()
  }
}

const state = reactive<NuevaConsultaDraft>(load())

let watching = false
function ensureWatching() {
  if (watching || typeof window === 'undefined') return
  watching = true
  watch(
    state,
    (s) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
      } catch {
        // ignore quota errors
      }
    },
    { deep: true },
  )
}

export function useNuevaConsultaDraft() {
  ensureWatching()

  function setStep(step: WizardStep) {
    state.step = step
  }

  function setOwner(owner: Owner | null) {
    state.owner = owner
    state.ownerCreating = null
    if (!owner) {
      state.pet = null
      state.petCreating = null
    }
  }

  function startCreatingOwner(prefill?: Partial<OwnerDraft>) {
    state.ownerCreating = {
      name: '',
      document: '',
      phone: '',
      email: '',
      countryId: '',
      stateId: '',
      cityId: '',
      address: '',
      ...(prefill ?? {}),
    }
  }

  function cancelCreatingOwner() {
    state.ownerCreating = null
  }

  function setPet(pet: Animal | null) {
    state.pet = pet
    state.petCreating = null
  }

  function startCreatingPet() {
    state.petCreating = {
      name: '',
      code: '',
      specieId: '',
      breedId: '',
      gender: '',
      color: '',
      bod: '',
      animalType: 'pet',
      weight: '',
      weightType: 'kg',
      size: '',
      reproductiveState: '',
    }
  }

  function cancelCreatingPet() {
    state.petCreating = null
  }

  function setConsultationType(type: ConsultationType | null) {
    state.consultationType = type
    state.consultation.typeId = type?.id ?? ''
  }

  function reset() {
    Object.assign(state, defaultDraft())
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  }

  function resetKeepingOwner() {
    const keptOwner = state.owner
    Object.assign(state, defaultDraft())
    state.owner = keptOwner
    state.step = 2
  }

  const isEmpty = computed<boolean>(() => {
    const hasOwner = !!state.owner || !!state.ownerCreating
    const hasPet = !!state.pet || !!state.petCreating
    const c = state.consultation
    const hasConsultationData =
      !!c.typeId ||
      !!c.anamnesis.trim() ||
      !!c.diagnosis.trim() ||
      !!c.diagnosticPlan.trim() ||
      !!c.therapeuticPlan.trim() ||
      !!c.nextControlDate ||
      !!c.nextControlNotes.trim()
    return !hasOwner && !hasPet && !hasConsultationData
  })

  return {
    state,
    setStep,
    setOwner,
    startCreatingOwner,
    cancelCreatingOwner,
    setPet,
    startCreatingPet,
    cancelCreatingPet,
    setConsultationType,
    reset,
    resetKeepingOwner,
    isEmpty,
  }
}

export function buildConsultation(
  draft: NuevaConsultaDraft,
  ownerId: string,
  animalId: string,
): Consultation {
  return {
    date: draft.consultation.date,
    type: draft.consultationType,
    anamnesis: draft.consultation.anamnesis,
    diagnosis: draft.consultation.diagnosis,
    diagnosticPlan: draft.consultation.diagnosticPlan,
    therapeuticPlan: draft.consultation.therapeuticPlan,
    nextControlDate: draft.consultation.nextControlDate,
    nextControlNotes: draft.consultation.nextControlNotes,
    ownerId,
    animalId,
  }
}
