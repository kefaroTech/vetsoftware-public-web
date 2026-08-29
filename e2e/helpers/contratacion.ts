import type { Page } from '@playwright/test'

/**
 * El espejo de la intención de contratación, sembrado desde la prueba.
 *
 * Vive en un helper y no dentro de una spec porque lo usan dos: importar una
 * spec desde otra registraría sus casos DOS veces (Playwright ejecuta los
 * `test()` al importar el módulo), y el informe contaría el doble de lo que hay.
 */

/**
 * Clave del espejo. Va literal porque `constants/storageKeys.ts` importa por
 * alias `@/…` y Playwright no resuelve ese alias. La atadura entre este literal
 * y la constante real la pone `tests/unit/contratacion-store.spec.ts`, que
 * afirma el valor exacto: si alguien la renombra, allí se pone rojo.
 */
export const CLAVE_INTENCION = 'vs.contratacion.intencion.v1'

export interface Intencion {
  planCode: string
  ciclo: 'MENSUAL' | 'ANUAL'
  sedes: number
  usuarios: number
  importeVistoMensual: number
  selloRevisadoEl: string
  creadaEn: string
  descartada: boolean
}

/** El plan «Clínica», mensual, una sede y una persona: 179.000 al mes. */
export function intencion(over: Partial<Intencion> = {}): Intencion {
  return {
    planCode: 'CLINICA',
    ciclo: 'MENSUAL',
    sedes: 1,
    usuarios: 1,
    importeVistoMensual: 179000,
    selloRevisadoEl: '2026-08-28',
    creadaEn: new Date().toISOString(),
    descartada: false,
    ...over,
  }
}

/** Siembra el espejo ANTES del arranque: el store lo hidrata al crearse. */
export async function sembrarIntencion(page: Page, valor: Intencion): Promise<void> {
  await page.addInitScript(([clave, json]) => window.localStorage.setItem(clave, json), [
    CLAVE_INTENCION,
    JSON.stringify(valor),
  ] as const)
}

/** Lo que hay hoy en el espejo, ya parseado. `null` si no hay nada. */
export async function leerIntencion(page: Page): Promise<Intencion | null> {
  const crudo = await page.evaluate((clave) => window.localStorage.getItem(clave), CLAVE_INTENCION)
  return crudo ? (JSON.parse(crudo) as Intencion) : null
}
