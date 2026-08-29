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
/**
 * POR QUÉ `annualExtraUnitAmount` ESTÁ EN `null` EN LAS SEIS FILAS.
 *
 * Porque no hay nada que transcribir. `PublicPlanCapacityResponse` pasó a traer
 * el precio de la unidad adicional PARTIDO POR CICLO, y de la lista `PUB-2026-COP`
 * este front solo tiene transcritas las cifras mensuales: la escalera `ANNUAL` de
 * cada artículo no está publicada en ninguna fuente que se pueda leer desde aquí.
 *
 * <p>Lo que había antes en su lugar no era un dato, era una cuenta:
 * `calcularEstimado` multiplicaba el importe mensual por diez —la proporción del
 * precio base, «2 meses gratis»— y enseñaba el resultado como el precio anual de
 * una sede o de un usuario extra. El servidor no cobra así: liquida la capacidad
 * extra contra la escalera `ANNUAL` del propio artículo, que no tiene por qué
 * valer diez mensualidades. Copiar aquí ese `× 10` habría convertido una cuenta
 * inventada en un «precio de lista revisado por comercial», que es peor que
 * dejarlo vacío: le pondría el sello a lo que no lo tiene.
 *
 * <p>Consecuencia visible, y es la correcta: en ciclo anual, pasar de las sedes o
 * las personas incluidas deja de tener importe estimado y la pantalla lo dice con
 * todas las letras (`textoSinPrecio`). Contratarlo tampoco funcionaría — la
 * autocontratación exige precio en el ciclo pedido y hunde la oferta entera si no
 * lo hay—, así que la portada deja de anunciar lo que el paso siguiente rechaza.
 *
 * <p>Para cerrarlo hace falta un dato que no está en el código: las cifras
 * anuales de `USER` y `BRANCH` de los tres paquetes en `PUB-2026-COP`. Con ellas,
 * se reemplazan los seis `null` y se mueve `SELLO.revisadoEl`.
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
        {
          code: 'USER',
          name: 'Usuarios',
          unit: 'USER',
          included: 3,
          monthlyExtraUnitAmount: 15000,
          annualExtraUnitAmount: null,
        },
        {
          code: 'BRANCH',
          name: 'Sedes',
          unit: 'BRANCH',
          included: 1,
          monthlyExtraUnitAmount: 45000,
          annualExtraUnitAmount: null,
        },
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
        {
          code: 'USER',
          name: 'Usuarios',
          unit: 'USER',
          included: 8,
          monthlyExtraUnitAmount: 14000,
          annualExtraUnitAmount: null,
        },
        {
          code: 'BRANCH',
          name: 'Sedes',
          unit: 'BRANCH',
          included: 2,
          monthlyExtraUnitAmount: 42000,
          annualExtraUnitAmount: null,
        },
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
        {
          code: 'USER',
          name: 'Usuarios',
          unit: 'USER',
          included: 20,
          monthlyExtraUnitAmount: 12000,
          annualExtraUnitAmount: null,
        },
        {
          code: 'BRANCH',
          name: 'Sedes',
          unit: 'BRANCH',
          included: 5,
          monthlyExtraUnitAmount: 38000,
          annualExtraUnitAmount: null,
        },
      ],
    },
  ],
}
