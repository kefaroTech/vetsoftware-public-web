import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useAppointmentForm, type FormMode } from '@/features/agenda/composables/useAppointmentForm'
import type { AppointmentResponse as Appt } from '@/features/agenda/types/appointment'

/**
 * Traducción del formulario de citas al cuerpo de la petición.
 *
 * Lo que se fija aquí es lo que BE-17 añadió al payload y lo que el resto de la pantalla
 * no puede comprobar: que `durationMinutes` viaja como `null` cuando el usuario deja
 * «por defecto» —que es lo que el backend interpreta como «usa el ajuste de la empresa»—,
 * que `forceOverlap` es `false` salvo que se pida a propósito, y que reprogramar arma su
 * propio cuerpo (sin sujeto ni sede) en vez de reutilizar el de crear.
 */

function makeForm(mode: FormMode = 'create', appointment: Appt | null = null) {
  const ctx = {
    mode: ref<FormMode>(mode),
    appointment: ref<Appt | null>(appointment),
    focusDate: ref('2026-08-17'),
  }
  const form = useAppointmentForm(ctx)
  form.resetFrom(appointment, 7)
  return form
}

function makeAppt(over: Partial<Appt> & { id: number }): Appt {
  return {
    // `id` lo aporta el `...over` de abajo: repetirlo aquí era una línea muerta
    // que el spread pisaba en cada llamada.
    startAt: '2026-08-17T09:00:00',
    durationMinutes: null,
    type: 'CONSULTATION',
    status: 'REQUESTED',
    notes: null,
    cancellationReason: null,
    animal: null,
    owner: null,
    clientName: null,
    clientPhone: null,
    clientEmail: null,
    employee: { id: 7, name: 'Ana Ruiz' },
    version: 0,
    enabled: true,
    createdDate: '2026-08-01T10:00:00',
    overlappingAppointmentIds: [],
    ...over,
  }
}

describe('buildPayload', () => {
  it('manda durationMinutes null y forceOverlap false por defecto', () => {
    const form = makeForm()
    form.clientName.value = 'María Pérez'
    form.subjectMode.value = 'free'

    const payload = form.buildPayload(3)

    expect(payload.startAt).toBe('2026-08-17T09:00:00')
    expect(payload.durationMinutes).toBeNull()
    expect(payload.forceOverlap).toBe(false)
    expect(payload.branchId).toBe(3)
  })

  it('manda la duración elegida cuando el usuario sale del «por defecto»', () => {
    const form = makeForm()
    form.durationMinutes.value = 45
    expect(form.buildPayload(null).durationMinutes).toBe(45)
  })

  it('forceOverlap viaja en true sólo cuando se pide: es el reenvío del banner del 409', () => {
    const form = makeForm()
    expect(form.buildPayload(null, { forceOverlap: true }).forceOverlap).toBe(true)
    expect(form.buildPayload(null, {}).forceOverlap).toBe(false)
  })

  it('al editar no viaja la sede (el PUT no cambia de sede) pero sí los campos nuevos', () => {
    const form = makeForm('edit', makeAppt({ id: 10, durationMinutes: 60 }))

    const payload = form.buildPayload(3, { forceOverlap: true })

    expect('branchId' in payload).toBe(false)
    expect(payload.durationMinutes).toBe(60)
    expect(payload.forceOverlap).toBe(true)
  })

  it('resetFrom hereda la duración de la cita, y la deja en null al crear', () => {
    expect(makeForm('edit', makeAppt({ id: 10, durationMinutes: 90 })).durationMinutes.value).toBe(
      90,
    )
    expect(makeForm('edit', makeAppt({ id: 11 })).durationMinutes.value).toBeNull()
    expect(makeForm().durationMinutes.value).toBeNull()
  })
})

describe('buildReschedulePayload', () => {
  it('lleva sólo hueco, duración y veterinario — nada del sujeto de la cita', () => {
    const form = makeForm('reschedule', makeAppt({ id: 10, durationMinutes: 45 }))
    form.time.value = '11:30'

    const payload = form.buildReschedulePayload()

    expect(payload).toEqual({
      startAt: '2026-08-17T11:30:00',
      durationMinutes: 45,
      employeeId: 7,
      forceOverlap: false,
    })
  })

  it('propaga el forzado igual que crear/editar', () => {
    const form = makeForm('reschedule', makeAppt({ id: 10 }))
    expect(form.buildReschedulePayload({ forceOverlap: true }).forceOverlap).toBe(true)
  })

  it('con «por defecto» manda null, que en este PATCH significa «no toques la duración»', () => {
    const form = makeForm('reschedule', makeAppt({ id: 10, durationMinutes: 45 }))
    form.durationMinutes.value = null
    expect(form.buildReschedulePayload().durationMinutes).toBeNull()
  })
})
