# El configurador público — especificación de diseño

> **Qué sustituye.** El selector de paquetes (`/planes` + la sección de planes de la landing) deja de
> ser el camino público de compra. En su lugar: **un cuestionario corto sobre la práctica del
> cliente que produce una propuesta de módulos sueltos, con su precio y su total**, y un **aviso de
> paquete** solo cuando un paquete salga más barato.
>
> **Frontera de este documento.** Lo escribe el agente de UX y **no toca `src/`**. Lo implementa
> `front-feature`. Las primitivas (`tokens.css`, `primitives.css`) son gemelos TR-02 y solo las toca
> `front-parity`; aquí se pide una primitiva, no se escribe. Los cambios de datos del cuestionario
> (`configurator_questions`, `_options`, `_effects`) son un **changeset de Liquibase en el backend**,
> no código de front: van redactados en §4.4 para que el agente de backend los aplique.
>
> Fecha: 2026-08-29. Todo lo de §1 está verificado leyendo el árbol; lo que no pude verificar está
> marcado como tal.

---

## Índice

1. [El terreno verificado](#1-el-terreno-verificado)
2. [Cuatro defectos que la implementación tiene que evitar](#2-cuatro-defectos-que-la-implementación-tiene-que-evitar)
3. [El contrato que hace falta](#3-el-contrato-que-hace-falta)
4. [El cuestionario](#4-el-cuestionario)
5. [El recorrido completo](#5-el-recorrido-completo)
6. [Accesibilidad, pantalla por pantalla](#6-accesibilidad-pantalla-por-pantalla)
7. [Reglas de honestidad de las cifras](#7-reglas-de-honestidad-de-las-cifras)
8. [Plan de ficheros y presupuesto](#8-plan-de-ficheros-y-presupuesto)
9. [Qué se retira](#9-qué-se-retira)
10. [Cómo se verifica](#10-cómo-se-verifica)
11. [Juicios comerciales que el dueño tiene que confirmar](#11-juicios-comerciales-que-el-dueño-tiene-que-confirmar)

---

## 1. El terreno verificado

### 1.1 El motor del configurador **ya existe en el backend**, y está sembrado

Esto es lo primero que hay que saber, porque cambia el trabajo entero: **no hay que inventar un
cuestionario, hay que rediseñar el que ya está en la base de datos**.

| Pieza | Dónde | Qué hace |
|---|---|---|
| Cuestionario público | `VetSoftware/.../configurator/infrastructure/web/ConfiguratorController.java:63` | `GET /configurator/questionnaire` → preguntas con sus opciones |
| Resolución pública | mismo fichero, `:69` | `POST /configurator/resolve` → `{items:[{catalogItemId, quantity}]}` |
| Las dos son públicas | `auth/infrastructure/config/PublicRoutes.java` (bloque `/configurator/...`) | patrones literales, y el POST con límite de 60/min por IP |
| Motor de reglas | `configurator/domain/ConfiguratorResolver.java:77` | aplica los efectos en orden `(priority, id)`; `ADD` / `REMOVE` / `SET_QUANTITY` / `QUANTITY_FROM_ANSWER` |
| Tipos de respuesta | `configurator/domain/AnswerType.java` | `SINGLE`, `MULTI`, `NUMBER`, `BOOLEAN` |
| Preguntas condicionales | `QuestionnaireQuestionResponse.parentOptionId` | una pregunta cuelga de una opción concreta |
| Datos sembrados hoy | `db/changelog/migrations/312_seed_configurator.xml` | **6 preguntas, 12 opciones, 49 efectos** |
| Catálogo comercial | `308_seed_commercial_catalog_items.xml` | 26 artículos con `item_type`, `is_core`, `capacity_unit` |
| Dependencias y paquetes | `309_seed_commercial_catalog_relations.xml:142` y `:234-260` | 9 `REQUIRES` + 4 `RECOMMENDS`; y la composición de los 3 paquetes |
| Tarifa vigente | `310_seed_price_list_2026.xml:134-168` | 32 tramos × 2 ciclos, `LISTA-2026-01`, COP |

El cuestionario sembrado hoy pregunta: tipo de negocio (`SINGLE` ×4), nivel de atención médica
(`SINGLE` ×4), si vende productos (`BOOLEAN`), si cobra en mostrador (`BOOLEAN`), cuántas cajas
(`NUMBER`, condicional) y cuántas personas (`NUMBER`). Se rediseña en §4; lo que **no** se rediseña
es el motor.

### 1.2 Lo que el front tiene hoy, y qué se conserva

- `src/features/landing/` — landing y `/planes`. La sección de paquetes (`LandingPlans.vue`,
  `PlanCard.vue`) y el configurador de capacidad (`PlanesConfigurador.vue`) **se retiran** (§9).
- `src/features/landing/content/plans.content.ts` — **precios transcritos a mano**, con sello
  (`SELLO.revisadoEl`). Muere en cuanto exista el endpoint de catálogo (§3).
- `src/features/landing/composables/planPricing.ts` — la aritmética y, sobre todo, **el vocabulario
  de honestidad**: `MONEDA_DE_FACTURACION` (:52), `importeEstimado` → `—` y nunca `$ 0` (:257),
  `textoSinPrecio` (:270). **Se conserva y se extiende**; no se escribe una segunda cuenta.
- `src/features/contratacion/` — pasos 6 y 7, ya construidos y correctos: idempotencia, deriva de
  precio (`PriceDriftNotice`), `DemoModeNotice`, `ErrorSummary`, foco al `<h1>`, permiso
  `quote.request`. **Se conserva entero**; solo cambia la forma de la intención (§5.7).
- Primitivas del tenant: `src/components/ui/` (`SegmentedRadio`, `BaseField`, `SectionCard`,
  `ModalShell`, …) y `src/components/feedback/` (`PawLoader`, `ErrorSummary`, `ToastStack`).
- Zona pública: `src/assets/styles/public-auth.css` define `.pub-scope`, `.pub-title`, `.pub-sub`,
  `.pub-section`, `.pub-section-head`, `.pub-card`, `.pub-error`, `.pub-skip`, `.pub-badge`,
  `.pub-price` y `.pub-plan-card` (esta última queda huérfana, §9).

### 1.3 Presupuestos que acotan la implementación

`scripts/css-budget.config.json`: `maxStyleMinusScript: 0`, `maxDuplicateGroups: 0`,
`maxSfcLines: 500`, `maxOversizedSfc: 0`. Es **trinquete**: los números solo bajan.
`ContratarView.vue` está en 497 líneas — no le cabe nada. `scripts/ds-audit.config.json`:
`maxDiffs: 320`, también trinquete.

Consecuencia dura para quien implemente: **cada SFC nueva tiene que aportar más plantilla+script que
CSS**, y ningún cuerpo de regla puede repetir una primitiva (`vetsoftware/no-duplicate-primitive`).
Si un patrón visual nuevo no se puede construir con `ds-*` + `pub-*`, **no se escribe CSS local: se
pide la primitiva a `front-parity`** (§8.3).

---

## 2. Cuatro defectos que la implementación tiene que evitar

Los cuatro están vivos hoy o aparecerían solos si nadie los nombra. Los tres primeros producen
**un precio equivocado en la pantalla donde alguien compra**, que es el peor fallo posible de este
flujo, y por eso van antes que ninguna cuestión de diseño.

> **[Bloqueante] `/configurator/resolve` devuelve la capacidad SIN restar lo incluido** —
> `ConfiguratorResolver.java:35-39` y la cabecera de `312_seed_configurator.xml` (punto 2).
> **Criterio:** Nielsen #1 (visibilidad del estado real) y, sobre todo, exactitud del precio.
> **Impacto:** el resolvedor declara explícitamente que **no** resta `included_quantity` («la resta
> va en el servicio que cotiza»), y el servicio que cotiza corre **después** de contratar. Un
> veterinario que trabaja solo responde «1 persona» y el carrito vuelve con `EXTRA_USER × 1`: se le
> cobran 12.000 al mes por un usuario que ya trae incluido. Afecta a las tres preguntas numéricas y
> por tanto a **todas** las propuestas.
> **Arreglo:** el front **nunca** factura una línea `EXTRA_*` con la cantidad cruda del `resolve`.
> Calcula `facturable = max(0, respondido − techoIncluido)` con el techo publicado por el catálogo
> (§3, campo `includedCeiling`). Si el catálogo no lo publica, **no se muestra importe para ese eje**
> (`—` + `textoSinPrecio`), nunca un número inventado.

> **[Bloqueante] El precio de la unidad extra es por TRAMOS, y el front lo multiplica linealmente** —
> `planPricing.ts:139-152` (`costeExtra` hace `precio * cobradas`) contra
> `310_seed_price_list_2026.xml:152-159`.
> **Criterio:** exactitud del precio; y el caso 3 del flujo actual (deriva de precio).
> **Impacto:** la escalera real de `EXTRA_USER` es 1-8 a 12.000 y 9-∞ a 9.000. Una clínica de 15
> personas paga 141.000 (96.000 + 45.000) y la pantalla le enseña 156.000 (13 × 12.000): **15.000 de
> más al mes**, y luego `PriceDriftNotice` salta en el paso vinculante para desmentir a la landing.
> Con `EXTRA_BRANCH` (tres tramos) y `EXTRA_TERMINAL` (dos) pasa lo mismo. El defecto ya existe hoy
> en `/planes`; el configurador lo heredaría multiplicado por tres ejes.
> **Arreglo:** el catálogo público publica **la escalera completa por artículo y ciclo** (§3) y el
> front la aplica acumulativamente. Mientras no la publique, los importes de capacidad extra se
> rotulan `desde` y **no entran en el total**: entra el total de módulos y una línea aparte
> «unidades adicionales: se calculan al confirmar». Un total redondo y falso es peor que un total
> incompleto y dicho.

> **[Bloqueante] El carrito puede salir con dependencias rotas** —
> `309_seed_commercial_catalog_relations.xml:156-192`, `CatalogItemDependency.java:6-11`.
> **Criterio:** Nielsen #5 (prevención de errores). La tabla existe literalmente para que «un cliente
> no compre Facturación electrónica sin Caja y lo descubra después de pagar».
> **Impacto:** hay 9 `REQUIRES` (`HOSPITALIZATION`, `SURGERY` y `LAB_IMAGING` → `CLINICAL_HISTORY`;
> `PURCHASES` → `INVENTORY`; `OPEN_ACCOUNTS`, `CAPACITY_TERMINAL`, `EXTRA_TERMINAL` y
> `ELECTRONIC_INVOICING` → `CASH_REGISTER`). En el paso de **ajuste** (§5.6) el cliente puede quitar
> `CASH_REGISTER` y dejar en pie tres módulos que no funcionan sin él.
> **Arreglo:** el catálogo público publica las aristas `REQUIRES` (§3) y el front las hace cumplir en
> el ajuste: quitar un artículo del que otros dependen abre un aviso que **nombra los arrastrados y
> los quita con él**, con deshacer. Añadir un artículo con `REQUIRES` insatisfecho añade también su
> requisito, dicho en la misma frase y con su precio.

> **[Grave] La propuesta no puede explicar por qué incluye cada cosa con lo que hay hoy** —
> `ConfiguratorSelectionResponse.java` (solo `catalogItemId` + `quantity`).
> **Criterio:** Nielsen #1 y #7, y la promesa del dueño («la lista exacta que sus respuestas
> implican»). Una lista de trece cobros sin causa no es una propuesta, es una factura.
> **Arreglo, sin esperar al backend:** el front resuelve **una vez por paso respondido** y **diffea**
> el resultado contra el del paso anterior; lo que apareció en el paso *n* se atribuye a la respuesta
> del paso *n*. Con eso cada línea lleva «Porque respondiste: *Hospitalización*». Es el mismo recurso
> que la consola ya usa (`ConfiguratorQuestionnaireView` → `SelectionDiff`). Coste: 4-6
> `POST /configurator/resolve` por sesión, muy por debajo del límite de 60/min.
> **Petición al backend (deseable, no bloqueante):** un `reason: {questionCode, optionCode}` por ítem
> haría el diff innecesario.

---

## 3. El contrato que hace falta

`GET /plans` publica **paquetes**, no artículos sueltos, y `/configurator/resolve` devuelve **ids sin
nombre ni precio**. Entre los dos no se puede pintar una propuesta à la carte. Lo que el front
necesita del endpoint público que el agente de backend está construyendo, en orden de necesidad:

**C-1 · Un artículo del catálogo, con precio por ciclo.** Por cada `catalog_item` `ACTIVE` con
tarifa vigente:

```jsonc
{
  "id": 12,                    // el mismo Long que devuelve /configurator/resolve — es la llave del cruce
  "code": "CLINICAL_HISTORY",
  "name": "Historia clínica y consultas",
  "shortDescription": "Consultas, diagnósticos y tratamientos del paciente",
  "itemType": "MODULE",        // MODULE | CAPACITY | BUNDLE | ONE_TIME
  "capacityUnit": null,        // no nulo si y solo si itemType = CAPACITY
  "isCore": false,
  "trialDays": 30,             // ya filtrado por política ELIGIBLE, como PublicPlanComponentRowDto
  "monthlyAmount": 49000,      // null = NO SE VENDE en ese ciclo. Nunca 0 por ausencia.
  "annualAmount": 490000,
  "setupAmount": 0             // DATA_MIGRATION lleva aquí sus 450.000
}
```

**C-2 · El techo incluido de cada eje de capacidad.** `includedCeiling` por artículo `CAPACITY` y
ciclo: el número de unidades que el contrato mínimo ya trae. Hoy el front tendría que deducirlo como
`included_quantity + 1` asumiendo que se contrata **una** unidad del artículo de capacidad, que es
una suposición del front sobre el modelo de suscripción — exactamente la clase de suposición que
produce un cobro de más. **Sin este campo, el defecto bloqueante nº 1 no se puede cerrar.**

**C-3 · La escalera de precios completa.** Por artículo y ciclo, la lista de tramos
`{tierMin, tierMax, unitAmount}`. Sin ella el front no puede sumar `EXTRA_USER` para más de ocho
personas sin mentir (defecto nº 2). Alternativa aceptable y más barata: un endpoint
`POST /configurator/quote-preview` que reciba el carrito y devuelva los importes ya calculados —
sería además **una sola verdad** sobre el precio, que es el criterio que `ConfiguratorSelectionResponse`
ya defiende en su javadoc.

**C-4 · La composición y el precio de los paquetes.** Por cada `BUNDLE`: sus `componentCode[]` y sus
importes por ciclo. Sin la composición no se puede decidir si un paquete **cubre** la selección, que
es la condición entera del aviso de §5.5.

**C-5 · Las aristas `REQUIRES`.** `{itemCode, requiresCode}[]`. Defecto nº 3.

**C-6 · La cabecera de tarifa.** `currency` y `priceValidFrom`, **nulables**, con el mismo
significado que hoy en `PublicPlanCatalogResponse`: `null` = no hay tarifa vigente, y la pantalla
sigue cargando (200, no 404).

Mientras C-1…C-6 no existan, `plans.source.ts` sigue siendo el seam y el front lee de contenido
sellado. **Lo que no se hace es empezar por el contenido y migrar después**: el tipo se escribe ya con
la forma de C-1 y `api.contract.ts` lo ata en cuanto el esquema exista.

---

## 4. El cuestionario

### 4.1 Los cinco principios, y qué descartan

1. **Se pregunta por la práctica, nunca por el software.** «¿Hospitalizáis pacientes?» sí;
   «¿Necesitas el módulo de Hospitalización?» no — obliga al cliente a hacer nuestro mapeo y a
   adivinar qué hay dentro de un módulo que todavía no ha visto.
2. **Menos preguntas que módulos.** Una pregunta por módulo (14) es un formulario de configuración
   disfrazado. El objetivo son **cuatro pantallas** y el minuto que promete la landing.
3. **Lo que casi todos necesitan no se pregunta: se incluye y se enseña.** `CORE` y `SCHEDULING` van
   por defecto. **Eso no es colar nada en la cesta** porque se cumplen las tres condiciones que
   separan un valor por defecto de un cobro escondido: la línea **aparece** en la propuesta, lleva
   **su precio**, y tiene **su botón de quitar** con el mismo peso visual que el resto.
4. **Capacidad no es función.** «¿Cuántas sedes?» es una cantidad, no un sí/no, y va en su propio
   paso, con los tres campos **prellenados a 1**: quien trabaja solo en un local pulsa «Continuar»
   sin escribir nada.
5. **Ninguna pregunta cuya respuesta no cambie el carrito.** Es el filtro que elimina la pregunta de
   tipo de negocio (§4.3).

### 4.2 El conjunto propuesto: 4 pasos, 6 preguntas

| # | Paso | Pregunta | Tipo | Qué compra (y solo eso) |
|---|---|---|---|---|
| P1 | 1 | **«¿Qué hacéis en un día normal?»** | `MULTI`, 6 opciones, ≥1 obligatoria | 8 módulos: `CLINICAL_HISTORY`, `VACCINATION_DEWORMING`, `SURGERY`, `HOSPITALIZATION`, `LAB_IMAGING`, `GROOMING`, `INVENTORY`, `PURCHASES` — más `SCHEDULING` y `OPEN_ACCOUNTS` por implicación |
| P2 | 2 | **«¿Cómo cobráis a los clientes?»** | `SINGLE`, 3 opciones | `CASH_REGISTER`, `CAPACITY_TERMINAL`, `SERVICES` |
| P3 | 3 | **«¿Emitís factura electrónica a la DIAN?»** | `SINGLE`, 3 opciones | `ELECTRONIC_INVOICING` (+ `CASH_REGISTER` por dependencia) |
| P4 | 4 | **«¿En cuántas sedes trabajáis?»** | `NUMBER`, defecto 1 | `EXTRA_BRANCH` |
| P5 | 4 | **«¿Cuántas personas van a usar el sistema?»** | `NUMBER`, defecto 1 | `EXTRA_USER` |
| P6 | 4 | **«¿Cuántos puntos de cobro funcionan a la vez?»** | `NUMBER`, defecto 1, **condicional** de P2=mostrador | `EXTRA_TERMINAL` |

Cuatro pantallas. Para el caso más común —una clínica pequeña que cobra en mostrador y no factura
electrónicamente— son **tres clics, una elección y un botón**: unos 40 segundos.

**Textos completos.**

**P1 — `DAILY_WORK` (`MULTI`, requerida, sort 10)**
> **¿Qué hacéis en un día normal?**
> Marca todo lo que aplique. Con esto armamos tu propuesta; después puedes quitar o añadir lo que
> quieras.

| Código | Etiqueta | Ayuda |
|---|---|---|
| `CONSULT` | Consultas, vacunas y desparasitación | El día a día de un veterinario con paciente delante. |
| `SURGERY` | Cirugías | Programadas o de urgencia, con su parte quirúrgico. |
| `INPATIENT` | Hospitalización o internación | Pacientes que se quedan y acumulan cargos por día. |
| `DIAGNOSTICS` | Laboratorio o imagen propios | Analítica, rayos X o ecografía que hacéis vosotros. |
| `GROOMING` | Baños, peluquería y estética | Con o sin veterinario de por medio. |
| `RETAIL` | Venta de alimento, medicamento o accesorios | Mercancía que entra, se guarda y sale. |

**P2 — `HOW_YOU_CHARGE` (`SINGLE`, requerida, sort 20)**
> **¿Cómo cobráis a los clientes?**

| Código | Etiqueta | Ayuda |
|---|---|---|
| `COUNTER` | En el mostrador, con cierre de caja al final del día | Efectivo, tarjeta o transferencia, con arqueo. |
| `OUTSIDE` | Cobramos, pero fuera del sistema | Datáfono o transferencia por vuestra cuenta; aquí solo queréis las tarifas. |
| `NOT_YET` | Todavía no cobramos por aquí | Podéis añadirlo cuando queráis, sin cambiar de plan. |

**P3 — `DIAN_INVOICING` (`SINGLE`, requerida, sort 30)**
> **¿Emitís factura electrónica a la DIAN?**
> Si ya facturáis, o si os toca hacerlo este año, el módulo os ahorra el proveedor externo.

| Código | Etiqueta |
|---|---|
| `YES` | Sí, ya facturamos electrónicamente |
| `SOON` | Todavía no, pero nos va a tocar |
| `NO` | No nos aplica |

**P4 / P5 / P6 — el paso de capacidad (`NUMBER`)**
> **Un último dato: el tamaño**
> Los tres vienen con lo mínimo puesto. Si trabajas en un local y sola, no toques nada.

- `BRANCH_COUNT` — «¿En cuántas sedes trabajáis?» · ayuda: «Locales con dirección distinta.» · min 1
- `USER_COUNT` — «¿Cuántas personas van a usar el sistema?» · ayuda: «Veterinarios, auxiliares y quien
  esté en recepción.» · min 1
- `TERMINAL_COUNT` — «¿Cuántos puntos de cobro funcionan a la vez?» · ayuda: «Cada sitio donde se
  cobra al mismo tiempo.» · min 1 · **solo si P2 = `COUNTER`** (`parentOptionId`)

### 4.3 Qué se quita del cuestionario sembrado, y por qué

**`BUSINESS_TYPE` (la P1 actual) se elimina.** Es la única pregunta cuya respuesta no determina nada
que otra no determine mejor:

- `CLINIC` añade `CLINICAL_HISTORY` + `VACCINATION_DEWORMING`, exactamente lo mismo que
  `MEDICAL_CONSULTATIONS=BASIC` dos pantallas después (`312`, prioridades 12-13 contra 20-21).
- `PETSHOP` añade `INVENTORY`, `PURCHASES` y `CASH_REGISTER`, que vuelven a preguntarse en
  `SELLS_PRODUCTS` y `CHARGES_AT_COUNTER`.
- `MIXED` —que es lo que va a marcar media Colombia— añade **solo** `CORE` + `SCHEDULING`: la
  pregunta más visible del cuestionario no compra nada en su respuesta más probable.
- Y deja **un agujero real**: `GROOMING` solo es alcanzable con `BUSINESS_TYPE=SPA`. Una clínica que
  además baña —el caso mayoritario— **nunca puede comprar Peluquería desde el configurador**. Un
  módulo de 29.000 al mes, invendible por diseño.

Con P1 = `MULTI` de actividades el agujero desaparece y además desaparece **casi todo el `REMOVE`**:
de los 49 efectos sembrados, 15 son `REMOVE` y existen para que una pregunta corrija a la anterior.
Ese mecanismo es el que produjo el defecto D-98 («marcar más servicios produce un carrito más
pequeño») y el que obliga a repartir prioridades por decenas. Una casilla no marcada simplemente no
dispara: **no hay nada que deshacer**. La invariante de prioridades se conserva igual (§4.4), pero
deja de ser lo único que separa al carrito de un error silencioso.

**Lo que no se pregunta, y por qué no es un olvido:**

| No se pregunta | Motivo |
|---|---|
| `CORE` | `is_core = TRUE` (`308:41-46`). No es opcional: sin él no hay contrato. Se enseña siempre (§4.6). |
| `SCHEDULING` | Lo implica toda actividad con cita. Va por defecto salvo que la única respuesta de P1 sea `RETAIL` (§4.4). Visible, con precio y con «quitar». |
| `SERVICES` | Es el catálogo de tarifas. Lo implica cobrar, de cualquier forma. Sin él no hay qué cobrar. |
| `CAPACITY_USER` / `CAPACITY_BRANCH` | `is_core = TRUE` los dos (`308:41-46`): sin ellos el alta de la empresa falla entera con `PLATFORM_CATALOG_NOT_CONFIGURED`. Se enseñan como «incluido», a 0. |
| `EXTRA_STORAGE` | Se ofrece cuando el contador se acerca al techo, no en la venta. Es la decisión que ya toma `312` y sigue siendo correcta. |
| `ONBOARDING` | Vale 0 (`310:161`). Se enseña como línea «Implantación y capacitación — incluida», nunca se calla. |
| `DATA_MIGRATION` | 450.000 de una vez. **No es una pregunta del cuestionario**: es una casilla opcional en el paso de ajuste, con su importe y la frase de que se cobra una sola vez (§5.6). Preguntarlo en el embudo mete un susto de 450.000 en mitad de un flujo de un minuto. |

### 4.4 El mapa completo respuesta → carrito

Formato: `(pregunta, opción) → efecto artículo @prioridad`. La **invariante de prioridades** se
mantiene: una decena por paso, ninguna pregunta corrige a una posterior. Con P1 en `MULTI` no hace
falta ningún `REMOVE`, así que los efectos conmutan y el orden deja de ser la única defensa.

```
P1 DAILY_WORK  (decena 10)
  CONSULT      → ADD CORE @10 · ADD SCHEDULING @11 · ADD CLINICAL_HISTORY @12
                 ADD VACCINATION_DEWORMING @13                              [JC-01]
  SURGERY      → ADD CORE @10 · ADD SCHEDULING @11 · ADD CLINICAL_HISTORY @12   (REQUIRES)
                 ADD SURGERY @14
  INPATIENT    → ADD CORE @10 · ADD SCHEDULING @11 · ADD CLINICAL_HISTORY @12   (REQUIRES)
                 ADD HOSPITALIZATION @15 · ADD OPEN_ACCOUNTS @16             [JC-02]
  DIAGNOSTICS  → ADD CORE @10 · ADD SCHEDULING @11 · ADD CLINICAL_HISTORY @12   (REQUIRES)
                 ADD LAB_IMAGING @17
  GROOMING     → ADD CORE @10 · ADD SCHEDULING @11 · ADD GROOMING @18
  RETAIL       → ADD CORE @10 · ADD INVENTORY @19 · ADD PURCHASES @19        [JC-03]
                 (NO añade SCHEDULING: una tienda sin citas no necesita agenda)

P2 HOW_YOU_CHARGE  (decena 20)
  COUNTER      → ADD CASH_REGISTER @20 · ADD CAPACITY_TERMINAL @21 · ADD SERVICES @22
  OUTSIDE      → ADD SERVICES @22                                            [JC-04]
  NOT_YET      → (ningún efecto)

P3 DIAN_INVOICING  (decena 30)
  YES | SOON   → ADD CASH_REGISTER @30 (REQUIRES) · ADD ELECTRONIC_INVOICING @31   [JC-05]
  NO           → (ningún efecto)

P4 BRANCH_COUNT   → QUANTITY_FROM_ANSWER EXTRA_BRANCH   @40   [neteado, §2 defecto 1]
P5 USER_COUNT     → QUANTITY_FROM_ANSWER EXTRA_USER     @50   [neteado]
P6 TERMINAL_COUNT → QUANTITY_FROM_ANSWER EXTRA_TERMINAL @60   [neteado]
```

Los `ADD` repetidos de `CORE`, `SCHEDULING` y `CLINICAL_HISTORY` desde varias opciones son
deliberados y **no duplican**: `ConfiguratorResolver.java:115` hace
`merge(item, 1, (viejo, uno) -> viejo)`, así que un artículo ya presente conserva su cantidad.

Los tres `QUANTITY_FROM_ANSWER` siguen viniendo del motor **en crudo**. El neteo lo hace el front
(§2, defecto 1) hasta que exista `includedCeiling` y, mejor, hasta que lo haga el servidor.

### 4.5 Tres personas, con la aritmética hecha

Sirven de ejemplo y de fixture de prueba. Precios de `LISTA-2026-01`, ciclo mensual, sin IVA.

**Ana — spa, sola, un local, una caja.** P1 = [`GROOMING`] · P2 = `COUNTER` · P3 = `NO` · 1/1/1.

| Línea | Importe |
|---|---|
| CORE · Núcleo | 69.000 |
| SCHEDULING · Agenda de citas | 35.000 |
| GROOMING · Spa y peluquería | 29.000 |
| CASH_REGISTER · Caja y punto de venta | 46.000 |
| SERVICES · Servicios y tarifas | 29.000 |
| CAPACITY_TERMINAL · 1 terminal | incluido |
| **Total al mes** | **208.000** |

`PACK_SPA` es exactamente esos seis artículos (`309:234-239`) a **179.000**. Cubre la selección
entera, no trae nada de más, y **ahorra 29.000 al mes**. Es el caso canónico del aviso de §5.5.

**Marta — clínica de barrio, tres personas, un local.** P1 = [`CONSULT`] · P2 = `COUNTER` ·
P3 = `NO` · sedes 1 / personas 3 / cajas 1.

Módulos: CORE 69 + SCHEDULING 35 + CLINICAL_HISTORY 49 + VACCINATION 25 + CASH_REGISTER 46 +
SERVICES 29 = **253.000**. Capacidad: personas 3 − techo 2 = 1 × `EXTRA_USER` 12.000.
**Total 265.000.**

`PACK_CLINIC` (189.000) trae CORE, SCHEDULING, CLINICAL_HISTORY, VACCINATION, CASH_REGISTER y
CAPACITY_TERMINAL — **pero no `SERVICES`**. No cubre la selección entera, así que con la regla
estricta **no hay aviso**, aunque «paquete + los 29.000 de Servicios» = 218.000 sea 35.000 más
barato. Esta es la decisión **[JC-08]**, y de paso saca a la luz que `PACK_CLINIC` no incluye el
catálogo de tarifas con el que se cobra una consulta **[JC-09]**.

**Hospital Norte — 3 sedes, 12 personas, 2 cajas, factura DIAN.**
P1 = [`CONSULT`, `SURGERY`, `INPATIENT`, `DIAGNOSTICS`, `RETAIL`] · P2 = `COUNTER` · P3 = `YES`.

Módulos: 69 + 35 + 49 + 25 + 29 + 39 + 45 + 39 + 29 + 25 + 46 + 29 + 59 = **518.000**.
`PACK_FULL` cubre los trece **y además `GROOMING`**, por **449.000**: ahorra **69.000 al mes** y trae
Peluquería (29.000 de lista) que no pidieron. Aviso, con las dos cifras.
Capacidad, idéntica en las dos vías: sedes 3 − 1 = 2 × 35.000 = 70.000 · personas 12 − 2 = 10 →
8 × 12.000 + 2 × 9.000 = **114.000** (no 120.000: es el defecto nº 2) · cajas 2 − 1 = 1 × 18.000.
Extras = 202.000. **Total à la carte 720.000 · con paquete 651.000.**

### 4.6 `CORE`: las dos versiones, porque la decisión está abierta

La evidencia del árbol dice **obligatorio**: `is_core = TRUE` (`308:41-46`) y el suelo de contrato de
69.000 (`310:85-88`, «CORE es obligatorio, así que ningún contrato de pago baja de ahí»).

- **Si es obligatorio (lo que el código dice hoy).** Va el **primero** de la propuesta, con su precio,
  con el rótulo `Base de tu plan` y **sin** botón de quitar. En su sitio, una frase de una línea: «Es
  la base sobre la que funcionan los demás módulos: usuarios, sedes, pacientes y clientes.» **No** se
  le pone un botón deshabilitado — un botón apagado sin motivo se lee como una avería (es la
  convención que `ContratarView.vue:407-408` ya fija para el botón de confirmar).
- **Si pasa a ser opcional.** Misma fila, con «Quitar» como cualquier otra, y al quitarlo el aviso de
  dependencias de §2 (defecto 3) se dispara con **todos** los módulos: `CORE` sería requisito de
  todo. Quitarlo dejaría el total en `—` y la propuesta sin nada que contratar, así que el aviso tiene
  que decirlo antes: «Sin la base no queda nada que contratar.»

Se implementa **leyendo `isCore` del catálogo** (C-1), no con una constante en el front: así la
decisión se toma en el dato y ninguna de las dos versiones hay que escribirla dos veces.

---

## 5. El recorrido completo

```
Landing (§5.1)  →  /configurador  →  Paso 1 P1 (§5.2)
                                     Paso 2 P2
                                     Paso 3 P3
                                     Paso 4 P4·P5·P6
                                        ↓
                                   Propuesta (§5.4) ⇄ Ajuste (§5.6)
                                        │  └── Aviso de paquete (§5.5)
                                        ↓
                                   /registro → verificación → login
                                        ↓
                            /dashboard/contratar  (paso vinculante, YA EXISTE)
                                        ↓
                            /dashboard/contratar/exito  (pago SIMULADO, §5.8)
```

### 5.1 La entrada desde la landing

Se retira `<LandingPlans>` de `LandingView.vue:110-116` y en su lugar va **`LandingConfiguradorCta`**,
en la misma posición del DOM (entre `LandingDayFlow` y `LandingFaq`), con el ancla que ya usan tres
componentes.

- `<section id="configurador" tabindex="-1" class="pub-section">` — **el `id` cambia de `planes` a
  `configurador` y hay que actualizar los cuatro sitios que apuntan ahí**: `LandingHero.vue:44`
  (`href="#planes"` y la función `irAPlanes`), `LandingTopbar.vue:26`, `LandingFinalCta.vue:20` y
  `LandingPlans.vue:171` (este desaparece con el componente).
- Título: **«Dinos qué hacéis y te decimos qué necesitas»**.
  Bajada: «Cuatro preguntas sobre tu clínica. Al final ves los módulos que te hacen falta, con su
  precio y el total. Un minuto, y no te compromete a nada.»
- CTA primario, **el único de la sección**: «Empezar» → `RouterLink` a `{ name: 'configurador' }`.
  Nada de un segundo botón «ver precios» al lado: si el configurador es el único camino de compra,
  ofrecer una salida lateral es reconstruir la góndola de paquetes con otro nombre.
- Debajo, tres señales en texto plano, sin tarjetas: «Módulos sueltos desde 25.000 al mes» · «Sin
  permanencia» · «Precios en pesos colombianos (COP), sin IVA» — la última con
  `MONEDA_DE_FACTURACION`, **una vez por pantalla** (§7).
- El hero conserva su segundo CTA «Ya tengo cuenta».

`ResumeIntentBanner` se conserva y cambia de texto: ya no dice «Plan Clínica, 2 sedes» sino
**«Tenías una propuesta a medias — 7 módulos, 253.000 al mes»**, con «Seguir donde lo dejaste» →
`/configurador?paso=propuesta` y «Empezar de nuevo».

### 5.2 Los pasos: una pregunta por pantalla

Sigue el patrón *question pages* de GOV.UK: una pregunta por pantalla, el enunciado **es** el `<h1>`,
y nada más compite con él.

- **Ruta:** `/configurador`, `name: 'configurador'`, `meta: { guestOnly: true }` — igual que `/planes`
  hoy (`router/index.ts:110-115`). El paso viaja en la query: `?paso=1..4|propuesta`, para que
  atrás/adelante del navegador funcionen y el enlace se pueda compartir.
- **`/planes` se conserva como redirección permanente a `/configurador`.** Hay enlaces vivos ahí fuera
  y `ContratarResumenTabla.vue:37` apunta a esa ruta.
- **Estructura de cada paso:**
  1. `<p class="ds-meta">Paso 2 de 4</p>` — y el mismo dato en `document.title` («Paso 2 de 4 · ¿Cómo
     cobráis? — VetSoftware»), que es la convención de `meta.title` del router (§2.4.2).
  2. `<h1 tabindex="-1">` con el texto de la pregunta.
  3. `<p>` con el `helpText`, **asociada por `aria-describedby` al grupo**, no suelta.
  4. El grupo de respuesta (§6.2).
  5. Barra de acciones: `« Atrás` (`.ds-btn .ds-btn--ghost`) y `Continuar »` (`.ds-btn
     .ds-btn--primary .ds-btn--lg`). En el paso 1, «Atrás» vuelve a la landing.
  6. **Progreso**, no barra decorativa: `<progress>` nativo o un `role="progressbar"` con
     `aria-valuenow/min/max` y un texto «2 de 4» visible. Sin el texto, es un adorno.
- **Sin total en vivo durante las preguntas.** Un contador de dinero que sube mientras alguien
  describe su trabajo convierte la conversación en una caja registradora, y obliga a una región viva
  que interrumpe en cada clic. Lo que sí va, bajo el grupo y **sin** `aria-live`, es un recuento
  sobrio: «Llevas 5 módulos». El dinero aparece **entero y explicado** en la propuesta.
- **Sin autoavance al marcar.** Con `SINGLE`, saltar de pantalla al primer clic impide corregir y
  rompe §3.2.2 *On Input* (A). Se avanza con «Continuar», siempre.

### 5.3 Volver atrás sin perder nada

- Las respuestas viven en un **store de Pinia** (`configurador.store.ts`) —regla dura del repo: nada de
  `ref()` de módulo dentro de un composable— con la forma
  `{ version: 2, opciones: Set<number>, numeros: Record<number, number>, ciclo, actualizadoEn }`.
- Se persiste en `sessionStorage` sellando con `pagehide` (regla R09 del repo: **nunca**
  `beforeunload`).
- **Volver atrás no borra nada hacia delante.** Se recalcula, que no es lo mismo: el resolvedor es puro
  sobre el conjunto completo de respuestas (`ConfiguratorResolver.java:77`), así que cambiar la
  respuesta 2 y saltar a la propuesta da el mismo resultado que rehacer el cuestionario entero.
- **Única invalidación permitida, y es obligatoria:** si se deja de cumplir la condición de una
  pregunta condicional (P2 deja de ser `COUNTER`), su respuesta se descarta. Es lo que el servidor
  exige en `ConfiguratorAnswerCoherence`: mandar una respuesta inalcanzable devuelve error. Cuando
  ocurra, se dice en el paso siguiente: «Como ya no cobráis en mostrador, hemos quitado la Caja y los
  puntos de cobro.»
- Desde la propuesta, cada línea lleva **«Cambiar»** → vuelve al paso que la produjo (lo sabe el diff
  de §2) y, al continuar desde ahí, **regresa a la propuesta**, no al paso siguiente. Es el patrón
  *check answers* de GOV.UK, y el mismo que ya usan los cuatro «Cambiar» de `ContratarView`.

### 5.4 La propuesta

`<h1>`: **«Esto es lo que necesitáis»**. Debajo, una frase que resume la lectura, no el carrito:
«Según lo que nos contaste: una clínica que consulta, opera y cobra en mostrador.»

**Selector de ciclo primero, antes de los importes.** Se reutiliza `CicloFieldset.vue` tal cual
(`SegmentedRadio` con `MENSUAL`/`ANUAL`), con el ahorro anual **calculado, no declarado**
(`planPricing.ts:ahorroAnual`).

**La tabla.** Consume `.ds-table` y `.ds-table-scroll` (regla R15: una tabla ancha se desplaza, no se
recorta). Una fila por artículo:

| Columna | Contenido |
|---|---|
| Módulo | Nombre + `shortDescription` en una línea `.ds-meta` |
| Por qué está | «Porque respondiste: *Hospitalización*» — o `Base de tu plan` / `Lo incluye todo el mundo` para los de §4.3 |
| Prueba | «30 días gratis» o «Sin prueba» — `trialDays` con `textoPrueba` (`PlanesConfigurador.vue:94`) |
| Precio | Importe del ciclo elegido, o `—` (§7) |
| — | «Quitar», con el nombre del módulo en su nombre accesible (regla R04): `aria-label="Quitar Hospitalización"` |

Orden: `CORE` primero, luego los módulos en el orden en que sus preguntas los añadieron (el cliente
reconoce su propio recorrido), y al final las capacidades. Nunca por precio: ordenar por precio es una
recomendación disfrazada de orden.

Debajo: **«Añadir otro módulo»**, que despliega el resto del catálogo con su precio y su descripción
(§5.6).

**El total**, en `.ds-card`, con tres líneas y ni una más: subtotal · IVA 19 % · **Total al mes / al
año**. Y bajo el total, tres frases que ya son doctrina de este repositorio y no se negocian:

> Precios en pesos colombianos (COP), sin IVA incluido en las líneas.
> Esta cifra es **orientativa**: el importe que obliga se calcula al confirmar.
> Nada de esto te compromete todavía.

**CTA:** «Continuar y crear mi cuenta» → `/registro`, con la selección guardada (§5.7). Secundario, en
`ghost`: «Guardar y seguir después» (deja la intención y vuelve a la landing).

### 5.5 El aviso de paquete

**Cuándo aparece.** Las cuatro condiciones, todas a la vez:

1. Existe un `BUNDLE` cuyos `componentCode[]` **contienen** todos los módulos seleccionados (las
   capacidades extra no cuentan: se suman igual en las dos vías).
2. Ese `BUNDLE` **tiene precio en el ciclo elegido**. Si es `null`, no se compara nada (§7).
3. `precioPaquete < Σ precios de los módulos seleccionados` en ese mismo ciclo.
4. Todos los módulos seleccionados tienen precio en ese ciclo — si a la suma le falta un sumando, no
   hay comparación que hacer.

Si varios cumplen, gana el más barato; a igualdad, el que traiga menos extras.
**Si el paquete cuesta más pero trae más, no se muestra.** Eso es una venta cruzada, y el encargo dice
que los paquetes son una alerta de ahorro, no un pasillo.

**Qué dice, obligatoriamente.** Cuatro datos; sin uno de los cuatro no es honesto:

> **Hay un paquete que te sale más barato**
> El **Pack Clínica completa** incluye los 13 módulos que necesitáis y cuesta **449.000 al mes**, en
> vez de los **518.000** que suman por separado: **ahorráis 69.000 al mes**.
> Además trae **Spa y peluquería** (29.000 al mes por separado), que no habíais pedido.
> Las sedes, personas y cajas adicionales cuestan lo mismo en las dos opciones.
>
> [ Cambiar al Pack Clínica completa ]   [ Seguir con mis 13 módulos ]

- **Los dos botones pesan lo mismo.** Ni el del paquete en `primary` y el otro como enlace de texto,
  ni al revés. Es una elección, no una recomendación.
- **Nunca se cambia solo.** Ni preseleccionado, ni «lo hemos cambiado por ti».
- **Dónde va:** después del total, antes del CTA. No es un modal —interrumpir para dar una buena
  noticia sigue siendo interrumpir— ni un banner flotante.
- **Cómo se pinta:** `.ds-banner .ds-banner--info` con `<PiggyBank>` o `<TrendingDown>` de Lucide como
  `aria-hidden`. **`info`, no `success`**: no ha pasado nada bueno todavía. Y el color no es la única
  señal — el titular lo dice con palabras (§1.4.1).
- **Reversible.** Tras aceptar el paquete, la propuesta se pinta como paquete y ofrece **«Volver a mis
  módulos sueltos»** con el mismo detalle. Un cambio de opinión no puede costar rehacer el
  cuestionario.
- **Cuando aparece o desaparece por un ajuste**, se anuncia por la región viva del total (§6.4), con
  el mismo retardo de 400 ms: «Ahora hay un paquete más barato: ahorras 69.000 al mes».

### 5.6 Ajustar la propuesta

**Quitar.** Botón por fila. Si otros artículos dependen del que se quita (§2, defecto 3), en vez de
quitarlo en silencio se abre un `ModalShell` (que ya trae `role="dialog"`, `aria-modal`,
`aria-labelledby`, Escape y foco inicial):

> **Si quitas Caja y punto de venta, también salen tres módulos**
> Facturación electrónica DIAN, Cuentas abiertas y el terminal de caja no funcionan sin ella.
> [ Quitar los cuatro ]   [ Dejarlo como está ]

Tras quitar, un `useToast().info` con **«Deshacer»** durante 10 segundos. Quitar sin deshacer es la
forma más rápida de perder trabajo, y esta app se usa con prisa.

**Añadir.** «Añadir otro módulo» abre la lista de lo no seleccionado, agrupada en «Clínica»,
«Comercial» y «Administración», cada uno con nombre, descripción, precio del ciclo elegido y prueba.
Si el que se añade tiene un `REQUIRES` insatisfecho, **se añade el requisito con él y se dice en la
misma frase**: «Añadimos también Caja y punto de venta (46.000), que la Facturación electrónica
necesita para funcionar.» Nunca se añade un requisito en silencio, y nunca se deja añadir algo roto.

**`DATA_MIGRATION`**, aparte de la lista de módulos, como casilla única bajo el total: «¿Traéis datos
de otro sistema? Migración de datos — 450.000, **una sola vez**, no mensual.» El «una sola vez» va en
negrita porque es la diferencia entre 450.000 y 5.400.000 al año.

**Ninguna de estas acciones vuelve a llamar a `/configurator/resolve`.** El ajuste manual es del
cliente y el motor de reglas lo pisaría en la siguiente resolución. El carrito pasa a ser
`resuelto ∪ añadidos ∖ quitados`, y si el cliente vuelve atrás a cambiar una respuesta se le avisa:
«Cambiar esta respuesta rehace la propuesta y pierde los ajustes que hiciste. [Cambiar igual]
[Dejarlo]».

### 5.7 El traspaso a la contratación

`IntencionContratacion` (`contratacion.types.ts:19-46`) hoy guarda un plan y dos cantidades. Pasa a
guardar una selección. **Cambio de forma, no de filosofía**: los cuatro campos de honestidad se
conservan tal cual, porque son los que sostienen el aviso de deriva del paso 6.

```ts
export interface IntencionContratacion {
  version: 2                       // NUEVO. Una intención v1 guardada NO se migra: se descarta.
  items: { code: string; quantity: number }[]   // lo que se va a contratar, ya ajustado
  packCode: string | null          // NUEVO. No nulo si el cliente aceptó el paquete
  ciclo: Ciclo
  importeVistoMensual: number | null   // se conserva, y su `null` significa lo mismo
  selloRevisadoEl: string
  creadaEn: string
  descartada: boolean
}
```

**Por qué `version` y por qué descartar en vez de migrar.** Una intención guardada antes del cambio
lleva `planCode: 'CLINICA'`, un código que ya no se vende suelto. Traducirlo a una lista de módulos
sería el front adivinando qué compró alguien; descartarlo devuelve a la persona al configurador con un
aviso («Los planes cambiaron; te lleva un minuto rehacer tu propuesta»), que es honesto y cuesta 40
segundos.

Lo que hay que tocar aguas abajo, con su fichero:

- `useContratacion.ts:36-42` — `elegir(plan, ciclo, sedes, usuarios)` pasa a
  `elegir(items, ciclo, packCode)`; el cálculo de `importeVistoMensual` sigue siendo suyo.
- `SeleccionAside.vue` (carril del registro) — de «Plan Clínica · 2 sedes · 5 personas» a «7 módulos ·
  253.000 al mes», con un `<details>` que los liste. Su enlace «Cambiar» va a `/configurador`.
- `ContratarView.vue` — **no cambia de estructura**. `fetchResumenContratacion` recibe la lista de
  artículos en lugar del plan; `ResumenContratacion` cambia `planCode`/`planNombre` por
  `items[]`/`packCode`. Los `null` de `subtotal`/`impuesto`/`total` significan lo mismo y
  `ConfirmarBloqueadoNotice` con motivo `SIN_PRECIO` sigue haciendo su trabajo.
  **Ojo al presupuesto: el fichero está en 497 de 500 líneas.** Todo lo que crezca sale a un componente
  hijo.
- `ContratarResumenTabla.vue:37` — el enlace «Cambiar» apunta a `configurador`.

### 5.8 El final: el pago es simulado, y no se disimula

No hay pasarela. Lo que ya existe se conserva **sin tocar una palabra**: `DemoModeNotice` en el paso 6
y `LetraPequenaPaso6`. Las reglas, repetidas aquí porque el configurador añade pantallas nuevas donde
podrían romperse:

- **En ninguna pantalla del configurador aparecen** las palabras «pagar», «pago», «tarjeta» o
  «pasarela», ni un icono de tarjeta de crédito. El CTA final del embudo es **«Confirmar mi plan»**
  (`ContratarView.vue:417`), no «Pagar».
- El aviso de modo demostración va **antes** del botón, no después: quien lo lea al terminar ya ha
  decidido.
- La pantalla de éxito dice qué quedó registrado (número de oferta, validez, módulos activados) y
  **no** dice «pago recibido», «gracias por tu compra» ni «te hemos cobrado».
- En el error de envío se conserva literal la frase que ya está escrita en `ContratarView.vue`: «No se
  ha hecho ningún cambio en tu clínica y no se te ha cobrado nada.»

---

## 6. Accesibilidad, pantalla por pantalla

Todo lo que sigue es **AA de WCAG 2.2** salvo donde se diga otra cosa. Ninguna de estas líneas es
opcional, y ninguna se puede verificar sola: no hay `axe-core` ni ninguna otra puerta de accesibilidad
en este repositorio (§10).

### 6.1 Foco entre pasos

- Al cambiar de paso, el foco va al `<h1>` del paso nuevo (`tabindex="-1"`, `.focus()` tras
  `nextTick`). Es exactamente lo que hace `ContratarView.vue` al montar, y por el mismo motivo: tras un
  `router.push` el foco se queda en `<body>` y el lector reempieza por la navegación.
  **§2.4.3 Focus Order (A).**
- **No hay trampa de foco**: son páginas, no diálogos. La única trampa legítima es la del `ModalShell`
  de dependencias, que además hoy **pone el foco inicial pero no lo retiene** — hueco conocido del
  repo, y con este flujo pasa a importar más porque ese modal decide una compra.
  **Recomendación al equipo: cerrar el foco atrapado de `ModalShell` antes de soltar esta feature.**
- El `<h1>` enfocado **no** pierde el anillo: nada de `outline: none` en `:focus-visible`.
  §2.4.11 *Focus Appearance* (AA en 2.2) y regla R03 del repo (anillo ≥ 3:1 contra la superficie real).
- La landing ya tiene su enlace de salto (`LandingView.vue:83`); las pantallas del configurador van
  bajo `PublicLayout`, donde hay que comprobar que también lo trae. **Si no, se añade: §2.4.1 (A).**

### 6.2 Los grupos de respuesta

**Radios y casillas nativos dentro de `<fieldset>` con `<legend>`.** No se hace un `role="radiogroup"`
a mano y no se reutiliza `SegmentedRadio` para las preguntas: ese componente es un control segmentado
para etiquetas cortas —perfecto para el ciclo mensual/anual, que es donde se queda— y las opciones de
P1 y P2 llevan etiqueta larga más texto de ayuda. Con `<input type="radio">` el patrón *Radio Group*
del APG (flechas que mueven y marcan, `Tab` que entra y sale del grupo como uno solo, `Space` que
marca) lo da el navegador **sin escribir una línea de JavaScript**, y con él la semántica correcta
gratis.

- `<legend>` = el texto de la pregunta. Si el `<h1>` ya lo dice, el `<legend>` lo repite y se oculta
  con `.ds-sr-only` — **no** se deja el grupo sin nombre.
- La ayuda de la pregunta: `<p id="…-ayuda">` referenciada con `aria-describedby` en el `<fieldset>`.
- La ayuda de cada opción: `<span id="…-op-3-ayuda">` referenciada por `aria-describedby` **del
  input**, no metida dentro del `<label>` — si va dentro, se convierte en parte del nombre accesible y
  el lector canta un párrafo entero cada vez que se pasa por la opción.
- **Área de pulsación: la tarjeta entera es el `<label>`**, no solo el círculo de 16 px.
  §2.5.8 *Target Size (Minimum)* pide 24×24 px CSS; aquí se va a **≥ 44 px de alto** por fila, que es
  lo que necesita una mano sola con un animal delante.
- Estado marcado: **nunca solo por color** (§1.4.1). Marca (`Check` de Lucide) + borde + fondo del
  tono. El borde del control cuenta como componente de interfaz y necesita **3:1** contra el fondo
  adyacente (§1.4.11 *Non-text Contrast*) — es el criterio que más se incumple con la rampa OKLCH de
  este proyecto, y hay que medirlo antes de dar por buena la tarjeta.
- Los tres campos numéricos: `<input type="number" inputmode="numeric" min="1">` dentro de
  `BaseField`, que ya resuelve `<label for>` y el `aria-describedby` del error.

### 6.3 Validación

Se respeta la convención documentada del tenant, entera y sin sustituirla: validador puro →
`computed errors` → mapa `touched` → **el error no aparece hasta el `@blur`** →
`defineExpose({ validate })` → resumen en el padre.

- «Continuar» con el paso sin responder: `ErrorSummary` arriba (ya existe,
  `components/feedback/ErrorSummary.vue`, con `role="alert"` y foco programático), **con el mismo texto
  exacto** que el error en línea. Es lo que GOV.UK exige y lo que `toSummaryItems` ya sostiene.
- Texto del error, por tipo: «Marca al menos una opción para seguir.» / «Elige una de las tres
  opciones.» / «Escribe cuántas personas van a usar el sistema: al menos 1.»
- El control inválido lleva `aria-invalid="true"` y su mensaje asociado por `aria-describedby`.
  **§3.3.1 Error Identification (A) y §3.3.3 Error Suggestion (AA).** Este repositorio hoy no tiene ni
  un solo `aria-describedby` en muchos formularios: aquí es obligatorio y hay que mirarlo en la
  revisión.
- **Nada de validación prematura**: el paso 4 arranca con 1/1/1 puestos, así que no puede estar mal al
  entrar.

### 6.4 El total, y cómo se anuncia

- Región `aria-live="polite"` con **el importe anunciado, distinto del importe pintado**, siguiendo
  literalmente el patrón que ya existe en `PlanesConfigurador.vue:47` (`ANUNCIO_MS = 400`) y `:74-79`:
  lo que se pinta cambia al instante; lo que se anuncia va 400 ms por detrás y solo se emite si el
  valor se quedó quieto. Sin esa separación, quitar tres módulos seguidos dispara tres interrupciones
  y el lector no llega a leer ninguna entera.
- El texto anunciado es una frase completa, no un número: **«Total: 253.000 pesos al mes, 7 módulos.»**
  Un `aria-live` que canta «253000» no informa de nada.
- La región vive **solo en la propuesta**, no en los pasos de pregunta (§5.2).
- `aria-live="polite"`, nunca `assertive`: un total no es una alarma. `assertive` está reservado en
  este repo a `PageLoader`.

### 6.5 Movimiento, carga y espera

- **`PawLoader` es el único indicador de carga.** Prohibidos los spinners genéricos, los iconos de
  Lucide girando y las rotaciones CSS sueltas (regla R06). El `resolve` de cada paso tarda
  milisegundos: **por debajo de 1 s no se pinta ningún indicador** (umbral de NN/g); si pasa de 1 s,
  `PawLoader` con los 200 ms de retardo y 300 ms de visible mínimo que ya trae.
- Las transiciones entre pasos, si existen, van bajo `prefers-reduced-motion`. **Este repo tiene 328
  SFC con transiciones y no tiene la guarda global** que sí tiene la consola: aquí se escribe en el
  componente. §2.3.3 (AAA) y §2.2.2.
- Nada de temporizadores que avancen solos. §2.2.1.

### 6.6 Errores de red

Regla R05 del repo, y ya está escrita en `PlanesView.vue:101-110`: el error de red se pinta **antes**
que el vacío, lleva `role="alert"`, un botón de reintento y **la traza** (`getTraceId`). Si
`/configurator/questionnaire` falla, la pantalla dice qué pasó y ofrece reintentar y escribir a
soporte; **no** cae a un cuestionario cableado en el front, que sería una segunda verdad sobre qué se
vende.

---

## 7. Reglas de honestidad de las cifras

Cinco reglas. Las cuatro primeras ya son doctrina de este repositorio y aquí solo se aplican al caso
nuevo; la quinta es nueva y es la que más se va a incumplir por accidente.

1. **`null` ≠ `0`.** Un importe `null` para el ciclo elegido significa «este artículo no se vende en
   ese ciclo». Se pinta `—` (`importeEstimado`, `planPricing.ts:257`) **y la fila no se oculta**: una
   fila que desaparece se lee como un módulo que no existe. Debajo, la frase entera de qué falta y qué
   se puede hacer, con la forma de `textoSinPrecio` (`:270`). Nunca un `$ 0`, que se lee como «gratis».
2. **`0` sí es un precio, y se dice con palabras.** `ONBOARDING`, `CAPACITY_USER`, `CAPACITY_BRANCH` y
   `CAPACITY_TERMINAL` valen 0,00 de verdad (`310:148-151, 160`). Su fila pone **«Incluido»**, no
   «$ 0» ni `—`. Confundir estos tres estados es el error más caro de esta pantalla: `—` es «no lo
   sabemos», «Incluido» es «no te cuesta», y `$ 0` no significa ninguna de las dos.
3. **Si a la suma le falta un sumando, el total es `—`.** Nunca se suma lo que se conoce y se presenta
   como total: sería un importe más bajo que el real en la pantalla donde alguien compra. Es lo que ya
   hace `calcularEstimado` (`planPricing.ts:203-208`), y se conserva.
4. **La moneda se afirma una vez por pantalla, nunca por celda.** `MONEDA_DE_FACTURACION`
   (`planPricing.ts:52`). Los DTO de dinero no llevan moneda; ponerle símbolo a cada número es inferir
   de un dato que no la tiene. Las celdas usan `formatMoney`.
5. **Un importe por tramos no se multiplica.** Mientras el catálogo no publique la escalera (C-3), el
   precio de una unidad adicional se rotula **«desde»** y su línea **no entra en el total**; el total
   lleva entonces una línea explícita: «Sedes, personas y cajas adicionales: se calculan al confirmar.»
   Es menos vistoso que un número redondo, y es la diferencia entre un total y una cifra inventada
   (§2, defecto 2).

**El ciclo anual, cuando no hay cifras.** Hoy `plans.content.ts` lleva los seis extras anuales en
`null` a propósito. Si al cambiar a ANUAL algún artículo seleccionado no tiene precio anual: las filas
afectadas van a `—`, el total va a `—`, **el aviso de paquete no se calcula** (condición 3 de §5.5), y
aparece el texto de `textoSinPrecio` con la salida real: probar el ciclo mensual o escribirnos. **No se
bloquea el «Continuar»** —nada aquí compromete a nada— pero la propuesta dice con todas las letras que
esa combinación no se puede contratar en ese ciclo, que es lo que el paso 6 va a repetir con
`ConfirmarBloqueadoNotice`.

---

## 8. Plan de ficheros y presupuesto

### 8.1 Lo que se crea

```
src/features/configurador/
  api/configurador.source.ts        seam: questionnaire + resolve + catálogo (C-1..C-6)
  types/configurador.types.ts       espejo del contrato + tipos de pantalla
  stores/configurador.store.ts      respuestas, ciclo, ajustes manuales, ciclo de vida
  composables/useConfigurador.ts    wrapper con storeToRefs (patrón usePlanes.ts)
  composables/propuesta.ts          PURO: neteo de capacidad, suma por tramos, comparador de paquete
  components/PasoPregunta.vue       un paso: h1 + grupo + acciones (sirve a P1, P2 y P3)
  components/GrupoOpciones.vue      fieldset + inputs nativos + ayuda + estado
  components/PasoCapacidad.vue      los tres numéricos, con sus defectos a 1
  components/PropuestaTabla.vue     la tabla de líneas con «Quitar» y «Cambiar»
  components/PropuestaTotal.vue     total + región viva + las tres frases
  components/PackMasBaratoAviso.vue el aviso de §5.5
  components/AnadirModuloPanel.vue  el catálogo de lo no seleccionado
  components/DependenciaModal.vue   ModalShell con el arrastre de REQUIRES
  views/ConfiguradorView.vue        orquesta pasos y propuesta; ≤ 300 líneas
src/features/landing/components/LandingConfiguradorCta.vue
```

**`propuesta.ts` es puro y es donde va todo el criterio de dinero**: neteo, tramos y comparador de
paquete. Es la pieza que se prueba sin DOM, y es donde un error se convierte en una cotización
equivocada. Ni un solo `computed` de precio dentro de un componente.

### 8.2 Presupuesto

- Ninguna SFC pasa de 500 líneas (`maxSfcLines`), y ninguna de las nuevas debería acercarse: la más
  grande, `PropuestaTabla.vue`, no llega a 200 si consume `.ds-table`.
- `maxStyleMinusScript: 0` es **agregado del repo**: cada SFC nueva tiene que aportar más
  plantilla+script que CSS. Con `ds-*` + `pub-*` se cumple solo; con una tarjeta de opción escrita a
  mano, no.
- `maxDuplicateGroups: 0` más `vetsoftware/no-duplicate-primitive`: si el `<style scoped>` de un
  componente nuevo reescribe el cuerpo de una primitiva, stylelint lo rechaza. **La retirada de
  `LandingPlans`, `PlanCard`, `PlanesConfigurador` y `.pub-plan-card` (§9) baja el agregado**, así que
  esta feature puede permitirse su CSS propio sin subir el trinquete.

### 8.3 Primitivas que quizá haya que pedir a `front-parity`

Este agente no escribe en `primitives.css` (gemelo TR-02). Si al implementar hacen falta, se piden con
nombre y motivo:

1. **`.ds-option-card`** — la fila seleccionable con etiqueta, ayuda, marca y ≥ 44 px de alto. Es un
   patrón que van a repetir P1, P2, P3 y el panel de añadir: cuatro sitios, que es el umbral a partir
   del cual escribirlo cuatro veces es lo que `no-duplicate-primitive` existe para impedir.
2. **`.ds-steps`** — el indicador «Paso 2 de 4» con su `progressbar`.

Y la regla de especificidad del repo, que aquí muerde seguro: **la base del componente lleva solo
geometría y el color viaja en una clase de tono `ds-tone--*` desde el marcado**, incluido el estado por
defecto. Una regla base en `scoped` pesa `(0,2,0)` por el `[data-v-…]` y le gana siempre a la primitiva
global, que pesa `(0,1,0)`. Poner color en el `<style scoped>` de estos componentes es proponer un bug
de estado seleccionado que solo se ve en producción.

---

## 9. Qué se retira

`front-feature` los borra; ninguno es gemelo TR-02.

| Fichero | Motivo |
|---|---|
| `landing/components/LandingPlans.vue` | la sección de paquetes de la landing |
| `landing/components/PlanCard.vue` | solo la usa la anterior |
| `landing/components/PlanesConfigurador.vue` | el selector de paquete + capacidad, usado por `PlanesView` y `ContratarView:315` |
| `landing/views/PlanesView.vue` | `/planes` pasa a redirigir |
| `landing/content/plans.content.ts` | contenido transcrito; muere con C-1 (§3) |
| `.pub-plan-card`, `.pub-plan-card--featured` en `public-auth.css` | quedan huérfanas |

**No se retiran** y hay que revisarlos uno a uno: `CicloFieldset.vue` (se reutiliza tal cual),
`SeleccionAside.vue` (cambia de contenido, §5.7), `ResumeIntentBanner.vue` (cambia de texto, §5.1) y
`planPricing.ts` (se conserva y se extiende: es el vocabulario de honestidad).
`ContratarView.vue:315` deja de renderizar `PlanesConfigurador` en su rama «no hay intención» y en su
lugar pone un enlace al configurador — es lo correcto y además le devuelve líneas al fichero, que está
a tres del techo.

Tres specs de e2e apuntan a lo retirado y hay que reescribirlas, no borrarlas: `e2e/landing.spec.ts`,
`e2e/contratacion.spec.ts` y `e2e/a11y-publicas.spec.ts`.

---

## 10. Cómo se verifica

**Unitario (Vitest), y esto es lo que de verdad protege el dinero:**

1. `propuesta.ts` — neteo: 1 persona con techo 2 ⇒ **0** unidades de `EXTRA_USER` (el defecto nº 1,
   convertido en prueba).
2. `propuesta.ts` — tramos: 12 personas con techo 2 ⇒ 10 unidades ⇒ **114.000**, no 120.000.
3. `propuesta.ts` — comparador: los tres casos de §4.5 con sus cifras exactas (Ana ⇒ aviso de
   `PACK_SPA` con 29.000; Marta ⇒ **sin** aviso con la regla estricta; Hospital ⇒ aviso de `PACK_FULL`
   con 69.000 y `GROOMING` como extra).
4. `propuesta.ts` — un artículo con precio `null` en el ciclo ⇒ total `null` **y** aviso de paquete
   suprimido.
5. Store — cambiar P2 a `NOT_YET` descarta la respuesta de `TERMINAL_COUNT`; volver atrás no borra
   ninguna otra.

**Componente:** el `ErrorSummary` lleva el mismo texto literal que el error en línea; la región viva
emite una sola vez tras tres cambios seguidos en 400 ms.

**E2E (Playwright):** el recorrido de Ana, entero, de la landing al paso 6, comprobando que el total
que sale del configurador es el mismo que compara `PriceDriftNotice`.

**Lo que NO ejecuté, y hay que decirlo:**

- **No corrí nada.** Ni `npm run quality`, ni `vitest`, ni Playwright, ni `css-budget.mjs`, ni
  `ds-audit`. Esta especificación se emitió leyendo el árbol.
- **No medí ni un contraste.** Los ratios de §6.2 (3:1 en bordes de control, 4,5:1 en texto) están
  **por comprobar** contra la rampa OKLCH de `tokens.css`. Hay que medirlos antes de dar la feature por
  terminada, y este repositorio **no tiene ninguna puerta que los mida**.
- **No hay accesibilidad automatizada en el repo**: ni `axe-core`, ni `@axe-core/playwright`, ni
  `eslint-plugin-vuejs-accessibility`, ni Lighthouse. Está abierto en public-web #57. Una feature con
  cuatro grupos de radio, un modal de dependencias y una región viva es exactamente el momento de meter
  `@axe-core/playwright` en el spec de e2e; **queda propuesto, no hecho**, y no lo decide esta
  especificación.
- **No verifiqué el endpoint de catálogo** de §3: no existía en el árbol cuando escribí esto (solo
  `GET /plans`). Lo está construyendo otro agente y la forma C-1…C-6 es una **petición**, no una
  lectura.

---

## 11. Juicios comerciales que el dueño tiene que confirmar

Ninguno de estos es un hecho funcional: son decisiones de negocio que he tenido que tomar para que la
especificación esté completa, y **cualquiera puede cambiarse sin tocar código** (son filas de
`configurator_effects`, o un parámetro). Van aquí, separadas, y no enterradas en la prosa.

| # | Decisión | Lo que he supuesto | Qué pasa si se cambia |
|---|---|---|---|
| **JC-01** | «Consultas» arrastra **Vacunación y desparasitación** (25.000) | Que quien consulta también vacuna y quiere el carné y los recordatorios aparte de la historia | Quitar un `ADD`. Baja 25.000 la propuesta más común |
| **JC-02** | «Hospitalización» arrastra **Cuentas abiertas** (25.000) | Que un paciente internado acumula cargos por días y se cobra al alta | Quitar un `ADD`. Sin él, `OPEN_ACCOUNTS` queda **invendible desde el configurador** |
| **JC-03** | «Venta de producto» arrastra **Compras y proveedores** (29.000) | Que quien vende, repone; y `PURCHASES` REQUIERE `INVENTORY` de todos modos | Quitar un `ADD`. Baja 29.000 el caso de tienda |
| **JC-04** | «Cobramos fuera del sistema» arrastra igualmente **Servicios y tarifas** (29.000) | Que sin catálogo de tarifas no hay nada que facturar, se cobre donde se cobre | Quitar un `ADD`. Deja a ese cliente sin tarifario |
| **JC-05** | **Se pregunta por la facturación DIAN** y se vende desde el configurador (59.000) | Que facturar electrónicamente es una obligación legal, no una venta consultiva | `312` decidió **lo contrario** («venta consultiva que no cabe en una casilla»). Si se mantiene aquella decisión, el módulo más caro del catálogo sigue siendo **inalcanzable desde el único camino público de compra** |
| **JC-06** | **Se pregunta por las sedes** y se venden `EXTRA_BRANCH` sueltas | Que una cadena de tres locales tiene que ver su precio real | `312` también decidió lo contrario. Sin la pregunta, **una cadena recibe el precio de un local**: no es una pregunta que falte, es una cotización equivocada |
| **JC-07** | **`SCHEDULING` por defecto** salvo que la única actividad sea vender producto | Que toda actividad con cita necesita agenda | Convertirlo en una séptima pregunta, o quitarlo del defecto |
| **JC-08** | El aviso de paquete solo salta si el paquete **cubre la selección entera** | Lectura literal del encargo | La alternativa —«paquete + lo que falte»— habría avisado a Marta de un ahorro **real de 35.000 al mes** que con la regla estricta no ve. **Recomiendo la variante**, y no la he puesto por defecto porque cambia lo que el encargo dice |
| **JC-09** | *(hallazgo, no decisión)* `PACK_CLINIC` **no incluye `SERVICES`** (`309:240-245`) | — | Una clínica que cobra consultas y compra el pack se queda **sin catálogo de tarifas**. O falta el componente en el paquete, o el mapeo de JC-04 sobra |
| **JC-10** | *(bloqueante)* Cuántos usuarios trae incluidos el contrato: **1 o 2** | He usado el techo del catálogo (`included + 1`), que con `LISTA-2026-01` da **2** | `310:64-83` deja escrita la divergencia con #511: laboratorio siembra `included_quantity = 2` (techo 3) y la tarifa 2026 siembra 1 (techo 2). **Los dos números no pueden ser correctos.** Mientras no se cierre, el configurador enseña un extra de más o de menos según el entorno |
| **JC-11** | `DATA_MIGRATION` (450.000) va como casilla del ajuste, no como pregunta | Que un cargo único de 450.000 en mitad de un embudo de un minuto asusta más de lo que vende | Convertirlo en pregunta, o sacarlo del flujo público |
| **JC-12** | `EXTRA_STORAGE` **no se ofrece** en la venta | La decisión que ya tomó `312`, y sigue siendo buena | Ofrecerlo obliga a explicar gigabytes a alguien que solo quiere trabajar |
