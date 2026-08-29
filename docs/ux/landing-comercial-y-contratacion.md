# Landing comercial y flujo de contratación — especificación de diseño

> **Qué es esto.** La especificación con la que `front-feature` implementa la landing pública de
> VetSoftware y el flujo de contratación completo, sin volver a tomar ninguna decisión de diseño.
> Todo lo que aquí se afirma del código está verificado con `fichero:línea` el **2026-08-28**.
>
> **Qué NO es.** No es un handoff visual (para eso, `docs/design_handoff_vetsoftware_completo/`) ni
> una regla de interfaz (para eso, `reglas-de-interfaz.md`, que es gemelo byte a byte con la consola
> y **no se toca desde aquí**). Este fichero **no es gemelo TR-02**: describe una superficie que solo
> existe en el tenant. No lo copies a `VetSoftwareFront/docs/ux/`.
>
> **Frontera.** Quien escribió esto no toca `src/`. Cada cambio de abajo lleva su dueño:
> `front-feature` (vistas, features, stores), `front-parity` (gemelos TR-02),
> `front-e2e-visual` (specs y líneas base), backend (los tres puntos de la §2.4).

---

## Índice

1. [El terreno verificado](#1-el-terreno-verificado)
2. [La decisión del catálogo](#2-la-decisión-del-catálogo) ← la decisión de arquitectura del encargo
3. [El flujo de contratación](#3-el-flujo-de-contratación)
4. [La simulación de pago](#4-la-simulación-de-pago)
5. [Los estados que no son el feliz](#5-los-estados-que-no-son-el-feliz)
6. [El periodo de prueba, que vence por línea](#6-el-periodo-de-prueba-que-vence-por-línea)
7. [Estructura de la landing, sección a sección, con los textos](#7-estructura-de-la-landing-sección-a-sección-con-los-textos)
8. [Comportamiento accesible](#8-comportamiento-accesible)
9. [Contraste medido](#9-contraste-medido)
10. [CSS: qué se consume y qué haría falta](#10-css-qué-se-consume-y-qué-haría-falta)
11. [Router, stores y tipos](#11-router-stores-y-tipos)
12. [Qué hay que pedirle al backend](#12-qué-hay-que-pedirle-al-backend)
13. [Cómo se verifica](#13-cómo-se-verifica)
14. [Riesgos](#14-riesgos)

---

## 1. El terreno verificado

### 1.1 La feature `landing` está viva, enrutada, y **se amplía, no se sustituye**

`src/features/landing/views/LandingView.vue` (468 líneas) está montada en `/` con
`meta: { guestOnly: true }` (`src/router/index.ts:65-70`) y es el destino de los dos enlaces de marca
de la zona pública (`src/components/public/PublicLayout.vue:38` y `:53`). No está muerta.

Lo que es hoy: una **página de decisión** —dos tarjetas, «Crear cuenta» / «Iniciar sesión»—, tal
como la especificó el handoff (`docs/design_handoff_vetsoftware_completo/README.md`, §Entregables:
«Inicio.html — landing de decisión»). Ese handoff **no contempla precios**: `grep -i "plan\|precio\|
price\|COP"` sobre `reference/landing.jsx` no devuelve nada.

**Veredicto: se conservan la ruta (`/`), el nombre (`landing`) y el papel de puerta de entrada; se
reemplaza el contenido.** Renombrar la ruta rompería los dos `RouterLink` de `PublicLayout`. La
página de decisión desaparece como pantalla: sus dos acciones pasan a ser el CTA del hero y el enlace
de la barra superior, que es donde las busca cualquiera que llegue de Google.

Cinco defectos del `LandingView.vue` actual que la reescritura tiene que corregir, no heredar:

| Defecto | Línea | Por qué importa |
|---|---|---|
| Tarjeta-enlace: un `RouterLink` envuelve icono, kicker, título, descripción y CTA | `:95-112`, `:114-130` | El nombre accesible del enlace es la concatenación de los cinco textos. Un lector de pantalla anuncia un párrafo entero como si fuera el rótulo del botón |
| Enlaces muertos en el pie: `href="#" @click.prevent` | `:143-145` | Privacidad, Términos y Soporte **no llevan a ningún sitio**. Un enlace que no navega es peor que la ausencia del enlace |
| `v-icon` + iconos MDI de Vuetify | `:71`, `:75`, `:81`, `:104`, `:110`, `:122`, `:128`, `:135` | El repo usa **Lucide** (`lucide-vue-next`, única dependencia de iconos en `package.json`). La zona pública es la última bolsa de MDI: 15 SFC con `v-icon`, 0 con Lucide |
| `@mousemove` que recomputa un `radial-gradient` en cada píxel | `:10-22`, `:32-33` | Es el mayor coste de INP de la página. Y **`prefers-reduced-motion` no lo apaga**: la guarda global de `src/assets/styles/base.css:108-119` actúa sobre `animation`/`transition`, y esto es un `:style` reactivo que la regla no ve |
| Mezcla `ds-stack` / `ds-grid-2` con el lenguaje `pub-*` | `:32`, `:94` | Tolerable —las dos son puro layout, sin tipografía ni color (`primitives.css:942-945`, `:614-618`)— pero está en contra de lo que `public-auth.css:150-152` declara por escrito. Ver §10 |

### 1.2 El alta de clínica ya existe y **no se duplica**

Flujo actual, completo:

```
/registro  →  RegisterForm.vue  →  POST /register  →  «Revisa tu correo»  →  /verify-email  →  POST /register/verify  →  /login
```

- `SignupView.vue:7-14` — dos pantallas en una vista: `form` → `check`. **Opción B: sin auto-login.**
- `RegisterForm.vue:30-44` — 13 campos: `documentType`, `companyIdentifier`, `companyName`,
  `taxRegime`, `fiscalEmail`, `companyAddress`, `companyContactNumber`, cascada
  `countryId`→`stateId`→`cityId`, `employeeName`, `employeeEmail`, `password`.
- `RegisterForm.vue:85-124` — validador puro por clave; `:139-145` — error solo si `touched[key]`;
  `:250-268` — el `submit` marca todo, valida y aborta. **Es la convención documentada del tenant y
  se respeta.**
- `RegisterForm.vue:158-168` — reCAPTCHA obligatorio, con estado propio para «no disponible».
- `registration/types/index.ts:3-17` — `RegisterUserRequest` **no tiene ningún campo de plan,
  cotización ni intención comercial**. Este es el hecho que decide la §3.

Consecuencia dura: **entre elegir un plan y poder contratarlo hay un salto de correo electrónico**
que puede durar días y cambiar de dispositivo. Todo el flujo de la §3 está construido alrededor de
ese hecho.

### 1.3 La zona pública y la zona de app son dos lenguajes distintos, a propósito

`src/assets/styles/public-auth.css:146-156` lo dice literalmente: la zona pública usa Inter, la
paleta `--pub-*` y sus propias sombras; «no se usan las clases `ds-*` aquí a propósito — mezclarlas
traería Geist y la paleta warm a las pantallas de acceso».

`public-auth.css` **existe solo en el tenant** (`VetSoftwareFront/src/assets/styles/` solo tiene
`app.css`, `base.css`, `primitives.css`, `tokens.css`). No es gemelo TR-02. Eso es lo que hace
implementable esta spec sin coordinar con `front-parity`. Ver §10.

### 1.4 El agujero que el flujo de compra hereda si nadie lo tapa

| Hecho verificado | Comando / línea |
|---|---|
| `components/ui/` **asocia bien**: `fieldContext.ts:33` provee `describedBy` y lo consumen `BaseInput.vue:92`, `BaseSelect.vue:248`, `BaseTextarea.vue:77`, `DateInput.vue:106`, `SearchableSelect.vue:191`, `SegmentedRadio.vue:101` | `grep -rn "aria-describedby" src/` → 9 aciertos, **todos en `components/ui/`** |
| `components/public/` **no asocia nada**: hay **un solo `<label>` en toda la zona pública** (`AuthField.vue:15`) y **no lleva `for`**. El error es un `<span role="alert">` hermano (`AuthField.vue:21-23`), sin `id` y sin `aria-describedby` | `grep -rn "<label" src/components/public/ src/features/registration/ src/features/auth/` → 1 acierto |
| Cero `aria-current` en todo el repo | `grep -rn "aria-current" src/` → 0 |
| Cero *skip link* en todo el repo | `grep -rni "skip.*link\|saltar al contenido" src/` → 0 |
| `RegisterForm.vue:262` resume los errores como «Revisa los campos marcados en rojo antes de continuar», en un `AuthBanner` sin enlaces (`:314-316`) | — |
| `ErrorSummary.vue` **ya existe** y hace lo correcto: `role="alert"`, `tabindex="-1"`, lista de anclas que mueven el foco (`:62-67`), texto literal del error en línea (`:5`), orden del DOM explícito (`:16-27`) | — |

Traducción: el formulario más largo del producto —13 campos, cascada geográfica y captcha— **no
asocia su etiqueta a su campo ni su error a su campo, y resume los errores con un mensaje que solo
funciona si ves el color rojo**. Eso incumple 1.3.1, 3.3.1, 3.3.2 y 1.4.1, todos nivel A. El alcance
son **las 7 pantallas públicas** (login, registro con sus dos secciones, verificación, recuperar
contraseña, recuperar código, restablecer, cambiar contraseña) y, si no se arregla antes, **el paso
de contratación las hereda**.

**La reparación no inventa nada: porta `fieldContext.ts` a `AuthField`/`AuthInput`/`AuthSelect`.**
Es tenant puro —`fieldContext.ts` no existe en la consola—, así que no hay coordinación TR-02. Es
la tarea 0 de esta spec: sin ella, el flujo de compra nace incumpliendo el nivel A.

---

## 2. La decisión del catálogo

### 2.1 La pregunta

**¿Qué puede mostrar la landing sin sesión iniciada?**

### 2.2 Lo que hay, verificado

**Cerrado con `hasRole('SYSTEM')`** —los gates viven en `application/port/in/*UseCase.java`, no en
los controllers—:

- `catalogitem/application/port/in/ListCatalogItemsUseCase.java:15`
- `catalogitem/application/port/in/FindCatalogItemUseCase.java:8`
- `pricelist/application/port/in/ListCatalogPricesUseCase.java:14`
- y las 20 rutas restantes de `/catalog-items`, `/price-lists`, `/catalog-prices`.

**Abierto**, y esto es el hallazgo que cambia el planteamiento: **el asistente de venta ya es
público**. `PublicRoutes.java:82-83` declara, con patrón literal y sin comodín:

```java
new Route(HttpMethod.GET,  "/configurator/questionnaire"),
new Route(HttpMethod.POST, "/configurator/resolve"),
```

Y el motivo está escrito (`PublicRoutes.java:69-74`): «El asistente de venta lo lee un prospecto que
todavía no es cliente: si exigiera token no se podría cotizar antes de existir como usuario».

Las **dos** cosas que exige hacer pública una ruta en este proyecto están, y son dos, no una:

1. la ruta, literal, en `PublicRoutes.BUSINESS` (`PublicRoutes.java:54-106`);
2. el **puerto** anotado `@NoAuthorizationRequired`, nunca `@PreAuthorize`
   (`GetPublicQuestionnaireUseCase.java:24`, `ResolveConfiguratorSelectionUseCase.java:29`).

El javadoc de `ResolveConfiguratorSelectionUseCase.java:20-27` documenta el fallo exacto de hacer
solo una: «Durante un tiempo dijeron cosas contrarias —el puerto abierto, la ruta cerrada—, así que
el prospecto que este javadoc describe recibía un 401 al resolver».

### 2.3 Por qué el configurador público **no basta**

`ConfiguratorController.java:67-76` devuelve:

```java
return new ConfiguratorSelectionResponse(selection.items().stream()
        .map(item -> new SelectedItemResponse(item.catalogItemId(), item.quantity()))
        .toList());
```

**Identificadores y cantidades. Nada más.** Ni nombre, ni descripción, ni precio, ni ciclo, ni
impuesto. Un prospecto anónimo puede resolver su cuestionario y recibir `[{catalogItemId: 7,
quantity: 3}]`, y **no tiene ningún endpoint con el que convertir el 7 en «Agenda» ni en un precio**:
esos dos viven detrás de `hasRole('SYSTEM')`.

**Hoy no existe ningún endpoint público que devuelva los planes con sus precios.** Confirmado.

### 2.4 Las tres opciones, y el veredicto

| | Qué es | Puede pintar una tarjeta de plan hoy | Riesgo |
|---|---|---|---|
| **A** | Reutilizar `/configurator/*` | **No.** Devuelve ids | — |
| **B** | Endpoint público nuevo | Sí, cuando exista | Bloquea la landing hasta una release del backend |
| **C** | Planes como contenido del front | Sí, hoy | El precio publicado se separa del precio real y nadie se entera |

**Veredicto: se implementa C ahora, con B como destino, y las dos detrás de un único adaptador.**

Los cuatro argumentos, en orden de peso:

1. **No existe la entidad «plan», y ningún endpoint la va a inventar.** El modelo comercial son
   *artículos* (`ItemType.java`: `MODULE`, `CAPACITY`, `ONE_TIME`, `BUNDLE`) cruzados con *listas de
   precio* (`PriceList`, con `DRAFT|PUBLISHED|ARCHIVED` y `validFrom`/`validTo`) y *precios por
   tramo* (`CatalogPrice`, con `tierMin`/`tierMax`/`includedQuantity` acumulativos —
   `CatalogPrice.java:106-126`— y `TaxTreatment`). Convertir eso en «Esencial / Clínica / Cadena» es
   una **decisión editorial que hoy no está tomada en los datos**. Abrir un endpoint no la toma: solo
   traslada el problema.
2. **La landing no puede esperar a una release del backend.** Es la cara pública del producto y el
   encargo pide que esté lista para vender.
3. **Pero un precio escrito en el front es riesgo comercial real**, y se acota con tres cosas, no con
   buena voluntad:
   - la cifra pública se presenta siempre como **«desde $X»**, no como el precio de nadie;
   - la cifra **vinculante** solo aparece en el paso 6 (contratación autenticada) y **viene del
     servidor**;
   - el módulo de contenido lleva un sello (`listaDePrecioCodigo`, `revisadoEl`) y un test unitario
     que **falla cuando el sello pasa de 90 días**, para que la deriva sea ruidosa y no silenciosa.
4. **El adaptador hace que migrar a B sea un fichero.** Todo el resto del front consume
   `fetchPlans()`; nada más sabe de dónde salen los planes.

### 2.5 El adaptador (lo que se implementa hoy)

```
src/features/landing/
  api/plans.source.ts        ← EL SEAM. Hoy: devuelve el contenido. Mañana: http.get('/plans')
  content/plans.content.ts   ← el contenido, con sello
  types/plans.types.ts       ← los tipos, que NO cambian al migrar a B
```

`plans.source.ts` expone exactamente una función:

```ts
export async function fetchPlans(signal?: AbortSignal): Promise<PublicCatalog>
```

Devuelve una promesa **también en la variante de contenido** (no un valor síncrono): así la vista ya
tiene sus estados de carga y error escritos el día que detrás haya una petición de red, y la
migración a B no reescribe ninguna pantalla.

`plans.content.ts` empieza con el sello, y es lo primero que se lee:

```ts
/**
 * CONTENIDO, NO CONTRATO.
 *
 * Estos precios NO vienen del backend: hoy no existe ningún endpoint público que
 * los sirva (`ListCatalogPricesUseCase.java:14` exige `hasRole('SYSTEM')`). Son
 * una transcripción manual de la lista de precio publicada, y por eso llevan sello.
 *
 * La cifra que se muestra aquí es ORIENTATIVA y así se rotula en pantalla. La cifra
 * VINCULANTE la calcula el servidor en el paso de contratación (§3, paso 6) y puede
 * no coincidir: ese desacuerdo tiene su propio estado en pantalla (§5, caso 3).
 *
 * Cuando exista `GET /plans` (§12), este fichero se borra y `plans.source.ts` pasa
 * a llamar al endpoint. Nada más cambia.
 */
export const SELLO = {
  listaDePrecioCodigo: 'PUB-2026-COP',
  revisadoEl: '2026-08-28',
  revisadoPor: 'comercial',
} as const
```

Y el test que lo sujeta (lo escribe `front-e2e-visual`):
`tests/unit/plans-content-sello.spec.ts` — falla si `hoy - revisadoEl > 90 días`, con el mensaje
«El contenido de precios de la landing lleva más de 90 días sin revisar. Revísalo contra la lista
`PUB-2026-COP` o migra a `GET /plans`.»

### 2.6 El endpoint que hay que pedir (destino B)

**Ruta:** `GET /plans` — sin token, sin `X-Company-Id`.

**Las dos cosas, no una:**

1. `new Route(HttpMethod.GET, "/plans")` **literal**, en `PublicRoutes.BUSINESS`
   (`PublicRoutes.java:54-106`). **Nunca `/plans/**`**: el mismo prefijo acabará colgando la
   administración de planes, y un comodín la abriría al mundo sin que nadie lo vea en el diff — es
   el razonamiento que ya dejó `/configurator` con sus dos rutas exactas (`PublicRoutes.java:90-94`).
2. El puerto `GetPublicPlansUseCase` anotado `@NoAuthorizationRequired(reason = "...")`, **en un
   puerto separado de los de administración**, con un DTO propio y más pobre. El motivo está escrito
   en el precedente y se copia tal cual (`GetPublicQuestionnaireUseCase.java:10-17`): «mezclar "lo
   que puede ver el mundo" con "lo que puede editar SYSTEM" en un mismo puerto convierte cualquier
   campo nuevo del lado de administración en una fuga silenciosa hacia la respuesta pública».

Es un `GET`, así que no le aplica la invariante de `LoginRateLimitFilterTest`
(`toda_ruta_publica_post_esta_limitada`, citada en `PublicRoutes.java:78-81`). Aun así conviene
cachearlo: la respuesta es la misma para todo el mundo.

**Forma de la respuesta:**

```jsonc
{
  "currency": "COP",
  "priceValidFrom": "2026-08-01",
  "plans": [
    {
      "code": "ESENCIAL",
      "name": "Esencial",
      "tagline": "Para una clínica que empieza",
      "recommended": false,
      "monthlyFromAmount": 89000,
      "annualFromAmount": 890000,
      "setupAmount": 0,
      "taxRate": 19.00,
      "taxTreatment": "TAXED",
      "includes": [
        { "code": "AGENDA",   "name": "Agenda",           "trialDays": 30 },
        { "code": "HISTORIA", "name": "Historia clínica", "trialDays": 30 },
        { "code": "CAJA",     "name": "Caja",             "trialDays": 14 }
      ],
      "capacities": [
        { "unit": "USER",   "included": 3, "extraUnitAmount": 15000 },
        { "unit": "BRANCH", "included": 1, "extraUnitAmount": 45000 }
      ]
    }
  ]
}
```

**Qué NO debe exponer, con el motivo de cada línea:**

| Dato | Por qué no sale |
|---|---|
| `priceListId`, `code` de la lista, `publishedBySystemUserId`, `publishedAt`, `validTo` | Revela cuántas listas hay, quién las publica y **cuándo caduca la oferta** — con `validTo` público, un comprador espera al último día. Solo viaja `priceValidFrom` |
| La escalera de tramos completa (`tierMin`/`tierMax`/`includedQuantity` de todos los tramos) | Es la estructura de descuento por volumen, y los tramos son **acumulativos** (`quotes.types.ts:46-52`). Publicarla entera es publicar la política de precios. Sale solo el tramo de entrada, y rotulado «desde» |
| `discountPercent`, `discountIsConditional`, permanencias | Son de negociación por cotización, no de catálogo (`quotes.types.ts:63-68`). Publicarlas convierte cualquier oferta puntual en precio de lista |
| Artículos en `DRAFT` o `DEPRECATED` | Un `DRAFT` es una idea a medias; un `DEPRECATED` ya no se vende. `CatalogItemStatus` |
| `core`, `minQuantity`/`maxQuantity`, `sortOrder`, y el `catalogItemId` de artículos que no se venden sueltos | Fuga del modelo interno. Los `code` públicos (`AGENDA`, `CAJA`) son rótulos, no claves |
| Cualquier campo con `company_id` | Ninguna de estas tablas lo tiene, y **el read model separado es lo que garantiza que siga siendo así** cuando alguien añada un campo del lado SYSTEM |
| Cargos de implantación negociados, costes, márgenes | No son precio de lista. `setupAmount` solo sale si es el de lista y es el mismo para todos |

**Un detalle que hay que resolver en el mismo cambio:** `default_trial_days` existe en la entidad
(`CatalogItemJpaEntity.java:112-113`) pero **no está en `CatalogItemResponse.java:8-18`**. O sea:
hoy **ningún API devuelve los días de prueba por artículo**. Si la landing promete «30 días gratis
en Agenda», ese número no lo puede leer de ningún sitio. `GET /plans` tiene que traerlo por línea
(`includes[].trialDays`), que es justo lo que la §6 necesita.

---

## 3. El flujo de contratación

### 3.1 La decisión: **plan primero, registro en medio, contratación autenticada**

Los dos órdenes tienen argumentos. Este es el que se elige y por qué.

**Contra «registro primero».** El alta pide NIT, régimen tributario, correo fiscal y una cascada
geográfica de tres niveles (`RegisterForm.vue:30-44`, `:203-237`) más un captcha. Es pedirle a una
veterinaria la contabilidad de su empresa **antes de decirle qué cuesta**. La asimetría entre
esfuerzo y valor entregado es la definición de un embudo que no convierte, y además obliga a que la
elección del plan ocurra dentro de la app, donde ya no hay narrativa comercial que la sostenga.

**A favor de «plan primero».** Es el orden mental de quien compra, y sobre todo **justifica el
formulario largo**: cuando la auxiliar llega al campo del NIT ya sabe qué está comprando y por
cuánto. El formulario deja de ser un peaje y pasa a ser el último tramo de algo que ya empezó.

**Pero la elección no puede ser el acto vinculante.** El registro es Opción B: sin auto-login,
verificación por correo (`SignupView.vue:7`, `registration.api.ts:11-13`). Entre elegir y poder
contratar hay un salto de correo que puede durar días y cambiar de dispositivo. Firmar antes de
tener sesión dejaría un compromiso **sin principal**: sin `acceptedByEmail` y sin `acceptedIp`, que
son exactamente los tres campos que el modelo ya exige como prueba de la aceptación, y que
`quotes.types.ts:142-146` documenta con la frase que zanja el asunto — «La pone el SERVIDOR desde la
petición, no el formulario. Una prueba que el cliente escribe no prueba nada».

**De ahí la forma del flujo:** antes de la sesión, lo que hay es una **intención** —reversible, sin
consecuencia, y así rotulada—. Después de la sesión, hay una **contratación**, y es ahí donde vive
el §3.3.4 de WCAG.

### 3.2 Los siete pasos

| # | Ruta | Sesión | Una línea |
|---|---|---|---|
| 1 | `/` | no | La landing. Ve los planes con precio orientativo «desde», y elige uno |
| 2 | `/planes` | no | Compara los tres, ajusta ciclo / sedes / usuarios, ve el subtotal orientativo |
| 3 | `/registro?plan=ESENCIAL&ciclo=ANUAL&sedes=1&usuarios=3` | no | El `RegisterForm` **existente, sin tocar sus campos**, con un carril «Tu selección» al lado |
| 4 | «Revisa tu correo» → `/verify-email` | no | El flujo de verificación **existente, sin cambios** |
| 5 | `/login` | no→sí | El guard ve una intención pendiente y, tras autenticar, lleva al paso 6 en vez de al tablero |
| 6 | `/dashboard/contratar` | sí | **El paso vinculante.** Resumen del servidor, prueba por línea con fechas reales, confirmación explícita |
| 7 | `/dashboard/contratar/exito` | sí | Qué acaba de pasar, qué se cobrará y cuándo, y **tres cosas que hacer ahora** |

Los pasos 6 y 7 van dentro de `/dashboard` pero **sin la barra lateral**, con
`meta: { fullBleed: true, hideTopbar: true }` — el patrón ya existe y está probado en
`consulta/nueva` (`src/router/index.ts:134` y `:141`). Motivo: es un embudo, y un menú con 30
entradas al lado de un embudo es una invitación a abandonarlo.

### 3.3 Paso 2 — `/planes`, el configurador ligero

No es el configurador del backend (ese resuelve a ids, §2.3). Son **tres preguntas**, ninguna
obligatoria, todas con valor por defecto:

1. **Ciclo** — `<fieldset>` + `<legend>Cómo prefieres pagar</legend>` + dos `<input type="radio">`
   nativos: «Mes a mes» / «Un año (2 meses gratis)». Radio nativo, **no** un toggle a mano: el
   patrón Radio Group del APG sale gratis y no hay que escribir teclado.
2. **Sedes** — `<input type="number" min="1">`, etiqueta «¿Cuántas sedes tienes?».
3. **Usuarios** — `<input type="number" min="1">`, etiqueta «¿Cuántas personas van a usarlo?».

A la derecha, un resumen que se recalcula, con el rótulo **siempre visible**:

> **Estimado: $89.000 + IVA al mes**
> Es un cálculo orientativo con los precios de lista. El precio exacto de tu clínica lo ves antes de
> confirmar, sin compromiso.

El resumen es un `aria-live="polite"` sobre el importe (no sobre el bloque entero: si no, cada
tecleo en «usuarios» dispara una lectura completa). Y el recálculo va **con `debounce` de 400 ms**,
para que teclear «12» no anuncie primero «1».

### 3.4 Paso 3 — el carril «Tu selección» junto al registro

`RegisterForm.vue` **no se toca en sus campos, su validador ni su `submit`**. Se le pone al lado un
`<aside aria-labelledby="seleccion-titulo">` con:

> **Tu selección**
> Plan Esencial · Un año · 1 sede · 3 personas
> Estimado: $890.000 + IVA al año
> [Cambiar la selección]

En móvil el `<aside>` va **antes** del formulario en el DOM (colapsado en un `<details>` abierto),
no después: quien navega con teclado o lector tiene que saber qué está comprando antes de empezar a
teclear su NIT.

«Cambiar la selección» vuelve a `/planes` **conservando lo ya escrito en el formulario** —el borrador
vive en el store de la §11, no en el componente— y devuelve el foco al mismo control al regresar.

### 3.5 Paso 5 — el enganche en el login

El guard de `router/index.ts:377-449` ya conserva el destino con `query: { redirect }`
(`:427-433`). Se añade **una sola regla**, después de la comprobación de `mustChangePassword` y
antes de la de `guestOnly`:

> Si el usuario acaba de autenticarse, va a `home`, la empresa **no tiene plan activo** y hay una
> intención de contratación guardada → redirigir a `contratar`.

Con dos cautelas que son las que evitan que esto se convierta en una jaula:

- **Solo en la primera navegación tras autenticar**, nunca en cada `push`. Si el usuario sale de
  `/dashboard/contratar` a mano, no vuelve a caer ahí.
- La intención se marca `descartada` cuando el usuario pulsa «Ahora no» en el paso 6, y entonces
  este redirect deja de dispararse para siempre.

Si la empresa **ya tiene plan activo**, no hay redirect: la intención se descarta en silencio, con
un aviso `info` («Tu clínica ya tiene un plan activo»). Ver §5, caso 6.

### 3.6 Paso 6 — `/dashboard/contratar`, el paso vinculante

Tres bloques verticales, en este orden de DOM, dentro de un `<main>` con un `<h1>` propio.

**1) `<h1>` y contexto**

> # Confirma tu plan
> Estás contratando para **Veterinaria San Roque** (NIT 900.123.456-7).

**2) El resumen, con «Cambiar» en cada fila**

Tabla de una columna de rótulo y una de valor. **Cada fila modificable lleva su propio enlace
«Cambiar»**, con nombre accesible completo — «Cambiar el plan», «Cambiar el ciclo de pago», nunca
seis enlaces que se llaman «Cambiar» (regla R04 de `reglas-de-interfaz.md`).

| | | |
|---|---|---|
| Plan | Esencial | [Cambiar el plan] |
| Ciclo de pago | Un año | [Cambiar el ciclo de pago] |
| Sedes | 1 | [Cambiar el número de sedes] |
| Personas | 3 | [Cambiar el número de personas] |

Debajo, los importes, **calculados por el servidor**:

| | |
|---|---|
| Subtotal | $890.000 |
| IVA (19 %) | $169.100 |
| **Total del primer año** | **$1.059.100** |

Y, si aplica, el bloque de prueba por línea de la §6.

**3) La confirmación**

- El aviso de modo demostración de la §4, **siempre visible, no descartable, antes del botón**.
- Una casilla: «He leído y acepto los [Términos del servicio] y la [Política de tratamiento de
  datos].» — obligatoria, con su error asociado, y **los dos enlaces abren en pestaña nueva con
  `rel="noopener"` y el aviso «(se abre en otra pestaña)` en `.ds-sr-only`».
- El botón: **«Confirmar y activar mi plan»**. Nunca «Pagar». Nunca «Comprar».
- A su lado, en el mismo grupo: **«Ahora no»**, que descarta la intención y lleva al tablero. Sin
  esta salida el paso 6 es una jaula, y una jaula al final de un embudo es lo que convierte una duda
  en un abandono definitivo.

**WCAG 2.2 §3.3.4 Error Prevention (Legal, Financial, Data), nivel AA** — se cumple por la vía
**«Confirmed»**: hay un mecanismo para revisar, confirmar y corregir la información antes de
finalizar el envío. Los cuatro «Cambiar» son la parte de *corregir*; la casilla y el botón separado
son la de *confirmar*.

**Nota honesta:** la vía «Reversible» **no** se puede reclamar hoy: el front del tenant no tiene
ninguna superficie de suscripción (`grep -rln "subscription" src/features` → 0 aciertos; lo único
que aparece con «billing» es `features/cuentas/`, que es la facturación **que la clínica le hace a
sus clientes**, no su plan). Así que la pantalla **no promete cancelar desde la app**. Lo que dice
es lo que es verdad: «Durante la prueba no se cobra nada. Si quieres darte de baja antes de que
empiece el cobro, escríbenos a soporte@vetsoftware.co y lo hacemos.» Ver §12, punto 3.

### 3.7 Paso 7 — `/dashboard/contratar/exito`, el momento más importante

Es el paso que peor se resuelve siempre: se pone un «¡Gracias por tu compra!» y se deja al usuario
delante de una pantalla vacía. Aquí no.

Tres bloques, en este orden:

**1) Qué pasó, en una línea, con el dato que le importa**

> # Listo. Tu plan Esencial está activo.
> Agenda, Historia clínica y Caja ya están encendidos para Veterinaria San Roque.

**2) Qué se va a cobrar y cuándo** — la tabla de la §6, con las fechas reales por módulo, más:

> Te vamos a avisar por correo antes del primer cobro. Como no hay pasarela de pago conectada
> todavía, hoy no se ha cobrado nada.

**3) Tres cosas que hacer ahora** — esto es lo que convierte una compra en un uso. Tres tarjetas, con
verbo, en el orden en que una clínica arranca de verdad:

| | | |
|---|---|---|
| **Invita a tu equipo** | Para que cada persona entre con su usuario | → `empleados` |
| **Crea tu primera cita** | La agenda del día empieza aquí | → `agenda` |
| **Configura tu caja** | Antes del primer cobro del mostrador | → `caja` |

Cada tarjeta es un `<article>` con `<h3>` y **un solo** enlace, cuyo texto es la acción completa
(«Invita a tu equipo»), no «Ir». El foco al montar la pantalla va al `<h1>`, con `tabindex="-1"`.

**Lo que NO va aquí:** confeti, un contador de días de prueba, y un botón «Ir al tablero» como única
acción. Un tablero vacío es la peor primera pantalla posible después de contratar.

---

## 4. La simulación de pago

### 4.1 La tensión, y cómo se resuelve

No puede parecer un cobro real. Pero tampoco puede ser un botón de juguete que rompa la ilusión de
producto.

**La resolución: el marco es honesto, el contenido es real.**

Lo único falso del paso 6 es **el cobro**. Todo lo demás —el nombre de la clínica, el plan, los
importes calculados por el servidor, el IVA, las fechas de fin de prueba de cada módulo, la activación
de los módulos— es verdad y funciona. Así que el diseño no disfraza nada: **pone un marco explícito
alrededor de la única parte que no es real, y deja el resto intacto.**

### 4.2 Lo que NO se hace, y por qué

**No hay formulario de tarjeta falso.** Ni número, ni CVV, ni fecha de caducidad, ni «4242 4242 4242
4242». Tres motivos, cualquiera de ellos suficiente:

1. Es **deshonesto**: pedirle a alguien los 16 dígitos de su tarjeta para no cobrarle es exactamente
   lo que hace el fraude.
2. Es un **riesgo de seguridad real**: entrena al usuario a teclear datos de tarjeta en un formulario
   que no está bajo ningún alcance PCI, y esa costumbre no se desaprende cuando llegue la pasarela
   de verdad.
3. Es **trabajo desechable**: cuando llegue la pasarela, ese formulario se tira entero, porque la
   pasarela traerá el suyo (o su redirección).

### 4.3 Lo que sí se hace: el aviso

Un bloque **siempre visible, no descartable**, inmediatamente antes del botón de confirmación, con
el tono de aviso (`--pub-warn-*` en la zona pública / `.ds-banner--warning` en la zona de app):

> ### Modo demostración: no vamos a cobrarte nada
>
> Todavía no tenemos conectada la pasarela de pago. Al confirmar, tu plan se activa y empieza tu
> periodo de prueba.
>
> **No se te va a cobrar, no vamos a pedirte una tarjeta y no guardamos ningún dato de pago.**
> Cuando conectemos la pasarela te escribiremos por correo antes del primer cobro, y podrás decidir
> entonces.

Reglas de este bloque:

- **No es `role="alert"`.** No es un error ni algo que acabe de pasar: está ahí desde que carga la
  pantalla, y un `alert` que se anuncia al montar interrumpe la lectura de la página. Va como
  `<aside aria-labelledby="demo-titulo">` con un `<h2>`/`<h3>` real, y forma parte del orden de
  lectura.
- **No se puede cerrar.** Un aviso descartable que informa de que no hay cobro real es un aviso que
  la mitad de la gente no verá.
- **El icono no es el mensaje.** El icono de Lucide (`Info`) va con `aria-hidden="true"`; lo que
  informa es el texto (1.1.1, 1.4.1).
- **Se repite exactamente una vez más**, en el paso 7, en una línea, y nunca más.

### 4.4 El botón y lo que ocurre al pulsarlo

- Rótulo: **«Confirmar y activar mi plan»**. Nunca «Pagar», «Comprar» ni «Finalizar compra».
- Al pulsar: `disabled` mientras `submitting`, con el texto «Activando…».
- **Con `PawLoader` y solo `PawLoader`** si la espera pasa de los 200 ms de retardo del componente
  (`src/components/feedback/PawLoader.vue`). Nada de spinners genéricos, ni de rotaciones CSS
  sueltas, ni de los iconos giratorios de Lucide.
- **Llave de idempotencia**: se genera un `clientRequestId` (UUID) **al entrar en el paso 6**, no al
  pulsar. El modelo ya lo tiene y ya documenta para qué sirve: «Es lo que hace que un doble clic no
  cree dos» (`quotes.types.ts:147-148`).
- Si tarda más de 10 s, el texto cambia a «Seguimos activando tu plan. No cierres esta ventana.»
  (umbral de NN/g: por encima de 10 s hay que decir algo o el usuario asume que se colgó).

---

## 5. Los estados que no son el feliz

Ocho, con el texto exacto y el comportamiento. **Ninguno de ellos es un error del usuario**, y
ninguno se redacta como si lo fuera.

**1) Cierra el navegador a mitad de elegir**

La intención vive en el store con espejo en `localStorage` (§11). Al volver a `/`, **no se restaura
en silencio**: aparece una banda sobre el hero.

> Estabas mirando el plan **Esencial** para 1 sede y 3 personas. ¿Seguimos donde lo dejaste?
> [Seguir] [Empezar de nuevo]

La banda es un `<aside>`, no un modal: no bloquea a quien vuelve por otra cosa. «Empezar de nuevo»
borra la intención sin confirmación (no destruye nada que costara trabajo).

**2) Vuelve desde otro dispositivo, o borró el almacenamiento**

La intención no está. **El paso 6 no muestra un error**: muestra el selector de plan dentro de la
app, con el mismo contenido del paso 2.

> Vamos a elegir el plan de tu clínica. Te lleva un minuto.

Un usuario que perdió un borrador no cometió ningún fallo, y tratarlo como si lo hubiera cometido es
la forma más rápida de que se vaya.

**3) El precio cambió mientras decidía** ← el caso que justifica media §2

En el paso 6 se compara el importe que traía la intención con el que devuelve el servidor. Si
difieren, **antes** del resumen:

> ### El precio cambió desde que lo elegiste
> Cuando lo elegiste: **$89.000 + IVA al mes**.
> Ahora: **$95.000 + IVA al mes**.
> Es el precio de lista vigente hoy. Revisa el resumen antes de confirmar.

Y —esto es lo que lo hace un cumplimiento de §3.3.4 y no un adorno— **la casilla de términos se
desmarca y el botón vuelve a su estado inicial**. Nadie confirma un importe que no ha leído. El foco
se mueve al encabezado del aviso.

**4) El correo ya está registrado**

`RegisterForm.vue:291-297` ya mapea `EMAIL_ALREADY_REGISTERED` al campo del correo con «Ese correo ya
está registrado.» Hoy eso es un **callejón sin salida**: te dice el problema y no te da la salida. Se
añade, bajo el error del campo:

> Ese correo ya tiene cuenta. [Inicia sesión y sigue con tu plan]

El enlace lleva a `/login?redirect=/dashboard/contratar` y **conserva la intención**, para que quien
se equivocó de puerta no pierda la elección que ya hizo.

**5) Ya hay una clínica registrada con ese NIT**

Error del servidor sobre `companyIdentifier`. Texto:

> Ya hay una clínica registrada con este NIT. Si es la tuya, inicia sesión. Si crees que es un error,
> escríbenos a soporte@vetsoftware.co.

**Nunca** se dice quién la registró, ni cuándo, ni con qué correo: sería filtrar datos de otra
empresa a cualquiera que teclee un NIT.

**6) La empresa ya tiene plan activo**

`/dashboard/contratar` redirige al tablero con un aviso **`info`, no `error`**:

> Tu clínica ya tiene un plan activo. No hace falta contratar otro.

Y la intención se descarta, para que el guard del paso 5 no la vuelva a disparar.

**7) Falla la red al confirmar**

- El botón vuelve al reposo (nada de dejarlo `disabled` para siempre).
- El error va **dentro de la pantalla**, en un bloque con la forma de `ErrorSummary` —`role="alert"`,
  `tabindex="-1"`, y el foco se mueve a él—, **no solo en un toast**. Un toast se va solo, y este es
  el clic más importante de todo el flujo.
- El aviso se emite además con `useToast().errorFrom('No se pudo activar el plan', e)`, **nunca** con
  el texto del error escrito a mano: `errorFrom` es lo que conserva el `X-Trace-Id`
  (`src/composables/useToast.ts:42-50`), y sin traza soporte no puede correlacionar nada.
- Texto del bloque: «No pudimos activar tu plan. No se ha hecho ningún cambio en tu clínica. Vuelve a
  intentarlo; si sigue fallando, escríbenos con este código: `<traceId>`.»

**8) Doble clic en confirmar**

`clientRequestId` generado al entrar (§4.4) + `disabled` durante `submitting`. Las dos cosas: la
segunda evita el caso común, la primera evita el caso raro de la doble pestaña.

---

## 6. El periodo de prueba, que vence por línea

### 6.1 El hecho

La prueba **no vence por contrato: vence por línea**. Verificado en el modelo:

- `entitlement/domain/ModuleGrantLine.java:45` — cada línea de concesión lleva su propio
  `trialEndDate`, y `:62-65` lo hace obligatorio si la línea está en modo prueba y prohibido si no.
- `entitlement/infrastructure/persistence/ContractItemJpaRepository.java:72` — lee
  `i.trial_end_date` **de la línea del contrato**, no de la cabecera.
- `ModuleGrantLine.java:106-112` — «`trial_end_date` es el último día de prueba, **inclusive**».
  Ese detalle decide cómo se redacta la fecha en pantalla.
- `catalogitem/.../CatalogItemJpaEntity.java:112-113` — `default_trial_days` es **por artículo**.

Es decir: Caja puede vencer el día 14 y Agenda el día 30, dentro del mismo contrato.

### 6.2 Lo que la landing puede prometer, y lo que no

**No puede decir «30 días gratis»** a secas si los módulos del plan tienen pruebas distintas. Sería
falso para Caja, y el día 14 el usuario descubriría que le estaban cobrando algo que creía gratis
hasta el 30. Ese es el tipo de sorpresa que quema una cuenta nueva.

**Lo que la landing dice:**

> Prueba gratis. Sin tarjeta.

**El detalle aparece en el paso 2 (plegado) y en el paso 6 (desplegado, obligatorio).**

### 6.3 Cómo se pinta, en los pasos 6 y 7

Con `.ds-table` a pelo —el tenant no tiene primitiva de tabla— dentro de un `.ds-table-scroll`:

| Módulo | Gratis hasta | Después |
|---|---|---|
| Agenda | 27 de septiembre de 2026 | $35.000 + IVA / mes |
| Historia clínica | 27 de septiembre de 2026 | Incluido |
| Caja | 11 de septiembre de 2026 | $28.000 + IVA / mes |

Y encima de la tabla, la frase que explica por qué las fechas no coinciden — **es la parte que no se
puede omitir**:

> Cada módulo tiene su propia prueba, y no terminan todas el mismo día. **Caja termina antes:** el
> 11 de septiembre empezamos a cobrar Caja, y Agenda sigue gratis hasta el 27.

Reglas de redacción, que valen también para el resto de la app:

- **Siempre la fecha, siempre con el módulo delante.** Nunca «tu prueba vence el 11 de septiembre»
  (¿cuál prueba?), nunca «te quedan 14 días» a secas.
- «Gratis **hasta** el 11 de septiembre» y no «hasta el 12»: `trialEndDate` es el último día
  **inclusive** (`ModuleGrantLine.java:106-112`). Equivocarse aquí es equivocarse en un día de cobro.
- Formato de fecha con `src/composables/format.ts` (locale `es-CO`), nunca con un `toLocaleDateString`
  suelto. El marcador de ausencia es el `—` que ese mismo composable define.
- Se ordena por **fecha de fin ascendente**, no alfabéticamente: lo primero que hay que ver es lo
  primero que se acaba.
- Cuando todas las líneas comparten fecha, la frase se colapsa a una sola: «Todo tu plan es gratis
  hasta el 27 de septiembre de 2026.» El caso simple no paga el precio del complejo.

---

## 7. Estructura de la landing, sección a sección, con los textos

### 7.1 Orden del DOM

```
<a class="pub-skip" href="#contenido">Saltar al contenido</a>      ← NUEVO en todo el repo
<header>            marca · nav (Planes · Iniciar sesión · Crear cuenta)
<main id="contenido" tabindex="-1">
  §A  Hero
  §B  Lo que resuelve
  §C  Un día en tu clínica
  §D  Planes                       <section aria-labelledby="planes-titulo">
  §E  Preguntas frecuentes
  §F  CTA final
<footer>            Privacidad · Términos · Soporte · © 2026
```

Un solo `<h1>`, en el hero. Cada sección abre con un `<h2>`. Las tarjetas de plan y las de §B usan
`<h3>`. Sin saltos de nivel.

### 7.2 §A — Hero

> **VetSoftware**
> # Tu clínica, de la sala de espera a la caja, en un solo sitio.
>
> Agenda, historia clínica, hospitalización, inventario y facturación electrónica DIAN.
> Hecho para clínicas veterinarias en Colombia.
>
> [Ver los planes] [Ya tengo cuenta]

- «Ver los planes» es el CTA primario y **ancla a `#planes`** con desplazamiento; no es una ruta
  nueva. La gente que llega a una landing quiere ver el precio sin cambiar de página.
- «Ya tengo cuenta» es secundario y va a `/login`.
- El kicker de encima del `<h1>` («Plataforma de gestión veterinaria») **desaparece**: dice lo mismo
  que el `<h1>` y lo dice peor.

Bajo los CTA, tres señales de confianza en una fila, cada una con su icono de Lucide
(`aria-hidden`) y su texto:

> Facturación electrónica DIAN · Varias sedes · Tus datos cifrados

### 7.3 §B — «Lo que resuelve»

`<h2>` Lo que dejas de hacer a mano

Cuatro tarjetas. El verbo es el de la clínica, no el de la plataforma: «gestión de módulos» no le
dice nada a una auxiliar; «la historia queda escrita sola» sí.

| Título | Texto |
|---|---|
| La agenda del día, sin llamadas cruzadas | Ves quién viene, a qué hora y con quién. Si el hueco ya está ocupado, la cita no se agenda. |
| La historia queda escrita | Lo que anotas en la consulta se guarda en la historia del paciente. Sin pasar nada a limpio después. |
| El mostrador cuadra | Cobras, cierras caja y sabes qué entró. Con factura electrónica DIAN cuando toca. |
| El inventario avisa antes | Sabes qué se está acabando antes de que se acabe delante del cliente. |

### 7.4 §C — «Un día en tu clínica»

`<h2>` Un día, de principio a fin

Cuatro pasos numerados, en horizontal en escritorio y en vertical en móvil. Es una **lista ordenada
real** (`<ol>`), no cuatro `<div>` con un número dibujado: el número es información.

1. **8:00 · Llega el primer paciente.** Está en la agenda desde ayer.
2. **8:15 · La consulta.** Anotas peso, motivo y tratamiento. La historia se escribe sola.
3. **8:40 · El cobro.** La consulta pasa a la cuenta del propietario. Facturas si hace falta.
4. **20:00 · Cierras caja.** Cuadra, porque nadie tuvo que apuntar nada en un papel.

### 7.5 §D — Planes

```html
<section id="planes" aria-labelledby="planes-titulo">
  <h2 id="planes-titulo">Planes</h2>
```

Bajada: **Elige por el tamaño de tu clínica, no por una lista de funciones.**

**El conmutador de ciclo** — `<fieldset>` con `<legend>Cómo prefieres pagar</legend>` y dos radios
nativos: «Mes a mes» / «Un año — 2 meses gratis». Radio nativo, no toggle a mano.

**Las tres tarjetas.** Cada una es un `<article>` con:

- `<h3>` con el nombre del plan;
- una línea de a quién es;
- el precio **«desde $89.000»** + `<span>+ IVA al mes</span>`;
- si el ciclo es anual, la línea «$890.000 al año — ahorras $178.000»;
- una lista `<ul>` de 4-5 puntos, con `<li>` de texto plano (los iconos de check van
  `aria-hidden="true"`; el punto lo dice el texto);
- **un único** control: `<RouterLink>` con el texto **«Empezar con Esencial»** — nombra el plan, no
  dice «Elegir».

**La tarjeta recomendada** lleva una insignia con **texto visible** («La que más eligen») y
`aria-describedby` apuntando a ella desde el `<h3>`. **No se distingue solo por el color del borde**:
`--pub-line` da 1,23:1 contra blanco (§9), muy por debajo del 3:1 que §1.4.11 exige a un indicador de
estado, y §1.4.1 prohíbe que el color sea el único portador.

**Bajo las tres tarjetas**, y esto es lo que hace honesta la opción C de la §2:

> Los precios son orientativos, en pesos colombianos, y no incluyen IVA. El precio exacto para tu
> clínica lo ves antes de confirmar, sin compromiso y sin tarjeta.

**Lo que no va aquí:** una tabla comparativa de 40 filas con checks y cruces. Si hace falta, va
plegada tras un «Comparar los tres planes en detalle» que abre `/planes`.

### 7.6 §E — Preguntas frecuentes

`<h2>` Preguntas que nos hacen siempre

Seis `<details>`/`<summary>` **nativos**. No un acordeón a mano: el nativo trae el teclado, el
estado expandido y el anuncio del lector sin una línea de JavaScript, y es lo que el APG recomienda
para «Disclosure».

1. **¿Tengo que poner una tarjeta para probarlo?** No. La prueba no pide datos de pago.
2. **¿Qué pasa cuando se acaba la prueba?** Te avisamos por correo antes. Cada módulo tiene su propia
   fecha, y las verás todas cuando contrates.
3. **¿Puedo cambiar de plan después?** Sí. Escríbenos y lo ajustamos.
4. **¿Sirve para varias sedes?** Sí. Las sedes se cuentan y se cobran por sede.
5. **¿Emite factura electrónica DIAN?** Sí, con tu resolución de facturación.
6. **¿Dónde están mis datos?** En Colombia, cifrados, y son tuyos. Puedes pedir que te los
   exportemos.

### 7.7 §F — CTA final

> ## Empieza hoy. Sin tarjeta.
> Creas tu clínica, verificas el correo y ya estás dentro.
> [Ver los planes] [Ya tengo cuenta]

### 7.8 Pie

**Los tres enlaces del pie tienen que llevar a algún sitio.** Hoy son `href="#" @click.prevent`
(`LandingView.vue:143-145`). Si las páginas legales todavía no existen, la solución **no** es dejar
el enlace muerto: es **quitar el enlace y dejar el texto**, o poner `mailto:soporte@vetsoftware.co`
en Soporte. Un enlace que no navega falla §2.4.4 y, peor, enseña al usuario que los enlaces de esta
web no funcionan.

Además, en una landing comercial, «Términos» y «Privacidad» son obligaciones legales en Colombia
(Ley 1581 de 2012 para el tratamiento de datos): no son decoración de pie de página, y el paso 6
enlaza a ellas desde la casilla de aceptación. **Tienen que existir antes de que el flujo de
contratación se publique.**

---

## 8. Comportamiento accesible

Todo lo de abajo es obligatorio, no recomendable. Cada línea lleva su criterio.

### 8.1 Lo que hay que crear porque no existe en ningún sitio del repo

| Qué | Criterio | Dónde |
|---|---|---|
| **Skip link** — primer elemento focalizable del documento, invisible hasta recibir foco, «Saltar al contenido», ancla a `#contenido` que tiene `tabindex="-1"` | **§2.4.1 Bypass Blocks (A)** | Landing y todas las vistas del flujo. Cero ocurrencias hoy en el repo |
| **`document.title` por ruta** — `afterEach` del router lo fija desde `to.meta.title`. Landing: «VetSoftware — Software para clínicas veterinarias en Colombia» | **§2.4.2 Page Titled (A)** | `router/index.ts:451-453` ya tiene el `afterEach` donde engancharlo |
| **`aria-describedby` en la zona pública** — portar `fieldContext.ts` a `AuthField`/`AuthInput`/`AuthSelect` | **§1.3.1 (A) · §3.3.1 (A) · §3.3.2 (A)** | §1.4. Alcance: 7 pantallas + todo el flujo nuevo |
| **`<label for>` real en `AuthField`** — hoy el `<label>` de `AuthField.vue:15` no tiene `for` y el control está en un `<slot>` | **§1.3.1 (A) · §4.1.2 (A)** | Mismo cambio que el anterior |
| **`ErrorSummary` en `RegisterForm`** — sustituye el `AuthBanner` de `:314-316`; `toSummaryItems(errors, ids, ORDEN_DOM)` con el orden visual explícito | **§3.3.1 (A) · §2.4.3 (A) · §1.4.1 (A)** | El componente ya existe: `components/feedback/ErrorSummary.vue` |

### 8.2 Teclado y foco

- **Orden de tabulación = orden visual.** El carril «Tu selección» del paso 3 va antes del formulario
  en el DOM cuando está encima visualmente (§1.3.2, §2.4.3). Nada de `order` de flexbox que
  desincronice DOM y pantalla.
- **Ninguna tarjeta es un enlace entero.** Ni las de plan, ni las de §B, ni las de «tres cosas que
  hacer ahora». Un `<article>` con `<h3>` y un solo control. Es la corrección directa de
  `LandingView.vue:95-130`.
- **El foco se mueve al cambiar de paso.** Al entrar en 6 y en 7, el foco va al `<h1>` con
  `tabindex="-1"`; sin eso, tras un `router.push` el foco se queda en el `<body>` y el lector empieza
  a leer desde la barra de navegación otra vez (§2.4.3).
- **Foco visible en todo.** Los enlaces del hero, los radios del ciclo, los `<summary>` de las FAQ.
  §2.4.11 Focus Appearance (AA en 2.2) exige un indicador de al menos 2 px de grosor y **3:1 de
  contraste contra lo que hay debajo**. La zona pública no usa `.ds-focus-ring` (§10): su anillo
  tiene que medirse. Ver §9: `--pub-ame-600` sirve (4,56:1 sobre el fondo, 5,38:1 sobre blanco);
  `--pub-ame-400` **no** (2,64:1).
- **Tamaño de objetivo ≥ 24×24 px CSS** en todo control (§2.5.8 Target Size (Minimum), AA en 2.2), y
  **≥ 44×44** en los CTA de la landing y en los botones del paso 6: se usan con el animal delante y
  con una sola mano.
- **`<details>` nativo** en las FAQ: el patrón Disclosure del APG sale resuelto.

### 8.3 Formularios

Se respeta y se completa la convención del tenant, no se sustituye:

```
validador puro  →  computed errors  →  mapa touched  →  error solo tras @blur
                →  ErrorSummary al fallar el submit  →  foco al resumen
```

- **Nunca validación prematura.** El error aparece tras `@blur` o tras el `submit`, nunca mientras se
  teclea (`RegisterForm.vue:139-145` ya lo hace bien).
- **El texto del resumen es literal, no reformulado.** Es lo que `ErrorSummary.vue:5` exige por
  escrito y lo que el patrón de GOV.UK requiere: si el error en línea dice «Para NIT debe ser
  numérico, 5 a 15 dígitos», el resumen dice exactamente eso.
- **`aria-invalid="true"`** en el control con error, además del `aria-describedby`.
- **`autocomplete` correcto** en los campos del registro: `organization`, `email`, `new-password`,
  `tel`, `street-address`. §1.3.5 Identify Input Purpose (AA). Hoy solo lo llevan los de contraseña.
- **La casilla de términos del paso 6** lleva su propio error asociado y entra en el `ErrorSummary`
  como una fila más: «Tienes que aceptar los Términos para continuar.»

### 8.4 Movimiento

- La guarda global de `src/assets/styles/base.css:108-119` apaga `animation` y `transition` con
  `!important` bajo `prefers-reduced-motion: reduce`. **Cubre `.pub-reveal` y `.pub-drift`.**
- **No cubre el glow que sigue el cursor** de `LandingView.vue:18-22, 33`: es un `:style` reactivo,
  no una animación CSS. Si se conserva, hay que apagarlo en JS:
  `matchMedia('(prefers-reduced-motion: reduce)').matches` → no registrar el `mousemove`. §2.3.3
  (AAA) y, sobre todo, §2.2.2 Pause, Stop, Hide (A) para el movimiento continuo.
- **Y apagarlo también en puntero grueso** (`matchMedia('(pointer: coarse)')`): en táctil no hay
  cursor, así que el efecto no aporta nada y sí cuesta.
- Si se conserva: `requestAnimationFrame` + `shallowRef`, no un `reactive` recomputado en cada
  píxel. Es el mayor coste de INP de la página, y la landing es donde el INP se mide.

### 8.5 Anuncios en vivo

- El importe estimado del paso 2: `aria-live="polite"` **sobre el importe**, no sobre el bloque, con
  `debounce` de 400 ms.
- Los avisos del flujo, por `useToast()`; los de error, siempre con `errorFrom(titulo, error)` para
  conservar el `X-Trace-Id` (`useToast.ts:42-50`). `ToastStack` ya es `aria-live="polite"`.
- El bloque de «Modo demostración» **no** es `aria-live` ni `role="alert"` (§4.3).
- El error de confirmación del paso 6 **sí** es `role="alert"` con foco (§5, caso 7).

### 8.6 Estados de carga, vacío y error

Umbrales de NN/g: por debajo de 1 s sin indicador; entre 2 y 10 s, indicador; por encima de 10 s,
progreso con estimación.

- El indicador es **`PawLoader`, y solo `PawLoader`** (200 ms de retardo, 300 ms de visible mínimo).
  Prohibidos los spinners genéricos, los iconos giratorios de Lucide y las rotaciones CSS sueltas.
  Ojo: `public-auth.css:123-125` define `.pub-spin`, que es **deuda conocida** y no se usa en nada
  nuevo (`tests/unit/loader-guard.spec.ts:122-133`).
- Si `fetchPlans()` falla en la landing, **la sección de planes no desaparece**: muestra el estado de
  error con reintento y el CTA de registro sigue vivo. Una landing sin precios convierte peor; una
  landing rota no convierte nada.
- El error de red se pinta **antes** que el estado vacío (regla R05 de `reglas-de-interfaz.md`):
  «no hay planes» y «no pudimos cargar los planes» son cosas distintas y se dicen distinto.

---

## 9. Contraste medido

Medido el 2026-08-28 con la fórmula de luminancia relativa de WCAG 2.x, sobre los tokens reales de
`src/assets/styles/public-auth.css:8-36` y el fondo de `LandingView.vue:157`.
Reproducible: el script está en el scratchpad como `landing-ux-contrast.mjs`.

### 9.1 Lo que se puede usar

| Par | Ratio | Veredicto |
|---|---|---|
| `--pub-ink-900` #1a1325 / blanco | **18,04** | Texto |
| `--pub-ink-900` / fondo landing #f3e8ff | **15,29** | Texto — el `<h1>` va sobrado |
| `--pub-ink-700` #3d2e57 / blanco | **12,16** | Texto |
| `--pub-ink-600` #4a3d63 / fondo landing | **8,32** | Texto |
| `--pub-ame-700` #7e22ce / blanco | **6,98** | Texto y enlaces |
| `--pub-ink-500` #6b5b80 / blanco | **6,12** | Texto — el subtítulo |
| `--pub-ame-700` / fondo landing | **5,92** | Texto |
| `--pub-ink-500` / fondo landing | **5,18** | Texto |
| Blanco sobre `--pub-ame-600` #9333ea | **5,38** | Texto de botón primario |
| `--pub-warn-tx` #92600a / `--pub-warn-bg` | **5,19** | Texto — el aviso de la §4 cumple |
| `--pub-ame-600` / fondo landing | **4,56** | Texto y **anillo de foco** (≥3:1) |

### 9.2 Lo que NO se puede usar, y qué se pone en su lugar

| Par | Ratio | Falla | Qué se hace |
|---|---|---|---|
| `--pub-err-tx` #dc2626 / `--pub-err-bg` #fef2f2 | **4,41** | §1.4.3 AA por 0,09 | **Usar `--pub-err-tx-2` #b91c1c**, que ya está definido (`public-auth.css:25`) y da **5,91**. Cambio de un token en un fichero tenant-only |
| `--pub-ink-400` #8578a0 / blanco | **4,05** | §1.4.3 AA para texto normal | Es el color del pie (`.pub-footer`, 12 px). **Subir a `--pub-ink-500`** (6,12). Solo vale para texto ≥ 24 px o ≥ 19 px en negrita |
| `--pub-ink-400` / fondo landing | **3,43** | §1.4.3 AA | Igual: `--pub-ink-500` (5,18) |
| `--pub-ok-tx` #16a34a / `--pub-ok-bg` | **3,12** | §1.4.3 AA | **#15803d** da 4,76. Afecta a los mensajes de éxito de la zona pública |
| `--pub-ink-300` #a89bbd / blanco | **2,60** | §1.4.3 AA | Solo decorativo. **Nunca** para un `placeholder` que porte información |
| `--pub-ame-400` #c084fc / blanco | **2,64** | §1.4.11 | No vale como borde de control ni como anillo de foco |
| `--pub-err-bd` #fecaca / blanco | **1,45** | §1.4.11 | El borde de un campo inválido tiene que llegar a 3:1. El estado de error **no puede depender de él**: va acompañado del icono + el texto |
| `--pub-line` #ece5f4 / blanco | **1,23** | §1.4.11 si porta estado | Vale como separador decorativo. **No vale para marcar la tarjeta de plan recomendada**: por eso la insignia con texto de §7.5 |

Los cambios de token de esta tabla viven en `public-auth.css`, que **no es gemelo TR-02** (§1.3):
son de `front-feature`, no de `front-parity`.

---

## 10. CSS: qué se consume y qué haría falta

### 10.1 La regla, y la trampa que la explica

Se consume `primitives.css` y `tokens.css` desde el marcado; **no se reescribe una primitiva dentro
del `<style scoped>`**. Dos puertas lo comprueban: `vetsoftware/no-duplicate-primitive` al escribir,
y `scripts/css-budget.mjs` sobre el agregado, con techos que son un trinquete y **solo bajan**
(`scripts/css-budget.config.json`): `maxStyleMinusScript: 0`, `maxDuplicateGroups: 0`,
`maxSfcLines: 500`, `maxOversizedSfc: 0`.

**Una landing es tentación pura de CSS nuevo, y el techo de `maxStyleMinusScript: 0` es implacable:**
si el `<style>` de todos los SFC pesa más que el `<script>`, el gate se pone rojo para todo el repo.
Un `LandingView.vue` de 468 líneas con 317 de CSS y 28 de script (lo que hay hoy) es exactamente el
perfil que revienta ese techo.

**Mitigación obligatoria, y es de diseño, no de implementación: la landing se parte en componentes.**

```
src/features/landing/
  views/LandingView.vue          ← composición y estados. < 150 líneas
  components/LandingHero.vue
  components/LandingValueGrid.vue
  components/LandingDayFlow.vue
  components/LandingPlans.vue
  components/PlanCard.vue
  components/LandingFaq.vue
  components/LandingFooter.vue
```

Ninguno pasa de 500 líneas y el CSS repartido no crea grupos duplicados. **Si dos de ellos acaban con
el mismo cuerpo de regla, eso es un `.pub-*` nuevo, no un copiar y pegar** — es lo que
`no-duplicate-primitive` va a rechazar de todos modos.

Y la trampa de especificidad de `AGENTS.md:103-122`: una primitiva global pesa (0,1,0); la regla base
de un componente en `scoped` lleva `[data-v-…]` y pesa (0,2,0), así que **le gana siempre**. Por eso
la base del componente se queda **solo con geometría** y el color viaja en la clase de tono aplicada
desde el marcado, **incluido el estado de reposo**. Si en la revisión aparece un `color:` en el
`<style scoped>` de un componente de la landing, eso es un bug esperando a manifestarse.

### 10.2 Primitivas `ds-*` que se consumen

**En la zona pública (pasos 1-4): solo layout, nunca tipografía ni color.**
`public-auth.css:146-156` declara que la zona pública no usa `ds-*` a propósito, «mezclarlas traería
Geist y la paleta warm». Se respeta con una excepción acotada y justificada: **`.ds-stack`
(`primitives.css:942-945`) y `.ds-grid-2` (`:614-618`) son puro layout** —`display`,
`flex-direction`, `grid-template-columns`, `gap`—, sin una sola declaración de fuente o color. Usarlas
no contamina el lenguaje. Cualquier otra (`ds-btn`, `ds-card`, `ds-display`, `ds-title`) **sí** lo
haría, y está prohibida en la zona pública.

**En la zona de app (pasos 5-7): el catálogo completo.**

| Necesidad | Primitiva |
|---|---|
| Página y pila | `.ds-page`, `.ds-page--contained`, `.ds-stack`, `.ds-stack--14`, `.ds-stack--16` |
| Título y bajada | `.ds-display`, `.ds-display--sm`, `.ds-title`, `.ds-subtitle`, `.ds-kicker` |
| Tarjeta del resumen | `.ds-card`, `.ds-panel`, `.ds-frame`, `.ds-block-head` |
| Botones | `.ds-btn`, `.ds-btn--primary`, `.ds-btn--lg`, `.ds-btn--ghost`, `.ds-btn--elevated` |
| Aviso de demostración | `.ds-banner`, `.ds-banner--warning`, `.ds-banner-icon` |
| Error de confirmación | `.ds-banner--error`, `.ds-error-summary` |
| Tabla de la prueba por línea | `.ds-table`, `.ds-table--dense`, `.ds-table-scroll` |
| Importes | `.ds-num`, `.ds-text-strong`, `.ds-meta`, `.ds-meta--sm` |
| Insignia | `.ds-pill`, `.ds-tone--accent-soft`, `.ds-tone--success` |
| Foco | `.ds-focus-ring` |
| Solo para lectores | `.ds-sr-only` |

**El tenant no tiene primitiva de botón ni de tabla como componentes**: `.ds-btn` y `.ds-table` se
usan como clases sobre `<button>` y `<table>`. Tampoco tiene primitiva de paginación en `ui/` más
allá de `Pagination.vue`. No se asuman componentes que no existen.

### 10.3 Componentes `ui/` que se consumen (paso 6-7)

`BaseField`, `BaseInput`, `BaseSelect`, `SegmentedRadio`, `SectionCard`, `PageHeader`, `ModalShell`
(solo si hace falta un diálogo; el paso 6 **no** es un modal), `ErrorSummary`, `PawLoader`,
`AppConfirmDialog`.

### 10.4 Primitivas nuevas — el balance

**En `primitives.css` (gemelo TR-02): ninguna.** Es el resultado deseado y hay que preservarlo. Todo
lo que la zona de app necesita ya está.

**En `public-auth.css` (tenant-only, `front-feature`): siete clases nuevas**, todas del lenguaje
`pub-*` y todas con al menos tres usos, para que no sean CSS de un solo sitio disfrazado de
primitiva:

| Clase | Para qué | Usos |
|---|---|---|
| `.pub-skip` | El skip link: fuera de pantalla hasta `:focus-visible` | Landing + las 7 públicas |
| `.pub-section` | Ritmo vertical de una sección de la landing | §B, §C, §D, §E, §F |
| `.pub-section-head` | `<h2>` + bajada centrados | §B, §C, §D, §E |
| `.pub-plan-card` | Geometría de la tarjeta de plan (**solo geometría**) | 3 tarjetas |
| `.pub-plan-card--featured` | El realce de la recomendada (borde ≥3:1 + elevación) | 1, pero es el estado que §1.4.11 exige medir |
| `.pub-price` | Cifra grande con `font-variant-numeric: tabular-nums` | §D, /planes, carril del paso 3 |
| `.pub-badge` | La insignia con texto de «La que más eligen» | §D + estados de /planes |

**Y tres correcciones de token**, en el mismo fichero, con los números de la §9:

1. `.pub-error` / `.pub-field-error` pasan de `--pub-err-tx` a `--pub-err-tx-2` (4,41 → 5,91).
2. `.pub-footer` y `.pub-topbar-right` pasan de `--pub-ink-400` a `--pub-ink-500` (4,05 → 6,12).
3. `--pub-ok-tx` se redefine a `#15803d` (3,12 → 4,76).

**Nada de esto toca un fichero gemelo.** Si en la implementación aparece la necesidad de una
primitiva en `primitives.css`, **eso es de `front-parity` y hay que pedirlo antes de escribir una
línea**: `primitives.css` está verificado idéntico byte a byte entre los dos repos
(`diff -q` limpio el 2026-08-28), y romper eso rompe la paridad TR-02 para todo el mundo.

### 10.5 Iconos

**Solo Lucide, en componentes.** La landing y todo el flujo nuevo importan de `lucide-vue-next` y
usan `<Calendar :size="18" :stroke-width="1.7" aria-hidden="true" />`. Cero `v-icon`, cero `mdi-*`.

Nota de alcance para quien lo implemente: la zona pública tiene hoy **15 SFC con `v-icon` y 0 con
Lucide**. Migrarlos todos no es tarea de este encargo; lo que sí es tarea es **no añadir el
decimosexto**.

---

## 11. Router, stores y tipos

### 11.1 Rutas

```ts
// públicas — sin guard de sesión, junto a las que ya hay (router/index.ts:65-113)
{ path: '/',        name: 'landing', component: LandingView,
  meta: { guestOnly: true, title: 'VetSoftware — Software para clínicas veterinarias en Colombia' } },
{ path: '/planes',  name: 'planes',  component: PlanesView,
  meta: { guestOnly: true, title: 'Planes y precios — VetSoftware' } },

// autenticadas — dentro de /dashboard, sin barra lateral (patrón de :134 y :141)
{ path: 'contratar',       name: 'contratar',
  meta: { fullBleed: true, hideTopbar: true, title: 'Confirma tu plan — VetSoftware' } },
{ path: 'contratar/exito', name: 'contratar-exito',
  meta: { fullBleed: true, hideTopbar: true, title: 'Tu plan está activo — VetSoftware' } },
```

Dos avisos para no ensuciar lo que está limpio:

- **`guestOnly` en `/planes`.** Es lo que ya llevan `landing`, `login`, `signup` y `verify-email`
  (`:69`, `:75`, `:81`, `:87`). Un cliente con sesión que entra a `/planes` va a `home`, que es lo
  correcto: su plan se gestiona desde dentro.
- **Ninguna entrada nueva en el menú lateral.** `contratar` y `contratar-exito` no son destinos de
  navegación: se llega a ellos por el flujo. El menú y el router están limpios y así se quedan.

El `afterEach` de `:451-453` se amplía para fijar `document.title` desde `to.meta.title` (§8.1). Es
un cambio de una línea que cubre **todas** las rutas, no solo las nuevas.

### 11.2 Store

**Pinia obligatorio.** Prohibido un `ref()` o `reactive()` a nivel de módulo dentro de un composable:
en SSR o en dos pestañas comparte estado entre usuarios, y es una regla dura del repo.

```
src/features/contratacion/stores/contratacion.store.ts   → useContratacionStore
```

Estado:

```ts
interface IntencionContratacion {
  planCode: string
  ciclo: 'MENSUAL' | 'ANUAL'
  sedes: number
  usuarios: number
  /** El importe que VIO el usuario cuando eligió. Se compara contra el del servidor (§5, caso 3). */
  importeVistoMensual: number
  /** Sello del contenido con el que se calculó, para saber si el precio pudo moverse. */
  selloRevisadoEl: string
  creadaEn: string
  descartada: boolean
}
```

Reglas del store:

- **Espejo en `localStorage`**, clave `vs.contratacion.intencion.v1`. La `v1` no es adorno: cuando
  la forma cambie, una clave nueva evita leer un objeto viejo con campos que ya no existen.
- **El sellado va en `pagehide`, nunca en `beforeunload`** (regla R09 de `reglas-de-interfaz.md`):
  `beforeunload` no dispara de forma fiable en móvil y además penaliza el bfcache.
- **La intención caduca a los 30 días.** Un plan elegido hace dos meses no es una intención, es
  basura, y el precio de entonces ya no vale.
- El `clientRequestId` del paso 6 **no vive aquí**: se genera al montar la vista y muere con ella.
  Persistirlo haría que un reintento a los tres días reusara una llave de hace tres días.

### 11.3 Tipos

`src/features/landing/types/plans.types.ts` — los tipos **son los mismos** para la variante de
contenido y para el futuro `GET /plans`. Esa es la razón de que estén en su propio fichero y no
dentro del contenido.

```ts
export type Ciclo = 'MENSUAL' | 'ANUAL'
export type CapacityUnit = 'USER' | 'BRANCH' | 'TERMINAL' | 'STORAGE_GB'

export interface PlanInclude   { code: string; name: string; trialDays: number }
export interface PlanCapacity  { unit: CapacityUnit; included: number; extraUnitAmount: number }

export interface PublicPlan {
  code: string
  name: string
  tagline: string
  recommended: boolean
  monthlyFromAmount: number
  annualFromAmount: number
  setupAmount: number
  taxRate: number
  includes: PlanInclude[]
  capacities: PlanCapacity[]
}

export interface PublicCatalog {
  currency: string          // 'COP'
  priceValidFrom: string    // ISO date
  plans: PublicPlan[]
}
```

`CapacityUnit` reproduce el enum del backend (`commercial-catalog.types.ts:2` en la consola). Los
rótulos en español se resuelven con un mapa local en el tenant, en la línea de
`composables/domainLabels.ts`; no se importa nada de la consola.

---

## 12. Qué hay que pedirle al backend

Tres cosas, en orden de urgencia. **Ninguna bloquea la implementación de esta spec** —el adaptador de
la §2.5 existe justamente para eso—, pero las tres deciden hasta dónde llega el producto.

**1) `GET /plans`, público (medio: desbloquea que el precio sea contrato y no contenido).**
Especificado entero en §2.6: la ruta literal en `PublicRoutes.BUSINESS`, el puerto separado con
`@NoAuthorizationRequired`, el DTO pobre por diseño, y la tabla de lo que no debe salir. En el mismo
cambio: **exponer `default_trial_days` por artículo**, que existe en
`CatalogItemJpaEntity.java:112-113` y **no está en `CatalogItemResponse.java:8-18`** — sin él, la §6
no tiene fechas que pintar y hay que inventarlas en el front.

**2) Un endpoint para que la clínica contrate su propio plan (alto: hoy el paso 6 no tiene a quién
llamar).** El modelo casi lo tiene: `AcceptQuoteUseCase.java:9-10` ya admite que **el empleado del
tenant acepte**, no solo `SYSTEM`:

```java
@PreAuthorize("hasRole('SYSTEM') or (hasAuthority('quote.accept') "
        + "and @authz.isMyCompany(#command.companyId))")
```

Pero faltan las dos mitades: **crear** la cotización sigue siendo `hasRole('SYSTEM')`
(`CreateQuoteUseCase.java:29`), y el front del tenant **no declara ningún permiso `quote.*`**
(`grep -rn "quote" src/constants/permissions.ts` → 0 aciertos). Las dos opciones, para que decida
quien corresponda:

- **(a)** un `POST /subscriptions/self` que cree contrato y suscripción en un paso, con el gate
  `hasAuthority('subscription.create') and @authz.isMyCompany(...)`. Más simple, no reutiliza el
  embudo de cotizaciones;
- **(b)** abrir `CreateQuoteUseCase` al tenant sobre su propia empresa y reutilizar
  `accept` + `clientRequestId`. Reutiliza toda la prueba de aceptación (`acceptedAt`,
  `acceptedByEmail`, `acceptedIp`) que ya existe y ya está pensada.

**Preferencia de esta spec: (b).** El rastro de aceptación es un requisito legal, no un detalle
técnico, y ya está construido y probado. Reimplementarlo en (a) es reconstruir la única parte
delicada.

**3) Una vía de baja durante la prueba (bajo, pero condiciona el texto del paso 6).** Mientras no
exista, la pantalla **no puede prometer «cancela cuando quieras»** y dice la verdad: escríbenos. Si
llega, el texto del paso 6 cambia y §3.3.4 pasa a cumplirse también por la vía «Reversible», que es
más fuerte.

> Se redacta aquí, no se abre. **No se abre ningún issue de GitHub** — regla suspendida por orden
> explícita del dueño. Estos tres párrafos son el cuerpo listo para que lo decida un humano.

---

## 13. Cómo se verifica

Lo escribe `front-e2e-visual`, no `front-feature`, y no es negociable que exista antes de dar el
flujo por cerrado.

**Unitario (Vitest)**

| Spec | Qué sujeta |
|---|---|
| `plans-content-sello.spec.ts` | El sello del contenido no pasa de 90 días (§2.5) |
| `contratacion-store.spec.ts` | Caducidad a 30 días, `descartada`, y que el espejo de `localStorage` sobrevive a un `pagehide` |
| `plan-price-drift.spec.ts` | Cuando el importe del servidor difiere del de la intención, la casilla de términos **se desmarca** (§5, caso 3) |
| `register-error-summary.spec.ts` | El `ErrorSummary` del registro lista los errores **en el orden del DOM** y su texto es **literalmente** el del error en línea |

**Extremo a extremo (Playwright)**

- El recorrido feliz completo, `/` → paso 7, con el correo verificado por atajo de datos de prueba.
- **`toMatchAriaSnapshot()` de la sección de planes y del paso 6.** Es regresión de *semántica*, no
  de píxeles: detecta que alguien convirtió la tarjeta de plan en un enlace envolvente otra vez, o
  que el `<h2>` se volvió un `<div>`. Es exactamente el fallo que esta spec está corrigiendo.
- Recorrido de **solo teclado** desde el skip link hasta «Confirmar y activar mi plan», comprobando
  que el foco es visible en cada parada y que el orden es el visual.
- Los ocho estados de la §5, cada uno con su texto exacto.

**Accesibilidad automatizada**

Hoy **no hay ninguna puerta de accesibilidad en el pipeline** de ninguno de los dos repos: ni
`axe-core`, ni `@axe-core/playwright`, ni `eslint-plugin-vuejs-accessibility`, ni Lighthouse (está
abierto en public-web #57 y admin-web #44, citados en `docs/ux/README.md`). **La landing es el mejor
sitio para estrenarla**: es una página pública, estática, sin sesión, y por tanto la más barata de
auditar en CI. La propuesta concreta es `@axe-core/playwright` sobre `/` y `/planes`, con el listón
en «cero violaciones serias o críticas», antes de publicar.

**Lo que esta spec NO ejecutó**, y se declara: no se levantó el dev server, no se corrió
`npm run quality`, ni `css:budget`, ni Playwright, ni `ds:audit`. Lo único que se **midió** de verdad
son los contrastes de la §9, con un script propio sobre los tokens reales. Todo lo demás se decidió
leyendo el código, con `fichero:línea`.

---

## 14. Riesgos

| # | Riesgo | Probabilidad | Mitigación, y quién |
|---|---|---|---|
| 1 | **El precio del front se separa del real** y nadie se entera | Alta si nadie mira | El sello + el test de 90 días (§2.5) lo hacen ruidoso; el rótulo «orientativo» y el recálculo del servidor en el paso 6 lo hacen inofensivo. Se cierra del todo con `GET /plans` |
| 2 | **El paso 6 no tiene endpoint** y queda como maqueta | Cierta hoy | §12, punto 2. Mientras tanto, el paso 6 se implementa contra un adaptador con la misma forma; el día que exista el endpoint se cambia el adaptador y nada más. **La simulación de la §4 es honesta precisamente porque hoy no hay nada que llamar** |
| 3 | **La landing revienta `maxStyleMinusScript: 0`** y pone el gate en rojo para todo el repo | Alta | §10.1: la landing se parte en 7 componentes desde el primer commit, no «cuando crezca». Medir con `npm run css:budget` **antes** de abrir el PR, no después |
| 4 | El salto de verificación de correo mata la conversión | Media | Es una restricción del backend (Opción B), no una elección. Se mitiga con el carril «Tu selección» (§3.4), la banda de reanudación (§5, caso 1) y el enganche del login (§3.5). No se puede eliminar sin cambiar el registro, y cambiar el registro está fuera de este encargo |
| 5 | Alguien «mejora» el aviso de demostración haciéndolo descartable o poniéndolo en un toast | Media | Está escrito en §4.3 con el motivo. Un aviso de que no hay cobro real que se pueda cerrar es un aviso que la mitad de la gente no ve |
| 6 | Se implementa la prueba como «30 días» plana y el día 14 se cobra Caja | **Alta**, es el error natural | §6. El modelo es por línea (`ModuleGrantLine.java:45,62-65`) y la pantalla tiene que serlo. Es el fallo que más caro sale: rompe la confianza de una cuenta recién creada |
| 7 | El flujo nuevo hereda el hueco de `aria-describedby` de la zona pública | **Alta si no se hace la tarea 0** | §1.4 y §8.1. Portar `fieldContext.ts` a `AuthField` es lo primero, no lo último. Es tenant-only: no hay excusa de coordinación |
| 8 | Los enlaces legales del pie siguen muertos cuando el flujo se publique | Media | §7.8. La casilla del paso 6 enlaza a Términos y a Privacidad; si no existen, el paso 6 no se puede publicar. Es una dependencia legal, no de diseño |
