import { describe, expect, it } from 'vitest'
import {
  APPT_TERMINAL,
  APPT_TRANSITIONS,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  apptClashes,
  apptDate,
  apptDuration,
  apptEndTime,
  apptHour,
  apptInitials,
  apptStartMinutes,
  apptTime,
  apptTimeRange,
  apptTypeTokens,
  apptVetHue,
  toIsoLocalDateTime,
  type AppointmentResponse,
  type AppointmentStatus,
} from '@/features/agenda/types/appointment'
import { itemsOnDay, type AgendaItem } from '@/features/agenda/types/agenda'
import { TYPE_COLORS } from '@/features/historia-clinica/constants/eventTypes'
import { exigir } from '../helpers/exigir'

/**
 * Red de seguridad de la lógica pura de la agenda.
 *
 * BE-17 (2ª pasada) ya entró: una cita dejó de ser un punto en el tiempo y pasa a
 * ocupar el intervalo `[inicio, inicio + duración)`. `apptClashes` compara esos
 * intervalos con la **misma regla semiabierta que el backend**, así que dos citas
 * consecutivas —10:00–10:30 y 10:30–11:00— NO chocan, y en cambio un minuto de
 * diferencia sí. Los tres casos que documentaban lo contrario están invertidos.
 *
 * La duración que no declara la cita la pone la empresa
 * (`appointment.default_duration_minutes`, tercer argumento de `apptClashes`) y, en
 * su defecto, `DEFAULT_APPOINTMENT_DURATION_MINUTES`.
 *
 * Sigue habiendo casos marcados con «HOY»: los que fijan un comportamiento actual
 * discutible que ninguna tarea ha decidido cambiar todavía.
 */

// ── Fixtures ─────────────────────────────────────────────────────────
function makeAppt(over: Partial<AppointmentResponse> & { id: number }): AppointmentResponse {
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
    employee: { id: 1, name: 'Ana Ruiz' },
    version: 0,
    enabled: true,
    createdDate: '2026-08-01T10:00:00',
    overlappingAppointmentIds: [],
    ...over,
  }
}

const candidateAt = (startAt: string, over: Partial<Parameters<typeof apptClashes>[1]> = {}) => ({
  employeeId: 1,
  startAt,
  status: 'REQUESTED' as AppointmentStatus,
  ...over,
})

// ── Helpers de fecha/hora sobre el ISO LocalDateTime ─────────────────
describe('apptTime / apptDate / apptHour', () => {
  const iso = '2026-08-17T09:05:30'

  it('recortan el ISO por posición, sin parsear la fecha', () => {
    expect(apptTime(iso)).toBe('09:05')
    expect(apptDate(iso)).toBe('2026-08-17')
    expect(apptHour(iso)).toBe(9)
  })

  it('devuelven el vacío neutro cuando no hay valor', () => {
    for (const empty of [null, undefined, '']) {
      expect(apptTime(empty)).toBe('')
      expect(apptDate(empty)).toBe('')
      expect(apptHour(empty)).toBe(0)
    }
  })

  it('apptHour no distingue la medianoche de "sin dato": las dos son 0', () => {
    expect(apptHour('2026-08-17T00:30:00')).toBe(0)
    expect(apptHour(null)).toBe(0)
  })

  it('aceptan un ISO sin segundos porque cortan por índice', () => {
    expect(apptTime('2026-08-17T09:05')).toBe('09:05')
    expect(apptDate('2026-08-17T09:05')).toBe('2026-08-17')
  })

  it('no aplican zona horaria: el texto se lee tal cual', () => {
    // Es el motivo de que se recorte en vez de usar `new Date`: en Bogotá
    // (UTC-5) un parseo UTC movería la fecha un día atrás.
    expect(apptDate('2026-08-17T00:00:00')).toBe('2026-08-17')
  })
})

describe('toIsoLocalDateTime', () => {
  it('añade los segundos cuando la hora viene como HH:mm', () => {
    expect(toIsoLocalDateTime('2026-08-17', '09:30')).toBe('2026-08-17T09:30:00')
  })

  it('respeta la hora que ya trae segundos', () => {
    expect(toIsoLocalDateTime('2026-08-17', '09:30:45')).toBe('2026-08-17T09:30:45')
  })

  it('HOY: una hora sin cero a la izquierda sale sin segundos (la regla es la longitud, no el formato)', () => {
    expect(toIsoLocalDateTime('2026-08-17', '9:30')).toBe('2026-08-17T9:30')
  })

  it('concatena sin validar: el sitio de llamada garantiza fecha y hora', () => {
    expect(toIsoLocalDateTime('', '')).toBe('T')
  })
})

describe('apptInitials', () => {
  it('toma la inicial de las dos primeras palabras, en mayúscula', () => {
    expect(apptInitials('María Pérez')).toBe('MP')
    expect(apptInitials('ana ruiz gómez')).toBe('AR')
  })

  it('tolera espacios de sobra y nombres de una sola palabra', () => {
    expect(apptInitials('   ana    ruiz  ')).toBe('AR')
    expect(apptInitials('Ana')).toBe('A')
  })

  it('devuelve vacío para un nombre vacío', () => {
    expect(apptInitials('   ')).toBe('')
  })
})

describe('apptVetHue', () => {
  it('es determinista por empleado y cae siempre en [0, 360)', () => {
    expect(apptVetHue(1)).toBe(57)
    expect(apptVetHue(1)).toBe(apptVetHue(1))
    expect(apptVetHue(0)).toBe(0)
    for (const id of [1, 7, 42, 999, 123456]) {
      const hue = apptVetHue(id)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })

  it('normaliza el negativo (el doble módulo no es decorativo)', () => {
    expect(apptVetHue(-1)).toBe(303)
  })
})

describe('apptTypeTokens', () => {
  it('resuelve el tipo de cita a los tokens de color de la historia clínica', () => {
    expect(apptTypeTokens('CONSULTATION')).toBe(TYPE_COLORS.amatista)
    expect(apptTypeTokens('SURGERY')).toBe(TYPE_COLORS.red)
    expect(apptTypeTokens('OTHER')).toBe(TYPE_COLORS.gray)
  })
})

describe('máquina de estados', () => {
  it('los tres estados terminales no admiten transición', () => {
    for (const status of ['COMPLETED', 'NO_SHOW', 'CANCELLED'] as AppointmentStatus[]) {
      expect(APPT_TERMINAL.has(status)).toBe(true)
      expect(APPT_TRANSITIONS[status]).toEqual([])
    }
  })

  it('ningún estado activo es terminal', () => {
    for (const status of [
      'REQUESTED',
      'CONFIRMED',
      'ARRIVED',
      'IN_PROGRESS',
    ] as AppointmentStatus[]) {
      expect(APPT_TERMINAL.has(status)).toBe(false)
      expect(APPT_TRANSITIONS[status].length).toBeGreaterThan(0)
    }
  })
})

// ── Aritmética de intervalos ─────────────────────────────────────────
describe('apptStartMinutes', () => {
  it('convierte el LocalDateTime en minutos absolutos comparables', () => {
    const nueve = exigir(
      apptStartMinutes('2026-08-17T09:00:00'),
      "apptStartMinutes('2026-08-17T09:00:00')",
    )
    expect(
      exigir(apptStartMinutes('2026-08-17T09:30:00'), "apptStartMinutes('2026-08-17T09:30:00')") -
        nueve,
    ).toBe(30)
    expect(
      exigir(apptStartMinutes('2026-08-18T09:00:00'), "apptStartMinutes('2026-08-18T09:00:00')") -
        nueve,
    ).toBe(24 * 60)
  })

  it('cruza el borde de mes y el de año sin aritmética de calendario', () => {
    expect(
      exigir(apptStartMinutes('2027-01-01T00:00:00'), "apptStartMinutes('2027-01-01T00:00:00')") -
        exigir(apptStartMinutes('2026-12-31T23:30:00'), "apptStartMinutes('2026-12-31T23:30:00')"),
    ).toBe(30)
  })

  it('descarta los segundos: el minuto es la unidad de la agenda', () => {
    expect(apptStartMinutes('2026-08-17T09:00:59')).toBe(apptStartMinutes('2026-08-17T09:00:00'))
  })

  it('tolera el ISO sin segundos y devuelve null para lo que no lo es', () => {
    expect(apptStartMinutes('2026-08-17T09:00')).toBe(apptStartMinutes('2026-08-17T09:00:00'))
    for (const malo of [null, undefined, '', 'T', '2026-08-17', 'mañana']) {
      expect(apptStartMinutes(malo)).toBeNull()
    }
  })
})

describe('apptDuration', () => {
  it('prefiere la duración de la cita sobre la de la empresa', () => {
    expect(apptDuration(45, 20)).toBe(45)
  })

  it('sin duración propia hereda la de la empresa, y sin ella el respaldo de 30', () => {
    expect(apptDuration(null, 20)).toBe(20)
    expect(apptDuration(undefined, 20)).toBe(20)
    expect(apptDuration(null)).toBe(DEFAULT_APPOINTMENT_DURATION_MINUTES)
    expect(DEFAULT_APPOINTMENT_DURATION_MINUTES).toBe(30)
  })

  it('un valor no positivo se trata como ausente, igual que hace el backend al parsear el ajuste', () => {
    expect(apptDuration(0, 20)).toBe(20)
    expect(apptDuration(-15, 20)).toBe(20)
    expect(apptDuration(null, 0)).toBe(DEFAULT_APPOINTMENT_DURATION_MINUTES)
  })
})

describe('apptEndTime / apptTimeRange', () => {
  it('suman la duración efectiva al inicio', () => {
    expect(apptEndTime('2026-08-17T09:00:00', 45)).toBe('09:45')
    expect(apptEndTime('2026-08-17T09:00:00', null)).toBe('09:30')
    expect(apptEndTime('2026-08-17T09:00:00', null, 20)).toBe('09:20')
    expect(apptTimeRange('2026-08-17T09:00:00', 45)).toBe('09:00–09:45')
  })

  it('cruzar la medianoche imprime la hora del día siguiente, no "24:30"', () => {
    expect(apptEndTime('2026-08-17T23:45:00', 60)).toBe('00:45')
  })

  it('sin inicio no hay rango', () => {
    expect(apptEndTime('', 30)).toBe('')
    expect(apptTimeRange(null, 30)).toBe('')
  })
})

// ── El corazón de BE-17 ──────────────────────────────────────────────
describe('apptClashes (intervalos semiabiertos)', () => {
  it('detecta la cita del mismo vet a la misma hora exacta', () => {
    const list = [makeAppt({ id: 10, startAt: '2026-08-17T09:00:00' })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00')).map((a) => a.id)).toEqual([10])
  })

  it('compara al minuto: los segundos se ignoran', () => {
    const list = [makeAppt({ id: 10, startAt: '2026-08-17T09:00:59' })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'))).toHaveLength(1)
  })

  it('tolera que el candidato venga sin segundos', () => {
    const list = [makeAppt({ id: 10, startAt: '2026-08-17T09:00:00' })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00'))).toHaveLength(1)
  })

  it('un minuto de diferencia SÍ es choque: los intervalos se cruzan', () => {
    // Invertido en BE-17. Antes se comparaba el minuto exacto de inicio, así que
    // 09:00 y 09:01 pasaban por huecos distintos aunque duraran media hora cada uno.
    const list = [makeAppt({ id: 10, startAt: '2026-08-17T09:01:00' })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00')).map((a) => a.id)).toEqual([10])
  })

  it('una cita que empieza 30 min después choca si la duración del candidato la alcanza', () => {
    // Invertido en BE-17: con 45 min, 09:00–09:45 pisa el arranque de 09:30.
    const list = [makeAppt({ id: 10, startAt: '2026-08-17T09:30:00' })]
    expect(
      apptClashes(list, candidateAt('2026-08-17T09:00:00', { durationMinutes: 45 })).map(
        (a) => a.id,
      ),
    ).toEqual([10])
  })

  it('una cita que empieza 30 min ANTES choca si SU duración alcanza al candidato', () => {
    // Simétrico del anterior: 08:30–09:15 pisa el arranque de las 09:00.
    const list = [makeAppt({ id: 10, startAt: '2026-08-17T08:30:00', durationMinutes: 45 })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00')).map((a) => a.id)).toEqual([10])
  })

  it('el borde no cuenta: 09:00–09:30 y 09:30–10:00 son consecutivas, no un choque', () => {
    // La mitad que hace útil la función. Si el intervalo se cerrara por la derecha,
    // cada cita pegada a la anterior daría un conflicto falso y el aviso sería ruido.
    const despues = [makeAppt({ id: 10, startAt: '2026-08-17T09:30:00' })]
    expect(apptClashes(despues, candidateAt('2026-08-17T09:00:00'))).toEqual([])

    const antes = [makeAppt({ id: 11, startAt: '2026-08-17T08:30:00' })]
    expect(apptClashes(antes, candidateAt('2026-08-17T09:00:00'))).toEqual([])
  })

  it('un minuto antes del borde sí choca, uno después no: la frontera está donde debe', () => {
    const justoDentro = [makeAppt({ id: 10, startAt: '2026-08-17T09:29:00' })]
    expect(apptClashes(justoDentro, candidateAt('2026-08-17T09:00:00'))).toHaveLength(1)

    const justoFuera = [makeAppt({ id: 11, startAt: '2026-08-17T09:31:00' })]
    expect(apptClashes(justoFuera, candidateAt('2026-08-17T09:00:00'))).toEqual([])
  })

  it('una cita contiene a otra: la corta dentro de la larga choca en los dos sentidos', () => {
    const larga = [makeAppt({ id: 10, startAt: '2026-08-17T09:00:00', durationMinutes: 120 })]
    expect(
      apptClashes(larga, candidateAt('2026-08-17T10:00:00', { durationMinutes: 15 })),
    ).toHaveLength(1)

    const corta = [makeAppt({ id: 11, startAt: '2026-08-17T10:00:00', durationMinutes: 15 })]
    expect(
      apptClashes(corta, candidateAt('2026-08-17T09:00:00', { durationMinutes: 120 })),
    ).toHaveLength(1)
  })

  it('la cita sin duración usa el default de la empresa, no el respaldo de 30', () => {
    // Con huecos de 15 min configurados por la empresa, 09:00 y 09:20 no se tocan…
    const list = [makeAppt({ id: 10, startAt: '2026-08-17T09:20:00' })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'), 15)).toEqual([])
    // …y con los 30 del respaldo, sí.
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'))).toHaveLength(1)
  })

  it('el default de la empresa se aplica a las dos partes, no solo al candidato', () => {
    // 08:15 + 60 = 09:15, que pisa las 09:00 aunque ninguna declare duración.
    const list = [makeAppt({ id: 10, startAt: '2026-08-17T08:15:00' })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'), 60)).toHaveLength(1)
  })

  it('un solape que cruza la medianoche cuenta igual', () => {
    const list = [makeAppt({ id: 10, startAt: '2026-08-18T00:15:00' })]
    expect(
      apptClashes(list, candidateAt('2026-08-17T23:45:00', { durationMinutes: 60 })),
    ).toHaveLength(1)
  })

  it('un startAt ilegible no choca con nada, ni como candidato ni en la lista', () => {
    const list = [makeAppt({ id: 10, startAt: 'T' })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'))).toEqual([])
    expect(apptClashes([makeAppt({ id: 11 })], candidateAt('T'))).toEqual([])
  })

  it('misma hora en otro día no es choque', () => {
    const list = [makeAppt({ id: 10, startAt: '2026-08-18T09:00:00' })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'))).toEqual([])
  })

  it('otro veterinario a la misma hora no es choque', () => {
    const list = [makeAppt({ id: 10, employee: { id: 2, name: 'Luis Mora' } })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'))).toEqual([])
  })

  it('la propia cita nunca choca consigo misma al editar', () => {
    const list = [makeAppt({ id: 10 })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00', { id: 10 }))).toEqual([])
  })

  it('al crear (sin id) no se excluye ninguna cita de la lista', () => {
    const list = [makeAppt({ id: 10 })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'))).toHaveLength(1)
  })

  it('las citas eliminadas (enabled=false) no cuentan', () => {
    const list = [makeAppt({ id: 10, enabled: false })]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'))).toEqual([])
  })

  it('las citas en estado terminal no cuentan', () => {
    const list = (['COMPLETED', 'NO_SHOW', 'CANCELLED'] as AppointmentStatus[]).map((status, i) =>
      makeAppt({ id: 100 + i, status }),
    )
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00'))).toEqual([])
  })

  it('un candidato en estado terminal cortocircuita y no busca nada', () => {
    const list = [makeAppt({ id: 10 })]
    for (const status of ['COMPLETED', 'NO_SHOW', 'CANCELLED'] as AppointmentStatus[]) {
      expect(apptClashes(list, candidateAt('2026-08-17T09:00:00', { status }))).toEqual([])
    }
  })

  it('devuelve TODAS las citas en choque, en el orden de la lista', () => {
    const list = [
      makeAppt({ id: 10 }),
      makeAppt({ id: 11, employee: { id: 2, name: 'Luis Mora' } }),
      makeAppt({ id: 12 }),
      makeAppt({ id: 13, startAt: '2026-08-17T10:00:00' }),
    ]
    expect(apptClashes(list, candidateAt('2026-08-17T09:00:00')).map((a) => a.id)).toEqual([10, 12])
  })

  it('lista vacía → sin choques', () => {
    expect(apptClashes([], candidateAt('2026-08-17T09:00:00'))).toEqual([])
  })
})

// ── Modelo unificado de la agenda ────────────────────────────────────
describe('itemsOnDay', () => {
  const apptItem = (id: string, date: string, time: string): AgendaItem => ({
    kind: 'appointment',
    id,
    date,
    endDate: null,
    time,
    appt: makeAppt({ id: Number(id.replace(/\D/g, '')), startAt: `${date}T${time}:00` }),
  })

  const clinicalItem = (id: string, date: string, endDate: string | null): AgendaItem => ({
    kind: 'clinical',
    id,
    date,
    endDate,
    time: null,
    event: {
      id,
      type: 'HOSPITALIZATION',
      date,
      endDate,
      title: 'Hospitalización',
      subtitle: 'Observación',
      animalId: 1,
      consultationId: null,
    },
  })

  it('filtra por día exacto las citas', () => {
    const items = [
      apptItem('appt-1', '2026-08-17', '09:00'),
      apptItem('appt-2', '2026-08-18', '09:00'),
    ]
    expect(itemsOnDay(items, '2026-08-17').map((i) => i.id)).toEqual(['appt-1'])
  })

  it('un evento clínico multi-día aparece en el día de inicio, en los intermedios y en el de fin', () => {
    const items = [clinicalItem('HOSPITALIZATION-1', '2026-08-15', '2026-08-18')]
    for (const iso of ['2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18']) {
      expect(itemsOnDay(items, iso)).toHaveLength(1)
    }
    expect(itemsOnDay(items, '2026-08-14')).toEqual([])
    expect(itemsOnDay(items, '2026-08-19')).toEqual([])
  })

  it('la expansión de rango compara cadenas ISO, así que cruza meses y años sin aritmética de fechas', () => {
    const items = [clinicalItem('HOSPITALIZATION-2', '2026-12-30', '2027-01-02')]
    expect(itemsOnDay(items, '2026-12-31')).toHaveLength(1)
    expect(itemsOnDay(items, '2027-01-01')).toHaveLength(1)
    expect(itemsOnDay(items, '2027-01-03')).toEqual([])
  })

  it('un evento clínico sin endDate, o con endDate igual al inicio, es de un solo día', () => {
    const sinFin = [clinicalItem('HOSPITALIZATION-3', '2026-08-17', null)]
    const mismoDia = [clinicalItem('HOSPITALIZATION-4', '2026-08-17', '2026-08-17')]
    expect(itemsOnDay(sinFin, '2026-08-17')).toHaveLength(1)
    expect(itemsOnDay(sinFin, '2026-08-18')).toEqual([])
    expect(itemsOnDay(mismoDia, '2026-08-17')).toHaveLength(1)
    expect(itemsOnDay(mismoDia, '2026-08-18')).toEqual([])
  })

  it('HOY: la expansión de rango es exclusiva de `kind === "clinical"`', () => {
    // El tipo `AgendaAppointmentItem` fuerza `endDate: null`, pero el guard de
    // `itemsOnDay` mira el `kind` antes que el `endDate`: si una cita llegara
    // con rango (una cita con duración que cruza medianoche, p. ej.), sólo se
    // vería en su día de inicio. Se fija por escrito para que BE-17 decida.
    const conRango = {
      kind: 'appointment',
      id: 'appt-9',
      date: '2026-08-17',
      endDate: '2026-08-19',
      time: '23:30',
      appt: makeAppt({ id: 9, startAt: '2026-08-17T23:30:00' }),
    } as unknown as AgendaItem
    expect(itemsOnDay([conRango], '2026-08-17')).toHaveLength(1)
    expect(itemsOnDay([conRango], '2026-08-18')).toEqual([])
  })

  it('ordena las citas por hora y manda los eventos clínicos al final', () => {
    const items = [
      clinicalItem('HOSPITALIZATION-5', '2026-08-17', null),
      apptItem('appt-2', '2026-08-17', '14:00'),
      apptItem('appt-1', '2026-08-17', '08:15'),
    ]
    expect(itemsOnDay(items, '2026-08-17').map((i) => i.id)).toEqual([
      'appt-1',
      'appt-2',
      'HOSPITALIZATION-5',
    ])
  })

  it('ordena por texto HH:mm, así que "09:00" va antes que "10:00" sin convertir a número', () => {
    const items = [
      apptItem('appt-10', '2026-08-17', '10:00'),
      apptItem('appt-9', '2026-08-17', '09:00'),
    ]
    expect(itemsOnDay(items, '2026-08-17').map((i) => i.id)).toEqual(['appt-9', 'appt-10'])
  })

  it('entre dos eventos clínicos conserva el orden de entrada (empate a "99:99")', () => {
    const items = [
      clinicalItem('HOSPITALIZATION-7', '2026-08-17', null),
      clinicalItem('HOSPITALIZATION-6', '2026-08-17', null),
    ]
    expect(itemsOnDay(items, '2026-08-17').map((i) => i.id)).toEqual([
      'HOSPITALIZATION-7',
      'HOSPITALIZATION-6',
    ])
  })

  it('no muta el arreglo recibido', () => {
    const items = [
      apptItem('appt-2', '2026-08-17', '14:00'),
      apptItem('appt-1', '2026-08-17', '08:15'),
    ]
    itemsOnDay(items, '2026-08-17')
    expect(items.map((i) => i.id)).toEqual(['appt-2', 'appt-1'])
  })
})
