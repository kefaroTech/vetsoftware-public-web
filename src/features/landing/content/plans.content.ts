import type { PublicCatalog } from '../types/plans.types'

/**
 * CONTENIDO, NO CONTRATO.
 *
 * Estos precios NO vienen del backend: hoy no existe ningún endpoint público que
 * los sirva (`ListCatalogPricesUseCase.java:14` exige `hasRole('SYSTEM')`, y el
 * único asistente público, `/configurator/resolve`, devuelve `catalogItemId` y
 * `quantity`, sin nombre ni precio). Son una transcripción manual de la lista de
 * precio publicada, y por eso llevan sello.
 *
 * La cifra que se muestra aquí es ORIENTATIVA y así se rotula en pantalla, con
 * «desde» delante y con la nota bajo las tarjetas. La cifra VINCULANTE la
 * calcula el servidor en el paso de contratación y puede no coincidir: ese
 * desacuerdo tiene su propio estado en pantalla (`PriceDriftNotice`), que además
 * DESMARCA la casilla de términos — nadie confirma un importe que no ha leído.
 *
 * Cuando exista `GET /plans`, este fichero se borra y `plans.source.ts` pasa a
 * llamar al endpoint. Nada más cambia.
 */
/**
 * NOTA SOBRE `code` y `name` DE LAS CAPACIDADES.
 *
 * El contrato los garantiza (`PublicPlanCapacityResponse`) y son el ARTÍCULO del
 * catálogo que vende la capacidad, no el eje. Aquí se transcriben con el mismo
 * código del eje porque el código real del artículo en la lista `PUB-2026-COP`
 * no está publicado en ninguna fuente que este front pueda leer. No se muestran
 * en pantalla —la tarjeta rotula por `unit`—, así que la transcripción no puede
 * enseñar un dato falso; pero cuando `plans.source.ts` pase a leer del endpoint,
 * estos valores los pondrá el servidor y esta nota se borra con el fichero.
 */
export const SELLO = {
  listaDePrecioCodigo: 'PUB-2026-COP',
  revisadoEl: '2026-08-28',
  revisadoPor: 'comercial',
} as const

/**
 * Cuántos días puede pasar el sello sin revisar antes de que la prueba unitaria
 * lo cante. No es un número redondo por gusto: un trimestre es lo que tarda una
 * lista de precio en moverse sin que nadie se acuerde de este fichero, y el
 * fallo tiene que ser RUIDOSO, porque la alternativa —un precio publicado que se
 * separó del real y nadie lo sabe— es silenciosa por definición.
 */
export const SELLO_MAX_DIAS = 90

export const PLANS_CONTENT: PublicCatalog = {
  currency: 'COP',
  priceValidFrom: '2026-08-01',
  plans: [
    {
      code: 'ESENCIAL',
      name: 'Esencial',
      tagline: 'Para una clínica que empieza',
      recommended: false,
      monthlyFromAmount: 89000,
      annualFromAmount: 890000,
      setupAmount: 0,
      taxRate: 19,
      taxTreatment: 'TAXED',
      includes: [
        { code: 'AGENDA', name: 'Agenda', trialDays: 30 },
        { code: 'HISTORIA', name: 'Historia clínica', trialDays: 30 },
        { code: 'CAJA', name: 'Caja', trialDays: 14 },
      ],
      capacities: [
        { code: 'USER', name: 'Usuarios', unit: 'USER', included: 3, extraUnitAmount: 15000 },
        { code: 'BRANCH', name: 'Sedes', unit: 'BRANCH', included: 1, extraUnitAmount: 45000 },
      ],
    },
    {
      code: 'CLINICA',
      name: 'Clínica',
      tagline: 'Para una clínica con quirófano y hospital',
      recommended: true,
      monthlyFromAmount: 179000,
      annualFromAmount: 1790000,
      setupAmount: 0,
      taxRate: 19,
      taxTreatment: 'TAXED',
      includes: [
        { code: 'AGENDA', name: 'Agenda', trialDays: 30 },
        { code: 'HISTORIA', name: 'Historia clínica', trialDays: 30 },
        { code: 'CAJA', name: 'Caja', trialDays: 14 },
        { code: 'HOSPITAL', name: 'Hospitalización', trialDays: 30 },
        { code: 'INVENTARIO', name: 'Inventario', trialDays: 30 },
      ],
      capacities: [
        { code: 'USER', name: 'Usuarios', unit: 'USER', included: 8, extraUnitAmount: 14000 },
        { code: 'BRANCH', name: 'Sedes', unit: 'BRANCH', included: 2, extraUnitAmount: 42000 },
      ],
    },
    {
      code: 'CADENA',
      name: 'Cadena',
      tagline: 'Para varias sedes con facturación electrónica',
      recommended: false,
      monthlyFromAmount: 329000,
      annualFromAmount: 3290000,
      setupAmount: 0,
      taxRate: 19,
      taxTreatment: 'TAXED',
      includes: [
        { code: 'AGENDA', name: 'Agenda', trialDays: 30 },
        { code: 'HISTORIA', name: 'Historia clínica', trialDays: 30 },
        { code: 'CAJA', name: 'Caja', trialDays: 14 },
        { code: 'HOSPITAL', name: 'Hospitalización', trialDays: 30 },
        { code: 'INVENTARIO', name: 'Inventario', trialDays: 30 },
        { code: 'DIAN', name: 'Facturación electrónica DIAN', trialDays: 14 },
      ],
      capacities: [
        { code: 'USER', name: 'Usuarios', unit: 'USER', included: 20, extraUnitAmount: 12000 },
        { code: 'BRANCH', name: 'Sedes', unit: 'BRANCH', included: 5, extraUnitAmount: 38000 },
      ],
    },
  ],
}
