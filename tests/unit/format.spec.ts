import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  calcAge,
  formatDateLong,
  formatDateNumeric,
  formatDateShort,
  formatMonthLabel,
  initials,
  parseISODate,
  todayISO,
} from '@/composables/format'

/**
 * Red de seguridad del módulo de formato transversal.
 *
 * Estas pruebas existen porque `src/composables/format.ts` fusionó tres
 * implementaciones que vivían en tres features distintas:
 *
 * - `formatDateShort` (asistente de consulta) y `formatEventDate` (historia
 *   clínica) imprimían lo mismo (`13 ago 2026`) pero divergían en el parseo y
 *   en el marcador de "sin dato". Quedó una sola: el parseo tolerante del de
 *   historia clínica, el nombre del de consulta.
 * - `formatDate` (compras) NO era la misma función: `es-CO` con `dateStyle:
 *   'medium'` produce `13/08/2026`, no `13 ago 2026`. Sobrevive con nombre
 *   propio, `formatDateNumeric`, para que nadie las vuelva a confundir.
 * - `initials` (consulta) e `initialsFromName` (historia clínica) eran la
 *   misma función escrita dos veces. Quedó `initials`.
 *
 * Los casos de zona horaria son el motivo real de que el parseo se unificara:
 * `new Date('2026-08-13')` es medianoche UTC y en Bogotá (UTC-5) cae el día 12.
 */
describe('parseISODate', () => {
  it('fija la medianoche local, no la UTC', () => {
    const d = parseISODate('2026-08-13')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(13)
    expect(d.getHours()).toBe(0)
  })

  it('acepta un instante completo y se queda con la parte de fecha', () => {
    const d = parseISODate('2026-08-13T22:45:10.123Z')!
    expect(d.getDate()).toBe(13)
    expect(d.getHours()).toBe(0)
  })

  it('devuelve null para vacío, null y undefined', () => {
    expect(parseISODate('')).toBeNull()
    expect(parseISODate(null)).toBeNull()
    expect(parseISODate(undefined)).toBeNull()
  })

  it('devuelve null si la cadena no empieza por una fecha ISO', () => {
    expect(parseISODate('13/08/2026')).toBeNull()
    expect(parseISODate('ayer')).toBeNull()
    expect(parseISODate('2026-8-1')).toBeNull()
  })

  it('devuelve null para una fecha que no existe en el calendario', () => {
    expect(parseISODate('2026-02-31')).toBeNull()
    expect(parseISODate('2026-13-01')).toBeNull()
  })

  it('acepta el 29 de febrero de un bisiesto y lo rechaza en uno normal', () => {
    expect(parseISODate('2024-02-29')).not.toBeNull()
    expect(parseISODate('2026-02-29')).toBeNull()
  })
})

describe('formatDateShort', () => {
  it('imprime dia mes-abreviado anio', () => {
    expect(formatDateShort('2026-08-13')).toBe('13 ago 2026')
  })

  it('no rellena el dia con cero', () => {
    expect(formatDateShort('2026-01-05')).toBe('5 ene 2026')
  })

  it('cubre el primer y el ultimo mes del anio', () => {
    expect(formatDateShort('2026-01-01')).toBe('1 ene 2026')
    expect(formatDateShort('2026-12-31')).toBe('31 dic 2026')
  })

  it('no se corre de dia al cambiar de mes por zona horaria', () => {
    // El caso que rompía: `new Date('2026-09-01')` en UTC-5 daba 31 ago.
    expect(formatDateShort('2026-09-01')).toBe('1 sep 2026')
    expect(formatDateShort('2026-03-01')).toBe('1 mar 2026')
  })

  it('formatea un instante completo, no solo una fecha suelta', () => {
    // Antes de la fusión esto devolvía el ISO crudo: el split por guiones
    // dejaba `13T22:45:10Z` y el Number salía NaN. Se veía en la lista de
    // cuentas, que muestra `createdDate`.
    expect(formatDateShort('2026-08-13T22:45:10Z')).toBe('13 ago 2026')
  })

  it('usa el guion largo cuando no hay fecha', () => {
    expect(formatDateShort(null)).toBe('—')
    expect(formatDateShort(undefined)).toBe('—')
    expect(formatDateShort('')).toBe('—')
  })

  it('respeta el marcador de vacio que le pasen', () => {
    expect(formatDateShort(null, '')).toBe('')
    expect(formatDateShort(undefined, 'Sin fecha')).toBe('Sin fecha')
  })

  it('devuelve la cadena original si no la puede parsear', () => {
    expect(formatDateShort('mañana')).toBe('mañana')
    expect(formatDateShort('2026-02-31')).toBe('2026-02-31')
  })
})

describe('formatDateLong', () => {
  it('imprime la frase completa en minuscula', () => {
    expect(formatDateLong('2026-08-13')).toBe('13 de agosto, 2026')
    expect(formatDateLong('2026-12-01')).toBe('1 de diciembre, 2026')
  })

  it('tolera instantes y comparte el marcador de vacio', () => {
    expect(formatDateLong('2026-08-13T10:00:00')).toBe('13 de agosto, 2026')
    expect(formatDateLong(null)).toBe('—')
    expect(formatDateLong(null, '')).toBe('')
  })

  it('devuelve la cadena original si no la puede parsear', () => {
    expect(formatDateLong('sin fecha')).toBe('sin fecha')
  })
})

describe('formatDateNumeric', () => {
  it('imprime dd/MM/yyyy, que es lo que ya veian las tablas de compras', () => {
    expect(formatDateNumeric('2026-08-13')).toBe('13/08/2026')
    expect(formatDateNumeric('2026-01-05')).toBe('5/01/2026')
  })

  it('no es lo mismo que la fecha corta', () => {
    expect(formatDateNumeric('2026-08-13')).not.toBe(formatDateShort('2026-08-13'))
  })

  it('marca el vacio y devuelve el original si no parsea', () => {
    expect(formatDateNumeric(null)).toBe('—')
    expect(formatDateNumeric('')).toBe('—')
    expect(formatDateNumeric('n/d')).toBe('n/d')
  })
})

describe('formatMonthLabel', () => {
  it('capitaliza el mes de una clave yyyy-MM', () => {
    expect(formatMonthLabel('2026-08')).toBe('Agosto 2026')
    expect(formatMonthLabel('2026-01')).toBe('Enero 2026')
    expect(formatMonthLabel('2026-12')).toBe('Diciembre 2026')
  })

  it('devuelve la clave si no es un mes valido', () => {
    expect(formatMonthLabel('2026-13')).toBe('2026-13')
    expect(formatMonthLabel('agosto')).toBe('agosto')
  })

  it('marca el vacio', () => {
    expect(formatMonthLabel(null)).toBe('—')
    expect(formatMonthLabel('')).toBe('—')
  })
})

describe('calcAge', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function at(iso: string) {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${iso}T12:00:00`))
  }

  it('cuenta anios y meses', () => {
    at('2026-08-16')
    expect(calcAge('2023-06-16')).toBe('3 años · 2 m')
  })

  it('usa el singular cuando toca', () => {
    at('2026-08-16')
    expect(calcAge('2025-08-16')).toBe('1 año')
    expect(calcAge('2026-07-16')).toBe('1 mes')
  })

  it('omite los meses cuando el aniversario cae justo hoy', () => {
    at('2026-08-16')
    expect(calcAge('2020-08-16')).toBe('6 años')
  })

  it('no cuenta el mes hasta que se cumple el dia', () => {
    at('2026-08-15')
    expect(calcAge('2026-07-16')).toBe('Recién nacido')
    at('2026-08-16')
    expect(calcAge('2026-07-16')).toBe('1 mes')
  })

  it('resta un anio cuando el mes de nacimiento aun no ha llegado', () => {
    at('2026-02-10')
    expect(calcAge('2024-11-20')).toBe('1 año · 2 m')
  })

  it('llama recien nacido a lo que no llega al mes', () => {
    at('2026-08-16')
    expect(calcAge('2026-08-01')).toBe('Recién nacido')
    expect(calcAge('2026-08-16')).toBe('Recién nacido')
  })

  it('no se corre de dia por zona horaria en el cambio de mes', () => {
    // Con `new Date('2026-08-01')` (UTC) en Bogotá el nacimiento caía el 31 de
    // julio y la edad salía un mes de más.
    at('2026-09-01')
    expect(calcAge('2026-08-01')).toBe('1 mes')
  })

  it('marca el vacio cuando no hay fecha o es invalida', () => {
    expect(calcAge(null)).toBe('—')
    expect(calcAge(undefined)).toBe('—')
    expect(calcAge('')).toBe('—')
    expect(calcAge('no soy una fecha')).toBe('—')
    expect(calcAge('2026-02-31')).toBe('—')
  })
})

describe('initials', () => {
  it('toma la inicial de las dos primeras palabras, en mayuscula', () => {
    expect(initials('orlando velasquez')).toBe('OV')
    expect(initials('María José Pérez Gómez')).toBe('MJ')
  })

  it('funciona con un solo nombre', () => {
    expect(initials('Firulais')).toBe('F')
  })

  it('ignora los espacios de sobra a los lados y en medio', () => {
    expect(initials('  ana   maria  ')).toBe('AM')
    expect(initials('\tluis\npaz')).toBe('LP')
  })

  it('devuelve cadena vacia cuando no hay nombre', () => {
    expect(initials('')).toBe('')
    expect(initials('   ')).toBe('')
    expect(initials(null)).toBe('')
    expect(initials(undefined)).toBe('')
  })
})

describe('todayISO', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('devuelve la fecha local en yyyy-MM-dd con relleno de ceros', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05T09:30:00'))
    expect(todayISO()).toBe('2026-01-05')
  })

  it('devuelve el dia local, no el UTC, al final del dia', () => {
    // 23:30 en Bogotá ya es el día siguiente en UTC: `toISOString()` habría
    // devuelto el 17.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-16T23:30:00'))
    expect(todayISO()).toBe('2026-08-16')
    expect(formatDateShort(todayISO())).toBe('16 ago 2026')
  })
})
