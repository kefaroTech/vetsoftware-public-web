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

/**
 * La forma que persiste `contratacion.store`, con sus dos discriminadores.
 *
 * <p>`origen` y `modulos` no son opcionales aunque `parseIntencion` sepa migrar
 * una intención escrita antes de que existieran: lo que se siembra desde una
 * prueba tiene que ser lo que este front ESCRIBE hoy, no lo que todavía sabe
 * leer. Sembrar la forma vieja probaría la migración y llamaría a eso «el caso
 * normal».
 *
 * <p>`planCode` es nulable porque la selección modular no reproduce ningún
 * paquete, y `importeVistoMensual` porque hay selecciones sin cifra que ver.
 */
export interface Intencion {
  origen: 'PLAN'
  planCode: string | null
  /** Los códigos de módulo marcados. Vacío cuando se eligió un paquete cerrado. */
  modulos: string[]
  ciclo: 'MENSUAL' | 'ANUAL'
  sedes: number
  usuarios: number
  importeVistoMensual: number | null
  selloRevisadoEl: string
  creadaEn: string
  descartada: boolean
}

/**
 * El plan «Pack Clínica», mensual, una sede y una persona: 189.000 al mes.
 *
 * `planCode` es el código REAL del catálogo (`PACK_CLINIC`, changeset 308). El
 * `CLINICA` que había aquí no existía en ninguna parte y el servidor no podía
 * resolverlo.
 *
 * `modulos` va vacío y eso ES la rama del paquete: con `planCode` puesto, quien
 * dice qué se contrata es el paquete y las casillas no existieron.
 *
 * `importeVistoMensual` tiene que ser EXACTAMENTE el subtotal mensual que
 * `calcularEstimado` da para esta selección (189.000 = precio de entrada de
 * `PACK_CLINIC`, sin extras: 1 sede y 1 persona caben en lo incluido). Si no lo
 * es, `ContratarView` detecta deriva de precio y pinta `PriceDriftNotice` — y
 * entonces media spec falla por un motivo que no tiene nada que ver con lo que
 * cada caso dice comprobar.
 */
export function intencion(over: Partial<Intencion> = {}): Intencion {
  return {
    origen: 'PLAN',
    planCode: 'PACK_CLINIC',
    modulos: [],
    ciclo: 'MENSUAL',
    sedes: 1,
    usuarios: 1,
    importeVistoMensual: 189000,
    selloRevisadoEl: '2026-08-28',
    creadaEn: new Date().toISOString(),
    descartada: false,
    ...over,
  }
}

/**
 * Una selección de módulos SUELTA: sin paquete que la nombre.
 *
 * <p>Es la otra rama de `IntencionPlan`, y la que decide qué cesta viaja a
 * `POST /quotes/self-serve`: con `planCode` a `null`, `lineasDeContratacion`
 * arma `CORE` + cada módulo marcado en vez de una línea de paquete.
 *
 * @param importeVistoMensual
 *            el subtotal que la pantalla anterior tenía delante. Se pide en vez
 *            de dejarlo por defecto porque en esta rama no hay lista de precio
 *            con la que recalcularlo: lo pone `POST /quotes/preview`, y darle un
 *            valor cualquiera dispararía el aviso de deriva en cada caso.
 */
export function intencionDeModulos(
  modulos: string[],
  importeVistoMensual: number | null,
  over: Partial<Intencion> = {},
): Intencion {
  return intencion({ planCode: null, modulos, importeVistoMensual, ...over })
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
