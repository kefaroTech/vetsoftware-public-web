/**
 * Los tipos del catálogo público de planes.
 *
 * **Están atados al contrato** (`GET /plans` → `PublicPlanCatalogResponse`). Lo
 * estuvieron pendientes mientras no existió endpoint público que sirviera planes
 * con sus precios; ese endpoint existe hoy —`PublicPlanController.java`, ruta
 * literal en `PublicRoutes.BUSINESS`— y `api.contract.ts` afirma cuatro de estos
 * tipos contra sus esquemas.
 *
 * ── Atado NO significa idéntico ────────────────────────────────────────────
 * Hay exactamente dos cosas que el contrato no dice y esta capa sí, y las dos
 * viven FUERA de los tipos atados a propósito:
 *
 *   · `PublicPlan.recommended` — cuál es el plan destacado es una decisión
 *     comercial de la portada, no un dato del modelo. El backend no la tiene ni
 *     debe tenerla. Por eso `PublicPlanContract` es el espejo del esquema y
 *     `PublicPlan` lo extiende con ese único campo: la aserción del contrato
 *     recae sobre el primero, y un campo inventado nunca se cuela en el atado.
 *   · `Ciclo` = `'MENSUAL' | 'ANUAL'` — el contrato habla de `MONTHLY`/`ANNUAL`,
 *     pero **no en estos esquemas**: `PublicPlanResponse` no trae ciclo alguno.
 *     Estos dos valores son el rótulo de un selector de pantalla, no un dato que
 *     viaje por el cable, así que no se renombran para parecerse al contrato.
 *     El día que haya un campo de ciclo en una petición, ese campo llevará el
 *     vocabulario del contrato y la traducción se hará en el seam.
 *
 * ── Dónde se traduce ───────────────────────────────────────────────────────
 * En `api/plans.source.ts`, y solo ahí. Ningún componente conoce el vocabulario
 * del contrato: reciben `PublicPlan` y `PublicCatalog` ya formados.
 */

/**
 * Tratamiento fiscal del paquete. Es el mismo enum que declara
 * `suscripcion.types.ts`; se importa en vez de replicarse porque es el MISMO
 * repositorio y una tercera copia sería la que se quedaría atrás.
 */
import type { TaxTreatment } from '../../suscripcion/types/suscripcion.types'

export type { TaxTreatment }

/** Cómo se paga. El ahorro del anual se calcula, no se declara. */
export type Ciclo = 'MENSUAL' | 'ANUAL'

/**
 * Unidades de capacidad del catálogo comercial. Reproduce el enum del backend
 * (el mismo que la consola declara en `commercial-catalog.types.ts`); los
 * rótulos en español se resuelven con un mapa local del tenant, no se importa
 * nada de la consola.
 *
 * <p>El contrato declara `unit` como `string` y no como unión cerrada —el
 * backend lo emite desde `capacityUnit()` sin enum en la respuesta—. Estrechar
 * aquí es legítimo y la aserción lo acepta: un tipo local MÁS estrecho que el
 * contrato no rompe ninguna pantalla, solo obliga a mirar este fichero cuando el
 * backend añada un eje nuevo.
 */
export type CapacityUnit = 'USER' | 'BRANCH' | 'TERMINAL' | 'STORAGE_GB'

/**
 * Un módulo incluido en el plan, con SU periodo de prueba.
 *
 * `trialDays` es por artículo y no por contrato: `CatalogItemJpaEntity.java`
 * declara `default_trial_days` en el artículo y `ModuleGrantLine.java:45` lleva
 * el `trialEndDate` en la LÍNEA de concesión. Caja puede vencer el día 14 y
 * Agenda el 30 dentro del mismo contrato, y la pantalla tiene que decirlo.
 *
 * <p>`trialDays` es NULABLE porque el contrato lo declara opcional: un artículo
 * sin `default_trial_days` no tiene prueba. Antes se declaraba requerido aquí y
 * eso era una afirmación que el backend nunca hizo.
 *
 * Espeja `PublicPlanIncludedResponse`.
 */
export interface PlanInclude {
  code: string
  name: string
  trialDays: number | null
}

/**
 * Capacidad incluida y precio de la unidad adicional.
 *
 * <p>`code` y `name` son el ARTÍCULO del catálogo que vende esa capacidad;
 * `unit` es el eje sobre el que se cuenta. No son lo mismo y el contrato los
 * trae separados: el artículo puede llamarse «Usuario adicional» mientras el eje
 * es `USER`. La pantalla rotula por `unit` (ver `CAPACITY_UNIT_LABEL`), así que
 * `name` hoy no se muestra; se declara porque el contrato lo garantiza y no
 * declararlo era justamente el agujero que `UndeclaredFields` existe para tapar.
 *
 * <p>El precio de la unidad adicional viene **por ciclo**, y los dos son
 * NULABLES. Antes había un solo `extraUnitAmount` que el contrato ya no manda y
 * que además era mensual sin decirlo: el ciclo anual se derivaba multiplicándolo
 * por diez. `null` no es cero ni «gratis»: significa que esa capacidad **no se
 * vende suelta en ese ciclo**, y la resolución del servidor en el momento de
 * contratar la rechaza (`JpaPublicPlanQueryPort` publica la fila con un `LEFT
 * JOIN`, mientras que el traductor de la autocontratación exige un `INNER JOIN`
 * con precio en el ciclo pedido). Por eso lo que la pantalla NO puede hacer con
 * un `null` es inventarse una cifra: estaría anunciando algo que la contratación
 * va a rechazar.
 *
 * <p>Lo que sigue siendo verdad con `null` es `included`: la capacidad incluida
 * existe en los dos ciclos aunque su unidad adicional no tenga precio en uno.
 *
 * Espeja `PublicPlanCapacityResponse`.
 */
export interface PlanCapacity {
  code: string
  name: string
  unit: CapacityUnit
  included: number
  /** Precio de la unidad adicional al mes. `null` = no se vende suelta en ese ciclo. */
  monthlyExtraUnitAmount: number | null
  /** Precio de la unidad adicional al año. `null` = no se vende suelta en ese ciclo. */
  annualExtraUnitAmount: number | null
}

/**
 * El plan tal y como lo declara el contrato, sin una sola adición.
 *
 * Es el tipo que `api.contract.ts` afirma contra `PublicPlanResponse`. No lo
 * consumen los componentes: consumen `PublicPlan`.
 */
export interface PublicPlanContract {
  code: string
  name: string
  tagline: string
  /** Precio de ENTRADA del ciclo mensual. Se rotula siempre «desde». */
  monthlyFromAmount: number
  /** Precio de ENTRADA del ciclo anual. Se rotula siempre «desde». */
  annualFromAmount: number
  setupAmount: number
  /** Porcentaje, 0–100. */
  taxRate: number
  /** Nulable: el contrato lo declara opcional. */
  taxTreatment: TaxTreatment | null
  includes: PlanInclude[]
  capacities: PlanCapacity[]
}

/**
 * El plan como lo ve la pantalla: el contrato **más** la decisión comercial.
 *
 * `recommended` es lo único que añade, y por eso el atado no recae aquí. Ver la
 * cabecera de este fichero.
 */
export interface PublicPlan extends PublicPlanContract {
  recommended: boolean
}

/**
 * El catálogo. Espeja `PublicPlanCatalogResponse` y **sí** está atado: sus
 * campos anidados se comprueban por su propia aserción, no por esta.
 *
 * <p>`currency` y `priceValidFrom` son NULABLES, y ese no es un descuido del
 * backend sino un estado real del negocio: `GetPublicPlansService.java:52`
 * devuelve `SIN_TARIFA` —los dos campos a `null` y la lista vacía— cuando no hay
 * ninguna lista de precio vigente hoy. Devuelve 200 y no 404 justamente para que
 * la portada siga cargando. Declararlos requeridos aquí describía un mundo en el
 * que ese estado no existe.
 */
export interface PublicCatalog {
  /** ISO-4217. Hoy siempre `COP`. Nulo si no hay tarifa vigente. */
  currency: string | null
  /** ISO date. Desde cuándo rige esta lista. Nulo si no hay tarifa vigente. */
  priceValidFrom: string | null
  plans: PublicPlan[]
}

/** Rótulos en español de las unidades de capacidad. Nunca se muestra el enum crudo. */
export const CAPACITY_UNIT_LABEL: Readonly<Record<CapacityUnit, string>> = {
  USER: 'personas',
  BRANCH: 'sedes',
  TERMINAL: 'terminales',
  STORAGE_GB: 'GB de almacenamiento',
}

/** Rótulos en singular, para cuando el número es 1. */
export const CAPACITY_UNIT_LABEL_ONE: Readonly<Record<CapacityUnit, string>> = {
  USER: 'persona',
  BRANCH: 'sede',
  TERMINAL: 'terminal',
  STORAGE_GB: 'GB de almacenamiento',
}

export const CICLO_LABEL: Readonly<Record<Ciclo, string>> = {
  MENSUAL: 'Mes a mes',
  ANUAL: 'Un año',
}
