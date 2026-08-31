import type { PublicCatalog } from '../types/plans.types'

/**
 * CONTENIDO, NO CONTRATO. Y YA NO ES LO QUE `/planes` MUESTRA.
 *
 * ── ⚠️ LO QUE CAMBIÓ, Y ES LO PRIMERO QUE HAY QUE SABER ────────────────────
 * `plans.source.ts` **ya no devuelve este fichero**: pide `GET /plans` y compone
 * la respuesta del servidor. Ningún importe de los que hay aquí abajo llega hoy
 * a la pantalla de nadie.
 *
 * <p>El motivo fue un defecto comprobado contra dev: sin lista de precio
 * publicada el servidor responde 200 con la lista vacía —que es un estado NORMAL
 * del negocio, no una avería—, y esta pantalla seguía enseñando tres importes y
 * dejando avanzar a contratar. La mentira se descubría en el peor momento
 * posible, cuando alguien intentaba pagar.
 *
 * ── PARA QUÉ SIRVE ESTE FICHERO AHORA ──────────────────────────────────────
 * Dos cosas, y ninguna es «el catálogo»:
 *
 *   1. {@link OVERLAY_EDITORIAL} — lo único de aquí que SÍ viaja a producción.
 *      Es la capa editorial: qué paquete se destaca y qué `tagline` se corrige.
 *      Ver su propio javadoc.
 *   2. {@link PLANS_CONTENT} — la transcripción de referencia, que hoy solo
 *      consumen las pruebas: de muestra realista para `plan-pricing`,
 *      `contratacion-*` y `trial-lines-table`, y de sujeto del contraste contra
 *      las semillas en `plans-content-catalogo.spec.ts`. **Ya no es una fuente
 *      de precios para ninguna pantalla**, y por eso el riesgo que el sello
 *      vigilaba —que se separe de la tarifa sin que nadie se entere— dejó de
 *      poder llegar a un usuario. El sello se conserva porque el contraste
 *      contra las semillas sigue siendo la única puerta que detecta que el
 *      vocabulario del catálogo (`PACK_*`, `EXTRA_*`) se movió, y ese
 *      vocabulario sí viaja: `contratacion.source.ts` manda el `code` al
 *      servidor tal cual.
 *
 * <p><b>Si vuelves a enchufar este fichero al seam, lee antes lo de arriba.</b>
 * `tests/unit/planes-desde-el-servidor.spec.ts` afirma que `fetchPlans` llama a
 * `http.get('/plans')`, justamente para que ese camino de vuelta no sea
 * silencioso.
 *
 * La cifra que se muestra aquí es ORIENTATIVA y así se rotula en pantalla, con
 * «desde» delante y con la nota bajo las tarjetas. La cifra VINCULANTE la
 * calcula el servidor en el paso de contratación y puede no coincidir: ese
 * desacuerdo tiene su propio estado en pantalla (`PriceDriftNotice`), que además
 * DESMARCA la casilla de términos — nadie confirma un importe que no ha leído.
 *
 * ── DE DÓNDE SALE CADA CIFRA, ARTÍCULO POR ARTÍCULO ────────────────────────
 * De los changesets de siembra del backend, que son la fuente de verdad y se
 * aplican en TODOS los entornos (no llevan `context`):
 *
 *   · `308_seed_commercial_catalog_items.xml` — los 26 artículos: `code`, `name`,
 *     `item_type`, `trial_eligibility` y `default_trial_days`.
 *   · `309_seed_commercial_catalog_relations.xml` — `bundle_components`: qué
 *     módulos trae cada paquete. Es lo que alimenta `includes`.
 *   · `310_seed_price_list_2026.xml` — la tarifa `LISTA-2026-01` y sus 64 precios
 *     (32 tramos × 2 ciclos). Es lo que alimenta los importes.
 *
 * `tests/unit/plans-content-catalogo.spec.ts` contrasta este fichero contra esos
 * tres changesets cuando el repositorio del backend está al lado (el caso normal
 * del monorepo de trabajo). Esa prueba existe porque este fichero YA se separó
 * del catálogo una vez sin que nada lo detectara: declaraba tres planes
 * `ESENCIAL` / `CLINICA` / `CADENA` y módulos `AGENDA` / `HISTORIA` / `CAJA`, y
 * ninguno de los seis códigos existía. `contratacion.source.ts` manda el `code`
 * del plan al servidor tal cual, así que el embudo de compra estaba roto de
 * punta a punta y fallaba tarde, después de que el prospecto se registrara.
 */
/**
 * POR QUÉ LOS PLANES SON LOS TRES `PACK_*` Y NO OTROS.
 *
 * `GET /plans` publica **un plan por cada `catalog_items` de tipo `BUNDLE`**
 * ACTIVE con precio de entrada en la tarifa vigente (`JpaPublicPlanQueryPort`,
 * `SQL_PLANS`). Hoy hay exactamente tres: `PACK_SPA`, `PACK_CLINIC` y
 * `PACK_FULL`, en ese orden (`sort_order` 310 / 320 / 330).
 *
 * `CORE` (69.000 al mes) NO es un plan: es un `MODULE` obligatorio que viaja
 * dentro de los tres paquetes, así que no aparece en esta lista ni debe hacerlo.
 */
/**
 * `includes`: LOS COMPONENTES DE TIPO MÓDULO, CON SU PRUEBA REAL.
 *
 * `SQL_COMPONENTS` trae los componentes `MODULE` y `CAPACITY` del paquete y
 * `GetPublicPlansService.toPlan` los reparte: los `MODULE` van a `includes` y los
 * `CAPACITY` a `capacities`. `trialDays` es
 * `CASE WHEN trial_eligibility = 'ELIGIBLE' THEN default_trial_days END`.
 *
 * <p>De ahí salen los tres únicos valores posibles hoy: **30** (núcleo, agenda,
 * historia clínica, vacunación, hospitalización, cirugía, laboratorio, spa y
 * servicios), **14** (caja, inventario, compras y cuentas abiertas) y **`null`**.
 *
 * <p>`null` es el caso de `ELECTRONIC_INVOICING`, y merece decirse entero: la
 * facturación electrónica DIAN es `NEVER_FREE` en el catálogo —`trial_eligibility
 * = 'NEVER_FREE'`, `default_trial_days = NULL`, y `chk_catalog_items_trial_policy`
 * lo impone como arco exclusivo—. Este fichero prometía 14 días de prueba sobre
 * ella. No es un matiz de rótulo: un paquete probable regalaría la facturación
 * electrónica que lleva dentro, que es justamente lo que el catálogo prohíbe
 * (D-05). `PlanesConfigurador.textoPrueba` rotula `null` como «Sin prueba».
 *
 * <p>`CAPACITY_TERMINAL` (la terminal de caja incluida) es el único componente de
 * tipo `CAPACITY` de los tres paquetes, y **no se transcribe**: la pantalla solo
 * pregunta por sedes y personas, no por terminales, y una capacidad que la
 * pantalla no ofrece no tiene nada que aportar aquí. Ver la nota siguiente.
 */
/**
 * `capacities`: LOS DOS EJES QUE LA PANTALLA SÍ PREGUNTA, Y SU LETRA PEQUEÑA.
 *
 * `code` y `name` son el ARTÍCULO que vende la unidad adicional —`EXTRA_USER`
 * «Usuario adicional» y `EXTRA_BRANCH` «Sede adicional»—, y `unit` es el eje
 * sobre el que se cuenta. El tipo `PlanCapacity` ya dejaba escrito que no son lo
 * mismo; antes aquí se transcribía el eje en las dos columnas (`code: 'USER'`),
 * que no es el código de ningún artículo del catálogo.
 *
 * <p>`included` NO sale del paquete: sale del mínimo estructural que la
 * plataforma concede a toda empresa nueva, que es el mismo con cualquiera de los
 * tres paquetes. `CapacityGrantLine.ceiling()` es `included_quantity + quantity`,
 * y con la plantilla inicial (`findInitialCapacityTemplates`, cantidad
 * `min_quantity = 1`) sale:
 *
 *   · `CAPACITY_USER`   → `included_quantity` 1 + 1 = **2 personas**
 *   · `CAPACITY_BRANCH` → `included_quantity` 0 + 1 = **1 sede**
 *
 * Los 3/8/20 usuarios y 1/2/5 sedes que este fichero declaraba por plan no salían
 * de ninguna parte del catálogo.
 *
 * <p>Los importes son el TRAMO DE ENTRADA (`tier_min = 1`) de cada artículo en
 * `LISTA-2026-01`, en los dos ciclos, que sí están publicados: `EXTRA_USER`
 * 12.000 / 120.000 y `EXTRA_BRANCH` 35.000 / 350.000. Los seis `null` anuales que
 * había aquí decían «la escalera ANNUAL no está publicada en ninguna fuente
 * legible»; sí lo está, en las 32 filas anuales del changeset 310. Los tramos
 * superiores (EXTRA_USER 9+ a 9.000; EXTRA_BRANCH 3-9 a 28.000, 10+ a 22.000) NO
 * se transcriben porque el contrato publica solo el tramo de entrada: la escalera
 * completa es política de descuento por volumen y no se publica.
 *
 * >>> LO QUE ESTA TRANSCRIPCIÓN NO PUEDE ARREGLAR, Y HAY QUE SABER <<<
 * `EXTRA_USER` y `EXTRA_BRANCH` son códigos REALES y con precio, pero **hoy no se
 * pueden contratar por autoservicio**: `findPublishedIdByCode` solo resuelve un
 * `BUNDLE` publicado o un `MODULE`/`CAPACITY` que **cuelgue de un paquete**, y
 * ninguno de los dos es componente de ningún paquete. Así que la línea que
 * `lineasDeContratacion` empuja al pasar de lo incluido se rechaza con
 * `Unknown or unavailable catalog item code` y hunde la oferta entera. Eso es un
 * hueco del CATÁLOGO, no de este fichero, y no se tapa desde aquí: poner otro
 * código sería volver a inventar, y no mandar la línea cobraría el paquete base
 * mientras el cliente cree haber comprado cinco personas. Se deja fallar.
 */
/**
 * LA CAPA EDITORIAL: lo único de este fichero que llega a producción.
 *
 * <p>Es la mitad de «lo que es dinero viene del servidor; lo que es mensaje
 * puede seguir siendo del front». El servidor manda el precio, el nombre, lo que
 * incluye y las capacidades; esto de aquí decide qué se destaca y arregla un
 * texto de escaparate. Se aplica en `plans.source.ts`, por código, y un código
 * que el servidor ya no publique simplemente no encuentra su entrada.
 *
 * ── `recommended`: no existe en el contrato, y no es un olvido ──────────────
 * `PublicPlanResponse` no lo trae porque no es un dato del modelo comercial:
 * cuál de los tres paquetes se rodea con el marco «el más elegido» es una
 * decisión de la portada. Por eso `PublicPlan` extiende `PublicPlanContract` en
 * vez de ser el mismo tipo. Si nadie casa, `plans.store.ts` cae al primero de la
 * lista, que es el orden del servidor (`sort_order`).
 *
 * ── `tagline`: se corrige UNO, y hay que decir por qué ──────────────────────
 * El servidor publica `short_description` como `tagline`. Las de `PACK_SPA` y
 * `PACK_CLINIC` son texto de escaparate y se usan tal cual. La de `PACK_FULL` en
 * el changeset 308 es una nota interna de modelado —«Todo el producto: quince
 * piezas enumeradas, sin anidar paquetes»— y transcribirla pondría esa frase en
 * la pantalla donde alguien decide una compra.
 *
 * <p><b>Esto es un parche, y el arreglo de verdad es la semilla.</b> Mientras la
 * semilla no cambie, la alternativa era peor: enseñar la nota de modelado.
 * Cuando `short_description` de `PACK_FULL` se corrija en el backend, esta
 * entrada sobra y hay que borrarla — no se cae sola, porque un `tagline` local
 * que coincide con el del servidor no se distingue de uno que lo tapa.
 */
export const OVERLAY_EDITORIAL: Readonly<
  Record<string, { readonly recommended?: boolean; readonly tagline?: string }>
> = {
  PACK_CLINIC: { recommended: true },
  PACK_FULL: { tagline: 'Todo el producto, de la historia clínica a la facturación DIAN' },
}

export const SELLO = {
  listaDePrecioCodigo: 'LISTA-2026-01',
  revisadoEl: '2026-08-29',
  revisadoPor: 'contraste con los changesets 308/309/310 del backend',
} as const

/**
 * Cuántos días puede pasar el sello sin revisar antes de que la prueba unitaria
 * lo cante. No es un número redondo por gusto: un trimestre es lo que tarda una
 * lista de precio en moverse sin que nadie se acuerde de este fichero, y el
 * fallo tiene que ser RUIDOSO, porque la alternativa —un precio publicado que se
 * separó del real y nadie lo sabe— es silenciosa por definición.
 */
export const SELLO_MAX_DIAS = 90

/**
 * Las dos capacidades que la pantalla pregunta. Son las mismas en los tres
 * paquetes porque el mínimo estructural que las concede es el mismo: se declara
 * una vez y se referencia, en vez de repetir tres veces dos filas que tienen que
 * mantenerse iguales. Ver la nota de `capacities` de arriba.
 */
const CAPACIDADES_DEL_NUCLEO: PublicCatalog['plans'][number]['capacities'] = [
  {
    code: 'EXTRA_USER',
    name: 'Usuario adicional',
    unit: 'USER',
    included: 2,
    monthlyExtraUnitAmount: 12000,
    annualExtraUnitAmount: 120000,
  },
  {
    code: 'EXTRA_BRANCH',
    name: 'Sede adicional',
    unit: 'BRANCH',
    included: 1,
    monthlyExtraUnitAmount: 35000,
    annualExtraUnitAmount: 350000,
  },
]

export const PLANS_CONTENT: PublicCatalog = {
  currency: 'COP',
  priceValidFrom: '2026-08-27',
  plans: [
    {
      code: 'PACK_SPA',
      name: 'Pack Spa',
      tagline: 'Núcleo, agenda, servicios, spa y caja',
      recommended: false,
      monthlyFromAmount: 179000,
      annualFromAmount: 1790000,
      setupAmount: 0,
      taxRate: 19,
      taxTreatment: 'TAXED',
      includes: [
        { code: 'CORE', name: 'Núcleo: clientes y mascotas', trialDays: 30 },
        { code: 'SCHEDULING', name: 'Agenda de citas', trialDays: 30 },
        { code: 'GROOMING', name: 'Spa, estética y guardería', trialDays: 30 },
        { code: 'SERVICES', name: 'Servicios, tarifas y promociones', trialDays: 30 },
        { code: 'CASH_REGISTER', name: 'Caja y punto de venta', trialDays: 14 },
      ],
      capacities: [...CAPACIDADES_DEL_NUCLEO],
    },
    {
      code: 'PACK_CLINIC',
      name: 'Pack Clínica',
      tagline: 'Núcleo, agenda, historia clínica, vacunación y caja',
      recommended: true,
      monthlyFromAmount: 189000,
      annualFromAmount: 1890000,
      setupAmount: 0,
      taxRate: 19,
      taxTreatment: 'TAXED',
      includes: [
        { code: 'CORE', name: 'Núcleo: clientes y mascotas', trialDays: 30 },
        { code: 'SCHEDULING', name: 'Agenda de citas', trialDays: 30 },
        { code: 'CLINICAL_HISTORY', name: 'Historia clínica y consultas', trialDays: 30 },
        { code: 'VACCINATION_DEWORMING', name: 'Vacunación y desparasitación', trialDays: 30 },
        { code: 'CASH_REGISTER', name: 'Caja y punto de venta', trialDays: 14 },
      ],
      capacities: [...CAPACIDADES_DEL_NUCLEO],
    },
    {
      // `tagline` es la ÚNICA divergencia deliberada de este fichero frente al
      // catálogo, y va declarada porque el día que `plans.source.ts` lea de la
      // red se va a notar. `SQL_PLANS` publica `short_description` como tagline, y
      // la de `PACK_FULL` en el changeset 308 es una nota interna de modelado
      // —«Todo el producto: quince piezas enumeradas, sin anidar paquetes»—, no
      // texto de escaparate. Transcribirla literalmente pondría esa frase en la
      // pantalla donde alguien decide una compra. Lo que hay que corregir es la
      // semilla; mientras tanto, aquí va una frase que dice lo mismo sin la nota
      // de modelado. Las de `PACK_SPA` y `PACK_CLINIC` sí van literales.
      code: 'PACK_FULL',
      name: 'Pack Clínica completa',
      tagline: 'Todo el producto, de la historia clínica a la facturación DIAN',
      recommended: false,
      monthlyFromAmount: 449000,
      annualFromAmount: 4490000,
      setupAmount: 0,
      taxRate: 19,
      taxTreatment: 'TAXED',
      includes: [
        { code: 'CORE', name: 'Núcleo: clientes y mascotas', trialDays: 30 },
        { code: 'SCHEDULING', name: 'Agenda de citas', trialDays: 30 },
        { code: 'CLINICAL_HISTORY', name: 'Historia clínica y consultas', trialDays: 30 },
        { code: 'VACCINATION_DEWORMING', name: 'Vacunación y desparasitación', trialDays: 30 },
        { code: 'HOSPITALIZATION', name: 'Hospitalización', trialDays: 30 },
        { code: 'SURGERY', name: 'Cirugía', trialDays: 30 },
        { code: 'LAB_IMAGING', name: 'Laboratorio e imagen diagnóstica', trialDays: 30 },
        { code: 'GROOMING', name: 'Spa, estética y guardería', trialDays: 30 },
        { code: 'SERVICES', name: 'Servicios, tarifas y promociones', trialDays: 30 },
        { code: 'CASH_REGISTER', name: 'Caja y punto de venta', trialDays: 14 },
        { code: 'INVENTORY', name: 'Inventario y kardex', trialDays: 14 },
        { code: 'PURCHASES', name: 'Compras y proveedores', trialDays: 14 },
        { code: 'OPEN_ACCOUNTS', name: 'Cuentas abiertas y cartera', trialDays: 14 },
        // NEVER_FREE en el catálogo: no hay prueba que prometer. Ver la nota de
        // `includes` de arriba.
        { code: 'ELECTRONIC_INVOICING', name: 'Facturación electrónica DIAN', trialDays: null },
      ],
      capacities: [...CAPACIDADES_DEL_NUCLEO],
    },
  ],
}
