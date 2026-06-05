import { storeToRefs } from 'pinia'
import {
  useNuevaConsultaDraftStore,
  buildConsultation,
} from '../stores/nuevaConsultaDraft.store'

export type {
  WizardStep,
  OwnerDraft,
  PetDraft,
  ConsultationDraft,
  MedicamentDraftItem,
  PrescriptionDraftItem,
  LaboratoryTestDraftItem,
  DiagnosticImagingDraftItem,
  VaccinationDraftItem,
  HospitalizationDraftItem,
  DewormingDraftItem,
  SurgeryDraftItem,
  NuevaConsultaDraft,
  ActionKind,
} from '../stores/nuevaConsultaDraft.store'

export { buildConsultation }

/**
 * Wrapper sobre el store de Pinia `nuevaConsultaDraft`. `state` se expone como
 * el objeto reactivo (acceso `draft.state.owner`); los derivados como refs
 * (`draft.isEmpty.value`) para no tocar call sites.
 */
export function useNuevaConsultaDraft() {
  const store = useNuevaConsultaDraftStore()
  const { isEmpty, actionsCount, hasPartialSave } = storeToRefs(store)

  return {
    state: store.state,
    isEmpty,
    actionsCount,
    hasPartialSave,
    setStep: store.setStep,
    setOwner: store.setOwner,
    startCreatingOwner: store.startCreatingOwner,
    cancelCreatingOwner: store.cancelCreatingOwner,
    setPet: store.setPet,
    startCreatingPet: store.startCreatingPet,
    cancelCreatingPet: store.cancelCreatingPet,
    setConsultationType: store.setConsultationType,
    reset: store.reset,
    resetKeepingOwner: store.resetKeepingOwner,
    addPrescription: store.addPrescription,
    removePrescription: store.removePrescription,
    addLaboratoryTest: store.addLaboratoryTest,
    removeLaboratoryTest: store.removeLaboratoryTest,
    addDiagnosticImaging: store.addDiagnosticImaging,
    removeDiagnosticImaging: store.removeDiagnosticImaging,
    addVaccination: store.addVaccination,
    removeVaccination: store.removeVaccination,
    addHospitalization: store.addHospitalization,
    removeHospitalization: store.removeHospitalization,
    addDeworming: store.addDeworming,
    removeDeworming: store.removeDeworming,
    addSurgery: store.addSurgery,
    removeSurgery: store.removeSurgery,
    updatePrescription: store.updatePrescription,
    updateLaboratoryTest: store.updateLaboratoryTest,
    updateDiagnosticImaging: store.updateDiagnosticImaging,
    updateVaccination: store.updateVaccination,
    updateHospitalization: store.updateHospitalization,
    updateDeworming: store.updateDeworming,
    updateSurgery: store.updateSurgery,
    markConsultationCreated: store.markConsultationCreated,
    markPrescriptionSaved: store.markPrescriptionSaved,
    markMedicamentSaved: store.markMedicamentSaved,
    markLaboratoryTestSaved: store.markLaboratoryTestSaved,
    markDiagnosticImagingSaved: store.markDiagnosticImagingSaved,
    markVaccinationSaved: store.markVaccinationSaved,
    markHospitalizationSaved: store.markHospitalizationSaved,
    markDewormingSaved: store.markDewormingSaved,
    markSurgerySaved: store.markSurgerySaved,
  }
}
