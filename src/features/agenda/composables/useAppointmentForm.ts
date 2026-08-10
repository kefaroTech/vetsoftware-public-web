import { computed, ref, type Ref } from 'vue'
import {
  APPT_CLIENT_EMAIL_MAX,
  APPT_CLIENT_NAME_MAX,
  APPT_CLIENT_PHONE_MAX,
  APPT_NOTES_MAX,
  apptDate,
  apptTime,
  toIsoLocalDateTime,
  type AppointmentResponse,
  type AppointmentType,
  type CreateAppointmentRequest,
} from '../types/appointment'

export type FormMode = 'create' | 'edit' | 'reschedule'

/**
 * Estado, validación y armado del payload del formulario de citas.
 *
 * Sale de `AppointmentFormModal` porque eran ~200 de sus líneas: 16 refs, los
 * cuatro modelos con tope de caracteres, las reglas de validez y la traducción
 * del formulario a la petición. El SFC se queda con el marcado y con los watch
 * que dependen del ciclo de vida del modal.
 *
 * La regla que conviene no perder: en modo "reprogramar" sólo importan fecha,
 * hora y veterinario — el sujeto de la cita (dueño registrado o contacto libre)
 * no se revalida porque no se está tocando.
 */
export function useAppointmentForm(ctx: {
  mode: Ref<FormMode>
  appointment: Ref<AppointmentResponse | null>
  focusDate: Ref<string>
}) {
  const date = ref('')
  const time = ref('09:00')
  const type = ref<AppointmentType>('CONSULTATION')
  const employeeId = ref<number | null>(null)
  const subjectMode = ref<'registered' | 'free'>('registered')
  const ownerId = ref<string | null>(null)
  const ownerName = ref<string | null>(null)
  const animalId = ref<string>('') // '' = por confirmar
  const clientName = ref('')
  const clientPhone = ref('')
  const clientEmail = ref('')
  const notes = ref('')
  const submitted = ref(false)

  const isReschedule = computed(() => ctx.mode.value === 'reschedule')
  const isEdit = computed(() => ctx.mode.value === 'edit')

  /** Rellena el formulario desde la cita (editar/reprogramar) o lo deja limpio. */
  function resetFrom(appt: AppointmentResponse | null, firstVetId: number | null) {
    submitted.value = false
    if (appt) {
      date.value = apptDate(appt.startAt)
      time.value = apptTime(appt.startAt)
      type.value = appt.type
      employeeId.value = appt.employee.id
      const free = !appt.owner && !!appt.clientName
      subjectMode.value = free ? 'free' : 'registered'
      ownerId.value = appt.owner ? String(appt.owner.id) : null
      ownerName.value = appt.owner?.name ?? null
      animalId.value = appt.animal ? String(appt.animal.id) : ''
      clientName.value = appt.clientName ?? ''
      clientPhone.value = appt.clientPhone ?? ''
      clientEmail.value = appt.clientEmail ?? ''
      notes.value = appt.notes ?? ''
      return
    }
    date.value = ctx.focusDate.value
    time.value = '09:00'
    type.value = 'CONSULTATION'
    employeeId.value = firstVetId
    subjectMode.value = 'registered'
    ownerId.value = null
    ownerName.value = null
    animalId.value = ''
    clientName.value = ''
    clientPhone.value = ''
    clientEmail.value = ''
    notes.value = ''
  }

  // ── Modelos con tope de caracteres ─────────────────────────────────────────
  const capped = (r: Ref<string>, max: number) =>
    computed({ get: () => r.value, set: (v: string) => (r.value = v.slice(0, max)) })
  const notesModel = capped(notes, APPT_NOTES_MAX)
  const clientNameModel = capped(clientName, APPT_CLIENT_NAME_MAX)
  const clientPhoneModel = capped(clientPhone, APPT_CLIENT_PHONE_MAX)
  const clientEmailModel = capped(clientEmail, APPT_CLIENT_EMAIL_MAX)

  // ── Validación ─────────────────────────────────────────────────────────────
  const hasSubject = computed(() =>
    subjectMode.value === 'registered'
      ? !!ownerId.value || !!animalId.value
      : clientName.value.trim().length > 0,
  )
  const missingSubject = computed(() => !isReschedule.value && !hasSubject.value)
  /** Correo del contacto libre: opcional, pero si se escribe debe tener formato válido. */
  const clientEmailInvalid = computed(
    () =>
      subjectMode.value === 'free' &&
      clientEmail.value.trim().length > 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clientEmail.value.trim()),
  )
  const valid = computed(
    () =>
      !!date.value &&
      !!time.value &&
      !!type.value &&
      employeeId.value != null &&
      (isReschedule.value || hasSubject.value) &&
      !clientEmailInvalid.value,
  )

  const startAtIso = computed(() =>
    date.value && time.value ? toIsoLocalDateTime(date.value, time.value) : '',
  )

  // ── Textos del modal según el modo ─────────────────────────────────────────
  const title = computed(() => {
    if (isReschedule.value) return `Reprogramar cita #${ctx.appointment.value?.id ?? ''}`
    if (isEdit.value) return `Editar cita #${ctx.appointment.value?.id ?? ''}`
    return 'Agendar cita'
  })
  const subtitle = computed(() => {
    if (isReschedule.value) return 'Elige nueva fecha, hora y veterinario/a.'
    if (isEdit.value) return 'Modifica los datos de la cita.'
    return 'Registra una nueva cita en la agenda.'
  })
  const submitLabel = computed(() => {
    if (isReschedule.value) return 'Reprogramar'
    if (isEdit.value) return 'Guardar cambios'
    return 'Agendar cita'
  })

  /** Traduce el formulario al cuerpo de la petición. La sede sólo viaja al crear. */
  function buildPayload(branchId: number | null): CreateAppointmentRequest {
    const registered = subjectMode.value === 'registered'
    return {
      startAt: toIsoLocalDateTime(date.value, time.value),
      type: type.value,
      employeeId: employeeId.value as number,
      ownerId: registered && ownerId.value ? Number(ownerId.value) : null,
      animalId: registered && animalId.value ? Number(animalId.value) : null,
      clientName: !registered ? clientName.value.trim() || null : null,
      clientPhone: !registered ? clientPhone.value.trim() || null : null,
      clientEmail: !registered ? clientEmail.value.trim() || null : null,
      notes: notes.value.trim() || null,
      ...(ctx.mode.value === 'create' ? { branchId } : {}),
    }
  }

  return {
    date,
    time,
    type,
    employeeId,
    subjectMode,
    ownerId,
    ownerName,
    animalId,
    clientName,
    clientPhone,
    clientEmail,
    notes,
    submitted,
    isReschedule,
    isEdit,
    notesModel,
    clientNameModel,
    clientPhoneModel,
    clientEmailModel,
    hasSubject,
    missingSubject,
    clientEmailInvalid,
    valid,
    startAtIso,
    title,
    subtitle,
    submitLabel,
    resetFrom,
    buildPayload,
  }
}
