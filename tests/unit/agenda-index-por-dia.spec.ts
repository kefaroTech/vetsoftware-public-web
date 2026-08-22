import { describe, it, expect } from 'vitest'
import {
  indexItemsByDay,
  itemsOnDay,
  type AgendaAppointmentItem,
  type AgendaClinicalItem,
  type AgendaEvent,
  type AgendaItem,
} from '@/features/agenda/types/agenda'
import type { AppointmentResponse } from '@/features/agenda/types/appointment'

/**
 * GUARDA DE LA EXPANSIÓN DE RANGOS (issue #169).
 *
 * `indexItemsByDay` sustituyó al barrido lineal por celda de las vistas mes y
 * semana. La ganancia es real (168 `filter` + 168 `sort` por render), pero la
 * optimización obvia —un `Map` indexado por `it.date`— es INCORRECTA y su fallo
 * es SILENCIOSO: una hospitalización de cinco días seguiría apareciendo el día
 * del ingreso y desaparecería de los otros cuatro. Ni excepción, ni celda en
 * rojo, ni traza: el calendario simplemente dejaría de decir que el paciente
 * está ingresado, que es justo el dato por el que se mira el calendario.
 *
 * Por eso la prueba no comprueba el rendimiento ni la forma del `Map`, sino la
 * ÚNICA propiedad que el atajo rompe: un item con `endDate` cae en todos los
 * días que cubre. El último caso cierra la puerta del todo comparando, celda a
 * celda, contra `itemsOnDay`, que es la función de referencia que este índice
 * dice sustituir.
 *
 * TypeScript puro: sin montar componente, sin jsdom y sin store.
 */

/** Ventana de `n` días consecutivos desde `desde` (ISO), como la que pinta la rejilla. */
function ventana(desde: string, n: number): string[] {
  const base = new Date(`${desde}T00:00:00Z`)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

/**
 * Un ingreso hospitalario: el único item de la agenda que abarca un RANGO.
 * `endDate !== date` es exactamente la condición que dispara la expansión.
 */
function ingreso(id: string, date: string, endDate: string): AgendaClinicalItem {
  const event: AgendaEvent = {
    id: `HOSPITALIZATION-${id}`,
    type: 'HOSPITALIZATION',
    date,
    endDate,
    title: 'Hospitalización',
    subtitle: 'Kira · Beagle',
    animalId: 7,
    consultationId: null,
  }
  return { kind: 'clinical', id: event.id, date, endDate, time: null, event }
}

/** Un evento clínico de un solo día (consulta, vacunación…): sin `endDate`. */
function evento(id: string, date: string): AgendaClinicalItem {
  const event: AgendaEvent = {
    id: `CONSULTATION-${id}`,
    type: 'CONSULTATION',
    date,
    endDate: null,
    title: 'Consulta',
    subtitle: 'Kira · Beagle',
    animalId: 7,
    consultationId: Number(id),
  }
  return { kind: 'clinical', id: event.id, date, endDate: null, time: null, event }
}

/** Una cita. Solo se leen `date` y `time`; el resto del DTO es relleno del tipo. */
function cita(id: string, date: string, time: string): AgendaAppointmentItem {
  return {
    kind: 'appointment',
    id: `APPOINTMENT-${id}`,
    date,
    endDate: null,
    time,
    appt: { id: Number(id) } as unknown as AppointmentResponse,
  }
}

/** Los ids que el índice dejó en un día, en orden. `[]` si el día no tiene bucket. */
function idsEn(mapa: Map<string, AgendaItem[]>, iso: string): string[] {
  return (mapa.get(iso) ?? []).map((it) => it.id)
}

describe('indexItemsByDay — el índice del calendario expande los rangos', () => {
  it('un ingreso de cinco días aparece en LOS CINCO días, no solo en el de ingreso', () => {
    // El caso literal del defecto: si alguien indexa por `it.date`, este ingreso
    // sale el 10 y desaparece del 11, 12, 13 y 14 sin que nada falle.
    const hospi = ingreso('401', '2026-03-10', '2026-03-14')
    const isos = ventana('2026-03-08', 9) // 08 … 16

    const mapa = indexItemsByDay([hospi], isos)

    for (const dia of ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14']) {
      expect(
        idsEn(mapa, dia),
        `el ingreso debe estar en ${dia}: es uno de los días que cubre`,
      ).toEqual([hospi.id])
    }
  })

  it('no se desborda: ni la víspera del ingreso ni el día siguiente al alta lo llevan', () => {
    const hospi = ingreso('401', '2026-03-10', '2026-03-14')

    const mapa = indexItemsByDay([hospi], ventana('2026-03-08', 9))

    expect(idsEn(mapa, '2026-03-09'), 'la víspera del ingreso').toEqual([])
    expect(idsEn(mapa, '2026-03-15'), 'el día siguiente al alta').toEqual([])
  })

  it('un evento de un solo día sigue cayendo solo en su día', () => {
    // La expansión no puede degenerar en «todo se copia a todas partes»: la rama
    // sin `endDate` es la de la inmensa mayoría de los items.
    const consulta = evento('9001', '2026-03-11')

    const mapa = indexItemsByDay([consulta], ventana('2026-03-08', 9))

    expect(idsEn(mapa, '2026-03-11')).toEqual([consulta.id])
    expect(idsEn(mapa, '2026-03-10')).toEqual([])
    expect(idsEn(mapa, '2026-03-12')).toEqual([])
  })

  it('un ingreso que entra y sale el mismo día no se expande', () => {
    // `endDate === date` es el caso frontera de la condición: tiene que caer en
    // la rama simple, no en el bucle.
    const mismoDia = ingreso('402', '2026-03-12', '2026-03-12')

    const mapa = indexItemsByDay([mismoDia], ventana('2026-03-08', 9))

    expect(idsEn(mapa, '2026-03-12')).toEqual([mismoDia.id])
    expect(idsEn(mapa, '2026-03-11')).toEqual([])
    expect(idsEn(mapa, '2026-03-13')).toEqual([])
  })

  it('solo materializa los días de la VENTANA, no los del rango entero', () => {
    // Una hospitalización de 40 días no puede crear 40 entradas cuando la
    // rejilla solo pinta unas pocas celdas: es la razón de que la función reciba
    // `isos` en vez de deducir los días del propio item.
    const larga = ingreso('403', '2026-01-01', '2026-02-09') // 40 días
    const isos = ventana('2026-01-20', 3) // 20, 21, 22

    const mapa = indexItemsByDay([larga], isos)

    expect([...mapa.keys()].sort()).toEqual(isos)
    for (const dia of isos) expect(idsEn(mapa, dia)).toEqual([larga.id])
  })

  it('ordena cada día por hora y deja los eventos clínicos al final', () => {
    // El índice promete el MISMO orden que daba `itemsOnDay`: citas por hora,
    // eventos sin hora detrás. Si se pierde, la celda del calendario cambia de
    // orden sin que nadie lo haya pedido.
    const tarde = cita('1', '2026-03-11', '16:30')
    const manana = cita('2', '2026-03-11', '08:15')
    const hospi = ingreso('401', '2026-03-10', '2026-03-12')

    const mapa = indexItemsByDay([hospi, tarde, manana], ventana('2026-03-08', 9))

    expect(idsEn(mapa, '2026-03-11')).toEqual([manana.id, tarde.id, hospi.id])
  })

  it('es equivalente, celda a celda, a llamar itemsOnDay en cada día', () => {
    // La guarda de fondo: cualquier «optimización» que cambie el resultado —no
    // solo la del Map por fecha de inicio— rompe aquí, sin tener que enumerar
    // por adelantado cada forma de equivocarse.
    const items: AgendaItem[] = [
      ingreso('401', '2026-03-10', '2026-03-14'),
      ingreso('402', '2026-03-12', '2026-03-12'),
      ingreso('403', '2026-03-01', '2026-03-31'),
      evento('9001', '2026-03-11'),
      evento('9002', '2026-03-14'),
      cita('1', '2026-03-11', '16:30'),
      cita('2', '2026-03-11', '08:15'),
      cita('3', '2026-03-14', '09:00'),
    ]
    const isos = ventana('2026-03-08', 12)

    const mapa = indexItemsByDay(items, isos)

    for (const iso of isos) {
      expect(
        idsEn(mapa, iso),
        `el índice y itemsOnDay discrepan en ${iso}: el índice dejó de ser equivalente al barrido que sustituye`,
      ).toEqual(itemsOnDay(items, iso).map((it) => it.id))
    }
  })
})
