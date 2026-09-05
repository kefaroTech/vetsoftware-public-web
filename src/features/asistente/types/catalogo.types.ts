/**
 * El catálogo comercial público, `GET /catalog`.
 *
 * ── Por qué estos seis tipos se llaman EXACTAMENTE como los esquemas ────────
 * TR-01: no se declara a mano un tipo que el contrato ya describe. `GET /catalog`
 * **existe hoy** —`PublicCatalogResponse` está en `api.generated.d.ts`— así que
 * los seis tipos de abajo llevan el nombre del esquema y `api.contract.ts` los
 * ata. `api-contract.spec.ts` comprueba esa cobertura por NOMBRE: si alguien
 * renombrara uno para «que quede más bonito», la atadura se perdería sin que
 * nada fallara. Por eso el nombre es el del contrato y no el del dominio.
 *
 * <p>Consecuencia práctica que conviene tener delante: `UndeclaredFields` obliga
 * a declarar **todos** los campos del esquema, incluidos los que esta pantalla
 * no pinta (`setupAmount`, `taxTreatment`). Se declaran. Un campo que el
 * servidor manda y el front ignora es como se pierden datos en silencio.
 *
 * ── Lo que el contrato NO trae, y por eso vive aparte ───────────────────────
 * Dos cosas que el diseño necesita y `GET /catalog` no publica:
 *
 *  1. **El tipo de arco.** `PublicCatalogRequirementResponse` solo trae
 *     `itemCode` → `requiredItemCode`. Los cuatro `RECOMMENDS` de la semilla 309
 *     **no viajan**, y sin ellos no se puede distinguir «arrastra» de «sugiere»
 *     — que es justo la distinción que impide que un upsell se disfrace de
 *     requisito técnico.
 *  2. **La `note` en español** que el negocio escribió en `catalog_item_dependencies`.
 *     Es la frase que explica POR QUÉ se añadió un módulo.
 *
 * Las dos son decisiones editoriales **mientras el contrato no las publique**,
 * y viven en `content/catalogo.content.ts` con el mismo criterio con el que
 * `recommended` vive fuera de `PublicPlanContract` (ver `plans.types.ts`). El
 * seam las compone; ningún componente sabe de dónde salió cada mitad.
 *
 * <p>La agrupación de los módulos SÍ viaja: `areas` con su orden de
 * presentación, y `PublicCatalogItemResponse.areaCode` para decir bajo qué
 * cabecera va cada uno. `GrupoCatalogo`, más abajo, es otra cosa —los cuatro
 * grupos temáticos que hoy pinta esta pantalla— y no se deriva de `areaCode`.
 */

/** Cómo tributa el artículo. Unión cerrada del contrato. */
export type CatalogoTaxTreatment = 'TAXED' | 'EXEMPT' | 'EXCLUDED'

/**
 * Un módulo o un cargo único, con su precio suelto.
 *
 * <p>`trialDays` es NULABLE y eso es un dato de negocio, no un hueco: los tres
 * paquetes y los cuatro `EXTRA_*` son `NEVER_FREE`, y `null` significa
 * literalmente «este artículo no tiene prueba». Aplanarlo a `0` haría que la
 * pantalla escribiera «0 días gratis» donde la verdad es «sin prueba», y esa
 * diferencia es la mitad de la comparación del paquete (§1.5 del plan).
 */
export interface PublicCatalogItemResponse {
  code: string
  name: string
  /** Descripción comercial corta. Es el fallback de un motivo saneado. */
  description: string | null
  /** Parte del mínimo estructural (`catalog_items.is_core`): no se puede desmarcar. */
  mandatory: boolean
  /** Días de prueba; `null` si su política no concede prueba. */
  trialDays: number | null
  /** Precio al mes; `null` si no se vende suelto en ese ciclo. */
  monthlyAmount: number | null
  /** Precio al año; `null` si no se vende suelto en ese ciclo. **No es el mensual por doce.** */
  annualAmount: number | null
  /** Cargo único de puesta en marcha. En un `ONE_TIME` es TODO su precio. */
  setupAmount: number | null
  taxRate: number | null
  taxTreatment: CatalogoTaxTreatment | null
  /** Si la autocontratación lo aceptaría como línea. Ver §2.3 del plan. */
  selfServiceEligible: boolean
  /**
   * Cabecera bajo la que va el módulo; casa con `areas[].code`. `null` en todo
   * lo que no se agrupa: los cargos únicos y `CORE`, que va en fila propia.
   */
  areaCode: string | null
  /** Rótulo corto para la casilla. `null` mientras nadie lo escriba: se pinta `name`. */
  shortLabel: string | null
}

/**
 * Un contador que se compra por unidades.
 *
 * <p>`selfServiceEligible` hay que LEERLO, no suponerlo: el servidor lo pone a
 * cierto cuando la capacidad cuelga de un paquete activo **o** lleva su propia
 * marca de autoservicio, así que una capacidad sí puede ser contratable.
 * Cotizar una que llegue con `false` produce un `ARTICULO_NO_CONTRATABLE` en el
 * paso 6, con un mensaje que deliberadamente no dice qué línea sobró (§2.3,
 * §6.5 del plan).
 */
export interface PublicCatalogCapacityResponse {
  code: string
  name: string
  description: string | null
  mandatory: boolean
  /** Código del eje: `USER`, `BRANCH`, `TERMINAL`, `STORAGE_GB`. */
  unit: string
  /** Unidades que trae el tramo de entrada mensual; `null` si no hay tramo mensual. */
  monthlyIncludedQuantity: number | null
  /** Unidades que trae el tramo de entrada anual; `null` si no hay tramo anual. */
  annualIncludedQuantity: number | null
  monthlyUnitAmount: number | null
  annualUnitAmount: number | null
  taxRate: number | null
  taxTreatment: CatalogoTaxTreatment | null
  selfServiceEligible: boolean
}

/**
 * Un paquete, con su precio y su composición.
 *
 * <p>`componentCodes` existe —lo dice su propio javadoc en el backend— para que
 * el front EVITE el conflicto «paquete + componente del paquete» antes de
 * pedirlo, en vez de descubrirlo con un 400. Aquí se usa para lo mismo y para
 * una cosa más: es lo único que permite comparar el paquete contra el carrito.
 */
export interface PublicCatalogPackResponse {
  code: string
  name: string
  tagline: string | null
  monthlyAmount: number | null
  annualAmount: number | null
  setupAmount: number | null
  taxRate: number | null
  taxTreatment: CatalogoTaxTreatment | null
  /** Rótulos de los artículos que incluye. Ninguno se puede comprar además del paquete. */
  componentCodes: string[]
  /**
   * La combinación que el negocio destaca. Es comercial y editable, no el
   * mínimo estructural de `mandatory`; a lo sumo un paquete vivo la lleva.
   */
  recommended: boolean
}

/**
 * Un arco DIRECTO del grafo de requisitos: «si eliges `itemCode`, se añade
 * `requiredItemCode`».
 *
 * <p>El propio contrato avisa de dos cosas que este front respeta: **no es el
 * cierre transitivo** —hay que recorrerlo en anchura— y `requiredItemCode`
 * puede no aparecer en `modules`/`capacities` si no tiene precio en la tarifa
 * vigente, porque el servidor lo añade igual.
 */
export interface PublicCatalogRequirementResponse {
  itemCode: string
  requiredItemCode: string
}

/**
 * Una cabecera funcional del configurador.
 *
 * <p>**El orden de la lista ES el orden de presentación** y no se reordena en el
 * cliente: el criterio lo fija el `ORDER BY` del servidor, igual que en
 * `modules`, `capacities` y `packs`. No viaja ningún `sortOrder` con el que
 * rehacerlo.
 */
export interface PublicCatalogAreaResponse {
  /** El valor que traen los módulos en `areaCode`. */
  code: string
  name: string
}

/**
 * La respuesta completa.
 *
 * <p>`currency` y `priceValidFrom` son NULABLES y ese es un estado real del
 * negocio, no un descuido: sin lista de precio vigente el servidor devuelve 200
 * con los dos a `null` para que la portada siga cargando.
 */
export interface PublicCatalogResponse {
  /** ISO-4217; `null` si no hay tarifa vigente. */
  currency: string | null
  /** Desde cuándo rigen estos precios; `null` si no hay tarifa vigente. */
  priceValidFrom: string | null
  modules: PublicCatalogItemResponse[]
  capacities: PublicCatalogCapacityResponse[]
  oneTimeItems: PublicCatalogItemResponse[]
  packs: PublicCatalogPackResponse[]
  requirements: PublicCatalogRequirementResponse[]
  /** Vacía si no hay tarifa vigente: sin módulos que agrupar, una cabecera es un título sobre la nada. */
  areas: PublicCatalogAreaResponse[]
}

/* ────────────────────────────────────────────────────────────────────────────
 * A partir de aquí: el catálogo COMO LO VE LA PANTALLA.
 *
 * Es el contrato MÁS las tres cosas que el contrato no trae (ver la cabecera).
 * Ningún componente conoce `PublicCatalog*Response`: consumen esto.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Los cuatro grupos temáticos. Decisión editorial del front, como `PublicPlan.recommended`. */
export type GrupoCatalogo = 'CLINICA' | 'AGENDA' | 'DINERO' | 'EXISTENCIAS'

/**
 * Los dos tipos de arco, y la diferencia es de producto, no de datos.
 *
 * <p>`REQUIRES` arrastra: marcar «Cuentas abiertas» sin Caja añade las dos.
 * `RECOMMENDS` **jamás** se auto-añade — se ofrece con un botón explícito. Un
 * `RECOMMENDS` que se auto-añadiera sería un upsell disfrazado de requisito
 * técnico, y el enum del backend (`RelationType`) ya dejó escrito que «solo
 * `REQUIRES` arrastra».
 */
export type TipoArco = 'REQUIRES' | 'RECOMMENDS'

/**
 * Un arco del grafo, ya con su explicación.
 *
 * <p>`note` es la frase en español que el negocio escribió en
 * `catalog_item_dependencies.note`. **Hoy no viaja por el contrato** y se
 * compone en el seam desde `content/catalogo.content.ts`; `null` cuando el arco
 * llega del servidor y nadie le ha escrito nota. Se pinta en REDONDA, nunca en
 * cursiva: la cursiva está reservada a lo que escribió un modelo, y confundir
 * «lo dice el catálogo» con «lo escribió un modelo» borra la única señal
 * tipográfica que distingue un dato de una conjetura.
 */
export interface ArcoDependencia {
  desde: string
  hacia: string
  tipo: TipoArco
  note: string | null
}

/**
 * Un artículo vendible del catálogo, con el precio del ciclo ya resuelto por el
 * seam.
 *
 * <p>`importe` es `null` cuando el artículo **no se vende suelto en ese ciclo**.
 * No es cero y no se aplana a cero: un `$ 0` se lee como «no cuesta nada» y aquí
 * significa «no hay precio publicado», que es lo que la contratación va a
 * rechazar. Es la misma decisión que `planPricing` ya tomó para las capacidades.
 */
export interface ArticuloCatalogo {
  code: string
  nombre: string
  /** `short_description` del catálogo. Español revisado; es el fallback del motivo. */
  descripcion: string
  grupo: GrupoCatalogo | null
  importe: number | null
  /**
   * El tipo de IVA en porcentaje, `null` si la tarifa no lo publica.
   *
   * <p>Llega hasta la pantalla porque la portada suma su total **en el
   * navegador**: pedirlo a `POST /quotes/preview` por cada casilla gastaría el
   * cupo por IP del prospecto antes de que llegue a `/planes`. Sin este campo la
   * única forma de rotular el impuesto sería deducir un tipo, y un tipo deducido
   * es una afirmación tributaria que nadie publicó.
   */
  taxRate: number | null
  /** Cómo tributa. `null` cuando la tarifa no lo declara: no se supone `TAXED`. */
  taxTreatment: CatalogoTaxTreatment | null
  /** `null` = sin prueba. Nunca `0`. */
  trialDays: number | null
  /** Parte del mínimo estructural: se muestra, no se puede desmarcar. */
  obligatorio: boolean
  /** Si la autocontratación lo aceptaría como línea (§2.3 del plan). */
  vendible: boolean
  /**
   * El área bajo la que se agrupa, o `null` si no se agrupa.
   *
   * <p>**No es {@link ArticuloCatalogo.grupo}.** Los cuatro grupos del asistente
   * son un reparto editorial del front y este es el del servidor; conviven a
   * propósito hasta que la convergencia (public-web#272) decida cuál queda.
   */
  areaCode: string | null
  /** Rótulo corto para donde no cabe el nombre. `null` si nadie lo escribió. */
  shortLabel: string | null
}

/**
 * Una capacidad: lo que el tramo de entrada incluye y lo que cuesta pasar de ahí.
 *
 * <p>Solo la vendible del eje (`EXTRA_*`) se convierte en línea; la que trae lo
 * incluido (`CAPACITY_*`) es un dato que se muestra. Ver
 * `PublicCatalogCapacityResponse` y `cotizadorLineas`.
 */
export interface CapacidadCatalogo {
  code: string
  nombre: string
  unit: string
  incluido: number
  vendible: boolean
  /** Lo que cuesta UNA unidad adicional en el ciclo resuelto; `null` si no se vende en él. */
  importe: number | null
  taxRate: number | null
  taxTreatment: CatalogoTaxTreatment | null
}

/** Un paquete, con lo que incluye ya resuelto a artículos. */
export interface PaqueteCatalogo {
  code: string
  nombre: string
  tagline: string | null
  importe: number | null
  taxRate: number | null
  taxTreatment: CatalogoTaxTreatment | null
  componentes: string[]
  /** La combinación que el negocio destaca. A lo sumo una la lleva. */
  recommended: boolean
}

/**
 * Una cabecera funcional, en el orden en que la publica el servidor.
 *
 * <p>Ese orden **es** el de presentación y no se reordena aquí: no viaja ningún
 * criterio con el que rehacerlo (ver `PublicCatalogAreaResponse`).
 */
export interface AreaCatalogo {
  /** El valor que traen los artículos en `areaCode`. */
  code: string
  nombre: string
}

/** El catálogo compuesto que consumen las pantallas. */
export interface CatalogoComercial {
  /** ISO-4217, o `null` si no hay tarifa vigente. */
  currency: string | null
  /** El sello REAL del servidor: desde cuándo rigen estos precios. */
  priceValidFrom: string | null
  articulos: ArticuloCatalogo[]
  capacidades: CapacidadCatalogo[]
  paquetes: PaqueteCatalogo[]
  arcos: ArcoDependencia[]
  /** Vacía cuando no hay tarifa vigente: sin artículos, una cabecera titula la nada. */
  areas: AreaCatalogo[]
}
