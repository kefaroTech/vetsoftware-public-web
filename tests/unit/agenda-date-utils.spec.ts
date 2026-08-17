import { describe, expect, it } from 'vitest'
import {
  MONTHS_LONG,
  WEEKDAYS_FULL,
  WEEKDAYS_SHORT,
  addDays,
  formatDayLong,
  formatMonthLong,
  formatWeekRange,
  isoFromDate,
  monthName,
  parseISO,
  sameDay,
  startOfMonth,
  startOfWeek,
  weekdayName,
} from '@/features/agenda/composables/dateUtils'

/**
 * Aritmética de calendario de la agenda. Sin date-fns ni dayjs: todo se
 * construye con `new Date(y, m, d)`, que fija la MEDIANOCHE LOCAL, y por eso
 * ninguna de estas funciones sufre corrimiento de zona horaria.
 *
 * Las aristas que se fijan aquí son las que rompen las vistas mes/semana: el
 * lunes como primer día, los bordes de mes y de año, y el rango de semana que
 * imprime un único año (el del domingo final).
 *
 * BE-17 ya movió el render del día al rango horario (`09:00–09:45`); esta red
 * cubre el armazón de fechas sobre el que se apoya. La aritmética del rango en
 * sí —minutos absolutos, duración efectiva, bordes— vive en
 * `agenda-appointment.spec.ts`, junto a la función que la implementa.
 */

// 2026-08-17 es LUNES; 2026-08-16, domingo. Todos los casos se anclan ahí.
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

describe('isoFromDate', () => {
  it('formatea yyyy-MM-dd con relleno de ceros', () => {
    expect(isoFromDate(d(2026, 8, 17))).toBe('2026-08-17')
    expect(isoFromDate(d(2026, 1, 5))).toBe('2026-01-05')
    expect(isoFromDate(d(2026, 12, 31))).toBe('2026-12-31')
  })

  it('usa componentes locales, no UTC (nada de toISOString)', () => {
    // Con `toISOString` en Bogotá (UTC-5) la medianoche del 17 saldría como el 16.
    const midnight = new Date(2026, 7, 17, 0, 0, 0)
    expect(isoFromDate(midnight)).toBe('2026-08-17')
    const almostMidnight = new Date(2026, 7, 17, 23, 59, 59)
    expect(isoFromDate(almostMidnight)).toBe('2026-08-17')
  })
})

describe('parseISO', () => {
  it('devuelve la medianoche local del día indicado', () => {
    const parsed = parseISO('2026-08-17')
    expect(parsed).not.toBeNull()
    expect(isoFromDate(parsed as Date)).toBe('2026-08-17')
    expect((parsed as Date).getHours()).toBe(0)
  })

  it('ignora la parte de hora: sólo mira el prefijo yyyy-MM-dd', () => {
    expect(isoFromDate(parseISO('2026-08-17T23:45:00') as Date)).toBe('2026-08-17')
  })

  it('devuelve null si no hay prefijo de fecha', () => {
    expect(parseISO('')).toBeNull()
    expect(parseISO('17/08/2026')).toBeNull()
    expect(parseISO('2026-8-17')).toBeNull() // exige dos dígitos
  })

  it('HOY: no valida el calendario, sólo el formato — un 31 de febrero desborda al mes siguiente', () => {
    expect(isoFromDate(parseISO('2026-02-31') as Date)).toBe('2026-03-03')
  })

  it('cierra el viaje de ida y vuelta con isoFromDate', () => {
    for (const iso of ['2026-01-01', '2026-02-28', '2026-12-31']) {
      expect(isoFromDate(parseISO(iso) as Date)).toBe(iso)
    }
  })
})

describe('startOfMonth', () => {
  it('cae en el día 1 conservando mes y año', () => {
    expect(isoFromDate(startOfMonth(d(2026, 8, 17)))).toBe('2026-08-01')
    expect(isoFromDate(startOfMonth(d(2026, 1, 31)))).toBe('2026-01-01')
    expect(isoFromDate(startOfMonth(d(2026, 12, 31)))).toBe('2026-12-01')
  })
})

describe('startOfWeek (semana ISO, lunes primero)', () => {
  it('un lunes es su propio inicio de semana', () => {
    expect(isoFromDate(startOfWeek(d(2026, 8, 17)))).toBe('2026-08-17')
  })

  it('el domingo pertenece a la semana que arrancó el lunes anterior', () => {
    // La trampa clásica: con `getDay()` crudo (domingo = 0) este caso saltaría
    // al lunes SIGUIENTE. El `(getDay() + 6) % 7` es lo que lo evita.
    expect(isoFromDate(startOfWeek(d(2026, 8, 16)))).toBe('2026-08-10')
  })

  it('retrocede al mes anterior cuando la semana lo cruza', () => {
    // 2026-09-01 es martes: su semana empezó el lunes 31 de agosto.
    expect(isoFromDate(startOfWeek(d(2026, 9, 1)))).toBe('2026-08-31')
  })

  it('retrocede al año anterior cuando la semana lo cruza', () => {
    // 2027-01-01 es viernes: su semana empezó el lunes 28 de diciembre de 2026.
    expect(isoFromDate(startOfWeek(d(2027, 1, 1)))).toBe('2026-12-28')
  })

  it('es idempotente', () => {
    const once = startOfWeek(d(2026, 8, 16))
    expect(isoFromDate(startOfWeek(once))).toBe(isoFromDate(once))
  })

  it('el grid mensual de 6 semanas (start + 41 días) cubre el mes entero', () => {
    // Es el rango que AgendaView pide al backend: startOfWeek(startOfMonth(d)) + 41.
    const gridStart = startOfWeek(startOfMonth(d(2026, 8, 17)))
    const gridEnd = addDays(gridStart, 41)
    expect(isoFromDate(gridStart)).toBe('2026-07-27')
    expect(isoFromDate(gridEnd)).toBe('2026-09-06')
  })
})

describe('addDays', () => {
  it('suma y resta días', () => {
    expect(isoFromDate(addDays(d(2026, 8, 17), 1))).toBe('2026-08-18')
    expect(isoFromDate(addDays(d(2026, 8, 17), -1))).toBe('2026-08-16')
    expect(isoFromDate(addDays(d(2026, 8, 17), 0))).toBe('2026-08-17')
  })

  it('desborda el mes y el año por normalización de Date', () => {
    expect(isoFromDate(addDays(d(2026, 8, 31), 1))).toBe('2026-09-01')
    expect(isoFromDate(addDays(d(2026, 12, 31), 1))).toBe('2027-01-01')
    expect(isoFromDate(addDays(d(2026, 1, 1), -1))).toBe('2025-12-31')
  })

  it('respeta el año bisiesto', () => {
    expect(isoFromDate(addDays(d(2028, 2, 28), 1))).toBe('2028-02-29')
    expect(isoFromDate(addDays(d(2026, 2, 28), 1))).toBe('2026-03-01')
  })

  it('no muta la fecha de entrada', () => {
    const origin = d(2026, 8, 17)
    addDays(origin, 30)
    expect(isoFromDate(origin)).toBe('2026-08-17')
  })
})

describe('sameDay', () => {
  it('compara sólo año, mes y día — la hora no cuenta', () => {
    expect(sameDay(new Date(2026, 7, 17, 0, 0), new Date(2026, 7, 17, 23, 59))).toBe(true)
  })

  it('distingue el mismo número de día en otro mes u otro año', () => {
    expect(sameDay(d(2026, 8, 17), d(2026, 9, 17))).toBe(false)
    expect(sameDay(d(2026, 8, 17), d(2027, 8, 17))).toBe(false)
    expect(sameDay(d(2026, 8, 17), d(2026, 8, 18))).toBe(false)
  })
})

describe('nombres de mes y de día', () => {
  it('las tres tablas tienen el tamaño que espera el índice', () => {
    expect(MONTHS_LONG).toHaveLength(12)
    expect(WEEKDAYS_FULL).toHaveLength(7)
    expect(WEEKDAYS_SHORT).toHaveLength(7)
    expect(WEEKDAYS_SHORT[0]).toBe('Lun')
    expect(WEEKDAYS_FULL[0]).toBe('Lunes')
  })

  it('monthName indexa 0-11', () => {
    expect(monthName(d(2026, 1, 1))).toBe('Enero')
    expect(monthName(d(2026, 8, 17))).toBe('Agosto')
    expect(monthName(d(2026, 12, 31))).toBe('Diciembre')
  })

  it('weekdayName reindexa a lunes = 0', () => {
    expect(weekdayName(d(2026, 8, 17))).toBe('Lunes')
    expect(weekdayName(d(2026, 8, 16))).toBe('Domingo')
    expect(weekdayName(d(2026, 8, 22))).toBe('Sábado')
  })

  it('formatMonthLong y formatDayLong componen las etiquetas de la barra', () => {
    expect(formatMonthLong(d(2026, 8, 17))).toBe('Agosto 2026')
    expect(formatDayLong(d(2026, 8, 17))).toBe('Lunes, 17 agosto 2026')
    expect(formatDayLong(d(2026, 8, 16))).toBe('Domingo, 16 agosto 2026')
  })
})

describe('formatWeekRange', () => {
  it('con la semana dentro de un mes imprime el mes una sola vez', () => {
    expect(formatWeekRange(d(2026, 8, 10))).toBe('10 – 16 ago 2026')
  })

  it('con la semana a caballo entre dos meses imprime los dos', () => {
    // Lunes 31 de agosto → domingo 6 de septiembre.
    expect(formatWeekRange(d(2026, 8, 31))).toBe('31 ago – 6 sep 2026')
  })

  it('HOY: en la semana que cruza el año sólo se imprime el año FINAL', () => {
    // Lunes 28 dic 2026 → domingo 3 ene 2027. El usuario lee "28 dic" sin año:
    // el `end.getFullYear()` se aplica a los dos extremos.
    expect(formatWeekRange(d(2026, 12, 28))).toBe('28 dic – 3 ene 2027')
  })

  it('abrevia el mes a tres letras en minúscula', () => {
    expect(formatWeekRange(d(2026, 9, 7))).toBe('7 – 13 sep 2026')
    expect(formatWeekRange(d(2026, 3, 2))).toBe('2 – 8 mar 2026')
  })

  it('no exige que el argumento sea lunes: suma 6 días a lo que reciba', () => {
    expect(formatWeekRange(d(2026, 8, 12))).toBe('12 – 18 ago 2026')
  })
})
