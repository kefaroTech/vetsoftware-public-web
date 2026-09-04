import type { ArcoDependencia, GrupoCatalogo } from '../types/catalogo.types'

/**
 * LO EDITORIAL DEL CATÁLOGO: lo que la pantalla necesita y `GET /catalog` no
 * publica.
 *
 * ── Por qué esto vive en el front y no se inventa como si viniera del servidor
 * Es el mismo criterio, con las mismas palabras, con el que `PublicPlan.recommended`
 * vive fuera de `PublicPlanContract`: **una decisión editorial no se disfraza de
 * dato del modelo**. Aquí hay cuatro, y cada una tiene su propio plazo de muerte:
 *
 *  1. {@link GRUPO_POR_CODIGO} — los cuatro grupos temáticos. **No caduca**: el
 *     backend no tiene categorías y no debería tenerlas. Los 26 artículos llevan
 *     `sort_order` y tipo, nada más. Los cuatro grupos están construidos por la
 *     pregunta que se hace el prospecto («¿qué le pasa a mi paciente?», «¿qué le
 *     cobro?», «¿qué tengo en bodega?»), no por la arquitectura del producto.
 *
 *  2. {@link ARCOS_EDITORIALES} — los cuatro `RECOMMENDS` de la semilla 309.
 *     **Caduca en cuanto el contrato publique el tipo de arco.** Verificado hoy
 *     contra `api.generated.d.ts`: `PublicCatalogRequirementResponse` solo trae
 *     `itemCode` y `requiredItemCode`, o sea que **los `RECOMMENDS` no viajan**.
 *     Sin ellos la pantalla no puede distinguir «arrastra» de «sugiere», y esa
 *     distinción es lo único que impide que un upsell se lea como un requisito
 *     técnico.
 *
 *  3. {@link NOTA_DE_ARCO} — la frase en español que el negocio escribió en
 *     `catalog_item_dependencies.note`. **Caduca en cuanto el contrato publique
 *     `note`.** Tampoco viaja hoy. Es lo que convierte «añadimos también Caja»
 *     en una explicación en vez de en una sorpresa de 46.000 pesos.
 *
 *  4. {@link CLAVES_POR_CODIGO} — el vocabulario con el que un negocio nombra
 *     cada módulo. **Caduca en cuanto el contrato publique unas palabras clave**
 *     (public-web, detección local del hero).
 *
 * ⚠️ Las dos que caducan están transcritas **literal** de la semilla 309 del
 * backend, no reescritas. Reescribirlas produciría dos verdades sobre lo mismo,
 * que es exactamente el defecto que el sello de `plans.content.ts` existe para
 * vigilar en los precios.
 *
 * ⚠️ Y una nota sobre el plan: `plan-implementacion-propuesta-ia.md` §4.3 dice
 * que `GET /catalog` «no publica las dependencias» y pide añadirlas. Está a
 * medias: **los nueve `REQUIRES` ya viajan** en `requirements`. Lo que falta es
 * el `type` y la `note`, que es un cambio bastante menor que el que el plan
 * describe.
 */

/**
 * Los cuatro grupos, con su rótulo de `<legend>`.
 *
 * <p>Sin acordeón y todos abiertos: un acordeón añade un clic por grupo,
 * esconde el precio —que es el dato por el que la sección existe— y convierte
 * trece elementos en cuatro botones para un lector de pantalla.
 */
export const GRUPOS: Readonly<Record<GrupoCatalogo, string>> = {
  CLINICA: 'Atención clínica',
  AGENDA: 'Agenda y servicios',
  DINERO: 'Dinero',
  EXISTENCIAS: 'Existencias',
}

/** Orden de aparición de los grupos. Explícito: el de las claves de un objeto no se promete. */
export const ORDEN_GRUPOS: readonly GrupoCatalogo[] = ['CLINICA', 'AGENDA', 'DINERO', 'EXISTENCIAS']

/**
 * A qué grupo pertenece cada artículo vendible a mano.
 *
 * <p>Son trece, no veintiséis: `CORE` es `is_core` y entra siempre —no es una
 * casilla—, los `CAPACITY` se muestran como dato, los dos `ONE_TIME` tienen
 * `selfServiceEligible = false` y los tres `BUNDLE` van al comparador. Un
 * artículo sin entrada aquí simplemente no aparece en el catálogo manual, que
 * es el comportamiento correcto para todo lo anterior.
 */
export const GRUPO_POR_CODIGO: Readonly<Record<string, GrupoCatalogo>> = {
  CLINICAL_HISTORY: 'CLINICA',
  VACCINATION_DEWORMING: 'CLINICA',
  HOSPITALIZATION: 'CLINICA',
  SURGERY: 'CLINICA',
  LAB_IMAGING: 'CLINICA',
  SCHEDULING: 'AGENDA',
  GROOMING: 'AGENDA',
  SERVICES: 'AGENDA',
  CASH_REGISTER: 'DINERO',
  OPEN_ACCOUNTS: 'DINERO',
  ELECTRONIC_INVOICING: 'DINERO',
  INVENTORY: 'EXISTENCIAS',
  PURCHASES: 'EXISTENCIAS',
}

/**
 * Con qué palabras nombra cada módulo quien cuenta su negocio con las suyas.
 *
 * <p>Vive aquí y no en el contrato porque `PublicCatalogItemResponse` no
 * declara ningún campo de palabras clave, y esto es vocabulario comercial en
 * español —lo escribe quien escribe el copy— no un dato del modelo. Es la misma
 * frontera que {@link GRUPO_POR_CODIGO}: lo que la pantalla necesita y
 * `GET /catalog` no publica.
 *
 * <p>Y es local a propósito: el texto que se compara contra esta lista es el del
 * hero, que **no sale del navegador** (Ley 1581, art. 9 y 26 lit. a). Una
 * detección en el servidor exigiría dos autorizaciones sobre el primer pliegue.
 *
 * <p>Son RAÍCES, no palabras completas —`estétic` cubre «estética» y
 * «estéticas»— y quien las compare tiene que anclarlas a principio de palabra:
 * «hora» dentro de «ahora» no menciona la agenda. Ver `deteccionModulos.ts`.
 */
export const CLAVES_POR_CODIGO: Readonly<Record<string, readonly string[]>> = {
  SCHEDULING: ['cita', 'agenda', 'turno', 'horario', 'reserv'],
  CLINICAL_HISTORY: ['consulta', 'historia', 'clínic', 'clinic', 'diagnos', 'tratamiento'],
  VACCINATION_DEWORMING: ['vacun', 'desparasit'],
  HOSPITALIZATION: ['hospital', 'internad', 'internac', 'urgencia'],
  SURGERY: ['cirug', 'quirófano', 'quirofano', 'esteriliz', 'operac'],
  LAB_IMAGING: ['laboratorio', 'radiograf', 'ecograf', 'examen', 'rayos x'],
  GROOMING: ['estétic', 'estetic', 'spa', 'peluquer', 'baño', 'guarder'],
  SERVICES: ['tarifa', 'promoc', 'descuento'],
  CASH_REGISTER: ['cobr', 'caja', 'mostrador', 'vend', 'tienda', 'pago'],
  INVENTORY: ['inventario', 'stock', 'product', 'aliment', 'medicament', 'bodega'],
  PURCHASES: ['compra', 'proveedor'],
  OPEN_ACCOUNTS: [
    'cartera',
    'cuenta abierta',
    'cuentas abiertas',
    'fiado',
    'fiamos',
    'credito',
    'crédito',
    'nos deben',
  ],
  ELECTRONIC_INVOICING: ['factur', 'dian'],
}

/**
 * Las notas del negocio, transcritas literal de la semilla 309.
 *
 * <p>La clave es `desde>hacia` porque un par de códigos puede tener a lo sumo un
 * arco: `catalog_item_dependencies` es único por `(item, related)`.
 */
const NOTAS: Readonly<Record<string, string>> = {
  'ELECTRONIC_INVOICING>CASH_REGISTER': 'Facturar electrónicamente necesita el módulo de Caja',
  'CAPACITY_TERMINAL>CASH_REGISTER': 'Las terminales de caja necesitan el módulo de Caja',
  'EXTRA_TERMINAL>CASH_REGISTER': 'Las terminales de caja necesitan el módulo de Caja',
  'OPEN_ACCOUNTS>CASH_REGISTER': 'Las cuentas abiertas se cierran cobrando en caja',
  'PURCHASES>INVENTORY': 'Registrar compras necesita Inventario para recibir la mercancía',
  'HOSPITALIZATION>CLINICAL_HISTORY':
    'La hospitalización cuelga de la historia clínica del paciente',
  'SURGERY>CLINICAL_HISTORY': 'La cirugía se registra dentro de la historia clínica',
  'LAB_IMAGING>CLINICAL_HISTORY': 'Los resultados de laboratorio se adjuntan a la historia clínica',
  'EXTRA_STORAGE>LAB_IMAGING':
    'El almacenamiento se consume con los archivos de laboratorio e imagen',
  'INVENTORY>CASH_REGISTER': 'Con Caja, el inventario descuenta solo al vender',
  'CLINICAL_HISTORY>SCHEDULING': 'La historia clínica se llena sola desde las citas',
  'VACCINATION_DEWORMING>SCHEDULING': 'Los refuerzos se programan como citas',
  'GROOMING>SCHEDULING': 'Los baños se agendan como citas',
}

/** La nota de un arco, o `null` si nadie le escribió una. */
export function NOTA_DE_ARCO(desde: string, hacia: string): string | null {
  return NOTAS[`${desde}>${hacia}`] ?? null
}

/**
 * Los cuatro `RECOMMENDS` que el contrato no trae.
 *
 * <p>Se declaran aparte de los `REQUIRES` y **no se mezclan con lo que llega del
 * servidor**: el seam los concatena marcados con su tipo, de modo que el día que
 * `requirements` traiga `type`, borrar esta constante y su uso en el seam es un
 * cambio de dos líneas que no toca ningún componente.
 */
export const ARCOS_EDITORIALES: readonly ArcoDependencia[] = [
  {
    desde: 'INVENTORY',
    hacia: 'CASH_REGISTER',
    tipo: 'RECOMMENDS',
    note: NOTA_DE_ARCO('INVENTORY', 'CASH_REGISTER'),
  },
  {
    desde: 'CLINICAL_HISTORY',
    hacia: 'SCHEDULING',
    tipo: 'RECOMMENDS',
    note: NOTA_DE_ARCO('CLINICAL_HISTORY', 'SCHEDULING'),
  },
  {
    desde: 'VACCINATION_DEWORMING',
    hacia: 'SCHEDULING',
    tipo: 'RECOMMENDS',
    note: NOTA_DE_ARCO('VACCINATION_DEWORMING', 'SCHEDULING'),
  },
  {
    desde: 'GROOMING',
    hacia: 'SCHEDULING',
    tipo: 'RECOMMENDS',
    note: NOTA_DE_ARCO('GROOMING', 'SCHEDULING'),
  },
]
