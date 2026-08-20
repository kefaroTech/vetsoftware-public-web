import { defineStore } from 'pinia'
import { computed, nextTick, reactive, watch } from 'vue'
import type {
  Animal,
  Consultation,
  ConsultationType,
  Deworming,
  DiagnosticImaging,
  Hospitalization,
  LaboratoryTest,
  MedicamentPrescription,
  Owner,
  Prescription,
  Surgery,
  Vaccination,
} from '@/types/domain'
import { NUEVA_CONSULTA_DRAFT_KEY } from '@/constants/storageKeys'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  isSameSessionOwner,
  readSessionOwner,
  type SessionOwner,
} from '@/features/auth/utils/sessionOwner'

export type WizardStep = 1 | 2

export interface OwnerDraft {
  name: string
  document: string
  phone: string
  email: string
  // Datos fiscales requeridos por el backend al crear (OwnerDocumentType / PersonType).
  // Se guardan como string (valor del select) por consistencia con countryId, etc.
  documentType: string
  personType: string
  countryId: string
  stateId: string
  cityId: string
  address: string
}

export interface PetDraft {
  name: string
  chipNumber: string
  specieId: string
  breedId: string
  gender: 'MALE' | 'FEMALE' | ''
  colorId: string
  bod: string
  animalType: 'SERVICE' | 'SUPPORT' | 'NONE'
  weight: string
  weightType: 'GRAMS' | 'POUNDS' | 'KILOGRAMS'
  size: string
  reproductiveState: 'STERILIZED' | 'NO_STERILIZED' | 'UNKNOWN' | ''
}

export interface ConsultationDraft {
  date: string
  typeId: string
  anamnesis: string
  diagnosis: string
  // Pronóstico (AVMA) — opcional.
  prognosis: string
  nextControlDate: string
  nextControlNotes: string
  // Peso opcional registrado en esta consulta (en la unidad preferida de la mascota). Se guarda como
  // punto del historial de peso del animal. Ver WeightRecord (backend).
  weight: string
  // Examen físico / constantes vitales (la "O" de SOAP) — todos opcionales. Strings de formulario.
  temperature: string
  heartRate: string
  respiratoryRate: string
  mucousMembranes: string
  capillaryRefill: string
  hydration: string
  bodyConditionScore: string
  painScore: string
  attitude: string
  examFindings: string
}

export type MedicamentDraftItem = MedicamentPrescription & { savedId?: number }
export type PrescriptionDraftItem = Omit<Prescription, 'medicaments'> & {
  savedId?: number
  medicaments: MedicamentDraftItem[]
}
export type LaboratoryTestDraftItem = LaboratoryTest & { savedId?: number }
export type DiagnosticImagingDraftItem = DiagnosticImaging & { savedId?: number }
export type VaccinationDraftItem = Vaccination & { savedId?: number }
export type HospitalizationDraftItem = Hospitalization & { savedId?: number }
export type DewormingDraftItem = Deworming & { savedId?: number }
export type SurgeryDraftItem = Surgery & { savedId?: number }

export interface NuevaConsultaDraft {
  step: WizardStep
  owner: Owner | null
  ownerCreating: OwnerDraft | null
  pet: Animal | null
  petCreating: PetDraft | null
  consultation: ConsultationDraft
  consultationType: ConsultationType | null
  consultationCreatedId?: number
  prescriptions: PrescriptionDraftItem[]
  laboratoryTests: LaboratoryTestDraftItem[]
  diagnosticImagings: DiagnosticImagingDraftItem[]
  vaccinations: VaccinationDraftItem[]
  hospitalizations: HospitalizationDraftItem[]
  dewormings: DewormingDraftItem[]
  surgeries: SurgeryDraftItem[]
}

export type ActionKind =
  'receta' | 'lab' | 'imaging' | 'vaccination' | 'hospitalization' | 'deworming' | 'surgery'

const STORAGE_KEY = NUEVA_CONSULTA_DRAFT_KEY

/**
 * Lo que de verdad se escribe en `localStorage`: el borrador **sellado** con la
 * sesión que lo escribió.
 *
 * El sello no es redundante con borrar la clave al cerrar sesión, es lo que
 * cierra el agujero: el borrado depende de que todos los caminos de salida se
 * acuerden de llamar a `clearVolatile()`, y basta con que uno falle —o con que
 * mañana aparezca otra forma de terminar una sesión— para que el borrador
 * clínico del turno anterior le aparezca prellenado al siguiente usuario del
 * mismo equipo (issue #68). El sello no depende de que nadie se acuerde de nada:
 * si el borrador no es tuyo, no se aplica.
 *
 * El sello se llama `sealedBy` y no `owner` porque en este borrador `owner` ya
 * es el propietario de la mascota; dos significados de "dueño" en el mismo
 * objeto se confunden solos.
 */
interface PersistedDraft {
  sealedBy: SessionOwner
  draft: NuevaConsultaDraft
}

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
    prognosis: '',
    nextControlDate: '',
    nextControlNotes: '',
    weight: '',
    temperature: '',
    heartRate: '',
    respiratoryRate: '',
    mucousMembranes: '',
    capillaryRefill: '',
    hydration: '',
    bodyConditionScore: '',
    painScore: '',
    attitude: '',
    examFindings: '',
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
    consultationCreatedId: undefined,
    prescriptions: [],
    laboratoryTests: [],
    diagnosticImagings: [],
    vaccinations: [],
    hospitalizations: [],
    dewormings: [],
    surgeries: [],
  }
}

/** Borra el borrador guardado. Un storage lleno o bloqueado no puede tirar la pantalla. */
function discardPersisted(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Vuelca sobre el borrador por defecto lo que traiga uno guardado, tolerando las
 * formas antiguas. Solo se llama con un borrador ya verificado como propio.
 */
function mergeSaved(parsed: Partial<NuevaConsultaDraft>): NuevaConsultaDraft {
  const merged = { ...defaultDraft(), ...parsed }
  // Deep-merge de la consulta: drafts LEGACY no traen los campos de examen físico /
  // pronóstico (Fase 3); sin esto quedarían `undefined` y romperían los v-model.
  merged.consultation = { ...emptyConsultation(), ...(parsed.consultation ?? {}) }
  // El paciente se persiste como `Animal` completo. Drafts LEGACY se guardaron antes de
  // que `Animal` declarara `enabled` (baja lógica): sin default el campo llega
  // `undefined` —falsy— y un paciente activo se leería como dado de baja.
  const legacyPet = parsed.pet as
    (Omit<Animal, 'enabled'> & { enabled?: boolean }) | null | undefined
  if (legacyPet) merged.pet = { ...legacyPet, enabled: legacyPet.enabled ?? true }
  // Paso persistido del wizard actual (1 o 2), preservado tal cual. Además,
  // drafts LEGACY de 4 pasos (3/4) colapsan al paso 2. `>= 2` cubre ambos:
  // conserva el paso 2 ACTUAL (antes se perdía) y mapea los antiguos 3/4.
  const rawStep = Number((parsed as { step?: number }).step ?? 1)
  merged.step = rawStep >= 2 ? 2 : 1
  return merged
}

function load(): NuevaConsultaDraft {
  if (typeof window === 'undefined') return defaultDraft()
  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return defaultDraft()
  }
  if (!raw) return defaultDraft()

  // Orden de inicialización: esto corre al CREAR el store, que puede ser antes de
  // que `/auth/me` haya contestado — de ahí que el dueño se resuelva del JWT ya
  // persistido y no de `useAuthStore().companyId`, que espera a la red.
  const current = readSessionOwner()
  if (!current) {
    // Sin sesión legible no hay a quién atribuir el borrador, así que no se aplica.
    // Tampoco se borra: una expulsión por token expirado deja la pestaña justo
    // aquí, y quien vuelva a entrar en este navegador puede ser su dueño. El
    // estado vacío que devolvemos no puede pisarlo, porque `persistNow()` tampoco
    // escribe mientras no haya sesión que sellar.
    return defaultDraft()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedDraft>
    if (!parsed?.draft || !isSameSessionOwner(parsed.sealedBy, current)) {
      // Ajeno, o sin sello —los borradores escritos antes de #68 no lo llevan, y
      // hay equipos reales con uno guardado ahora mismo—. Se descarta y se borra
      // la clave: dejarla ahí solo aplazaría la fuga al siguiente arranque.
      discardPersisted()
      return defaultDraft()
    }
    return mergeSaved(parsed.draft)
  } catch {
    discardPersisted()
    return defaultDraft()
  }
}

export const useNuevaConsultaDraftStore = defineStore('nuevaConsultaDraft', () => {
  const state = reactive<NuevaConsultaDraft>(load())

  // El sello protege lo que hay en DISCO; esto protege lo que hay en MEMORIA, y hace
  // falta porque se puede perder la sesión sin recargar la página: `refreshMe()`
  // falla, el store de auth la limpia y el guard del router hace `push` a /login en
  // la misma pestaña. Ahí `clearVolatile()` ya se llevó la clave, pero este store
  // sigue vivo con el paciente y el examen físico del turno anterior — el siguiente
  // usuario los vería, y al teclear encima los persistiría sellados con SU nombre,
  // que es justo la mala atribución que hace invisible el defecto.
  const auth = useAuthStore()
  watch(
    () => auth.isAuthenticated,
    (authenticated) => {
      if (!authenticated) reset()
    },
  )

  /**
   * Persistencia del borrador. Antes serializaba en CADA pulsación: un
   * `JSON.stringify` del borrador entero, en el hilo principal, mientras el
   * veterinario escribe la anamnesis, que es el texto más largo del asistente.
   *
   * Ahora se agrupa con un retardo. Eso abre dos huecos que hay que tapar, y
   * ambos son peores que el problema original si se dejan abiertos:
   *
   *  1. Entre la última tecla y la escritura hay una ventana en la que lo
   *     tecleado no está en disco. Si la pestaña se cierra ahí, se pierde
   *     justo lo último — lo contrario de para qué existe este borrador. Por
   *     eso se vuelca al salir y al ocultarse la pestaña.
   *  2. `reset()` borra el borrador, pero la propia mutación despierta al
   *     watcher, así que una escritura posterior lo resucitaría. Se suspende
   *     durante el reinicio.
   */
  const PERSIST_DELAY_MS = 400
  let persistTimer: ReturnType<typeof setTimeout> | null = null
  let persistSuspended = false

  function cancelPendingPersist() {
    if (persistTimer !== null) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
  }

  function persistNow() {
    cancelPendingPersist()
    if (typeof window === 'undefined') return
    // Sin sesión no hay sello, y sin sello no se escribe: un borrador anónimo es
    // exactamente el que el siguiente usuario acabaría viendo. Esto además protege
    // al dueño legítimo — si la pestaña se queda en /login tras expirar el token,
    // el estado vacío que hay en memoria no puede sobrescribir su borrador.
    const sealedBy = readSessionOwner()
    if (!sealedBy) return
    try {
      const payload: PersistedDraft = { sealedBy, draft: state }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore quota errors
    }
  }

  if (typeof window !== 'undefined') {
    watch(
      state,
      () => {
        if (persistSuspended) return
        cancelPendingPersist()
        persistTimer = setTimeout(persistNow, PERSIST_DELAY_MS)
      },
      { deep: true },
    )

    // `pagehide` y no solo `beforeunload`: en móvil e iOS el navegador puede
    // congelar la pestaña sin disparar nunca el segundo. `visibilitychange`
    // cubre el cambio de app o de pestaña, que es lo más frecuente de los tres.
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('pagehide', persistNow)
      window.addEventListener('beforeunload', persistNow)
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') persistNow()
      })
    }
  }

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
      documentType: '',
      personType: '',
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
      chipNumber: '',
      specieId: '',
      breedId: '',
      gender: '',
      colorId: '',
      bod: '',
      animalType: 'NONE',
      weight: '',
      weightType: 'KILOGRAMS',
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
    // El watcher es asíncrono: sin suspenderlo, el `Object.assign` de aquí
    // abajo lo despierta y, un tick después de haber borrado, vuelve a escribir
    // un borrador. Esto ya pasaba antes del retardo —el borrador «vacío»
    // reaparecía en `localStorage` en el siguiente tick— solo que era invisible
    // porque su contenido era el de por defecto.
    persistSuspended = true
    Object.assign(state, defaultDraft())
    cancelPendingPersist()
    if (typeof window !== 'undefined') discardPersisted()
    // Se reanuda tras el flush del watcher, no antes: la siguiente edición del
    // usuario vuelve a persistir con normalidad.
    void nextTick(() => {
      persistSuspended = false
    })
  }

  function resetKeepingOwner() {
    const keptOwner = state.owner
    Object.assign(state, defaultDraft())
    state.owner = keptOwner
    state.step = 1
  }

  const actionsCount = computed<number>(
    () =>
      state.prescriptions.length +
      state.laboratoryTests.length +
      state.diagnosticImagings.length +
      state.vaccinations.length +
      state.hospitalizations.length +
      state.dewormings.length +
      state.surgeries.length,
  )

  const isEmpty = computed<boolean>(() => {
    const hasOwner = !!state.owner || !!state.ownerCreating
    const hasPet = !!state.pet || !!state.petCreating
    const c = state.consultation
    const hasConsultationData =
      !!c.typeId ||
      !!c.anamnesis.trim() ||
      !!c.diagnosis.trim() ||
      !!c.nextControlDate ||
      !!c.nextControlNotes.trim()
    return !hasOwner && !hasPet && !hasConsultationData && actionsCount.value === 0
  })

  const hasPartialSave = computed<boolean>(() => {
    if (state.consultationCreatedId) return true
    if (state.prescriptions.some((p) => p.savedId || p.medicaments.some((m) => m.savedId))) {
      return true
    }
    return (
      state.laboratoryTests.some((t) => t.savedId) ||
      state.diagnosticImagings.some((i) => i.savedId) ||
      state.vaccinations.some((v) => v.savedId) ||
      state.hospitalizations.some((h) => h.savedId) ||
      state.dewormings.some((d) => d.savedId) ||
      state.surgeries.some((s) => s.savedId)
    )
  })

  function addPrescription(p: Prescription) {
    state.prescriptions.push(p)
  }
  function removePrescription(idx: number) {
    state.prescriptions.splice(idx, 1)
  }
  function addLaboratoryTest(t: LaboratoryTest) {
    state.laboratoryTests.push(t)
  }
  function removeLaboratoryTest(idx: number) {
    state.laboratoryTests.splice(idx, 1)
  }
  function addDiagnosticImaging(i: DiagnosticImaging) {
    state.diagnosticImagings.push(i)
  }
  function removeDiagnosticImaging(idx: number) {
    state.diagnosticImagings.splice(idx, 1)
  }
  function addVaccination(v: Vaccination) {
    state.vaccinations.push(v)
  }
  function removeVaccination(idx: number) {
    state.vaccinations.splice(idx, 1)
  }
  function addHospitalization(h: Hospitalization) {
    state.hospitalizations.push(h)
  }
  function removeHospitalization(idx: number) {
    state.hospitalizations.splice(idx, 1)
  }
  function addDeworming(d: Deworming) {
    state.dewormings.push(d)
  }
  function removeDeworming(idx: number) {
    state.dewormings.splice(idx, 1)
  }
  function addSurgery(s: Surgery) {
    state.surgeries.push(s)
  }
  function removeSurgery(idx: number) {
    state.surgeries.splice(idx, 1)
  }

  function updatePrescription(index: number, p: Prescription) {
    const prev = state.prescriptions[index]
    if (!prev) return
    // Los marcadores de medicamento se emparejan por `medicamentId`, NO por
    // posición. Emparejar por índice se rompe en cuanto el usuario borra o
    // reordena: guardado el medicamento 0 y no el 1, al borrar el 0 el que
    // queda heredaba el marcador del borrado, se daba por guardado y no
    // llegaba nunca al backend — receta incompleta y sin ningún error a la
    // vista.
    //
    // El mismo medicamento puede repetirse en una receta (distinta posología),
    // así que cada marcador se consume una sola vez: dos líneas del mismo
    // `medicamentId` reciben marcadores distintos, y si se borra una, solo se
    // hereda uno.
    const marcadores = prev.medicaments.filter((m) => m.savedId != null)
    state.prescriptions[index] = {
      ...p,
      savedId: prev.savedId,
      medicaments: p.medicaments.map((m) => {
        const j = marcadores.findIndex((q) => q.medicamentId === m.medicamentId)
        const previo = j === -1 ? undefined : marcadores.splice(j, 1)[0]
        return { ...m, savedId: previo?.savedId }
      }),
    }
  }
  function updateLaboratoryTest(index: number, t: LaboratoryTest) {
    const prev = state.laboratoryTests[index]
    if (!prev) return
    state.laboratoryTests[index] = { ...t, savedId: prev.savedId }
  }
  function updateDiagnosticImaging(index: number, i: DiagnosticImaging) {
    const prev = state.diagnosticImagings[index]
    if (!prev) return
    state.diagnosticImagings[index] = { ...i, savedId: prev.savedId }
  }
  function updateVaccination(index: number, v: Vaccination) {
    const prev = state.vaccinations[index]
    if (!prev) return
    state.vaccinations[index] = { ...v, savedId: prev.savedId }
  }
  function updateHospitalization(index: number, h: Hospitalization) {
    const prev = state.hospitalizations[index]
    if (!prev) return
    state.hospitalizations[index] = { ...h, savedId: prev.savedId }
  }
  function updateDeworming(index: number, d: Deworming) {
    const prev = state.dewormings[index]
    if (!prev) return
    state.dewormings[index] = { ...d, savedId: prev.savedId }
  }
  function updateSurgery(index: number, s: Surgery) {
    const prev = state.surgeries[index]
    if (!prev) return
    state.surgeries[index] = { ...s, savedId: prev.savedId }
  }

  function markConsultationCreated(id: number) {
    state.consultationCreatedId = id
  }
  function markPrescriptionSaved(index: number, id: number) {
    const p = state.prescriptions[index]
    if (p) p.savedId = id
  }
  function markMedicamentSaved(prescriptionIndex: number, medicamentIndex: number, id: number) {
    const med = state.prescriptions[prescriptionIndex]?.medicaments[medicamentIndex]
    if (med) med.savedId = id
  }
  function markLaboratoryTestSaved(index: number, id: number) {
    const t = state.laboratoryTests[index]
    if (t) t.savedId = id
  }
  function markDiagnosticImagingSaved(index: number, id: number) {
    const i = state.diagnosticImagings[index]
    if (i) i.savedId = id
  }
  function markVaccinationSaved(index: number, id: number) {
    const v = state.vaccinations[index]
    if (v) v.savedId = id
  }
  function markHospitalizationSaved(index: number, id: number) {
    const h = state.hospitalizations[index]
    if (h) h.savedId = id
  }
  function markDewormingSaved(index: number, id: number) {
    const d = state.dewormings[index]
    if (d) d.savedId = id
  }
  function markSurgerySaved(index: number, id: number) {
    const s = state.surgeries[index]
    if (s) s.savedId = id
  }

  return {
    state,
    actionsCount,
    isEmpty,
    hasPartialSave,
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
    addPrescription,
    removePrescription,
    addLaboratoryTest,
    removeLaboratoryTest,
    addDiagnosticImaging,
    removeDiagnosticImaging,
    addVaccination,
    removeVaccination,
    addHospitalization,
    removeHospitalization,
    addDeworming,
    removeDeworming,
    addSurgery,
    removeSurgery,
    updatePrescription,
    updateLaboratoryTest,
    updateDiagnosticImaging,
    updateVaccination,
    updateHospitalization,
    updateDeworming,
    updateSurgery,
    markConsultationCreated,
    markPrescriptionSaved,
    markMedicamentSaved,
    markLaboratoryTestSaved,
    markDiagnosticImagingSaved,
    markVaccinationSaved,
    markHospitalizationSaved,
    markDewormingSaved,
    markSurgerySaved,
  }
})

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
    nextControlDate: draft.consultation.nextControlDate,
    nextControlNotes: draft.consultation.nextControlNotes,
    ownerId,
    animalId,
  }
}
