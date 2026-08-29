# Mi suscripción — especificación de diseño para la app del tenant

**Repositorio:** `VetSoftwarePublicFront` (la app de la clínica que paga).
**Estado:** especificación. Ningún fichero de `src/` se ha tocado al escribirla.
**Quién implementa:** `front-feature`. La única pieza de `front-parity` está aislada en §9.2.
**Fecha de verificación del terreno:** 2026-08-28, contra el árbol de trabajo de los tres repos.

---

## 0 · El hueco, y por qué esto no es una pantalla más

La app del tenant tiene 28 features y **cero pantallas sobre su propia suscripción**. Verificado:
cero literales de `/subscriptions`, `/subscription-billing`, `/entitlements`, `/quotes`,
`/customer-credit` en todo `VetSoftwarePublicFront/src`.

El backend lleva meses listo. Cada rodaja tiene su controller de tenant separado del de plataforma,
y el reparto está escrito en el javadoc de cada uno —no deducido—:

- `VetSoftware/…/subscriptionbilling/infrastructure/web/SubscriptionBillingController.java:19-32`
  — *«quien factura es la plataforma, no el cliente»*.
- `VetSoftware/…/subscriptionitemlimit/infrastructure/web/SubscriptionItemLimitController.java:14-21`
  — *«un tope que solo aparece impreso en la cotización no sirve; tiene que ser visible dentro del
  producto en todo momento, porque es lo que convierte un portazo en algo que el usuario
  entiende»*.
- `VetSoftware/…/subscriptionpaymentmethod/infrastructure/web/SubscriptionPaymentMethodController.java:28-41`
  — el único con escritura del tenant, y el motivo: *«revoca, que es un derecho que no puede quedar
  detrás de una gestión de plataforma»*.

**Consecuencia de usabilidad, no de producto.** Hoy, cuando el contador de mascotas llega al techo,
la auxiliar recibe un rechazo a mitad de una consulta y **no hay ninguna pantalla en el producto que
le diga por qué**. Eso es NN/g H1 (visibilidad del estado del sistema) incumplido en el punto más
caro del recorrido: con el animal encima de la mesa. Esta especificación existe para que el bloqueo
deje de ser una sorpresa.

**El usuario que la lee.** Una auxiliar o un veterinario con prisa, muchas veces con una sola mano.
No es un operador de plataforma. Todo el vocabulario de la consola —«el otrosí #163», «Documento ·
solo se agrega», «devengado»— **está prohibido aquí**; el catálogo de textos de §6 es la sustitución
literal, no una guía de tono.

---

## 1 · Alcance: los cinco bloques y su gate real

Cada fila está verificada contra el `@PreAuthorize` del puerto —que vive en
`application/port/in/*UseCase.java`, **no** en el controller—. `T` = alcanzable por un empleado del
tenant. `S` = solo `ROLE_SYSTEM`, no se dibuja.

| Bloque | Endpoint | Puerto y gate | Permiso |
| --- | --- | --- | --- |
| **1 Mi plan** | `GET /subscriptions/current` | `FindCurrentSubscriptionUseCase` `T` | `subscription.read` |
| | `GET /subscriptions/{id}/items` | `ListSubscriptionItemsUseCase` `T` | `subscription.read` |
| | `GET /entitlements/access` | `FindCompanyAccessUseCase` `T` (solo `isMyCompany`, sin permiso) | — |
| **2 Cupos** | `GET /entitlements` | `ListCompanyEntitlementsUseCase` `T` | `entitlement.read` |
| | `GET /subscription-item-limits` | `ListSubscriptionItemLimitsUseCase` `T` | `subscriptionItemLimit.read` |
| | `GET /company-limit-overrides/effective-limits/{id}` | `ResolveEffectiveLimitUseCase` `T` | `companyLimitOverride.read` |
| | `GET /company-limit-events` | `ListCompanyLimitEventsUseCase` `T` | `companyLimitEvent.read` |
| **3 Cuentas de cobro** | `GET /subscription-billing/documents` (+`/{id}`, `/charges`) | `ListBillingDocumentsUseCase`, `FindBillingDocumentUseCase`, `ListSubscriptionChargesUseCase` `T` | `subscriptionBilling.read` |
| | `GET /subscription-payments` | `ListSubscriptionPaymentsUseCase` `T` | `subscriptionPayment.read` |
| | `GET /customer-credit/balance`, `/entries` | `FindCustomerCreditBalanceUseCase`, `ListCustomerCreditEntriesUseCase` `T` | `customerCredit.read` |
| | `GET /dunning-events` | `ListDunningEventsBySubscriptionUseCase` `T` | `dunningEvent.read` |
| **4 Medios de pago** | `GET /subscription-payment-methods` (+`/{id}`) | `ListSubscriptionPaymentMethodsUseCase` `T` | `subscriptionPaymentMethod.read` |
| | `PATCH /{id}/default` | `SetDefaultPaymentMethodUseCase` `T` | `subscriptionPaymentMethod.update` |
| | `PATCH /{id}/revocation` | `RevokeSubscriptionPaymentMethodUseCase` `T` | `subscriptionPaymentMethod.update` |
| | `POST /subscription-payment-methods` | `RegisterSubscriptionPaymentMethodUseCase` `T` | `subscriptionPaymentMethod.create` — **ver §7.4.4, no se implementa ahora** |
| **5 Cotizaciones** | `GET /quotes` | `ListQuotesByCompanyUseCase` `T` | `quote.read` |
| | `GET /quotes/{id}` | `FindQuoteUseCase` `T` | `quote.read` |
| | `POST /quotes/{id}/accept` | `AcceptQuoteUseCase` `T` | `quote.accept` |
| | `POST /quotes/{id}/reject` | `RejectQuoteUseCase` `T` | `quote.reject` |
| | `PATCH /subscriptions/{id}/cancel` | `CancelSubscriptionUseCase` `T` | `subscription.cancel` |
| | `PATCH /subscriptions/{id}/items/remove` | `RemoveSubscriptionItemUseCase` `T` | `subscription.update` |
| | `POST /subscriptions/{id}/items/quantity` | `ChangeSubscriptionItemQuantityUseCase` `T` | `subscription.update` |
| **Opcional** | `GET /legal-documents/{code}/current`, `/versions` | `FindCurrentLegalDocumentUseCase`, `ListLegalDocumentVersionsUseCase` `T` | `legaldocument.read` |

### 1.1 Lo que NO se dibuja, y no es un olvido

Verificado `S` en su puerto. **Si aparece un botón para alguna de estas, es un bug de la
especificación, no una mejora**:

- `POST /quotes` y `GET /quotes/platform` — la plataforma propone, la clínica no se cotiza sola.
- `POST /subscriptions/{id}/items` — el cuerpo lleva `unitAmount`; abrirlo sería un alta gratuita
  autoservida (`SubscriptionController.java:75-79`).
- `PATCH /subscriptions/{id}/status` — *«es la palanca de cobro»*.
- `POST /subscription-payments` — **la clínica no registra su propio pago.** Esta es la que más
  fácil se cuela: la consola tiene `RegisterPaymentModal` y es tentador clonarlo.
- `POST /dunning-events`, `POST /entitlements/recalculate`, todo `/customer-credit` que no sea
  `balance`/`entries`, y los `System*Controller` enteros.

---

## 2 · Reglas transversales — las que rompen la implementación si se saltan

### 2.1 `X-Company-Id` es veneno copiado. **Prohibida.**

`http.client.ts:36-71` lo documenta: el campo `companyId` de la config existe en el tenant **solo
porque el fichero es gemelo TR-02 byte a byte con el de la consola**, y su rama está inerte aquí. El
backend resuelve la empresa de un empleado desde el `EmployeeContext` del token
(`Authz.currentCompanyId()`) y **ignora la cabecera**.

**Regla:** ninguna llamada de `features/suscripcion/api/*.ts` pasa `companyId` en la config de axios.
Si se clona un fichero de API de la consola, lo primero que se borra es ese argumento. El síntoma de
no hacerlo es que **no hay síntoma**: funciona igual y nadie se entera, hasta que alguien lo copia a
un endpoint donde sí manda.

### 2.2 `MatchesContract` es ciego a lo anidado. Aquí eso duele de verdad.

`src/types/api.contract.ts` ata los tipos escritos a mano al contrato generado, pero su comparador
solo alcanza `Comparable = string | number | boolean`. En este dominio, eso deja **sueltos
exactamente los campos que llevan la información**:

| Tipo | Lo que la atadura comprueba | Lo que queda suelto |
| --- | --- | --- |
| `CompanyAccessResponse` | `companyId`, `recalculatedAt` | `entitlements[]` y **`capacities[]`** — el «340 de 500» entero |
| `BillingDocumentResponse` | 20 campos planos | `taxes[]` |
| `DunningEventResponse` | los planos | `subscription{}`, `billingDocument{}` |
| `QuoteResponse` | los planos | `lines[]`, `answers[]` |
| todo `PageResponse<T>` | la envoltura | **`content[]`**, es decir, todo |

**La defensa que sí hay que poner**, porque la atadura es decorativa en estos:

1. Cada tipo anidado (`CompanyCapacityResponse`, `BillingDocumentTaxSummary`, `QuoteLineResponse`,
   `DunningSubscriptionSummary`…) **se declara como interfaz propia y se ata individualmente** en
   `api.contract.ts`. Es lo que ya hace el resto del repositorio y lo que convierte la ceguera en
   cobertura: el comparador no baja, pero cada nivel tiene su propia línea.
2. **Ningún acceso a un array anidado se escribe sin comprobar su existencia.** `capacities` llegando
   `undefined` tras un renombrado en el backend pinta «sin cupos» en verde, que es lo contrario de la
   verdad. Rama explícita, no `?? []` silencioso: ver §7.2.5 (estado «no se pudo leer»).
3. **Una prueba unitaria por bloque** que monte la vista con una respuesta a la que le falte el
   array y compruebe que se pinta el hueco honesto y no el estado sano (R14 de
   `reglas-de-interfaz.md`).

### 2.3 Estado en Pinia. `ref()` a nivel de módulo, prohibido.

Un store por bloque, en `features/suscripcion/stores/`. Los composables `use*` son la fachada de
lectura que consume la vista; **no guardan estado propio**. Es la regla del proyecto y aquí tiene un
motivo concreto: el banner de estado de §7.1.3 lo consumen las cinco sub-pantallas, y un `ref()` de
módulo lo compartiría también entre dos sesiones distintas en la misma pestaña tras un cambio de
usuario.

### 2.4 CSS: consumir `primitives.css`, no reescribirlo

`scripts/css-budget.config.json` está en **0 / 0 / 0** con `maxStyleMinusScript: 0`,
`maxDuplicateGroups: 0`, `maxSfcLines: 500`, `maxOversizedSfc: 0`. Es un trinquete: **esta feature no
puede subir ninguno de esos números.** En la práctica:

- El `<style scoped>` de cada SFC nuevo pesa **menos líneas que su `<script>`**. Si no cabe, la
  pantalla está mal partida, no falta CSS.
- Ningún SFC pasa de 500 líneas. La ficha de un documento de cobro (§7.3) es la que más riesgo tiene:
  se parte en `DocumentoResumen` + `DocumentoLineas` + `DocumentoImpuestos`.
- **El color va en la clase de tono desde el marcado, nunca en el `scoped`** (AGENTS.md:103-122): una
  regla base en `scoped` pesa `(0,2,0)` por el `[data-v-…]` y le gana a la primitiva global, que pesa
  `(0,1,0)`. En el `scoped` solo entra geometría.
- Las primitivas exactas que se consumen están en §9.1. **La única que falta está en §9.2** y es
  trabajo de `front-parity`, no de esta feature.

### 2.5 Iconos: solo Lucide, en componentes

`<component :is="Icono" :size="…" />`. El tenant no tiene `constants/icons.ts` (la consola sí): aquí
se importa el icono directamente de `lucide-vue-next`, como hace `useSidebarNav.ts:2-21`. Iconos de
esta feature: `CreditCard`, `Receipt`, `Gauge`, `Wallet`, `FileText`, `AlertTriangle`, `Info`,
`Check`, `ShieldCheck`, `Ban`.

### 2.6 Carga, avisos y errores — sin invención

- **Loader:** `PawLoader` y solo `PawLoader`, vía el velo global de `useGlobalLoader` que ya dispara
  el interceptor de `http.client.ts`. Prohibidos los spinners genéricos, los de Lucide y las
  rotaciones CSS sueltas (R06).
- **Avisos efímeros:** `useToast()`; el error de red **siempre** `errorFrom(titulo, error)`, nunca el
  texto escrito a mano — así viaja la traza (TR-05).
- **Estados persistentes:** banner en el flujo, con el criterio de `patron-de-mensajes.md` §2: *«¿el
  mensaje sigue siendo verdad treinta segundos después?»*. Todo lo de esta feature —mora, cupo
  agotado, prueba por vencer, plan cancelado— **es banner, no toast**.
- **Listados:** la rama de error va **antes** que la de vacío (R05 / EST-01). El modelo a copiar es
  `src/features/acciones/components/ListBody.vue:140-158`: icono en `.ds-banner-icon`, mensaje en
  `.ds-flex-fill`, botón «Reintentar» a la derecha, traza copiable.

---

## 3 · Dónde cuelga: menú y router

### 3.1 Menú — **una** entrada, no cinco

`src/components/layout/AppSidebar.vue:290-320`, sección `ADMINISTRACIÓN`, **después de «Empresa» y
antes de «Empleados»**: es una responsabilidad de titularidad, no de personal.

```
ADMINISTRACIÓN
  Empresa            (Building2)   ← existe
  Mi suscripción     (CreditCard)  ← NUEVO
  Empleados          (Users)       ← existe
  Roles y permisos   (ShieldCheck) ← existe
  Medicamentos       (Pill)        ← existe
```

- **Rótulo exacto:** `Mi suscripción`. No «Facturación» —ya existe una sección de facturación
  electrónica DIAN, que es otra cosa— ni «Plan», que no dice de qué.
- **Icono:** `CreditCard` de Lucide.
- **Visibilidad:** `canSuscripcion = canAny(SUBSCRIPTION_READ, SUBSCRIPTION_BILLING_READ, QUOTE_READ,
  SUBSCRIPTION_PAYMENT_METHOD_READ)`, declarado en `useSidebarNav.ts` junto a los otros 25. Se añade
  a `showAdminSection`.
- **No se abre acordeón.** El menú ya tiene cuatro secciones desplegables y el criterio del sidebar es
  que una entrada de administración es plana. Las cinco sub-pantallas se navegan **dentro** de la
  página (§3.3), que además es lo que la hace enlazable por soporte.

### 3.2 Router — rutas hijas bajo un armazón

En `src/router/index.ts`, dentro de los `children` de `/dashboard`:

```
/dashboard/suscripcion                  → SuscripcionLayout.vue      meta: { permission: SUBSCRIPTION_READ }
  '' (redirect a 'plan')
  plan          name: 'suscripcion-plan'          MiPlanView.vue
  cupos         name: 'suscripcion-cupos'         CuposView.vue       meta: { permission: ENTITLEMENT_READ }
  cobros        name: 'suscripcion-cobros'        CuentasCobroView.vue meta: { permission: SUBSCRIPTION_BILLING_READ }
  cobros/:id    name: 'suscripcion-cobro'         CuentaCobroDetalleView.vue
  medios-pago   name: 'suscripcion-medios-pago'   MediosPagoView.vue  meta: { permission: SUBSCRIPTION_PAYMENT_METHOD_READ }
  cotizaciones  name: 'suscripcion-cotizaciones'  CotizacionesView.vue meta: { permission: QUOTE_READ }
  cotizaciones/:id name: 'suscripcion-cotizacion' CotizacionDetalleView.vue
```

Rutas hijas y no `BaseTabs`, y el motivo importa: **una pestaña con estado local no es enlazable.**
Cuando la auxiliar llama a soporte, «mándame el enlace de lo que ves» tiene que funcionar. La consola
resolvió lo mismo igual (`SubscriptionRecordLayout` + `RouterView`).

### 3.3 Sub-navegación dentro de la página — `<nav>`, no `role="tablist"`

**Esto es una decisión de accesibilidad, no de estilo.** Un conjunto de enlaces que **navegan** no es
un `tablist`: el patrón *Tabs* del APG exige que la activación muestre un panel del mismo documento,
con `aria-controls` a un `role="tabpanel"` presente en el DOM. Con `RouterLink` no hay tal panel.
Marcar esto como `tablist` es la forma más común de romper el patrón y **está expresamente descartada
aquí**; `BaseTabs.vue` se queda para lo que es (Caja, Cuentas, Reportes).

Marcado, en `SuscripcionLayout.vue`:

```html
<nav class="sub-nav" aria-label="Secciones de mi suscripción">
  <RouterLink :to="{ name: 'suscripcion-plan' }" class="ds-btn ds-btn--plain">Mi plan</RouterLink>
  …
</nav>
```

- `RouterLink` ya pone `aria-current="page"` en la ruta activa por defecto (`ariaCurrentValue`, valor
  por omisión `'page'`). **No se desactiva.** Esto cierra, en esta feature, el hueco de
  `aria-current` que `docs/ux/reglas-de-interfaz.md` da por abierto en todo el repositorio: el
  sidebar sigue sin anunciarlo, esta sub-navegación sí.
  **Criterio: WCAG 2.2 §4.1.2 Name, Role, Value (A).**
- El estado activo **no se comunica solo por color**: la clase activa sube el peso a
  `var(--weight-semibold)` y añade el subrayado del raíl. **WCAG 2.2 §1.4.1 Use of Color (A).**
- Objetivo mínimo 24×24 px CSS con separación (**WCAG 2.2 §2.5.8 Target Size (Minimum), AA**);
  `.ds-btn` ya lo cumple, `.ds-btn--sm` no siempre — **no se usa `--sm` en esta tira.**
- Cada `<h1>` de la sub-vista es el título de la sección; el `<h1>` de la página lo pone
  `PageHeader`. Un solo `<h1>` por documento: `PageHeader` en el layout, y las sub-vistas empiezan en
  `<h2>`.

### 3.4 Permisos a declarar en `src/constants/permissions.ts`

Todos existen ya en el backend (sembrados por las migraciones 256/257/259/260/366/377, verificado).
Lo que falta es la constante en el front:

```ts
// Autoservicio de la suscripción. Sembrados por 259 (read), 260 (update/cancel),
// 366 (los .read de límites) y backfilleados por 377 sobre las empresas existentes.
SUBSCRIPTION_READ: 'subscription.read',
SUBSCRIPTION_UPDATE: 'subscription.update',
SUBSCRIPTION_CANCEL: 'subscription.cancel',
ENTITLEMENT_READ: 'entitlement.read',
SUBSCRIPTION_ITEM_LIMIT_READ: 'subscriptionItemLimit.read',
COMPANY_LIMIT_OVERRIDE_READ: 'companyLimitOverride.read',
COMPANY_LIMIT_EVENT_READ: 'companyLimitEvent.read',
SUBSCRIPTION_BILLING_READ: 'subscriptionBilling.read',
SUBSCRIPTION_PAYMENT_READ: 'subscriptionPayment.read',
CUSTOMER_CREDIT_READ: 'customerCredit.read',
DUNNING_EVENT_READ: 'dunningEvent.read',
SUBSCRIPTION_PAYMENT_METHOD_READ: 'subscriptionPaymentMethod.read',
SUBSCRIPTION_PAYMENT_METHOD_CREATE: 'subscriptionPaymentMethod.create',
SUBSCRIPTION_PAYMENT_METHOD_UPDATE: 'subscriptionPaymentMethod.update',
QUOTE_READ: 'quote.read',
QUOTE_ACCEPT: 'quote.accept',
QUOTE_REJECT: 'quote.reject',
LEGAL_DOCUMENT_READ: 'legaldocument.read',
```

**Aviso, y es real.** La migración 377 documenta que `entitlement.read`, `subscriptionPayment.read`,
`billingDocumentApplication.read`, `dunningEvent.read` y `subscription.read` **fueron sembrados y
nunca backfilleados** hasta ella. Traducción para el diseño: **en producción habrá empresas cuyo rol
ADMIN no tenga alguno de estos permisos.** Por eso ninguna sub-pantalla puede asumir el permiso: cada
bloque degrada a su hueco honesto (§8.3), y ninguna ausencia de permiso deja la pantalla en blanco.

---

## 4 · Estructura de ficheros

```
src/features/suscripcion/
  api/            suscripcion.api.ts · cupos.api.ts · cobros.api.ts
                  medios-pago.api.ts · cotizaciones.api.ts
  types/          suscripcion.types.ts · cupos.types.ts · cobros.types.ts
                  medios-pago.types.ts · cotizaciones.types.ts
  stores/         suscripcion.store.ts · cupos.store.ts · cobros.store.ts
                  medios-pago.store.ts · cotizaciones.store.ts
  composables/    estadoSuscripcion.ts   (puro: rótulos, frases de apoyo, cortesía)
                  cuposText.ts           (puro: «340 de 500 mascotas», umbrales)
                  cobrosText.ts          (puro: rótulos de documento, pago, mora)
                  useSuscripcion.ts · useCupos.ts · useCobros.ts
                  useMediosPago.ts · useCotizaciones.ts
  components/     SuscripcionEstadoBanner.vue · MedidorCupo.vue · CupoCard.vue
                  DocumentoCobroFila.vue · MedioPagoCard.vue · RevocarMedioModal.vue
                  AceptarCotizacionModal.vue · RechazarCotizacionModal.vue
                  CancelarPlanModal.vue · CambiarCantidadModal.vue
  views/          SuscripcionLayout.vue · MiPlanView.vue · CuposView.vue
                  CuentasCobroView.vue · CuentaCobroDetalleView.vue
                  MediosPagoView.vue · CotizacionesView.vue · CotizacionDetalleView.vue
```

**Los tres `*Text.ts` son puros a propósito** —funciones y datos, sin estado—, por el mismo motivo por
el que la consola separó `subscriptionStatusText.ts`: es lo que una prueba unitaria puede barrer
entero. Aquí importa más que allí, porque estos textos son la única explicación que la clínica recibe
de por qué se le apagó un botón, y una palabra mal puesta se acaba repitiendo por teléfono.

**Dependencias fuera de la feature — declaradas y acotadas:**

- `formatDateShort` / `formatDateLong` de `@/composables/format`. **El tenant no tiene
  `formatDate`** (la consola sí): el equivalente es `formatDateShort` (`13 ago 2026`).
  `formatDateLong` (`13 de agosto, 2026`) solo para frases de apoyo. `EMPTY` es `—` y ya está.
- **Dinero:** `formatMoney` vive hoy en `@/features/tienda/composables/pricing.ts:53`. Importarlo
  desde `suscripcion` es acoplamiento entre features. **Petición explícita:** subirlo a
  `@/composables/money.ts` reexportándolo desde `tienda` para no romper a sus 2 consumidores actuales.
  Si `front-feature` decide no moverlo, se importa desde `tienda` y **se anota como deuda en el PR**;
  lo que no se hace es una tercera copia de `Intl.NumberFormat('es-CO', …)`.
- `useToast`, `useServerPaged`, `useConfirmDialog`, `ModalShell`, `SectionCard`, `PageHeader`,
  `Pagination`, `BaseField`, `BaseSelect`, `ErrorSummary`.

---

## 5 · Los estados que no son el feliz — el mapa maestro

**Es la mitad del valor de estas pantallas.** `SubscriptionResponse` ya trae todo lo necesario:
`status`, `pastDueSince`, `graceDays`, `trialEndDate`, `cancelRequestedAt`, `cancelEffectiveDate`,
`commitmentEndDate`, `nextBillingDate` (verificado en `SubscriptionResponse.java`).

| Estado | Qué ve la clínica | Banner | Tono | `role` |
| --- | --- | --- | --- | --- |
| `TRIALING`, > 7 días | todo normal | ninguno | — | — |
| `TRIALING`, ≤ 7 días | prueba por vencer | sí, en las 5 sub-pantallas | aviso | `status` |
| `ACTIVE` | todo normal | ninguno | — | — |
| `PAST_DUE` | **debe, y sigue trabajando** | sí, en las 5 | aviso | `status` |
| `PAST_DUE`, cortesía agotada | debe y ya no queda margen | sí, en las 5 | error | `status` |
| `READ_ONLY` | consulta e impresión sí, crear no | sí, en las 5 | error | `status` |
| baja pedida, aún vigente | sigue trabajando hasta la fecha | **no**: es un hecho del plan, no un aviso | — | — |
| `CANCELLED` | terminó | sí, en las 5 | error | `status` |
| `EXPIRED` | terminó y no se renovó | sí, en las 5 | error | `status` |
| cupo al 60 / 80 / 90 % | aviso de cupo | en Cupos y en la pantalla que lo consume | aviso | `status` |
| cupo agotado, `BLOCK` | bloqueado | en Cupos | error | `status` |
| cupo agotado, `WARN` | **avisa, no bloquea** | en Cupos | aviso | `status` |
| cupo agotado, `OVERAGE` | se cobra el excedente | en Cupos | aviso | `status` |

### 5.1 Las tres reglas de accesibilidad que gobiernan esa tabla

1. **`role="status"`, nunca `role="alert"`.** Todos estos son **condiciones permanentes de la
   cuenta**, no sucesos. `alert` implica `aria-live="assertive"` y **corta la locución en curso** —
   interrumpir a quien está leyendo la ficha de un paciente para decirle «debes dinero» le hace
   perder el punto de lectura. `patron-de-mensajes.md` §4.2b lo fija y añade el corolario operativo:
   *«`assertive` es un presupuesto, no un adjetivo»*. **Esta feature no añade ni un `assertive`.**
   El único banner de esta especificación con `role="alert"` es el de fallo de listado, que ya viene
   dado por `ListBody`.
2. **El `role` va en el elemento que persiste**, no en el que aparece. `SuscripcionEstadoBanner` se
   monta siempre en el layout y **conmuta su texto interior**, no su existencia. Si el nodo con
   `role="status"` naciera a la vez que su texto, muchos lectores no anunciarían nada.
   `patron-de-mensajes.md` §4.2c.
3. **Ningún estado se comunica solo por color ni por icono.** Cada banner lleva su frase completa,
   porque **un fondo ámbar no se puede leer por teléfono**, que es exactamente lo que hace la
   auxiliar cuando llama a soporte. **WCAG 2.2 §1.4.1 Use of Color (A).**

---

## 6 · Catálogo de textos — literales, en español, se copian tal cual

Formato: **negrita = qué pasa** · resto = qué significa y qué hacer. Reglas de redacción heredadas de
`patron-de-mensajes.md` §6: nunca empieza por «Error:», nunca dice «inténtalo de nuevo» sin un botón
que lo intente, nunca culpa al usuario, y el error de red no se escribe a mano.

### 6.1 Vocabulario del estado del plan

**Prohibido en toda esta feature**, por la misma política que la consola declara en
`subscriptionStatusText.ts` y que es riesgo legal, no preferencia: **«bloquear», «suspender el
acceso», «cortar», «desactivar la cuenta», «inhabilitar».** No existe ni existirá un corte total de
acceso: el grado máximo de restricción es solo consulta, y **una clínica en mora nunca pierde la
consulta de su propia historia clínica.** Una prueba unitaria barre lo que exporta
`estadoSuscripcion.ts` buscando esas cinco palabras y rompe el build.

| Estado | Rótulo | Frase de apoyo (obligatoria, va siempre junto al rótulo) |
| --- | --- | --- |
| `TRIALING` | En prueba | `Estás probando el servicio hasta el {trialEndDate}.` |
| `TRIALING` ≤7d | En prueba | `Tu prueba termina el {trialEndDate}. Después, el servicio pasa a cobrarse; no se corta nada por sí solo.` |
| `ACTIVE` | Al día | `Todo en orden. El próximo cobro es el {nextBillingDate}.` |
| `PAST_DUE` | Pago pendiente | `Tienes un saldo pendiente desde el {pastDueSince}. **Sigues trabajando con normalidad.** Te quedan {n} días de cortesía.` |
| `PAST_DUE` sin cortesía | Pago pendiente | `Tienes un saldo pendiente desde el {pastDueSince} y se agotaron los días de cortesía. Sigues trabajando, pero conviene ponerse al día ya.` |
| `READ_ONLY` | Solo consulta | `Puedes consultar e imprimir todo lo tuyo, incluida la historia clínica. Por ahora no puedes crear ni modificar. Se reactiva en cuanto se regularice el pago.` |
| `CANCELLED` | Cancelado | `Tu plan quedó cancelado el {cancelEffectiveDate}.` |
| `EXPIRED` | Terminado | `Tu plan terminó el {currentPeriodEnd} y no se renovó.` |
| baja pedida | (sin rótulo propio) | `Pediste la baja el {cancelRequestedAt}. **Sigues trabajando con normalidad hasta el {cancelEffectiveDate}**: es el periodo que ya está pagado.` |

`{n} días de cortesía` concuerda en número: `1 día` / `{n} días`. Nunca imprime un negativo — si
`pastDueSince` o `graceDays` faltan, la frase se queda en su forma genérica **y no se inventa un
número** (R14).

### 6.2 Cupos

| Situación | Tono | Texto |
| --- | --- | --- |
| Medidor, con techo | — | `{usado} de {limite} {sustantivo}` |
| Medidor, sin techo | — | `{usado} {sustantivo} · sin límite` |
| 60 % | aviso | `**Vas por el 60 % de tu cupo de {sustantivo}.** Te quedan {restantes}.` |
| 80 % | aviso | `**Te queda el 20 % del cupo de {sustantivo}:** {restantes} más. Si vas a necesitar más, pídelo antes de quedarte sin margen.` |
| 90 % | aviso | `**Casi sin cupo de {sustantivo}:** te quedan {restantes}. Al agotarse {consecuencia}.` |
| Agotado · `BLOCK` | error | `**Se agotó tu cupo de {sustantivo}** ({limite}). No podrás registrar más hasta que se amplíe. Lo que ya tienes sigue funcionando con normalidad.` |
| Agotado · `WARN` | aviso | `**Pasaste tu cupo de {sustantivo}** ({usado} de {limite}). **Puedes seguir registrando:** esto es solo un aviso, no un tope.` |
| Agotado · `OVERAGE` | aviso | `**Pasaste tu cupo de {sustantivo}** ({usado} de {limite}). Puedes seguir registrando, y lo que exceda se cobra aparte en la próxima cuenta.` |
| Agotado · `READ_ONLY` | error | `**Se agotó tu cupo de {sustantivo}** ({limite}). Puedes consultar e imprimir lo que ya tienes; para registrar más hay que ampliar.` |
| Sin cupos calculados | — | `Tu plan no lleva contadores de {sustantivo}: no hay ningún tope que te limite.` |
| Salida en los tres casos de agotado | — | Botón `Pedir más cupo` → §7.5.6 |

**`WARN` es el caso que hoy la clínica no distingue de un fallo, y por eso lleva texto propio.**
`LimitEnforcement` tiene cuatro valores (`WARN`, `BLOCK`, `READ_ONLY`, `OVERAGE`) y el que **avisa
sin bloquear** es indistinguible de un error cuando no hay pantalla que lo explique. La frase «puedes
seguir registrando» es la parte que no se puede recortar.

### 6.3 Cuentas de cobro

| Situación | Tono | Texto |
| --- | --- | --- |
| Sin documentos | — | `Todavía no tienes cuentas de cobro. Aparecerán aquí en cuanto se emita la primera.` |
| Documento con saldo | aviso (en la fila) | `Pendiente de pago · {balanceAmount}` |
| Documento vencido | error (en la fila) | `Vencida el {dueDate} · {balanceAmount} pendientes` |
| Documento pagado | — | `Pagada` |
| Documento anulado | — | `Anulada` |
| Saldo a favor > 0 | información | `Tienes {balanceAmount} a favor. Se descuentan solos de tu próxima cuenta de cobro.` |
| Saldo a favor con caducidad | aviso | `Tienes {balanceAmount} a favor. La parte más próxima caduca el {nextExpiryOn}.` |
| Excedente en una cuenta | — | `Excedente de {sustantivo}: {cantidad} sobre tu cupo de {limite}, a {unitario} cada uno.` |
| Cabecera de la pantalla | información, **sin `role`** (§5.1.2: presente al cargar) | `Las cuentas de cobro las emite VetSoftware. Aquí las consultas y las descargas; no se registran pagos desde esta pantalla.` |

### 6.4 Medios de pago

| Situación | Tono | Texto |
| --- | --- | --- |
| Sin medios | — | `No tienes ningún medio de pago registrado.` |
| Predeterminado | — | `Predeterminado` (píldora) |
| Por vencer ≤ 60 días | aviso | `**Tu {marca} terminada en {lastFour} vence el {expiresOn}.** Si vence antes del próximo cobro ({nextBillingDate}), el cobro será rechazado. Actualízala antes.` |
| Vencido | error | `**Tu {marca} terminada en {lastFour} venció el {expiresOn}.** Registra otro medio de pago para el próximo cobro.` |
| Revocado | — | `Revocado el {revokedAt}` |
| Confirmación de revocar | aviso | `Vas a revocar tu {marca} terminada en {lastFour}. Dejará de usarse para cobrar tu suscripción. Si es el único medio activo, el próximo cobro no se podrá hacer.` |
| Revocar el predeterminado sin otro | aviso | `Es tu único medio de pago activo. Si lo revocas, el cobro del {nextBillingDate} no se podrá hacer y tu plan pasará a pago pendiente.` |

### 6.5 Cotizaciones y cambios de plan

| Situación | Tono | Texto |
| --- | --- | --- |
| Sin cotizaciones | — | `No tienes ninguna propuesta pendiente. Cuando VetSoftware te prepare una, aparecerá aquí.` |
| Vigencia | — | `Vigente hasta el {validUntil}` / `Vence hoy` / `Venció hace {n} días` |
| Confirmar aceptación | — | `Vas a aceptar la propuesta {quoteNumber} por **{totalAmount}**. Al aceptar, tu plan cambia con las líneas de esta propuesta y este es el importe que se te cobrará.` |
| Confirmar rechazo | — | `Vas a rechazar la propuesta {quoteNumber}. Puedes pedir otra cuando quieras; esta quedará marcada como rechazada.` |
| Cancelar el plan | aviso | `Vas a pedir la baja de tu plan. **Seguirás trabajando con normalidad hasta el {cancelEffectiveDate}**, que es el final del periodo que ya pagaste. Tus datos no se borran.` |
| Cancelar con permanencia | aviso | `Tu plan tiene permanencia hasta el {commitmentEndDate}. Pedir la baja ahora puede tener consecuencias sobre lo pactado; te contactaremos.` |
| Quitar una línea | aviso | `Vas a quitar «{itemName}» de tu plan. Los datos que ya tienes en ese módulo no se borran: dejas de poder crear y modificar en él.` |
| Bajar cantidad por debajo de lo usado | aviso | `Ahora usas {usado} {sustantivo} y quieres bajar a {nuevo}. Lo que ya tienes registrado no se borra, pero no podrás crear más hasta volver por debajo del nuevo cupo.` |

---

## 7 · Los cinco bloques

### 7.1 Bloque 1 — Mi plan · `/dashboard/suscripcion/plan`

**La pregunta que responde:** «¿qué tengo contratado, en qué estado y qué me cuesta?». Y la que de
verdad importa: **es la pantalla que explica por qué un botón está apagado.**

#### 7.1.1 Datos

`GET /subscriptions/current` → `SubscriptionResponse`;
`GET /subscriptions/{id}/items` → `PageResponse<SubscriptionItemResponse>`;
`GET /entitlements/access` → `CompanyAccessResponse` (para el resumen de módulos activos).

#### 7.1.2 Estructura

```
PageHeader  kicker="Mi suscripción"  title="Mi plan"
[ SuscripcionEstadoBanner ]                       ← del layout, siempre presente
SectionCard "Tu plan"
  <dl class="ds-detail-grid">                     ← hechos, NO <input disabled>
    Estado · Ciclo de cobro · Desde · Próximo cobro
    Fin de la prueba · Renovación · Permanencia
  </dl>
SectionCard "Baja registrada"   (v-if cancelRequestedAt || cancelEffectiveDate)
SectionCard "Lo que incluye tu plan"
  <ul> una fila por SubscriptionItemResponse:
      itemName · cantidad · importe unitario · total de la línea
  totales al pie
SectionCard "Módulos activos"                     ← desde CompanyAccessResponse.entitlements
```

**Los datos se pintan como hechos, no como campos.** `<dl>` sobre `.ds-detail-grid`, nunca
`<input disabled>`: un input gris dice «editable, pero ahora no», y aquí no hay ninguna edición que
exista. Es el mismo criterio de `docs/ux/estado-solo-lectura.md` §1 y el que ya aplica
`SubscriptionSummaryView.vue:22-27` en la consola. Además evita, de paso, el problema de contraste de
un campo deshabilitado que esa misma ficha documenta.

**Se omiten del `<dl>`, a propósito:** `priceListId`, `quoteId`, `subscriptionId` crudo,
`companyId`. Son referencias internas de plataforma. **Sí se muestra** `subscriptionNumber` — es el
número que soporte pide por teléfono, y ocultarlo obliga a la clínica a describir su plan a mano.

#### 7.1.3 `SuscripcionEstadoBanner` — la pieza que viven las cinco sub-pantallas

Vive en `SuscripcionLayout.vue`, **encima del `<RouterView>`**, así que aparece en las cinco. Es el
equivalente tenant de `SubscriptionStatusBanner.vue` de la consola, y se reescribe entero: el de la
consola le habla a un operador y su acción es «Registrar pago», que **aquí no existe**.

- Contenedor **siempre montado**, texto conmutado (§5.1.2).
- `role="status"`, sin `aria-live` escrito (`status` ya implica `polite`).
- Estructura de tres piezas, la misma que `ListBody.vue:143-158`: `<component :is="icono"
  class="ds-banner-icon" aria-hidden="true" />` + `<span class="ds-flex-fill">{{ texto }}</span>` +
  acción a la derecha.
- Clase: `.ds-banner` + `.ds-banner--warning` o `.ds-banner--error` según §5. **El tono nunca en el
  `scoped`.**
- Acción a la derecha, según el estado:
  - `PAST_DUE` / `READ_ONLY` → `Ver mis cuentas de cobro` (a `suscripcion-cobros`).
  - `TRIALING` ≤7d → `Ver mi plan` (a `suscripcion-plan`), o ninguna si ya se está ahí.
  - `CANCELLED` / `EXPIRED` → ninguna acción. **No se pinta un botón muerto**: si no hay salida, no
    hay botón (criterio de `SubscriptionStatusBanner.vue:20-24`).
- El icono es decorativo: `aria-hidden="true"`. El significado está en el texto.

#### 7.1.4 Estados

- **Cargando:** velo global de `PawLoader`. Sin esqueleto propio: es una sola petición y por debajo
  del segundo no lleva indicador (NN/g, umbral de 1 s).
- **Sin plan** (`GET /current` → 404): `.ds-empty` con
  `No encontramos un plan activo para tu clínica. Si crees que es un error, escríbenos.` **No se
  pinta un plan a cero.**
- **Error:** banner de error con la traza copiable y «Reintentar», copiado de `ListBody`.
- **403** (rol sin `subscription.read`): §8.3.

---

### 7.2 Bloque 2 — Cupos y consumo · `/dashboard/suscripcion/cupos`

**El modelo lo declara condición de construcción, no de intención**: *«hoy hay contador y no hay
panel»*. Es el bloque con más valor operativo de los cinco: sin él, el bloqueo llega a mitad de una
consulta veterinaria.

#### 7.2.1 Datos

- `GET /entitlements/access` → `CompanyAccessResponse.capacities[]` → **`CompanyCapacityResponse`**:
  `dimensionCode`, `measureKind`, `periodKey`, `limitQuantity`, `usedQuantity`, `exhausted`,
  `limitRecalculatedAt`, `usageReconciledAt`. **Esto es el «340 de 500».**
- `GET /subscription-item-limits` → `SubscriptionItemLimitResponse[]`: aporta lo que la capacidad no
  dice — **`enforcement`** (`WARN`/`BLOCK`/`READ_ONLY`/`OVERAGE`), `warnThreshold`, `resetPeriod`,
  `overageUnitAmount`. Se cruza por `limitDimensionId`.
- `GET /company-limit-events` → historial, en un bloque plegado al final.
- `GET /company-limit-overrides/effective-limits/{limitDimensionId}` → **solo bajo demanda**, cuando
  la clínica abre «¿de dónde sale este tope?». No se pide en bucle por cada dimensión al montar.

#### 7.2.2 `MedidorCupo.vue` — `<progress>` nativo, cero ARIA

**Es la decisión de accesibilidad de este bloque y no se negocia.** Un `<progress>` con su `<label>`
ya expone rol, valor, mínimo y máximo al lector de pantalla. Un `<div role="progressbar">` con tres
`aria-value*` a mano es **más marcado para conseguir menos**, y además hay que mantenerlo sincronizado.

```html
<label class="ds-label" :for="`cupo-${dimensionCode}`">{{ titulo }}</label>
<progress v-if="limite !== null" :id="`cupo-${dimensionCode}`" class="medidor"
          :max="limite" :value="usado" />
<p class="ds-meta">{{ textoCupo }}</p>
```

Cuatro reglas duras:

1. **La barra nunca va sola.** El texto `340 de 500 mascotas` está **siempre**, porque una barra al
   68 % no se puede leer por teléfono ni contar en un correo. **WCAG 2.2 §1.4.1 (A).**
2. **Un límite nulo no es un límite de cero.** Sin techo declarado, **la barra no se pinta** —
   pintarla al 100 % inventaría un límite — y el texto dice `sin límite`. R14.
3. **El estado del cupo no se comunica por el color de la barra.** El navegador no permite colorear
   `<progress>` por umbral de forma portable, y aunque lo permitiera sería color solo. Los umbrales
   viven en el **banner** de al lado, con su texto.
4. `dimensionCode` **es un dato, no un enum.** El backend puede sembrar `APPOINTMENTS_PER_MONTH` sin
   desplegar nada. El mapa de rótulos cae al código en mayúsculas cuando no lo conoce —feo a
   propósito: se lee como «falta traducir» y no como una etiqueta legítima—. **Nunca `undefined`**;
   la consola ya sufrió el `«7 de 10 undefined»` y lo dejó escrito en `entitlementText.ts`.

`.medidor` en `scoped` solo lleva geometría (`width: 100%; height: var(--space-8)`), nunca color.

#### 7.2.3 Los tres avisos: 60 / 80 / 90 %

Umbrales fijos en `cuposText.ts`, no configurables desde la pantalla. **`warnThreshold` del backend
se respeta cuando viene y es mayor que 60**: es el umbral que el contrato pactó, y contradecirlo en
pantalla sería mentir sobre el contrato.

- Cada aviso es un `.ds-banner .ds-banner--warning` **junto a su medidor**, `role="status"`.
- **Solo se pinta el umbral más alto alcanzado**, nunca los tres apilados.
- El 90 % nombra la consecuencia real según `enforcement`: `no podrás registrar más` (`BLOCK`),
  `se cobrará aparte` (`OVERAGE`), `seguirás pudiendo registrar` (`WARN`).
- Cada uno lleva su salida: botón `Pedir más cupo` → §7.5.6.

#### 7.2.4 Estructura

```
PageHeader  kicker="Mi suscripción"  title="Cupos y consumo"
[ SuscripcionEstadoBanner ]
<p class="ds-meta"> Esto se calcula desde tu plan. Si algo no cuadra, escríbenos. </p>
SectionCard "Tus cupos"
  <ul class="ds-list-reset ds-stack ds-stack--14">
    <li> CupoCard: label + MedidorCupo + texto + banner de umbral si aplica
         + «¿de dónde sale este tope?» (detalle plegado, bajo demanda)
SectionCard "Módulos de tu plan"          ← entitlements[] con su nivel de acceso
<details> "Lo que ha pasado con tus cupos"  ← company-limit-events, plegado
```

#### 7.2.5 Estados — el que más importa de toda la especificación

- **Sin capacidades** (`capacities: []`): `Tu plan no lleva contadores: no hay ningún tope que te
  limite.` **No es un error y no se pinta como tal.**
- **`capacities` ausente o no es un array** (el hueco de `MatchesContract`, §2.2): rama **explícita**
  con `No pudimos leer tus cupos.` + «Reintentar». **Nunca se degrada a «sin cupos»**: decirle a una
  clínica que no tiene topes cuando sí los tiene es exactamente el fallo que R14 prohíbe, y el peor
  posible en esta pantalla.
- **`limitRecalculatedAt` con más de 24 h:** píldora `Datos con retraso` + `Estos números se
  actualizaron hace {n}. Si algo no cuadra, escríbenos.` La consola ya trata esta fecha como
  indicador de salud (`recalculationHealth`, `entitlementText.ts`) y aquí vale igual: si se queda
  vieja, hay un proceso caído, y la clínica está tomando decisiones sobre una foto antigua.
- **403 en `/company-limit-events`** (rol sin el permiso, escenario real por la migración 377): el
  `<details>` del historial **no se pinta**. El resto de la pantalla funciona. Nada de una pantalla
  entera en rojo por un bloque secundario.

#### 7.2.6 Lo que este bloque **no** hace

No hay `AdjustUsageModal`, ni `GrantCreditModal`, ni concesión de excepciones: `AdjustCompanyUsage`,
`GrantCompanyLimitOverride` y `RecordLimitEvent` son `SYSTEM`. La única salida es **pedir**, y pedir
es §7.5.6.

---

### 7.3 Bloque 3 — Mis cuentas de cobro · `/dashboard/suscripcion/cobros`

**SOLO LECTURA, y se dice en la pantalla** (§6.3, cabecera). No es una limitación que haya que
esconder: es la aclaración que evita que alguien busque durante cinco minutos el botón de «pagar».

#### 7.3.1 La regla dura de qué se enseña

**El cliente ve la factura fiscal `FE-`, nunca el documento de cobro interno `DC-`.** El campo del
listado es `externalInvoiceNumber`, **no** `documentNumber`. Y con él:

| Campo de `BillingDocumentResponse` | ¿Se enseña? |
| --- | --- |
| `externalInvoiceNumber`, `externalIssuedAt`, `externalCufe` | **sí** — es su factura |
| `periodStart`/`periodEnd`, `dueDate` | sí |
| `subtotalAmount`, `taxAmount`, `totalAmount`, `settledAmount`, `balanceAmount`, `taxes[]` | sí |
| `documentKind` (`INVOICE`/`CREDIT_NOTE`/`DEBIT_NOTE`) | sí, traducido |
| `documentNumber` (`DC-…`) | **NO** |
| `issueStatus` en crudo (`DRAFT`, `AWAITING_EXTERNAL`…) | **NO** — ver abajo |
| `externalProvider`, `externalRegisteredBySystemUserId`, `correctsDocumentId`, `version` | **NO** |
| `gatewayReference` de un pago, códigos crudos de rechazo, referencias de liquidación | **NO** |

`issueStatus` se colapsa a **una sola frase** para el cliente: `DRAFT`/`AWAITING_EXTERNAL` →
`En preparación`; `EXTERNAL_REGISTERED` → se muestra el número fiscal; `VOIDED` → `Anulada`. Un
`AWAITING_EXTERNAL` visible en crudo hace que la clínica llame preguntando por un estado que no le
concierne.

**Por qué esto es más que pulcritud:** las referencias de liquidación de pasarela y las de conciliación
son claves compartidas entre clínicas. Exponerlas abre los importes de las otras. Es una fuga, no un
detalle de interfaz.

#### 7.3.2 Estructura

```
PageHeader kicker="Mi suscripción" title="Mis cuentas de cobro"
[ SuscripcionEstadoBanner ]
<p class="ds-banner ds-banner--info">  ← información presente al cargar: SIN role, SIN aria-live
   Las cuentas de cobro las emite VetSoftware. Aquí las consultas y las descargas;
   no se registran pagos desde esta pantalla.
</p>
SectionCard "Saldo a favor"     (v-if balanceAmount > 0)  ← customer-credit/balance
SectionCard "Cuentas de cobro"
  tabla .ds-table dentro de .ds-table-scroll + Pagination
  columnas: Factura · Periodo · Vence · Total · Pendiente · Estado
SectionCard "Tus pagos"          ← subscription-payments, solo lectura
<details> "Avisos de cobro que te enviamos"   ← dunning-events, plegado
```

Ese `<p>` **no lleva `role` ni `aria-live`** y es deliberado: está en el DOM desde el primer render.
Una región viva sobre contenido inicial o se anuncia dos veces o no se anuncia ninguna, según el
lector. `patron-de-mensajes.md` §4.1, fila «Información presente al cargar».

#### 7.3.3 La mora: enterarse **antes** del portazo

Además del banner del layout, esta pantalla añade lo que ninguna otra puede dar:

- La cuenta vencida va **primera** en la tabla y con su estado en texto, no solo con color de fila.
- Bajo el banner de `PAST_DUE`, el desglose concreto: **desde cuándo**, **cuánto**, **cuántos días de
  cortesía quedan** y —lo más importante— **qué sigue funcionando**.
- `dunning-events` traducido a lenguaje de cliente. `DunningEventType` tiene cinco valores y el
  nombre del enum **no se enseña nunca**:
  `REMINDER_SENT` → `Te enviamos un recordatorio`;
  `GRACE_STARTED` → `Empezaron tus días de cortesía`;
  `READ_ONLY_APPLIED` → `Tu plan pasó a solo consulta`;
  `REACTIVATED` → `Tu plan volvió a la normalidad`;
  `WRITTEN_OFF` → `Se dio de baja el saldo`.
  De `DunningEventResponse` se enseñan `eventType`, `occurredAt` y `daysOverdue`. **`detail` y
  `channel` no**: son notas internas de cobranza.

#### 7.3.4 El excedente: «¿de dónde salen estos 18.500?»

Es la segunda cosa difícil del bloque, y se responde **dentro** de la ficha del documento, no en otra
pantalla: quien se hace la pregunta la tiene delante.

`CuentaCobroDetalleView` = `GET /subscription-billing/documents/{id}` + `GET
/subscription-billing/charges?billingDocumentId=…`, con los cargos agrupados por `chargeType` y
`billingReason`:

- `RECURRING_CYCLE` → **Tu plan del mes**
- `PRORATION` → **Ajuste por días** — con `prorationDays` de `periodDays`, que es lo que hace
  entendible un importe raro
- `ONE_TIME` → **Cargo puntual**
- `ADJUSTMENT` → **Ajuste**
- El excedente sale como línea con su cantidad y su unitario: `Excedente de mascotas: 40 sobre tu
  cupo de 500, a 450 cada uno.`

`taxes[]` se pinta como desglose («IVA 19 % sobre {base}: {importe}»), **no como una columna de
`taxRate`**. `TaxTreatment` se traduce: `IVA` → `Con IVA`, `EXCLUDED` → `Excluido de IVA`, `EXEMPT` →
`Exento`.

**La separación devengado / facturado / cobrado de `SubscriptionMoneyView` se conserva como idea y se
renombra entera:**

| Consola (operador) | Tenant (auxiliar) |
| --- | --- |
| Devengado | Lo que se está acumulando este mes |
| Facturado | Tus cuentas de cobro |
| Cobrado | Tus pagos |

La palabra «devengado» **no aparece en ninguna pantalla del tenant**.

#### 7.3.5 Estados

- Vacío: §6.3.
- Error del listado: `useServerPaged` ya trae `error` + `errorTraceId`; **la rama de error va antes
  que la de vacío** (R05).
- `settledAmount > 0` y `balanceAmount > 0` a la vez: se dicen los dos, `Pagado {x} de {total}`. Un
  pago parcial que se pinta como «pendiente» a secas hace que la clínica pague dos veces.
- Sin `customerCredit.read`: la tarjeta de saldo a favor no se pinta; el resto sí.

---

### 7.4 Bloque 4 — Medios de pago · `/dashboard/suscripcion/medios-pago`

El único bloque con escritura real de dinero para el tenant, y por un motivo escrito en el backend:
**revocar es un derecho que no puede quedar detrás de una gestión de plataforma**
(`SubscriptionPaymentMethodController.java:33-38`).

#### 7.4.1 Estructura

```
PageHeader kicker="Mi suscripción" title="Medios de pago"
[ SuscripcionEstadoBanner ]
[ banner de tarjeta por vencer / vencida, si aplica ]
SectionCard "Tus medios de pago"
  <ul class="ds-list-reset ds-stack ds-stack--10">
    <li> MedioPagoCard
```

`MedioPagoCard` muestra: `methodKind` traducido (`CARD` → `Tarjeta`, `PSE` → `PSE`), `brand`,
`•••• {lastFour}`, `expiresOn`, píldora `Predeterminado` si `defaultMethod`, `mandateStatus`
traducido, y las acciones. **No se muestran** `gateway`, `mandateEvidence` ni ningún token: son
constancia interna, y `mandateEvidence` puede llevar una referencia de pasarela.

#### 7.4.2 Avisar **antes** del cobro rechazado

Se calcula sobre `expiresOn` contra `subscription.nextBillingDate`, no contra hoy sin más:

- **Vence antes del próximo cobro** → banner de aviso, `role="status"`, texto de §6.4. Este es el
  caso que evita el rechazo, y por eso es el que manda.
- Vence en ≤ 60 días pero después del próximo cobro → aviso más suave, en la propia tarjeta.
- Ya vencido → banner de error.
- `mandateStatus === 'EXPIRED'` → la tarjeta se pinta apagada con `.ds-is-disabled` y su motivo
  escrito. **No se oculta**: una tarjeta que desaparece se lee como «me la borraron».

#### 7.4.3 Solo hay una predeterminada

- El botón `Hacer predeterminado` **solo aparece en las que no lo son** y están activas.
- `PATCH /{id}/default` no lleva cuerpo.
- Tras la respuesta, la lista se repinta y la píldora se mueve. **La evidencia está en pantalla, así
  que no hay toast** (`patron-de-mensajes.md` §3). Pero «no poner cartel» no es «no anunciar»: se
  emite `<p class="ds-sr-only" role="status">Ahora tu medio predeterminado es {marca} terminada en
  {lastFour}.</p>`. **WCAG 2.2 §4.1.3 Status Messages (AA).**
- El foco vuelve a la tarjeta afectada, no se pierde en `<body>` (R02).

#### 7.4.4 Registrar un medio nuevo — **no se implementa en esta entrega, y hay que decirlo**

`RegisterSubscriptionPaymentMethodRequest` exige `gateway`, **`token`** (`@NotBlank`, el token de la
pasarela), `mandateEvidence` y `authorizedAt`. El endpoint **presupone un widget de tokenización de
pasarela que este front no tiene**: verificado, `package.json` del tenant declara nueve dependencias
—`@grafana/faro-*`, `axios`, `lucide-vue-next`, `pinia`, `vue`, `vue-datepicker-next`, `vue-router`,
`vuetify`— y **ninguna de pasarela**; cero ocurrencias de `wompi|payu|mercadopago|epayco|stripe` en
`src/`.

**Un formulario que le pida a una auxiliar «el token de la pasarela» es peor que no tener el botón**:
promete una acción que no puede completar y la deja sintiéndose incapaz. Y **jamás se le pide el
número de tarjeta a este front**: no hay tokenización, así que ese dato viajaría en claro por nuestro
dominio.

**Lo que sí se hace:**

```
.ds-empty (o pie de la lista):
  Para registrar un medio de pago nuevo, escríbenos y lo dejamos listo.
  [ Escríbenos ]   ← canal de soporte ya existente
```

Cuando exista el widget, este hueco se sustituye por el formulario **sin tocar nada más**: el store,
el API y el tipo del comando ya quedan escritos con el campo `token`.

#### 7.4.5 Revocar

- Confirmación en `ModalShell` (no `useConfirmDialog`): hace falta un campo, `reason`, que es
  `@NotBlank` de máximo 255.
- **La consecuencia va escrita antes del botón** (§6.4), y **el caso de único medio activo tiene su
  propio texto**: es el que puede dejar a la clínica sin cobro y pasar su plan a pago pendiente.
- Formulario según la convención documentada del repositorio, **completada, no sustituida**:
  validador puro → `computed errors` → mapa `touched` que arranca en `false` → **el error solo se
  pinta tras `@blur`** o tras un `validate()` fallido → `ErrorSummary` con el **mismo texto literal**
  que el error en línea → foco al resumen. **Nunca validación prematura.**
- El error se ata al campo con **`aria-describedby`** y el campo lleva **`aria-invalid`**.
  `BaseField.vue` ya monta la región viva de campo (FORM-02); se usa tal cual, no se reinventa.
  **WCAG 2.2 §3.3.1 Error Identification (A) · §3.3.3 Error Suggestion (AA).**
- Botón de confirmación **nombra la acción**: `Revocar medio de pago`, no «Confirmar».
  **WCAG 2.2 §3.3.4 Error Prevention (AA)** y NN/g H2.
- Tono: `.ds-btn .ds-btn--danger`. El tono desde el marcado, nunca desde el `scoped`.

---

### 7.5 Bloque 5 — Cotizaciones y cambios de plan · `/dashboard/suscripcion/cotizaciones`

**La plataforma propone, la clínica acepta.** El tenant no crea cotizaciones ni añade líneas.

#### 7.5.1 Estructura

```
CotizacionesView    listado: GET /quotes  → PageResponse<QuoteSummaryResponse>
  columnas: Propuesta · Fecha · Vigencia · Total · Estado
CotizacionDetalleView   GET /quotes/{id} → QuoteResponse
  SectionCard "Qué incluye"    ← lines[]
  SectionCard "Total"          ← subtotal, descuento, impuestos, total
  QuoteValidity                ← vigente / vence hoy / venció hace n días
  acciones: [ Aceptar ] [ Rechazar ]
```

`QuoteStatus` traducido: `DRAFT` → **no se lista** (borrador de plataforma), `SENT` → `Pendiente de
tu respuesta`, `ACCEPTED` → `Aceptada`, `REJECTED` → `Rechazada`, `EXPIRED` → `Vencida`.

De `QuoteResponse` **no se enseñan** `priceListId`, `clientRequestId`, `acceptedIp`, ni `answers[]`
si son notas internas del comercial.

#### 7.5.2 Aceptar — el importe que se mostró, no el que se recalcule

**Regla del modelo, y es la que hay que implementar con cuidado.** Al confirmar hay que guardar **el
importe que se mostró en pantalla**, no recalcularlo después.

- El modal de confirmación cita `totalAmount` **tal como venía en la respuesta que se pintó**,
  guardado en el store al abrir el detalle.
- Tras la respuesta de `POST /{id}/accept`, si el `totalAmount` devuelto **difiere** del mostrado, se
  pinta un banner de aviso con los dos importes:
  `El importe cambió mientras confirmabas: te mostramos {mostrado} y quedó en {devuelto}. Revísalo
  antes de seguir; si no cuadra, escríbenos.` **Nunca se sobrescribe en silencio.**
- `AcceptQuoteRequest` solo lleva `acceptedByEmail`. **La IP y la marca de tiempo las escribe el
  servidor**: no hay campo de IP en el formulario. Una prueba que el cliente teclea no prueba nada, y
  pedirla sería fabricar evidencia (`QuoteController.java:139-143`).
- El campo por omisión se rellena con `prospectEmail` y **se limpia al abrir**: un correo tecleado
  para otra propuesta no puede quedarse ahí.
- Tras aceptar, el foco va al `<h1>` de la pantalla (que lleva `tabindex="-1"`), no a un botón que
  puede haber desaparecido del árbol. **WCAG 2.2 §2.4.3 Focus Order (A).**

#### 7.5.3 Rechazar

`POST /{id}/reject`, sin cuerpo. Confirmación en `useConfirmDialog` —no hace falta campo—, con el
texto de §6.5 y botón `Rechazar propuesta`.

#### 7.5.4 Cancelar el plan

`PATCH /subscriptions/{id}/cancel`. Vive en **Mi plan**, no aquí: es una acción sobre el contrato y su
efecto se ve allí.

- **La cancelación separa las dos fechas y no cambia el estado**: el plan sigue vigente hasta la fecha
  efectiva, que es el periodo ya pagado. El modal lo dice antes del botón (§6.5) y la ficha «Baja
  registrada» de §7.1.2 lo repite después, como hecho permanente.
- Si hay `commitmentEndDate` futura, **el modal lo advierte** (§6.5, permanencia). No se bloquea la
  acción: el backend decide, no la pantalla.
- Botón: `Pedir la baja de mi plan`. **No «Cancelar»**: en un modal, «Cancelar» es el botón de cerrar,
  y un modal con dos botones que dicen «Cancelar» es un accidente esperando.

#### 7.5.5 Quitar línea y cambiar cantidad

`PATCH /{id}/items/remove` y `POST /{id}/items/quantity`. Viven en **Mi plan**, junto a la línea.
Ninguno recibe precio: **la clínica elige cuántas unidades o si se va, nunca a cuánto**
(`SubscriptionController.java:71-75`).

- `CambiarCantidadModal`: un `BaseInput` numérico con mínimo 1, la cantidad actual como valor inicial
  y **el consumo actual visible**. Si la nueva cantidad queda por debajo de lo ya usado, el texto de
  §6.5 aparece **antes** de poder confirmar, no después de fallar.
- `QuitarLineaModal` sobre `useConfirmDialog`, con el texto de §6.5. La frase «los datos que ya tienes
  no se borran» **no es opcional**: es la duda que frena a cualquiera, y responderla es la diferencia
  entre una acción que se toma y una llamada a soporte.

#### 7.5.6 «Pedir más cupo» — el destino de las salidas del bloque 2

**El tenant no puede añadir líneas.** `POST /subscriptions/{id}/items` es `SYSTEM`. Así que el botón
`Pedir más cupo` de §7.2.3 **no abre un formulario de alta**: lleva a `suscripcion-cotizaciones` con
una explicación honesta.

```
.ds-empty en Cotizaciones, cuando se llega desde un cupo:
  **Para ampliar tus cupos necesitas una propuesta nueva.** Escríbenos y te la
  preparamos; cuando esté, aparecerá aquí y podrás aceptarla desde esta pantalla.
  [ Escríbenos ]
```

Es preferible a un botón deshabilitado con `title`: un control apagado sin explicación es el defecto
que `docs/ux/estado-solo-lectura.md` §2 documenta entero.

---

### 7.6 Opcional y barato — textos legales

Enlace desde **Empresa** (no desde Mi suscripción): es información de la empresa, no del plan.
`GET /legal-documents/{code}/current` y `/versions`, permiso `legaldocument.read`.

*«Una prueba que no puede exhibir no le sirve al cliente.»* Se muestran `title`, `documentVersion`,
`effectiveFrom`, `publishedAt` y el `content`. **`content` se pinta como texto, nunca con `v-html`**
salvo que se sanee explícitamente: es contenido que llega del servidor y `v-html` es la vía de XSS
que la guía de seguridad de Vue nombra por su nombre. Si el contenido trae marcado, es una decisión
aparte que hay que documentar, no un `v-html` puesto de paso.

---

## 8 · Los estados no felices, otra vez, desde el otro lado

### 8.1 En mora (`PAST_DUE`)

Lo que la clínica necesita saber, en este orden: **(1) sigue trabajando con normalidad**, (2) desde
cuándo debe, (3) cuánto, (4) cuántos días de cortesía le quedan. El punto (1) va **primero** porque es
el que quita el pánico, y el pánico es lo que hace que alguien deje de atender para llamar a soporte.

Se ve en tres sitios y con tres profundidades: banner en las cinco (§7.1.3), desglose en Cuentas de
cobro (§7.3.3), historial en el `<details>` de avisos.

### 8.2 En solo consulta (`READ_ONLY`)

El texto de §6.1 es literal y **es el que impide que alguien lo cuente por teléfono como si fuera otra
cosa**. Las tres partes son obligatorias: qué conserva (consulta e impresión, **incluida la historia
clínica**), qué pierde (crear y modificar), y **cómo vuelve** (regularizar el pago).

Consecuencia para el resto de la app, fuera del alcance de esta feature pero que hay que dejar dicho:
cuando `READ_ONLY` esté activo, las pantallas clínicas deberían usar **solo lectura, no `disabled`**
(`docs/ux/estado-solo-lectura.md` §1). Un `<input disabled>` dice «editable, pero ahora no» y encima
suele incumplir contraste. **No se hace en esta entrega**, pero se anota: es el consumidor natural del
banner de §7.1.3.

### 8.3 Sin permiso (403)

Escenario **real**, no teórico: la migración 377 documenta que `entitlement.read`,
`subscriptionPayment.read`, `dunningEvent.read` y `subscription.read` se sembraron y nunca se
backfillearon hasta ella, así que hay empresas cuyo ADMIN no los tiene.

- La entrada del sidebar solo aparece con **alguno** de los permisos (§3.1).
- El `meta.permission` de cada ruta hija la protege individualmente; el guard del router ya existe.
- **Dentro de una pantalla, un 403 en una petición secundaria oculta ese bloque y nada más.** Nunca
  deja la pantalla entera en rojo: `<details>` de eventos, tarjeta de saldo a favor y bloque de pagos
  son opcionales por diseño.
- Si falta el permiso del bloque principal, el hueco es honesto:
  `Tu rol no incluye ver esta información. Pídeselo a quien administre los permisos de tu clínica.`
  **Nunca «No tienes permiso» a secas**: eso no le dice a nadie qué hacer.

### 8.4 Sin conexión / 5xx

Banner de error con `errorFrom` y su traza copiable; el texto sale del `ProblemDetail` del backend,
nunca de un literal. Un 403 dice una cosa y un 500 dice otra: **aplastarlos a «no se pudo cargar» es
lo que hace imposible el soporte** (R05).

---

## 9 · Primitivas

### 9.1 Las que se consumen — todas existen ya en el tenant

Verificadas en `src/assets/styles/primitives.css` (132 raíces `ds-*`):

| Uso | Primitiva |
| --- | --- |
| Tarjetas de sección | `.ds-card`, `.ds-card--tight` (o `SectionCard.vue`) |
| Apilado vertical | `.ds-stack`, `--8` `--10` `--14` `--16` `--18` |
| Rejilla de hechos | `.ds-detail-grid`, `.ds-grid-span` |
| Tipografía | `.ds-display`, `.ds-title`, `.ds-subtitle`, `.ds-label`, `.ds-meta`, `.ds-kicker`, `.ds-strong`, `.ds-hint` |
| Banners | `.ds-banner` + `--info` `--warning` `--error` `--success` `--sm` `--flush`, `.ds-banner-icon` |
| Botones | `.ds-btn` + `--primary` `--ghost` `--neutral` `--danger` `--plain` `--snug`, `.ds-icon-btn` |
| Píldoras de estado | `.ds-pill` + `.ds-status-dot` + tono |
| Tonos | `.ds-tone--success`, `--danger`, `--neutral`, `--neutral-soft`, `--accent-soft` |
| Tabla | `.ds-table`, `.ds-table--dense`, `.ds-table-scroll`, `.ds-col-actions`, `.ds-row-hover` |
| Números y dinero | `.ds-num`, `.ds-amount--neg`, `.ds-amount--pos` |
| Vacío | `.ds-empty`, `--tight`, `--boxed` |
| Carga | `.ds-skeleton`, `.ds-skeleton--text` |
| Formulario | `.ds-field`, `.ds-field-invalid`, `.ds-error-summary` (+ `ErrorSummary.vue`) |
| Diálogo | `.ds-dialog-card`, `.ds-dialog-body`, `.ds-dialog-icon` (+ `ModalShell.vue`) |
| Foco | `.ds-focus-ring` |
| Anuncio invisible | `.ds-sr-only` |
| Listas | `.ds-list-reset`, `.ds-flex-row`, `.ds-flex-fill`, `.ds-truncate`, `.ds-wrap-row` |
| Apagado | `.ds-is-disabled`, `--40`, `--60` |

**El medidor de cupo no necesita primitiva nueva.** Es un `<progress>` nativo; su geometría (`width`,
`height`) va en el `scoped` del componente y **es geometría, no color**, así que no toca la regla de
especificidad ni el presupuesto.

### 9.2 La única que falta — **petición formal a `front-parity`**

> **Falta `.ds-tone--warning`.** El catálogo del tenant tiene tono de éxito, de peligro, neutro y de
> acento, **pero no de aviso**. `.ds-banner--warning` existe, así que los banners están cubiertos;
> lo que no se puede pintar hoy es una **píldora de estado en tono aviso**, que esta feature necesita
> en cinco sitios: `PAST_DUE`, `TRIALING` por vencer, cupo al 80/90 %, medio de pago por vencer, y
> excedente. Sin ella, la única salida es color en el `<style scoped>` — que **pierde contra la
> primitiva por especificidad** (`AGENTS.md:103-122`) y además es un `maxDuplicateGroups` nuevo
> multiplicado por cinco.

**Cambio propuesto, en el `primitives.css` gemelo TR-02 (los dos repos, byte a byte), junto a
`.ds-tone--success` (línea 309) y `.ds-tone--danger` (línea 314):**

```css
.ds-tone--warning {
  background: var(--warning-bg);
  color: var(--warning-fg);
}
```

**Medido, no supuesto.** `--warning-bg` = `--warning-50` = `oklch(95% 0.06 80deg)`; `--warning-fg` =
`--warning-900` = `oklch(40% 0.12 80deg)`. Contraste calculado con la fórmula literal de WCAG
(OKLCH → sRGB → luminancia relativa): **7,92:1**. Supera 4,5:1 de **§1.4.3 Contraste mínimo (AA)** y
también el 7:1 de §1.4.6 (AAA). El script reprodujo además el 3,41:1 que `tokens.css:130-135` ya
declara para `--warning-border` sobre `--warning-50`, lo que valida el cálculo contra un número que
el repositorio ya midió por su cuenta.

**Por qué es de `front-parity` y no de esta feature:** `primitives.css` es gemelo TR-02 byte a byte, y
una regla que entrara solo en un repo abriría exactamente la puerta que `reglas-de-interfaz.md`
documenta como admin-web #74/#81. **Se pide ANTES de implementar, no después.**

Es el par de tokens que `.ds-banner--warning` ya usa (líneas 217-221), así que no introduce ninguna
combinación de color nueva en el sistema: solo la expone en la familia de tonos, donde faltaba.

---

## 10 · Accesibilidad — la lista con la que se revisa el PR

Todo WCAG 2.2, nivel A y AA.

| # | Criterio | Qué se comprueba en esta feature |
| --- | --- | --- |
| 1 | **§1.4.1 Use of Color (A)** | Ningún estado —plan, cupo, documento, medio de pago— se distingue solo por color. Cada uno lleva su rótulo textual. La barra de cupo **siempre** con su «340 de 500». |
| 2 | **§1.4.3 Contraste mínimo (AA)** | Texto normal ≥ 4,5:1; texto grande ≥ 3:1. `.ds-tone--warning` medido en 7,92:1 (§9.2). **Nada de color nuevo fuera de `tokens.css`.** |
| 3 | **§1.4.11 No-text Contrast (AA)** | Bordes de campo, iconos portadores de significado y **el borde del `<progress>`** ≥ 3:1. Es el criterio que más incumplen los design systems. |
| 4 | **§2.4.1 Bypass Blocks (A)** | El repositorio **no tiene skip link**. Esta feature no lo introduce ni lo arregla; queda declarado como hueco preexistente (§11.4). |
| 5 | **§2.4.3 Focus Order (A)** | Tras aceptar/rechazar/revocar/cancelar, el foco va al `<h1>` con `tabindex="-1"`, **nunca a un botón que puede haber desaparecido**. Quien cierra un modal devuelve el foco al disparador (R02). |
| 6 | **§2.4.7 Focus Visible (AA)** + **§2.4.11 Focus Appearance (AA)** | `.ds-focus-ring` tokenizado, ≥ 3:1 contra la superficie real (A11Y-01, `AGENTS.md:124-151`). |
| 7 | **§2.5.8 Target Size (AA)** | ≥ 24×24 px CSS con separación. Afecta a la sub-navegación (§3.3, **sin `--sm`**) y a los iconos de acción de la tabla de cobros. |
| 8 | **§3.1.1 Language of Page (A)** | El tenant ya tiene `<html lang="es">`. Se comprueba que sigue. |
| 9 | **§3.3.1 Error Identification (A)** | El error del formulario **atado al input con `aria-describedby`** + `aria-invalid`. El repositorio tiene **cero ocurrencias de `aria-describedby`**: esta feature es la primera que lo pone. `BaseField.vue` ya monta la región viva; se usa, no se rehace. |
| 10 | **§3.3.3 Error Suggestion (AA)** | El mensaje dice qué corregir, con ejemplo cuando aplica. Mismo string literal en el campo y en `ErrorSummary` (GOV.UK, patrón de validación). |
| 11 | **§3.3.4 Error Prevention (AA)** | Aceptar, rechazar, revocar, cancelar y quitar línea: **confirmación con la consecuencia escrita** y botón que nombra la acción. |
| 12 | **§4.1.2 Name, Role, Value (A)** | `aria-current="page"` en la sub-navegación (§3.3). `<progress>` nativo con `<label>` asociado. `<nav aria-label>`. |
| 13 | **§4.1.3 Status Messages (AA)** | Cambios sin foco anunciados con `role="status"` en contenedor persistente. **Ni un `assertive` nuevo.** |

### 10.1 Focus trap en modales — hueco conocido, se declara

`ModalShell.vue` (gemelo de facto entre los dos repos, byte a byte, **no declarado en la tabla
TR-02**) ya trae `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape condicionado y foco inicial.
**Lo que no tiene es retención del foco**, y esta feature monta cinco modales nuevos sobre él.

**No se arregla aquí** —`ModalShell` es gemelo y su cambio es de `front-parity`—, pero **se declara**:
los cinco modales heredan el hueco de **§2.4.3 Focus Order (A)**. Con el trap resuelto en la
primitiva, los cinco lo ganan sin tocar ni una línea de esta feature. Es el mejor argumento
disponible para priorizarlo: el *blast radius* del arreglo cubre todos los diálogos de los dos
fronts, no cinco.

---

## 11 · Riesgos y huecos, declarados

### 11.1 `POST /subscription-payment-methods` no es implementable hoy

Exige `token` de pasarela y el front no tiene ninguna. §7.4.4 lo resuelve con un hueco honesto y un
canal de soporte. **El riesgo es que alguien lo implemente igual** con un campo de texto para el
token, o peor, pidiendo el número de tarjeta. Si aparece en el PR, se rechaza.

### 11.2 La ceguera de `MatchesContract` es peor aquí que en el resto del repositorio

`capacities[]` es literalmente todo el bloque 2 y la atadura no lo mira. §2.2 pone las tres defensas.
**Sin ellas, un renombrado en el backend pinta «no tienes topes» en verde**, que es el fallo más caro
que esta feature puede producir.

### 11.3 `WARN` frente a `BLOCK` depende de un cruce en cliente

`enforcement` está en `SubscriptionItemLimitResponse` y el consumo en `CompanyCapacityResponse`; se
cruzan por `limitDimensionId` **en el cliente**. Si una dimensión tiene capacidad y no tiene límite,
o al revés, hay que degradar a texto genérico y **no adivinar el modo**: decirle a alguien «puedes
seguir registrando» cuando en realidad va a chocar es peor que no decir nada.

### 11.4 Huecos preexistentes que esta feature **no** cierra

Se declaran para que no se confundan con deuda nueva:

- **Sin skip link** en todo el repositorio — §2.4.1 (A).
- **Focus trap ausente** en `ModalShell` — §2.4.3 (A), §10.1.
- **`aria-current` ausente en el sidebar** — §4.1.2 (A). Esta feature lo pone en su sub-navegación;
  el sidebar sigue sin él.
- **`prefers-reduced-motion` sin regla global en el tenant** — el admin la tiene en `main.css:222`;
  aquí hay 328 SFC con transiciones sin ella. §2.3.3 / §2.2.2. **`.ds-skeleton` de §9.1 anima**: si se
  usa, hereda el hueco.
- **Cero accesibilidad automatizada en el pipeline** — sin `axe-core`, sin
  `eslint-plugin-vuejs-accessibility`, sin Lighthouse, en ninguno de los dos repos. Ningún gate de
  accesibilidad va a comprobar nada de la §10.

### 11.5 Vuetify

Está instalado y montado (`<v-app>` + las 16 pantallas públicas), pero **la app autenticada es de
componentes propios**. Esta feature **no usa ni un componente de Vuetify**.

---

## 12 · Qué se reutiliza de la consola y qué no

### 12.1 Reventaría al importar — verificado

| De la consola | Por qué no |
| --- | --- |
| `SubscriptionDocumentsTable`, `SubscriptionChargesTable`, `SubscriptionPaymentsTable`, `EntitlementsTable`, `SubscriptionItemsTable` | Se construyen sobre `AppTable` / `AppPagination` / `AppBadge`. **El tenant no tiene primitiva de tabla ni de badge**: usa `.ds-table` a pelo y `Pagination.vue`. |
| `AddSubscriptionItemModal`, `StatusTransitionModal`, `RecordDunningEventModal`, `GrantCreditModal`, `RegisterRefundModal`, `AdjustUsageModal`, `RegisterPaymentModal`, `WriteOffDunningModal` | Sus casos de uso son `SYSTEM`. |
| `CompanyScopeFilter` y todo lo de elegir empresa | El tenant es una sola. |
| Cualquier texto | La consola le habla a un operador; aquí hay que hablarle a una auxiliar con un gato encima. §6 es la sustitución completa. |
| `formatDate`, `ICONS`, `formatDateTime` | **No existen en el tenant.** Equivalentes en §4. |

### 12.2 El patrón sí, el código no

| Patrón de la consola | Dónde se aplica |
| --- | --- |
| `SubscriptionSummaryView` — `<dl>` de hechos, no formulario apagado | §7.1.2 |
| `SubscriptionStatusBanner` — condición permanente, `role="status"`, banner y no toast, sin botón muerto | §7.1.3 |
| `CapacityMeters` — **lo mejor que hay para «340 de 500»**: `<progress>` nativo, cero ARIA, la barra nunca sola, límite nulo ≠ cero | §7.2.2 |
| `entitlementText.ts` — vocabulario puro y barrible; caída al código en mayúsculas ante una dimensión desconocida | `cuposText.ts` |
| `subscriptionStatusText.ts` — frase de apoyo obligatoria por estado, `graceDaysLeft`, vocabulario prohibido | `estadoSuscripcion.ts` §6.1 |
| `SubscriptionMoneyView` — separación devengado / facturado / cobrado | §7.3.4, **renombrada entera** |
| `quotes/components/*` — el conjunto más reutilizable: `AcceptQuoteModal` (convención de formulario, IP del servidor), `quoteValidity.ts` (tres estados, ninguno solo por color), `QuoteTotals`, `QuoteLinesTable` | §7.5 |

---

## 13 · Verificación propuesta

Para `front-e2e-visual`; **esta especificación no ejecuta ninguna** (§14).

**Unitarias (Vitest)** — sobre los tres `*Text.ts`, que son puros:

1. `estadoSuscripcion.ts` no emite «bloquear», «suspender», «cortar», «desactivar» ni «inhabilitar»
   en **ninguna** de sus salidas, para los 7 estados × las combinaciones de fechas. Es la prueba que
   sostiene §6.1.
2. `graceDaysLeft` nunca devuelve negativo y devuelve `null` —no `0`— cuando falta `pastDueSince` o
   `graceDays`.
3. `cuposText`: límite `null` → «sin límite» **y sin barra**; `dimensionCode` desconocido → el código
   en mayúsculas, **nunca `undefined`**; los umbrales 60/80/90 disparan uno solo, el más alto.
4. Cada `enforcement` produce su frase; **`WARN` contiene «puedes seguir registrando»**.
5. `CuposView` con `capacities` ausente pinta «No pudimos leer tus cupos», **no** «sin cupos» (§2.2).

**ARIA snapshots (Playwright, `toMatchAriaSnapshot`)** — regresión de semántica, no de píxeles, y es
lo que sujeta la §10 sin `axe-core`:

6. `SuscripcionLayout` con cada uno de los 7 estados: el banner tiene `role="status"` y **ninguno**
   `alert`.
7. La sub-navegación es `navigation` con nombre accesible, y la ruta activa lleva `aria-current`.
8. `MedidorCupo` expone `progressbar` con `valuenow`/`valuemax` **sin una sola línea de ARIA
   escrita a mano**.
9. `RevocarMedioModal` con el campo en error: el mensaje está atado por `aria-describedby` y el campo
   lleva `aria-invalid="true"`.

**Lo que haría falta y hoy no existe:** `@axe-core/playwright` sobre las cinco rutas. **No hay ninguna
puerta de accesibilidad en el pipeline de ninguno de los dos repos** (§11.4). Mientras no la haya,
las ARIA snapshots son la única red.

---

## 14 · Qué se midió y qué no

**Ejecutado:**

- Cálculo de contraste de `--warning-fg` sobre `--warning-bg` (OKLCH → sRGB → luminancia relativa →
  ratio WCAG 2.x), script propio en el scratchpad. **7,92:1.** Validado contra el 3,41:1 de
  `--warning-border` que `tokens.css:130-135` ya declaraba: coincide.
- Lectura verificada de los `@PreAuthorize` de **97 puertos** de las 12 rodajas del dominio de
  suscripción.
- Inventario de los 21 códigos de permiso sembrados, contra las migraciones 256/257/259/260/339/366/377.
- Censo de las **132 raíces `ds-*`** del `primitives.css` del tenant, para §9.1 y para confirmar la
  ausencia de `.ds-tone--warning`.
- Inventario de dependencias del tenant (`jq` sobre `package.json`) y búsqueda de SDK de pasarela en
  `src/`: **ninguna**.

**NO ejecutado, y por tanto no se afirma:**

- `npm run quality`, `css:budget`, `vue-tsc`, Vitest, Playwright y `ds:audit`. **Ningún gate de este
  repositorio se ha corrido** al escribir esta especificación: es diseño, no implementación.
- Contraste medido sobre render real. Los números de §9.2 son de los tokens, calculados; **no hay
  captura de pantalla que los confirme en su superficie final**.
- Árbol de accesibilidad real: no se levantó el dev server ni se abrió un navegador.
- No se comprobó contra la base de datos de dev qué permisos tiene hoy cada empresa. §8.3 se apoya en
  lo que la migración 377 declara por escrito, no en un `SELECT`.

---

## 15 · Fuentes

- **WCAG 2.2** (Recommendation, republicada 2024-12-12) — https://www.w3.org/TR/WCAG22/
- Contraste mínimo §1.4.3 — https://www.w3.org/TR/WCAG22/#contrast-minimum
- No-text Contrast §1.4.11 — https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Target Size §2.5.8 — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Focus Appearance §2.4.11 — https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- **APG — patrones de componente** (Tabs, Dialog) — https://www.w3.org/WAI/ARIA/apg/patterns/
- WAI-ARIA 1.2, *Live Region Roles* — https://www.w3.org/TR/wai-aria-1.2/
- Tutorial de formularios del W3C — https://www.w3.org/WAI/tutorials/forms/
- Accesibilidad en Vue — https://vuejs.org/guide/best-practices/accessibility.html
- Seguridad en Vue (`v-html`) — https://vuejs.org/guide/best-practices/security.html
- GOV.UK — patrón de validación y resumen de errores —
  https://design-system.service.gov.uk/patterns/validation/ ·
  https://design-system.service.gov.uk/components/error-summary/
- NN/g — heurísticas — https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g — umbrales de espera — https://www.nngroup.com/articles/response-times-3-important-limits/
- NN/g — estados vacíos — https://www.nngroup.com/articles/empty-state-interface-design/
- Playwright — ARIA snapshots — https://playwright.dev/docs/aria-snapshots

**Internas, y mandan sobre las anteriores cuando hablan del repositorio:**
`docs/ux/reglas-de-interfaz.md` (R02, R05, R06, R07, R14) · `docs/ux/patron-de-mensajes.md` (§1-§4,
§6) · `docs/ux/estado-solo-lectura.md` (§1, §2) · `AGENTS.md` §CSS (FE-08) y §Foco (A11Y-01).
