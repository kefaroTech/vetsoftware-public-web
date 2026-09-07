# Cobro anticipado con Wompi — lo que le falta al cliente, especificación

**Origen.** Auditoría UX/a11y del cierre de contratación idempotente (rama
`feature/cierre-contratacion-idempotente`), 2026-09-06. Informe completo con los 36 casos
verificados: `docs/ux/../../../` no aplica — vive en el scratchpad de la sesión que la generó; este
documento es la parte que sí se persiste como especificación para implementar.

**Qué es este documento y qué NO es.** Es la especificación con la que otro agente implementa: qué
pantalla toca, qué texto exacto va, qué criterio lo exige. No es el informe completo de auditoría
(36 casos, la mayoría `CUBIERTO`) — aquí solo entran los puntos con veredicto `PARCIAL`, `FALLA` o
`NO CUBIERTO` que le tocan a este repo.

**Contexto de negocio, para no perderlo al leer las fichas sueltas.** El backend responde al
`accept` de una cotización **antes** de saber si el cobro del primer periodo se aprobó — el cobro
corre `afterCommit` y puede quedar `PENDING` hasta el webhook, `DECLINED`, o fallar sin cobrar por
falta de perfil fiscal. El front ya lo modela bien en el camino feliz (`ContratarExitoView.vue`
sondea de verdad y no promete "pago exitoso" antes de tiempo); lo que falta son los bordes de ese
mismo modelo.

**Verificado leyendo**, no ejecutando: sin `npm run quality`, sin Vitest, sin Playwright, sin dev
server (fase de auditoría). `fichero:línea` de cada punto, contra el árbol de trabajo del
2026-09-06.

---

## Contenido

- [F-01 · El sondeo agotado no dice que dejó de mirar](#f-01)
- [F-02 · Reintentar el primer cobro con otra tarjeta es un salto al vacío](#f-02)
- [F-03 · La referencia se pierde en cuanto se sale de la pantalla de éxito](#f-03)
- [F-04 · El rebote de una renovación es invisible fuera de "Mi suscripción"](#f-04)
- [F-05 · "Pagar" no tiene el mismo aviso de espera larga que "Confirmar"](#f-05)
- [F-06 · La moneda del cobro real nunca se compara contra la asumida](#f-06)
- [F-07 · El fix de F-04 no sobrevive ni al skip link ni a su propio patrón hermano](#f-07)
- [F-08 · "La reintentaremos automáticamente" no cubre el rebote de renovación](#f-08)
- [F-09 · El abono por cambio de plan no se anuncia en ningún momento](#f-09)
- [F-10 · Los 409 nuevos de cambio de plan llegan al toast en inglés](#f-10)
- [F-11 · Un 409 al aceptar propuesta cierra el modal igual que un éxito](#f-11)
- [No tocar](#no-tocar)

---

## F-01 · El sondeo agotado no dice que dejó de mirar {#f-01}

**Severidad: menor.**

**Qué pasa hoy.** `ContratarExitoView.vue:63-90` sondea `GET
/payment-gateway/wompi/first-period-payment` cada `INTERVALO_MS` (2 s) hasta `DURACION_MAX_MS`
(20 s). Si el estado sigue `PENDING` al agotar el plazo, el bucle `while` de `sondear()` simplemente
termina — no hay ninguna rama que lo diga. El texto que quedó pintado (`mensajePago`,
`ContratarExitoView.vue:134-141`) sigue siendo *"Estamos confirmando el pago con tu banco; te
avisaremos."*, indistinguible de cuando el sondeo seguía activo.

**Por qué importa.** El cliente no tiene forma de saber si la pantalla lo sigue vigilando o si ya
lo abandonó. Un usuario que se queda mirando la pantalla 21 segundos cree que sigue en curso algo
que ya se detuvo.

**Corrección.** Añadir un `ref` `agotado` que se marque a `true` cuando el bucle termine por tiempo
(no por resolución), y una frase adicional bajo el banner cuando `agotado && estadoPago ===
'PENDING'`: *"Puedes seguir usando tu cuenta mientras tanto. Revisa el estado en Mis cuentas de
cobro cuando quieras."*, con enlace a `{ name: 'suscripcion-cobros' }`.

**Agente:** `front-feature`. **Verificación:** un test unitario que congele el reloj, deje la
respuesta en `PENDING` en cada tick y compruebe que tras `DURACION_MAX_MS` el nuevo texto aparece
(`tests/unit/contratar-exito-sondeo.spec.ts`, ya existe y cubre este flujo).

---

## F-02 · Reintentar el primer cobro con otra tarjeta es un salto al vacío {#f-02}

**Severidad: grave.**

**Qué pasa hoy.** Tras un `DECLINED`, `ContratarExitoView.vue:176-179` enlaza a
`suscripcion-medios-pago` para que el cliente actualice su tarjeta. Una vez ahí
(`MediosPagoView.vue`), añadir o marcar predeterminada una tarjeta nueva **no dispara ningún
reintento del cobro del primer periodo**: ese reintento depende del ciclo recurrente
(`RunPaymentCollectionService.java`, backend) y de si el documento entra en su ventana de
reintento, algo que el cliente no ve ni controla.

**Por qué importa.** El cliente hace lo que la pantalla le pidió (cambiar la tarjeta) y no tiene
ninguna confirmación de que eso sirvió de algo, ni una fecha de cuándo se volverá a intentar.

**Corrección.** Depende de un dato que hoy el backend no expone (`nextAttemptAt` del documento del
primer periodo, análogo al que ya existe para `payment_attempts` de plataforma). Mientras no
exista, `MediosPagoView.vue` debería, tras guardar una tarjeta nueva cuando hay un cobro pendiente
o rechazado, mostrar una frase explícita en vez de solo el toast de "Tarjeta añadida": *"La
reintentaremos automáticamente; no hace falta que hagas nada más."* — es honesto con lo que el
sistema realmente hace hoy (reintento por barrido, no inmediato) sin prometer un botón que no
existe.

**Agente:** `backend-feature` (`VetSoftware`, exponer la fecha del próximo intento del primer
periodo) primero; `front-feature` (`VetSoftwarePublicFront`, mostrarla) después.

---

## F-03 · La referencia se pierde en cuanto se sale de la pantalla de éxito {#f-03}

**Severidad: grave.**

**Qué pasa hoy.** `resultadoContratacion.store.ts:13-17` es deliberadamente efímero — documenta
por qué no se persiste, y la razón es correcta (no repetir una activación vieja). El problema es
que el `cotizacionNumero` que se muestra en `ContratarExitoView.vue:205-207` es la **única**
referencia legible que el cliente ve en todo el flujo: `cobros.types.ts:117-120` oculta a propósito
`gatewayReference` en `SubscriptionPaymentResponse` (correcto, es una clave compartida entre
clínicas) y `BillingDocumentResponse` no lleva ningún campo que enlace de vuelta a la cotización
que lo originó.

**Por qué importa.** Un cliente que llama a soporte al día siguiente no tiene ningún número que dar
salvo el ID de la cuenta de cobro, que tampoco es el mismo que vio al contratar.

**Corrección.** `CuentaCobroDetalleView.vue` (`suscripcion/views/CuentaCobroDetalleView.vue`)
debería mostrar el número de cotización de origen cuando `document.billingReason` indica que nació
de una contratación (`RECURRING_CYCLE`/primer periodo). Requiere que el contrato lo exponga primero.

**Agente:** `api-contract-sync` (comprobar si `BillingDocumentResponse` puede llevar la referencia
de la cotización que lo generó) → `backend-feature` si falta el dato → `front-feature` para
pintarlo.

---

## F-04 · El rebote de una renovación es invisible fuera de "Mi suscripción" {#f-04}

**Severidad: grave.**

**Qué pasa hoy.** `SuscripcionEstadoBanner.vue` está bien construido — `role="status"`, contenedor
siempre montado, tono correcto, vocabulario sin amenazas — pero **solo se monta dentro de
`SuscripcionLayout.vue`** (grep confirmado sobre todo `src/`: cero referencias en `HomeView.vue` ni
en el armazón `AppLayout`). Un rebote de renovación (`DECLINED` recurrente) no dispara ningún correo
todavía (issue #749) y tampoco aparece en ninguna pantalla que la auxiliar visite en su día a día.

**Por qué importa.** La persona de esta app —auxiliar o veterinario con prisa, con el animal
delante— no navega a "Mi suscripción" por curiosidad. El único momento en que se entera de un
problema de cobro es cuando alguien de la clínica revisa esa sección por otro motivo, o cuando la
cuenta ya pasó a `READ_ONLY`.

**Corrección.** Promover una versión resumida de `estadoPlan()` (mismo composable
`estadoSuscripcion.ts`, sin duplicar el vocabulario) al armazón de la app, visible en todas las
pantallas cuando `tono !== 'none'`. No repetir el banner completo — una línea con el `fuerte` y un
enlace a "Ver mi plan" basta; el detalle completo se queda donde ya vive.

**Agente:** `front-feature`. Cuidado con el techo de 500 líneas del SFC del armazón si existe —
extraer un componente pequeño (`SuscripcionAvisoGlobal.vue`) que reutilice `estadoPlan()` y
`SuscripcionEstadoBanner`'s clases de tono, no reimplemente el vocabulario.

---

## F-05 · "Pagar" no tiene el mismo aviso de espera larga que "Confirmar" {#f-05}

**Severidad: menor.**

**Qué pasa hoy.** El paso 1 (pedir la oferta) tiene `tardando` + `UMBRAL_LARGO_MS = 10_000`
(`usePasoContratar.ts:165-166`, pintado en `ContratarView.vue:403`). El paso 2 (`accept`, que en el
servidor puede incluir un sondeo síncrono contra Wompi — `GatewayCharger.pollUntilFinal`, varios
segundos reales) no tiene ningún equivalente: `MedioDePagoWompi.vue:137-140` solo cambia el texto
del botón a "Confirmando pago…", fijo, sin importar cuánto tarde.

**Por qué importa.** Es precisamente el paso que puede tardar más (hay I/O real contra una
pasarela externa con reintentos de sondeo), y es el único de los dos sin el aviso que ya existe en
el repo para este caso.

**Corrección.** Replicar el patrón `tardando`/`UMBRAL_LARGO_MS` en `usePasoContratar.confirmarPago`
(mismo composable, ya tiene el `setTimeout` como referencia en `enviar()`), y pintarlo en
`MedioDePagoWompi.vue` igual que `ContratarView.vue:403` lo hace para el paso 1.

**Agente:** `front-feature`.

---

## F-06 · La moneda del cobro real nunca se compara contra la asumida {#f-06}

**Severidad: nota.**

**Qué pasa hoy.** `FirstPeriodPaymentResponse.currency` (`pago.types.ts:38-44`) llega del backend
en cada sondeo, pero `ContratarExitoView.vue` nunca la lee: todos los importes se formatean con
`formatMoney()` (`composables/money.ts:28-40`), que fuerza `Intl.NumberFormat('es-CO',
{currency:'COP'})` sin mirar el campo real.

**Por qué importa hoy poco, y por qué merece quedar escrito.** La plataforma es Colombia-only hoy
(ver memoria de geografía del proyecto), así que el riesgo práctico es bajo. Pero es un campo del
contrato que el front pide, recibe y descarta — el día que exista una segunda moneda, el síntoma
será un importe mal rotulado y nadie recordará por qué.

**Corrección.** En `sondear()` (`ContratarExitoView.vue:68-90`), si `respuesta.currency` existe y
difiere de `'COP'`, no asumir `formatMoney`: usar el símbolo de moneda genérico o avisar. No es
urgente implementarlo; sí es urgente que quede como nota de este documento para no repetir la
pregunta.

**Agente:** `front-feature`, baja prioridad.

---

## F-07 · El fix de F-04 no sobrevive ni al skip link ni a su propio patrón hermano {#f-07}

**Severidad: grave.** Origen: auditoría de ronda 2, 2026-09-06, sobre el código nuevo de la rama
`feature/cierre-contratacion-idempotente` (`SuscripcionAvisoGlobal.vue`, que implementa el F-04
de este mismo documento).

**Qué pasa hoy.** Dos defectos independientes, cada uno suficiente por sí solo:

1. **Posición fuera de `<main>`.** `AppLayout.vue:26-33` monta `<SuscripcionAvisoGlobal />` como
   hermano de `<main id="contenido">`, no dentro. El enlace "Saltar al contenido"
   (`AppLayout.vue:26`, el propio arreglo de §2.4.1 que el comentario de las líneas 13-25
   documenta para 45+ rutas) salta directo a `#contenido` y deja el aviso atrás. Quien usa ese
   atajo —el perfil exacto que el enlace fue pensado para servir— nunca lo ve.
2. **El nodo `role="status"` nace y muere con `v-if`.** `SuscripcionAvisoGlobal.vue:26` pone
   `v-if="visible && estado"` en el `<div>` raíz. Su propio componente hermano,
   `SuscripcionEstadoBanner.vue:53`, mantiene el contenedor SIEMPRE montado y solo conmuta el
   contenido — y el JSDoc de ese hermano (líneas 17-19) explica por qué: *"Si el nodo con
   `role="status"` naciera a la vez que su contenido, muchos lectores no anunciarían nada."* El
   componente nuevo repite el error que el viejo documentó como advertencia.

**Por qué importa.** Es la misma jornada que motivó F-04 —auxiliar con prisa, rebote de
renovación de días atrás, entra un martes cualquiera— y las dos rutas por las que debería
enterarse (el atajo de teclado, el anuncio del lector de pantalla) están cortadas.

**Corrección.**
- Mover `<SuscripcionAvisoGlobal />` dentro de `<main id="contenido">`, primer hijo, antes de
  `<RouterView />`; o mover el `id="contenido"` al contenedor que envuelve a los dos.
- Cambiar el `v-if` del nodo raíz por un contenedor permanente con `role="status"`, igual que
  `SuscripcionEstadoBanner.vue`.

**Agente:** `front-feature`. **Verificación:** `tests/unit/suscripcion-aviso-global.spec.ts`
(ya existe) debe comprobar que el nodo con `role="status"` está en el DOM incluso con
`visible === false`; un ARIA snapshot de Playwright que confirme que "Saltar al contenido" no dej
a el aviso atrás cuando `tono !== 'none'`.

---

## F-08 · "La reintentaremos automáticamente" no cubre el rebote de renovación {#f-08}

**Severidad: grave.**

**Qué pasa hoy.** `MediosPagoView.vue:51-53` calcula `avisoReintento` a partir de
`resultadoStore.resultado?.pago?.status === 'DECLINED'`, y ese store
(`resultadoContratacion.store.ts`) es deliberadamente efímero (ver F-03): solo vive durante la
sesión de una contratación o cambio de plan recién completado. Para el rebote de una renovación
—que ocurre días o semanas después, en una sesión nueva— el store está vacío y el aviso de F-02
nunca aparece, precisamente en el caso que más pesa en el negocio (las renovaciones son mucho más
frecuentes que el primer cobro).

**Por qué importa.** El cliente cambia la tarjeta tras un rebote de renovación exactamente como
la app le pidió (ver `SuscripcionAvisoGlobal`/F-07 una vez arreglado) y no recibe ninguna
confirmación de que eso sirvió de algo — el mismo problema que F-02 quería resolver, sin resolver
para el caso real.

**Corrección.** El gate de `avisoReintento` no debería depender del store efímero de la última
contratación. Usar `useSuscripcion().estado.tono !== 'none'` (ya calculado, ya reactivo) como
condición adicional o sustituta, de modo que guardar una tarjeta con un problema de cobro vigente
—sea cual sea su origen— muestre el aviso.

**Agente:** `front-feature`.

---

## F-09 · El abono por cambio de plan no se anuncia en ningún momento {#f-09}

**Severidad: menor.**

**Qué pasa hoy.** El abono por el tramo no consumido al cambiar de plan
(`ReplaceSubscriptionFromQuoteService.java:283-317` en el backend, correcto y bien razonado) se
puede consultar en `CuentasCobroView.vue:96` ("Saldo a favor"), pero el toast de éxito de
`useCotizaciones.ts:52` ("Tu plan se actualiza con las líneas de la propuesta") no dice que se
generó un abono. Sin `customerCredit.read`, además, la tarjeta entera queda oculta
(`CuentasCobroView.vue:95`) y la clínica no puede verlo ni yendo a buscarlo.

**Por qué importa.** Es dinero real a favor de la clínica que nadie le avisa que tiene, salvo que
sepa navegar a una pantalla concreta y tenga el permiso correcto.

**Corrección.** Si `accept()` puede saber que hubo abono (requiere que el backend lo devuelva en
la respuesta, hoy no lo hace), añadir una frase al toast de éxito. Mientras tanto, documentar la
pregunta abierta: ¿el abono es dato del rol financiero solo, o de cualquiera que gestione la
suscripción? Sin esa decisión no se propone tocar el permiso.

**Agente:** `api-contract-sync` (¿puede `AcceptQuoteResponse` llevar el hecho de que se generó
abono?) → `backend-feature` si falta → `front-feature` para el toast.

---

## F-10 · Los 409 nuevos de cambio de plan llegan al toast en inglés {#f-10}

**Severidad: grave — hallazgo de contrato con precedente en el propio fichero.**

**Qué pasa hoy.** `SubscriptionHasPendingGatewayPaymentException.java:11` y
`QuoteAlreadyConvertedException.java:39` construyen su mensaje en inglés y con IDs internos
(`"Subscription 42 has a pending gateway payment in flight"`, `"Quote already has a subscription:
42"`). `GlobalExceptionHandler.problem(status, code, ex.getMessage())` los usa tal cual como
`detail`, y `getProblemDetailMessage()` los muestra literales. `usePasoContratar.ts:505-517` sí
trata el segundo código como éxito silencioso, pero solo para la contratación INICIAL; el camino
de cambio de plan (`useCotizaciones.store.ts:57-59`) no tiene ese tratamiento y expone el mensaje
crudo en el toast de `useCotizaciones.ts:54-57`.

**Por qué importa.** Rompe la única regla de vocabulario que la ronda 1 dio por buena de forma
universal (UX-21): esta app es 100% en español y aquí no lo es. Ocurre justo en el escenario
"dos administradoras aceptan la cotización a la vez" que el propio javadoc de
`QuoteAlreadyConvertedException` dice que existe para que el cliente NO vea un error que no
entiende — y aun así lo ve, en otro idioma.

**Corrección.** `backend-feature`: redactar el `detail` de los dos handlers en español, sin IDs
crudos, siguiendo el patrón que el propio fichero ya usa bien (`STRUCTURAL_MINIMUM_NOT_CARRIED`,
`PAYMENT_SOURCE_RATE_LIMIT_EXCEEDED`). `front-feature`: añadir a `useCotizaciones.store.ts` el
mismo tratamiento de `QUOTE_ALREADY_CONVERTED` que ya existe en `usePasoContratar.ts`.

**Agente:** `backend-feature` → `front-feature`.

---

## F-11 · Un 409 al aceptar propuesta cierra el modal igual que un éxito {#f-11}

**Severidad: grave.**

**Qué pasa hoy.** `CotizacionDetalleView.vue:71-75` (`onAceptar`) pone
`aceptarAbierto.value = false` **incondicionalmente**, fuera del `if (ok) devolverFoco()`. Con un
409 como los de F-10, `aceptar()` devuelve `false` pero el modal se cierra igual que si hubiera
tenido éxito — el usuario pierde el contexto del formulario justo cuando el toast de error es lo
único que le queda para entender qué pasó.

**Por qué importa.** WCAG 2.2 §2.4.3 (Focus Order): cerrar el diálogo sin que el usuario lo pida
tras un fallo deja el foco en un lugar impredecible y borra la evidencia visual del intento
fallido.

**Corrección.** Cerrar el modal solo si `ok === true`; si es `false`, mantenerlo abierto para que
el usuario vea el error dentro de su contexto (el toast ya lo anuncia, pero el modal debería
seguir reflejando el intento).

**Agente:** `front-feature`.

---

## No tocar {#no-tocar}

Verificado y correcto — no lo "mejores" sin motivo nuevo:

- `ContratarExitoView.vue` sondeando de verdad en vez de asumir éxito (§UX-01 del informe).
- `ConfirmarBloqueadoNotice.vue` y su vocabulario sin "bloquear/suspender/cortar".
- `clientRequestId` en `POST /quotes/self-serve` y el botón deshabilitado en los dos pasos de pago.
- `avisoVencimiento` en `MedioPagoCard.vue`, que avisa de una tarjeta por vencer ANTES del cobro
  fallido, calculado contra `nextBillingDate` y no contra hoy.
- `BaseField` cableando `aria-describedby` automáticamente — el formulario de tarjeta ya cumple
  WCAG 2.2 §3.3.1 en ese punto.
