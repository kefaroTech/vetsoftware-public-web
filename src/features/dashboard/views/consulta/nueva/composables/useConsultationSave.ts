import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNuevaConsultaDraft } from './useNuevaConsultaDraft'
import { useAuth } from '@/features/auth/composables/useAuth'
import { openBilling } from '@/features/cuentas/composables/useBillingPrompt'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { consultationApi } from '../api/consultation.api'
import { prescriptionApi } from '../api/prescription.api'
import { medicamentPrescriptionApi } from '../api/medicamentPrescription.api'
import { laboratoryTestApi } from '../api/laboratoryTest.api'
import { diagnosticImagingApi } from '../api/diagnosticImaging.api'
import { vaccinationApi } from '../api/vaccination.api'
import { hospitalizationApi } from '../api/hospitalization.api'
import { dewormingApi } from '../api/deworming.api'
import { surgeryApi } from '../api/surgery.api'

/** Convierte un campo de texto opcional del examen físico a número (null si vacío/inválido). */
function numOrNull(raw: string): number | null {
  const v = raw.trim().replace(',', '.')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function intOrNull(raw: string): number | null {
  const n = numOrNull(raw)
  return n == null ? null : Math.trunc(n)
}

/**
 * Guardado de la consulta completa: la cascada de POSTs y su idempotencia.
 *
 * Vive fuera de `NuevaView` porque era la mitad de su script y no tiene nada que
 * ver con la navegación del wizard. El contrato de reintento no cambia: la
 * consulta se crea una sola vez (`consultationCreatedId`) y cada item se marca
 * con su `savedId` al persistirse, así que reintentar tras un fallo parcial
 * continúa donde se quedó sin duplicar nada.
 */
export function useConsultationSave(options: { onKeepOwner?: () => void } = {}) {
  const router = useRouter()
  const draft = useNuevaConsultaDraft()
  const auth = useAuth()

  const saving = ref(false)
  const saveError = ref<string | null>(null)

  /** POSTea los items del draft que aún no tengan `savedId`. */
  async function persistConsultationItems(
    consultationId: number,
    animalId: number,
    companyId: number,
  ) {
    const s = draft.state

    // Recetas: cabecera + medicamentos en cascada. Items con savedId se saltan.
    for (let i = 0; i < s.prescriptions.length; i++) {
      const p = s.prescriptions[i]
      let prescriptionId = p.savedId
      if (!prescriptionId) {
        const created = await prescriptionApi.create({
          date: p.date,
          // El diagnóstico de la receta es el de la consulta (no se reescribe en la receta).
          diagnosis: s.consultation.diagnosis.trim() || null,
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
          medicamentId: m.medicamentId,
          presentation: m.presentation,
          quantity: m.quantity,
          posology: m.posology,
          observation: m.observation?.trim() || null,
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
        // Sede elegida en el modal de la muestra; si no hay, withBranchBody usa la del menú principal.
        branchId: t.branchId,
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
        weight: h.weight?.trim() ? Number(h.weight.trim().replace(',', '.')) : null,
        weightUnit: h.weight?.trim() ? (draft.state.pet?.weightType ?? null) : null,
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
          prognosis: cDraft.prognosis.trim() || null,
          nextControl: cDraft.nextControlDate || null,
          animalId: Number(pet.id),
          weight: cDraft.weight.trim() ? Number(cDraft.weight.trim().replace(',', '.')) : null,
          weightUnit: cDraft.weight.trim() ? pet.weightType : null,
          // Examen físico / constantes vitales (Fase 3) — opcionales; van null si vacíos.
          temperature: numOrNull(cDraft.temperature),
          heartRate: intOrNull(cDraft.heartRate),
          respiratoryRate: intOrNull(cDraft.respiratoryRate),
          mucousMembranes: cDraft.mucousMembranes.trim() || null,
          capillaryRefill: cDraft.capillaryRefill.trim() || null,
          hydration: cDraft.hydration.trim() || null,
          bodyConditionScore: intOrNull(cDraft.bodyConditionScore),
          painScore: intOrNull(cDraft.painScore),
          attitude: cDraft.attitude.trim() || null,
          examFindings: cDraft.examFindings.trim() || null,
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
        options.onKeepOwner?.()
        return
      }
      const successState = {
        ownerName: owner?.name ?? '',
        petName: pet.name,
        consultationType: consultationType.name,
        date,
        // Recetas guardadas → la pantalla de éxito ofrece imprimir su fórmula. Se lee ANTES
        // del draft.reset() de abajo (aquí los savedId todavía están presentes).
        prescriptions: draft.state.prescriptions
          .filter((p) => p.savedId)
          .map((p) => ({ id: p.savedId as number, label: p.medicaments[0]?.name ?? 'Receta' })),
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
        // Tras guardar, la facturación es una decisión forzada: sin X, sin Cancelar y
        // sin cierre por backdrop/Escape. El usuario sale eligiendo una acción del footer.
        dismissible: false,
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

  return { saving, saveError, saveConsultation }
}
