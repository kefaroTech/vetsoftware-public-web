# Cuenta gratuita — «Tus módulos», aviso global y modo degradado — especificación

**Repositorio:** `VetSoftwarePublicFront`. **Estado:** especificación, ningún fichero de `src/`
tocado. **Quién implementa:** dos `front-feature` en paralelo, repartidos en §7 sin solape.
**Árbol verificado:** 2026-09-07, contra `develop`.

**Esta spec es una extensión, no una reescritura**, de `docs/ux/suscripcion-tenant-especificacion.md`
(en adelante **«la spec base»**), que ya construyó los cinco bloques de «Mi suscripción», su
router, su vocabulario prohibido, su banner de estado y el hueco de `.ds-tone--warning` que
`front-parity` ya resolvió (verificado: `primitives.css:354` existe). Todo lo que la spec base fija
—§2 reglas transversales, §5 tabla de estados, §10 accesibilidad, §12 qué NO se reutiliza de la
consola— **manda aquí sin repetirlo**. Esta spec añade:

1. Un **sexto bloque**, «Tus módulos», que la spec base no cubría porque el backend de compra
   desde el tenant no existía (§1: *«hoy hay contador y no hay panel»* — hoy tampoco hay
   escaparate).
2. La evolución de `SuscripcionAvisoGlobal` y `estadoSuscripcion.ts` al modelo de **una sola fecha
   de prueba por cuenta** (decisión 2 del brief), que sustituye al modelo «vence por línea» que
   `TrialLinesTable.vue:12-20` documentaba como el vigente hasta ahora.
3. El patrón transversal de **modo degradado dentro de un módulo** que la propia spec base dejó
   escrito como deuda intencional: *«cuando `READ_ONLY` esté activo, las pantallas clínicas
   deberían usar solo lectura, no `disabled`. […] No se hace en esta entrega, pero se anota: es el
   consumidor natural del banner de §7.1.3»* (`suscripcion-tenant-especificacion.md:957-961`). Esto
   es exactamente esa entrega, generalizada a los dos modos nuevos (solo lectura y techo gratuito).
4. Los sitios de copy que la promesa comercial nueva vuelve falsos.

**Lo que doy por sentado del brief común** (`cuenta-gratuita-PLAN.md`) y no repito: las diez
decisiones de negocio, el reparto CORE/SCHEDULING/CLINICAL_HISTORY/GROOMING/SERVICES → gratis con
techo, VACCINATION_DEWORMING/HOSPITALIZATION/SURGERY/LAB_IMAGING/CASH_REGISTER/INVENTORY/
PURCHASES/OPEN_ACCOUNTS → solo lectura, ELECTRONIC_INVOICING → nunca gratis, y el estado actual del
backend (sin barrido de vencimiento, sin consumidores de cupo en ANIMAL/OWNER/APPOINTMENT, sin
endpoint de escaparate).

**Qué NO se ejecutó al escribir esto:** ningún gate del repositorio (`npm run quality`,
`vue-tsc`, Vitest, Playwright, `ds:audit`), ni el dev server, ni una medición de contraste nueva —
los tonos que uso ya están medidos en la spec base §9.2 y en `estado-solo-lectura.md` §4, y no
introduzco ninguno nuevo.

---

## 1 · Bloque 6 — «Tus módulos» · `/dashboard/suscripcion/modulos`

### Objetivo

Responder, en una sola pantalla, la pregunta que hoy no tiene dónde hacerse: **«¿qué módulo tengo,
en qué estado, y qué pasa si quiero seguir con él después de la prueba?»**. Es el destino que la
spec base ya reservaba sin saberlo: el `VER_PLAN` (`estadoSuscripcion.ts:156`) y el «Ver mi plan» de
`SuscripcionAvisoGlobal` van a esta pantalla y no a «Mi plan», que solo lista lo ya contratado y no
lo que se puede comprar.

### Anatomía

```
PageHeader          kicker="Mi suscripción"  title="Tus módulos"
[ SuscripcionEstadoBanner ]                         ← del layout, sin tocar (§3.2 de la spec base)
<p class="ds-meta">                                 ← cabecera informativa, sin role (presente al cargar)
   Aquí ves el estado de cada módulo de tu clínica y puedes comprar los que quieras seguir
   usando cuando termine la prueba.
</p>
SectionCard "Tus módulos"
  <ul class="ds-list-reset ds-grid ds-grid--cards">  ← una tarjeta por módulo del catálogo
    <li> ModuloCard × N
SectionCard "Comprar módulos"                        ← v-if hay selección Y puedeComprar
  CicloFieldset (mensual/anual)
  resumen de precio (líneas seleccionadas + total)
  LegalConsentCheckbox (si aplica cobro hoy)
  MedioDePagoWompi
  botón "Confirmar compra"
```

Una tarjeta (`ModuloCard`) por cada artículo `MODULE` del catálogo de la empresa — **los que ya
tiene Y los que no tiene, en la misma rejilla**: el catálogo entero es lo que responde «qué podría
tener», que es la pregunta que trae a esta pantalla a quien no compró nada todavía.

### Estados (por tarjeta, uno de estos cinco)

| Estado | Pill (`BaseChip`) | Cuerpo de la tarjeta | CTA (solo ADMIN) |
| --- | --- | --- | --- |
| **EN_PRUEBA** | `variant="accent"` «En prueba» | fecha de fin + días restantes | «Comprar» (adelanta el cobro a hoy, §1.4) |
| **GRATIS_CON_TECHO** | `variant="success"` «Gratis con techo» | medidor `MedidorCupo` + texto de consumo | «Ampliar» → mismo flujo de compra |
| **SOLO_LECTURA** | `variant="warn"` «Solo lectura» | qué conserva / qué perdió | «Comprar» (reactiva creación) |
| **DE_PAGO_ACTIVO** | `variant="neutral"` «Activo» | «Incluido en tu plan.» | ninguno (ya contratado) |
| **NUNCA_GRATIS** (solo `ELECTRONIC_INVOICING`) | `variant="warn"` «Nunca gratis» | «Se cobra desde el día en que lo actives.» | «Comprar» (cobro hoy, sin excepción) |

`BaseChip` (`src/components/ui/BaseChip.vue:1-16`) solo declara `neutral | accent | success | warn`
— **no hay `danger`**, y no hace falta: ningún estado de este bloque es un error, ni siquiera solo
lectura (es una consecuencia esperada de no comprar, no un fallo).

### Copy exacto (es-CO)

- **EN_PRUEBA:** `Gratis hasta el {fecha}. Quedan {n} días.` Con `n ≤ 7`: añadir
  `No se corta nada por sí solo.` (mismo giro que `estadoSuscripcion.ts:164`, para no introducir un
  segundo tono de urgencia).
- **GRATIS_CON_TECHO**, eje mensual (SCHEDULING, GROOMING): `{usado} de {limite} este mes.`
- **GRATIS_CON_TECHO**, eje acumulado (CORE, SERVICES): `{usado} de {limite} en total.`
- **GRATIS_CON_TECHO**, avisos al 60/80/90 %: **literales de `cuposText.avisoCupo`**
  (`cuposText.ts:201-220`), sin reformular. Ejemplo al 90 %: `Casi sin cupo de {sustantivo}: te
  quedan {restantes}. Al agotarse, no podrás crear más hasta ampliarlo.`
- **SOLO_LECTURA:** `Puedes consultar e imprimir lo que ya tienes. Para volver a crear, cómpralo.`
  — mismo giro «qué conserva / qué pierde» que `estadoSuscripcion.ts:248-250` para `READ_ONLY`,
  adaptado a la unidad módulo en vez de cuenta entera.
- **DE_PAGO_ACTIVO:** `Incluido en tu plan.`
- **NUNCA_GRATIS:** `Facturación electrónica no tiene prueba. Se cobra desde el día en que la
  actives.`
- **Sin permiso de compra** (no ADMIN), en vez del botón: `Solo quien administra tu cuenta puede
  comprar módulos. Pídeselo a tu administrador.` — mismo patrón que `SIN_PERMISO`
  (`accesoBloqueado.ts:31-32`), pero **no es un 403**: es una regla de negocio (D-9), así que no se
  reutiliza el texto literal de un hueco de lectura para una acción de escritura.
- **Resumen de compra, cobro diferido (todo módulo excepto ELECTRONIC_INVOICING):**
  `Pagas hoy con tarjeta guardada. El primer cobro es el {formatDateLong(trialEndDate + 1 día)} por
  el periodo completo.` — misma construcción que ya usa `ContratarResumenAside.vue:124-127` («El
  primer cobro sería el {fecha}, y te avisamos por correo antes»); aquí se declara «pagas hoy con
  tarjeta guardada» porque, a diferencia del paso 6 de contratación, **no hay paso de captura de
  tarjeta**: ya existe un medio por defecto (si no lo hay, el flujo cae a `FormularioTarjetaWompi`
  antes de este resumen, igual que `MedioDePagoWompi.vue:107-152`).
- **Resumen de compra, ELECTRONIC_INVOICING:** `Facturación electrónica se cobra desde hoy. No
  aplica el cobro diferido de los demás módulos.`
- **Confirmación tras comprar (toast):** `useToast().success('Módulo comprado', '{nombre} ya está
  activo.')` — nunca un `alert()` ni un banner nuevo: es un evento, no una condición permanente
  (`patron-de-mensajes.md` §1, ya citado por la spec base).

### Reglas de interacción

1. **Selección múltiple con casillas**, una por tarjeta comprable (EN_PRUEBA, SOLO_LECTURA,
   NUNCA_GRATIS; GRATIS_CON_TECHO no se "compra", ver nota). El bloque «Comprar módulos» aparece
   solo cuando hay ≥ 1 seleccionado, con el mismo criterio de aparición condicional que
   `ContratarResumenAside`.
2. **`GRATIS_CON_TECHO` no lleva casilla de compra individual hoy**: el modelo (decisión 5 del
   brief) no define un artículo de pago para «techo más alto» de CORE/SCHEDULING/GROOMING/
   SERVICES — solo define el techo gratuito. Su tarjeta muestra el medidor y, si `enforcement` no
   es `BLOCK` sino `WARN`/`OVERAGE`, la frase correspondiente de `cuposText.ts:216-220`. Si más
   adelante el catálogo publica un artículo de ampliación, esta tarjeta gana la misma casilla que
   las demás — **no se prediseña ahora un control para un artículo que no existe** (R14).
3. **Ciclo mensual/anual**: `CicloFieldset` (`src/features/landing/components/CicloFieldset.vue`),
   un solo selector para toda la compra — no uno por módulo. Si la empresa ya tiene un ciclo
   contratado (`SubscriptionResponse.billingCycle`) y compra un módulo nuevo, el ciclo del bloque
   se fija a ese valor y **no se ofrece elegir otro**: dos ciclos convivientes en la misma
   suscripción no es un caso que el modelo de datos contemple (verificado: `SubscriptionResponse`
   tiene un solo `billingCycle`, no uno por línea).
4. **Resumen de precio**: reutiliza el cálculo de `useCotizador`/`PlanesConfigurador` como
   *patrón* (toggle por módulo vía algo equivalente a `alternarModulo`,
   `useCotizador.ts:372-387`), no como componente literal: `PlanesConfigurador` está construido
   sobre un `PublicPlan` con sedes/usuarios, y esta pantalla vende módulos sueltos a una empresa ya
   existente. El precio final para confirmar sale de `cotizacionesApi.selfServe()`
   (`POST /quotes/self-serve`, ya existente, `cotizaciones.api.ts:41-44`) con una línea
   `{ code, quantity: 1 }` por módulo marcado — **nunca se computa el precio final en el
   navegador**, solo se anticipa (mismo principio que `useCotizador` ya aplica: la cifra local es
   «desde», la del servidor es la que se cobra).
5. **Confirmar compra**: `cotizacionesApi.selfServe()` → `cotizacionesApi.accept(id, {
   acceptedByEmail })`, calcado del paso 6 de contratación (`ContratarView.vue`,
   `usePasoContratar.ts`) pero sin el paso de "revisar antes de aceptar" en dos pantallas
   separadas: aquí el resumen y la confirmación viven en el mismo bloque, porque la compra es de
   1-3 líneas y no de un plan completo. Si el backend rechaza por el permiso `quote.request`
   (empresa en mora, gate `FULL` — ver `cotizaciones.api.ts:33-36`), el error viaja por
   `toast.errorFrom('No se pudo completar la compra', error)`.
6. **Solo el ADMIN ve el botón «Comprar»/«Ampliar»**, condicionado a
   `can(PERMISSIONS.QUOTE_REQUEST)` — el mismo permiso que ya protege `POST /quotes/self-serve`
   en el backend (`cotizaciones.api.ts:33`: *«Gate: `hasAuthority('quote.request')`»*), así que la
   UI no inventa una regla nueva: oculta antes lo que el servidor ya rechazaría. Quien no lo tiene
   ve la tarjeta completa (estado, medidor, fechas) menos el CTA.
7. **`onMounted(() => load(true))`** — recarga siempre al abrir, regla obligatoria del repositorio
   (`CLAUDE.md` del tenant, «Recargar SIEMPRE al abrir pantalla»).

### A11y

- Las cinco pills de estado llevan **texto, no solo color** (§1.4.1 Use of Color, A) — la tabla de
  arriba ya lo fija; ninguna tarjeta se distingue solo por el fondo de su `BaseChip`.
- El medidor de `GRATIS_CON_TECHO` es el `MedidorCupo` existente
  (`src/features/suscripcion/components/MedidorCupo.vue`), **sin tocarlo**: ya resuelve
  `<progress>` nativo sin ARIA a mano, borde a 3,15:1 (§1.4.11 AA) y «límite ausente ≠ límite de
  cero».
- El resumen de compra sigue la convención de formulario del repositorio: validador puro → `errors`
  computado → `touched` → error solo tras `@blur` → `ErrorSummary` con el mismo texto → foco al
  resumen (heredado de `RegisterForm.vue:94-105` y de `FormularioTarjetaWompi.vue:81-95`, que ya
  implementan exactamente este patrón para el correo del aceptante y la tarjeta).
- Tras confirmar la compra, el foco vuelve al `<h1>` de la propia pantalla (`tabindex="-1"`), **no**
  a un botón que puede haber desaparecido del árbol al recargar el estado — mismo criterio que la
  spec base fija para aceptar/rechazar cotizaciones (§7.5.2, `suscripcion-tenant-especificacion.md:875-876`).
- `role="status"` en los banners de aviso de cupo (60/80/90 %), nunca `alert` — mismo motivo que
  toda la feature: son condiciones permanentes, no sucesos.

### Reutiliza

- `PageHeader`, `SectionCard`, `BaseChip` — `src/components/ui/`.
- `MedidorCupo.vue`, `cuposText.ts` (`avisoCupo`, `sustantivo`, `restantesTexto`) —
  `src/features/suscripcion/{components,composables}/`.
- `CicloFieldset.vue` — `src/features/landing/components/`.
- `cotizacionesApi.selfServe` / `.accept` — `src/features/suscripcion/api/cotizaciones.api.ts`.
- `MedioDePagoWompi.vue`, `FormularioTarjetaWompi.vue` — `src/features/{contratacion,suscripcion}/`.
- `LegalConsentCheckbox.vue` — `src/features/legal/components/`.
- `useToast().errorFrom` / `.success` — `src/composables/useToast.ts`.
- `formatDateLong`, `formatMoney` — `src/composables/{format,money}.ts`.
- `PERMISSIONS.QUOTE_REQUEST`, `PERMISSIONS.SUBSCRIPTION_READ`, `PERMISSIONS.ENTITLEMENT_READ` —
  `src/constants/permissions.ts` (ya existen, sin altas nuevas).

### Dependencia de contrato — declarada, no resuelta aquí

Esta pantalla necesita, por módulo del catálogo: código, nombre, estado (uno de los cinco de
arriba), fecha de fin de prueba si aplica, consumo/techo si aplica (`used`/`limit`/`enforcement`,
ya modelados en `CompanyCapacityResponse`/`SubscriptionItemLimitResponse`), y si es comprable hoy.
**Ningún endpoint publica hoy ese cruce en una sola llamada** — es el «endpoint de escaparate de
módulos» que el brief asigna a `backend-feature` BF-C. Esta spec fija los **campos**, no el
contrato exacto: el nombre de ruta y la forma del DTO los cierra `api-contract-sync` en la fase 2
del reparto, y `front-feature` T1 debe leer el contrato generado en ese momento, no inventar un
cliente contra un endpoint que no existe todavía. Ver «ISSUES ABIERTOS».

---

## 2 · Aviso global de fin de prueba — evolución de `SuscripcionAvisoGlobal` + `estadoSuscripcion.ts`

### Objetivo

Sustituir el modelo «vence por línea» (que hoy no se usa en ningún banner global — `estadoPlan()`
solo mira `sub.trialEndDate`, singular, `estadoSuscripcion.ts:47,140`) por el modelo real de la
cuenta gratuita: **una fecha por cuenta**, cuenta atrás desde 7 días, y un aviso distinto después de
vencer que reparte en dos números lo que antes era un solo estado.

### Anatomía

Sin cambios estructurales: `SuscripcionAvisoGlobal.vue` sigue montado en
`AppLayout.vue:35` (dentro de `<main>`, tras el skip-link, antes de `<RouterView>`, exactamente
donde está hoy) y sigue siendo el `role="status"` siempre presente que conmuta su texto interior
(`SuscripcionAvisoGlobal.vue:29-30`). Lo que cambia es **qué computa `estadoPlan()`** para
`TRIALING` y qué pasa cuando la cuenta ya vive el reparto post-vencimiento.

### Estados

| Momento | `fuerte` | `frase` | CTA |
| --- | --- | --- | --- |
| `TRIALING`, > 7 días | *(sin banner: `tono: 'none'`, igual que hoy)* | — | — |
| `TRIALING`, ≤ 7 días | `No se corta nada por sí solo.` | `Tu prueba termina el {fecha}. Después, algunos módulos siguen gratis con límites y otros pasan a solo consulta.` | `Ver tus módulos` |
| Recién vencida (repartida) | `Tu prueba terminó.` | `{n} módulos quedaron en solo lectura y {m} siguen gratis con techo.` | `Ver tus módulos` |
| Post-reparto, sin cambios desde entonces | *(sin banner)* | — | — |

**El texto ≤ 7 días cambia respecto al literal actual** de `estadoSuscripcion.ts:165`
(`Tu prueba termina el {fin}. Después, el servicio pasa a cobrarse.`), que describe el modelo
antiguo (todo el contrato pasa a `ACTIVE` y se cobra). Con el reparto por `trial_outcome`, «el
servicio pasa a cobrarse» ya no es cierto para CORE/SCHEDULING/CLINICAL_HISTORY/GROOMING/SERVICES
— dejaría sin avisar del alivio real (siguen gratis) y sin avisar de la restricción real (los ocho
que sí se restringen). El nuevo texto nombra las dos consecuencias sin dar cifras que todavía no
se conocen en este banner global (las cifras exactas —qué módulo a qué grupo— viven en «Tus
módulos», que es adonde apunta el CTA).

**El aviso post-vencimiento es nuevo**: hoy `estadoPlan()` no distingue «recién vencida y ya
repartida» de «`ACTIVE` de toda la vida», porque el modelo antiguo no tenía ese momento. Se
necesita una señal para decidir cuándo mostrarlo — ver dependencia de contrato más abajo.

### Copy exacto (es-CO)

```
≤ 7 días:
  No se corta nada por sí solo. Tu prueba termina el {fecha}. Después, algunos
  módulos siguen gratis con límites y otros pasan a solo consulta.
  [ Ver tus módulos ]

Recién repartida:
  Tu prueba terminó: {n} módulos quedaron en solo lectura y {m} siguen gratis
  con techo.
  [ Ver tus módulos ]
```

Concordancia obligatoria (`1 módulo` / `{n} módulos`), mismo criterio que `dias()` en
`estadoSuscripcion.ts:147-149`.

### Reglas de interacción

1. **Una sola fecha por cuenta.** `estadoPlan()`/`enPrueba()` (`estadoSuscripcion.ts:158-177`) no
   necesitan tocar su forma —siguen leyendo `sub.trialEndDate` singular—, porque la decisión 2 del
   brief hace que esa fecha singular **ya sea la real** (hoy es un campo de la suscripción, y con
   el reparto congelado por `trial_outcome` sigue siéndolo: una fecha de contrato, aplicada a
   todas las líneas). Lo único que cambia es el texto de `enPrueba()` (arriba) y que se necesita
   una función nueva para el estado post-reparto.
2. **`VER_PLAN` se sustituye por un nuevo destino `VER_MODULOS`** en `estadoSuscripcion.ts:156`,
   apuntando a `suscripcion-modulos` (§1) en vez de a `suscripcion-plan`: «Mi plan» no dice qué
   pasa módulo a módulo, y es exactamente la pregunta que trae aquí. `SuscripcionEstadoBanner.vue`
   sigue funcionando sin cambios porque consume `estado.accion` genéricamente
   (`SuscripcionEstadoBanner.vue:42-46`).
3. **El aviso post-vencimiento se apaga solo**, con el mismo mecanismo que ya usa el resto de la
   tabla: `estadoPlan()` devuelve `tono: 'none'` en cuanto deja de ser información nueva. El
   umbral propuesto: se muestra mientras la cuenta lleve **menos de 3 días** desde el reparto (una
   ventana corta, para que no compita para siempre con el resto de avisos); pasado ese plazo, cada
   módulo cuenta su propio estado en su propia pantalla y el banner global vuelve a callar. Esta
   ventana es una propuesta de diseño, no un dato del modelo — `front-feature` la ajusta si
   `api-contract-sync` publica un campo distinto (p. ej. un `readAt`/`acknowledgedAt`).

### A11y

- Sin cambios sobre lo ya certificado en la spec base §5.1: `role="status"`, nunca `alert`;
  contenedor siempre montado; ningún estado solo por color.
- El CTA cambia de nombre (`Ver tus módulos` en vez de `Ver mi plan`) pero conserva la regla de
  «sin salida no hay botón» (`SuscripcionEstadoBanner.vue:42-46`, `mostrarEnlace` en
  `SuscripcionAvisoGlobal.vue:26`): en la propia pantalla de «Tus módulos» el enlace no se pinta.

### Reutiliza

`SuscripcionAvisoGlobal.vue`, `SuscripcionEstadoBanner.vue`, `estadoSuscripcion.ts` — los tres se
**editan**, no se sustituyen. `AppLayout.vue` no se toca: el punto de montaje ya es correcto.

### Dependencia de contrato — declarada, no resuelta aquí

«Recién repartida» necesita dos números (`n` solo-lectura, `m` gratis-con-techo) y una señal de
«hace cuánto se repartió». Hoy `SubscriptionResponse` no trae ninguno de los tres.
`api-contract-sync` (fase 2) debe confirmar de dónde salen: lo más barato es que salgan del mismo
escaparate de módulos de §1 (contar estados en el cliente tras la primera carga posterior al
vencimiento), sin campo nuevo en `SubscriptionResponse`. Se declara para que T1 no invente un
`GET` adicional solo para este banner.

---

## 3 · Estado degradado dentro de un módulo — patrón transversal

### Objetivo

Un solo patrón para los dos modos nuevos, consumido por cualquier feature clínica (agenda,
historia clínica, hospitalización, laboratorio, spa/guardería, caja, inventario…), sin que cada
una reinvente su propio banner o su propio `disabled`. Es la deuda que la spec base dejó escrita
(§8.2, citada arriba) y la regla de negocio 4 del brief la hace obligatoria ahora: *«nunca se
oculta un módulo, baja, no desaparece»* (R-ENT-01).

### Anatomía — dónde se monta cada pieza

```
src/composables/useModuloEstado.ts   (NUEVO, transversal, fuera de features/suscripcion)
  useModuloEstado(moduleCode: string) → {
    estado: ComputedRef<'FULL' | 'FREE_LIMITED' | 'READ_ONLY'>
    puedeCrear: ComputedRef<boolean>
    banner: ComputedRef<{ tono: 'warning' | 'error'; texto: string } | null>
  }

<Feature>ListView.vue (agenda, laboratorio, hospitalización, spa, caja, inventario…)
  <PageHeader … />
  <ModuloDegradadoBanner :estado="estado" :banner="banner" />   ← NUEVO componente, monta el banner
  … listado existente …
  <button @click="intentarCrear">Nuevo {{ x }}</button>          ← ver regla de interacción 3
```

**Por qué es un composable transversal y no una extensión de `useCupos`.** `useCupos` vive en
`features/suscripcion/` y expone TODOS los cupos de la empresa a la vez, pensado para las pantallas
de esa feature. Cada pantalla clínica solo necesita **la suya**: `useModuloEstado('LAB_IMAGING')`
cruza internamente contra `useCupos()`/`useSuscripcion()` (los reutiliza, no los duplica) y
devuelve un resultado ya resuelto para ese módulo, siguiendo el mismo principio que
`useFacturacionAccess.ts` ya aplica para `ELECTRONIC_BILLING_CREATE` (`hasModule` como fachada de
un permiso, aquí una fachada de un cruce de estado).

### Estados

| `estado` | Qué pasa al listar | Qué pasa al crear/editar |
| --- | --- | --- |
| `FULL` | normal | normal |
| `FREE_LIMITED`, bajo el umbral | normal | normal |
| `FREE_LIMITED`, al 60/80/90 % | banner de aviso (§6.2 de la spec base, reutilizado tal cual) | normal, hasta el N+1 (ver regla 4) |
| `FREE_LIMITED`, techo alcanzado | banner de aviso | bloqueado, con el error del servidor (regla 4) |
| `READ_ONLY` | banner de error, **permanente mientras dure el estado** | bloqueado, explicado antes de intentarlo (regla 3) |

### Copy exacto (es-CO)

**Banner de entrada, `READ_ONLY` de un módulo** (no de toda la cuenta — ese ya existe en la spec
base §6.1 para `SubscriptionResponse.status === 'READ_ONLY'`; este es el mismo tono para un módulo
individual cuya línea pasó a `EXPIRED_READ_ONLY` sin que el resto de la cuenta esté en mora):

```
Puedes consultar e imprimir lo que ya tienes en {módulo}, incluida la historia
si aplica. Para volver a crear, cómpralo.
[ Ver tus módulos ]
```

**Al intentar crear/editar en un módulo `READ_ONLY`** (banner o mensaje inline al pulsar, ver
regla 3):

```
{Módulo} está en modo solo consulta desde el {fecha}. Cómpralo para volver a
crear.
[ Comprar {módulo} ]
```

**Al chocar con el techo gratuito** (respuesta del servidor al crear el elemento N+1):

```
Llegaste al tope gratuito de {sustantivo} este mes ({limite}). Amplíalo para
seguir creando.
[ Ver tus módulos ]
```

Vocabulario prohibido: el mismo de la spec base §6.1 — «bloquear», «suspender», «cortar»,
«desactivar la cuenta», «inhabilitar» no aparecen en ninguno de estos tres textos ni en los que
`front-feature` derive de ellos.

### Reglas de interacción

1. **El módulo nunca se oculta del menú ni de la ruta** (R-ENT-01, decisión 4 del brief). Esto ya
   es cierto hoy en el router del tenant — ninguna ruta clínica lleva `meta.permission` condicionado
   al estado de la suscripción, solo a permisos de rol — así que esta regla es una **restricción
   para lo que se añade**, no una corrección de lo que existe: `front-feature` no debe envolver
   ninguna de estas rutas en un guard que las oculte por estado de módulo.
2. **El banner de `READ_ONLY` es persistente en la pantalla del módulo**, con el mismo criterio de
   «contenedor siempre montado, texto conmutado» que `SuscripcionEstadoBanner` — se monta una vez
   por vista (no por fila de la tabla) y no se puede cerrar: no es un aviso efímero, es una
   condición de la cuenta.
3. **No se deshabilita el botón de crear con un `title` como único aviso.** Se descarta la
   redacción literal del brief («deshabilitados con tooltip») por un motivo de accesibilidad
   verificado en este mismo repositorio: un `<button disabled>` con `title` **no es alcanzable por
   teclado en Chrome/Edge** (los elementos `disabled` no reciben foco, así que el `title` —que ya
   de por sí no se anuncia a lectores de pantalla— tampoco se puede activar con teclado en
   absoluto). Es el mismo argumento que ya usan `MiPlanView.vue:42-46` para justificar **retirar**
   un botón sin permiso en vez de deshabilitarlo, y el que `estado-solo-lectura.md` §2 documenta
   para la familia de campos. **Patrón correcto:** el botón queda **habilitado y enfocable**, con
   un icono `Lock` (Lucide) delante del texto — mismo vocabulario visual que
   `EditPermissionsModal.vue:271-277` ya usa para «solo lectura del sistema» — y al activarlo
   (click o Enter/Espacio) abre un mensaje inline o un `ModalShell` pequeño con el segundo texto de
   arriba y el CTA de compra, **en vez de** abrir el formulario de creación. Esto cumple **WCAG 2.2
   §2.1.1 Keyboard (A)** y **§4.1.2 Name, Role, Value (A)** sin perder ni la señal visual ni la
   explicación que el brief pedía — solo cambia CUÁNDO se explica (al activar, no al posar el
   ratón).
4. **El techo gratuito no se anticipa deshabilitando el botón de crear.** Se anticipa con el
   medidor (`MedidorCupo`) y el banner de 80/90 % **junto al listado**, reutilizados de la spec
   base §7.2.2-§7.2.3 sin cambios. El bloqueo real ocurre en el servidor al intentar crear el
   elemento N+1: la respuesta trae el `ProblemDetail` de cupo agotado (mismo mecanismo que ya
   describe `LimitEnforcement`), y el formulario lo muestra con `toast.errorFrom` **más** el texto
   específico de arriba en vez del genérico del `ProblemDetail` — mapeado por `code`, siguiendo el
   patrón `formErrorFrom`/`hintServerError` que `useCatalogAiHints.ts:61-75` ya usa en la consola
   para repartir un error del servidor entre «se arregla en el formulario» y «se avisa por toast».
   **No se predice el N+1-ésimo en el cliente contando filas locales**: la lista puede estar
   paginada o filtrada, y contar lo visible en vez de preguntar al servidor es exactamente el
   defecto que `MedidorCupo` ya evita en su regla 2 (`MedidorCupo.vue:18-19`).
5. **`useModuloEstado` no añade una llamada de red por módulo.** Se apoya en la misma carga que ya
   hace `useCupos()`/`useSuscripcion()` (montadas una vez por sesión o por navegación a
   «Suscripción»), cruzando en el cliente por `moduleCode`. Si el módulo no aparece en
   `capacities[]`/`entitlements[]`, el resultado es `FULL` — **nunca se asume degradado por
   ausencia de dato** (mismo principio de R14 que protege `useCupos` hoy: un array ausente no es
   «sin cupos», y aquí una entrada ausente en el cruce de un módulo tampoco es «restringido»,
   sería el error opuesto y más caro: mostrar bloqueado algo que sí funciona).

### A11y

- **WCAG 2.2 §2.1.1 Keyboard (A)** y **§4.1.2 Name, Role, Value (A)**: cubiertos por la regla 3
  (botón enfocable, nunca `disabled` como única señal de un estado explicable).
- **WCAG 2.2 §1.4.1 Use of Color (A)**: el banner de `READ_ONLY` lleva icono + texto, nunca solo el
  tono rojo del `.ds-banner--error`.
- **WCAG 2.2 §4.1.3 Status Messages (AA)**: el banner persistente usa `role="status"` en un
  contenedor que ya vive en el DOM al montar la vista (mismo patrón que `SuscripcionEstadoBanner`);
  el mensaje del choque con el techo (regla 4) es un **toast** (`useToast().error`, no `errorFrom`
  cuando el texto es el propio de esta feature y no el crudo del servidor) — un evento puntual, no
  una condición.
- El icono `Lock` de la regla 3 es decorativo (`aria-hidden="true"`): el estado ya lo dice el texto
  del propio botón (`Comprar {módulo}` en vez de `Nuevo {módulo}` mientras dure `READ_ONLY`, no un
  candado sin palabras).

### Reutiliza

`MedidorCupo.vue`, `cuposText.ts`, `useCupos.ts`, `useSuscripcion.ts` — de
`features/suscripcion/`. `useToast`, `ModalShell` — transversales. El patrón de `Lock` +
redacción de `EditPermissionsModal.vue:271-277` (consola) y de `useFacturacionAccess.ts` (fachada
de acceso por módulo, tenant) como precedentes de diseño, no como código a importar (son de
features distintas).

### Dependencia de contrato — declarada, no resuelta aquí

`useModuloEstado` necesita que el backend distinga, por módulo, entre `FREE_LIMITED` y
`EXPIRED_READ_ONLY` — es exactamente el campo `charge_mode` de la línea sucesora que
`ConsumeTrialGrantService` **todavía no escribe** (verificado en el brief:
*«no escribe la línea sucesora (`succeeds_item_id`, `charge_mode` FREE_LIMITED /
EXPIRED_READ_ONLY)»*). Sin ese trabajo de `backend-feature` BF-B, este composable no tiene de dónde
leer el estado real y **no se puede implementar completo antes de que exista**. Ver «ISSUES
ABIERTOS».

---

## 4 · Registro y landing — el copy que la promesa nueva vuelve falso

Cada fila: dónde está, qué dice hoy, por qué contradice las decisiones 1-2-8, y el texto que lo
sustituye. **No se abre issue por cada una: van todas en el mismo lote de T1** (son literales de
plantilla, sin lógica).

| Fichero:línea | Dice hoy | Contradice | Texto nuevo |
| --- | --- | --- | --- |
| `src/features/landing/components/LandingHero.vue:47-49` | *«Paga solo los módulos que tu negocio usa. Ni uno más.»* | Es la promesa de la landing ANTERIOR a esta iniciativa: vende «paga por módulo», y omite que la mayoría de los módulos **no se pagan nunca** si la clínica no los necesita más allá del techo gratis. Es el titular principal del sitio — el que más gente lee. | `Prueba todo 30 días. Después, sigue gratis con límites.` con la bajada actual (`land-sub`, línea 51-54) ajustada a: `Agenda, historia clínica, spa y más te acompañan gratis siempre, con un techo mensual. Si necesitas más, o quieres facturación electrónica DIAN, lo activas cuando quieras.` |
| `src/features/landing/components/LandingFaq.vue:17-20` (comentario) | *«Ninguna respuesta promete "30 días": la prueba vence POR LÍNEA…»* | Es la premisa de diseño que la decisión 2 revierte. El comentario no es visible al usuario, pero **es lo primero que lee el siguiente agente** y lo llevaría a defender un modelo ya derogado. | Reescribir la nota: *«La prueba dura 30 días para toda la cuenta (una sola fecha). Lo que sigue variando módulo a módulo es qué pasa DESPUÉS: unos siguen gratis con techo, otros pasan a solo lectura.»* |
| `src/features/landing/components/LandingFaq.vue:91-93` | *«¿Qué pasa cuando se acaba la prueba? Te avisamos por correo antes. Cada módulo tiene su propia fecha y las verás todas antes de confirmar.»* | Directamente falso tras la decisión 2: no hay «cada módulo su fecha», hay una fecha. | `Te avisamos por correo antes. Los módulos que uses todos los días — agenda, historia clínica, clientes — siguen gratis con un techo. Los más avanzados —hospitalización, laboratorio, caja— pasan a solo consulta hasta que los compres. Facturación electrónica es la única excepción: se cobra desde el primer día.` |
| `src/features/landing/components/PlanesConfigurador.vue:241-242` (comentario) + `:252-253` (texto) | *«la prueba vence por línea… Cada módulo tiene su propia prueba y no terminan todas el mismo día»* | Igual que arriba: con todos los módulos a 30 días y una sola fecha por cuenta, el `<details>` entero deja de tener algo que desplegar («¿cuánto dura la prueba de cada módulo?» tiene una sola respuesta). | Sustituir el `<details>` por una línea fija: `Prueba gratis 30 días para todo el plan. Después, cada módulo sigue con su propio límite gratuito o pasa a solo consulta — lo ves todo en «Tus módulos» antes de que pase.` Si `front-feature` prefiere conservar el desplegable por consistencia visual con el resto de la landing, su contenido deja de ser una lista de fechas por módulo (todas iguales) y pasa a ser la lista de qué grupo (gratis con techo / solo lectura) le toca a cada uno — dato que si existe en el catálogo (`ArticuloCatalogo`) se lee de ahí, y si no, se declara pendiente en «ISSUES ABIERTOS». |
| `src/features/landing/views/PlanesView.vue:322-325` | *«Cada módulo tiene su propia prueba y no terminan el mismo día. Estas son las fechas si contratas hoy.»* | Misma causa que la fila anterior. `TrialLinesTable.vue` de por sí ya colapsa correctamente al caso «uniforme» (`pruebaUniforme`, `TrialLinesTable.vue:50,72-74`): el defecto no está en el componente, está en el `<p>` estático que lo introduce con una premisa que deja de cumplirse siempre. | `Todo el plan es gratis 30 días. Esta es la fecha en la que empieza a cambiar cada módulo si contratas hoy.` |
| `src/features/registration/views/SignupView.vue`, `RegisterForm.vue` | Ningún literal visible promete un plazo o un modelo de cobro (verificado: cero ocurrencias de «30 días»/«14 días»/«prueba» en estos dos ficheros). | No contradice nada hoy — **pero tampoco confirma la promesa nueva en el único paso donde el usuario ya decidió registrarse**, que es el momento de más confianza para reforzarla. | Añadir, bajo el `<h1>`/subtítulo de `RegisterForm.vue` (línea 276, junto a `reg-sub`): `Registra tu empresa y tu primer usuario administrador. Todo gratis 30 días; después, sigues con acceso gratuito con límites.` |

**No se toca** `CotizadorCarril.vue:105`, `PlanesConfigurador.vue:237`, `SeleccionAside.vue:73`
(«Prueba gratis. Sin tarjeta.») ni `PlanesResumenAside.vue:143`: son ciertos bajo el modelo nuevo
tal cual están — no prometen un número de días ni un reparto por módulo, y decir «sin tarjeta»
sigue siendo verdad para todo excepto `ELECTRONIC_INVOICING`, que estas dos vistas no tratan como
caso especial hoy (fuera de alcance de esta spec: es el mismo hueco en las dos, y se declara en
«ISSUES ABIERTOS» en vez de resolverse aquí sobre la marcha).

---

## 5 · Accesibilidad y tokens — resumen transversal

No se introduce ningún token nuevo. Los tonos que este documento usa ya existen y ya están
medidos:

| Tono | Token | Medido en |
| --- | --- | --- |
| `.ds-banner--warning` / `.ds-tone--warning` | `--warning-bg` / `--warning-fg` | spec base §9.2 — 7,92:1, ≥ AA |
| `.ds-banner--error` | `--danger-*` | ya certificado por el uso existente en `SuscripcionEstadoBanner` |
| `.ds-banner--success` (toast de compra) | `--success-*` | ya certificado por `useToast().success` en toda la app |
| `BaseChip` `success`/`warn` | OKLCH local del propio componente (`BaseChip.vue:36-44`) | **no medido aquí** — ver nota |

**Nota sobre `BaseChip`.** Sus variantes `success`/`warn` (`BaseChip.vue:36-44`) son colores OKLCH
declarados en el `<style scoped>` del propio componente, **no** primitivas de `primitives.css`. Es
un patrón preexistente (el propio componente lo documenta: *«los otros tres no tienen primitiva
equivalente y siguen siendo locales»*, `BaseChip.vue:11-12`) y esta spec no lo cambia — pero
tampoco lo puede dar por medido sin comprobarlo, así que **no afirmo su contraste**. Si
`front-feature` necesita certeza antes de usarlo en las cinco pills de §1, la comprobación
(mismo método OKLCH → sRGB → luminancia relativa que ya usó `estado-solo-lectura.md` §4) es un
paso de una tanda, no un bloqueo de esta especificación.

Reglas ya fijadas por la spec base que se heredan sin repetir código: `role="status"` nunca
`alert` para condiciones permanentes (§5.1 de la base); ningún estado solo por color (§1.4.1, en
toda esta spec); foco tras una acción va al `<h1>` con `tabindex="-1"` (§7.5.2 de la base);
`ModalShell` ya retiene el foco (§10.1 de la base, corregido el 2026-08-28); `prefers-reduced-motion`
global ya existe en el tenant (§10.2 de la base, corregido el mismo día). **Cero accesibilidad
automatizada en el pipeline** sigue siendo cierto (§11.4 de la base) — esta spec no lo cierra,
solo lo hereda como límite conocido.

---

## 6 · `aria-live` del aviso global — precisión puntual

`role="status"` ya implica una región viva `polite` sin declarar `aria-live` a mano
(`SuscripcionAvisoGlobal.vue` no lo declara hoy y no debe empezar a hacerlo: sería redundante y
[la Understanding de WAI-ARIA 1.2 documenta `status` como equivalente implícito de
`aria-live="polite"`]). Lo único que cambia con este documento es **cuántas veces** se anuncia:
hoy el contenedor conmuta una sola frase (`estado.fuerte`); con el aviso post-vencimiento (§2), el
mismo contenedor pasa por dos frases distintas en la vida de una cuenta —la de ≤ 7 días y la de
recién repartida—, nunca las dos a la vez. No hace falta lógica nueva de `aria-live`: **es el
mismo nodo, conmutando texto**, que es justo el patrón que evita el problema (`SuscripcionAvisoGlobal.vue:29-30`
ya lo hace bien y no se toca).

---

## 7 · Reparto de ficheros — T1 y T2, sin solape

### T1 — «Tus módulos», compra y rutas

```
src/router/index.ts                                          (editar: alta de ruta + SUSCRIPCION_DESTINOS)
src/features/suscripcion/views/TusModulosView.vue             (nuevo)
src/features/suscripcion/components/ModuloCard.vue            (nuevo)
src/features/suscripcion/composables/useModulosCompra.ts      (nuevo — o el nombre que fije api-contract-sync)
src/features/suscripcion/stores/modulos.store.ts              (nuevo)
src/features/suscripcion/composables/estadoSuscripcion.ts     (editar: enPrueba(), VER_PLAN → VER_MODULOS, función de reparto post-vencimiento)
src/features/suscripcion/components/SuscripcionAvisoGlobal.vue (editar: nuevo estado "recién repartida")
src/features/registration/components/RegisterForm.vue         (editar: copy, §4)
src/features/landing/components/LandingHero.vue               (editar: copy, §4)
src/features/landing/components/LandingFaq.vue                (editar: copy + comentario, §4)
src/features/landing/components/PlanesConfigurador.vue        (editar: copy + comentario, §4)
src/features/landing/views/PlanesView.vue                     (editar: copy, §4)
```

### T2 — estado por módulo y modo degradado transversal (sin tocar el router)

```
src/composables/useModuloEstado.ts                            (nuevo, transversal)
src/components/feedback/ModuloDegradadoBanner.vue              (nuevo, transversal — o ubicación que fije front-feature dentro de components/)
```

Y, por cada feature clínica que ya exista y publique una acción de creación sujeta a un módulo del
reparto (agenda→SCHEDULING, historia clínica→CLINICAL_HISTORY, spa/guardería→GROOMING,
vacunación/desparasitación→VACCINATION_DEWORMING, hospitalización→HOSPITALIZATION,
cirugía→SURGERY, laboratorio/imagen→LAB_IMAGING, caja→CASH_REGISTER, inventario→INVENTORY,
compras→PURCHASES, cuentas abiertas→OPEN_ACCOUNTS): **una llamada a `useModuloEstado` en su vista
de listado y el reemplazo del botón de creación por el patrón de la regla 3 de §3**. Es un cambio
mecánico y repetido, no una decisión de diseño por pantalla — `front-feature` T2 decide el orden
de barrido; esta spec no lo prescribe fichero a fichero porque son ~11 vistas con la misma forma.

**Frontera exacta:** T1 no toca ninguna vista clínica ni `useModuloEstado`; T2 no toca el router,
`TusModulosView`, `SuscripcionAvisoGlobal` ni el copy de landing/registro. El único fichero que
ambos *leen* (no escriben) en común es `estadoSuscripcion.ts` — T1 lo edita, T2 solo lo consume
indirectamente a través de `useSuscripcion()` dentro de `useModuloEstado`. Si T2 arranca antes de
que T1 termine su edición de `estadoSuscripcion.ts`, no hay conflicto de escritura porque T2 no
edita ese fichero.

---

## 8 · Qué se midió y qué no

**Ejecutado:** lectura completa del código citado (rutas, permisos, componentes, composables,
tipos) vía CodeGraph e IntelliJ; lectura completa de `suscripcion-tenant-especificacion.md`,
`estado-solo-lectura.md` y las secciones citadas de `reglas-de-interfaz.md` para no repetir ni
contradecir lo ya decidido.

**No ejecutado:** ningún gate del repositorio, ninguna medición de contraste nueva (los tonos que
uso ya estaban medidos por otras specs, citadas en §5), ningún render real, ninguna consulta a la
base de datos de dev.

---

## ISSUES ABIERTOS

- **Contrato del escaparate de módulos** (§1, «Dependencia de contrato»): no existe hoy un
  endpoint que cruce catálogo + entitlement + capacidad + comprabilidad por módulo. Bloquea T1
  hasta que `api-contract-sync` (fase 2 del reparto) publique el DTO. Issue cross-repo
  (`vetsoftware-backend` origina, `vetsoftware-public-web` consume) si no se resuelve dentro de la
  fase 2 antes de que T1 arranque.
- **Señal de «recién repartida»** (§2, «Dependencia de contrato»): sin un campo o cálculo que
  distinga «la cuenta acaba de pasar por el reparto» de «lleva meses en `ACTIVE`», el aviso
  post-vencimiento de §2 no tiene de dónde leer `n`/`m`. Se propone resolverlo sin campo nuevo
  (contar estados del escaparate de §1 en el primer render posterior al vencimiento), pero
  requiere que ese escaparate exista primero — mismo bloqueo que el punto anterior.
- **`charge_mode` FREE_LIMITED/EXPIRED_READ_ONLY sin escribir** (§3, «Dependencia de contrato»):
  `useModuloEstado` no puede distinguir los dos modos degradados hasta que `backend-feature` BF-B
  escriba la línea sucesora con ese campo (ya declarado como pendiente en el propio brief común).
  Bloquea la implementación completa de T2; T2 puede avanzar el andamiaje (composable, banner,
  textos) contra datos de prueba y dejar el cruce real para cuando el campo exista.
- **Artículo de ampliación de techo gratuito inexistente** (§1, regla de interacción 2): el
  catálogo no define hoy un artículo comprable para subir el techo de CORE/SCHEDULING/GROOMING/
  SERVICES. No es un defecto — es que el modelo de negocio (brief, decisión 5) no lo pide — pero
  se declara para que nadie lo dé por implícito al ver la palabra «Ampliar» en la tabla de estados.
- **Contraste de `BaseChip` variantes `success`/`warn` sin medir** (§5): son OKLCH locales al
  componente, fuera de `primitives.css`. Se propone medirlos antes de que T1 los use en producción
  para las cinco pills de estado — mismo método que ya usó `estado-solo-lectura.md` §4.
- **`ELECTRONIC_INVOICING` sin caso especial en `CotizadorCarril`/`PlanesResumenAside`** (§4, nota
  de cierre): ninguna de las dos vistas distingue hoy «sin tarjeta» de «excepto facturación
  electrónica». No se resuelve en esta spec porque son dos ficheros que T1 no toca en su lote de
  copy (no estaban en el encargo original) — se deja anotado para una vuelta posterior sobre la
  landing completa, no para esta iniciativa de cuenta gratuita en concreto.
