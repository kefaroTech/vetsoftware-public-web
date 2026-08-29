# Pagos y suscripciones — revisión con ojos nuevos

> **Qué es esto.** Una revisión de segundo par de ojos sobre lo que ya existe en `src/`, no un
> rediseño. Las dos especificaciones de origen —`suscripcion-tenant-especificacion.md` y
> `landing-comercial-y-contratacion.md`— siguen siendo la referencia; esto solo señala **dónde la
> implementación se separó de ellas sin declararlo**, dónde **las dos mitades no encajan entre sí**,
> y dónde **el tono se acerca peligrosamente al de la consola**.
>
> **Frontera.** Quien escribe esto no toca `src/` ni `e2e/`. Cada mejora lleva su dueño:
> `front-feature` salvo indicación expresa. Ninguna necesita una primitiva nueva de `primitives.css`,
> así que **no hay nada para `front-parity`** en toda esta lista salvo el punto §5.3, que es opcional.
>
> **Fecha de verificación:** 2026-08-28, contra el árbol de trabajo.
> **Medido de verdad:** `npm run css:budget` → verde (367 SFC, distancia style−script **−3132** con
> techo 0, 0 cuerpos repetidos, 0 SFC de más de 500 líneas) y `npx stylelint` sobre los tres features
> nuevos → **0 problemas**. Lo demás se decidió leyendo, con `fichero:línea`.
> **No ejecutado:** `npm run quality`, `vue-tsc`, Vitest, Playwright, `ds:audit`, dev server. No se
> midió contraste sobre render real ni se abrió el árbol de accesibilidad en un navegador.

---

## 0 · Veredicto en una página

**El trabajo es bueno y está por encima de la media del repositorio.** Las decisiones difíciles están
tomadas y bien: el `<progress>` nativo de `MedidorCupo`, la rama explícita de `capacitiesLegibles`, el
`role="status"` en contenedor persistente, el hueco honesto del alta de medio de pago, la traducción
completa de los enums de cobranza, la tabla de prueba por línea, el `PriceDriftNotice` que desmarca la
casilla. Nada de eso hay que tocarlo.

Lo que falla es de otra clase, y es exactamente lo que se esperaba de dos agentes en paralelo:

1. **Una frase con el orden invertido** en el estado que más importa (mora). Cuesta cuatro líneas.
2. **Dos superficies que no se conocen.** La contratación cree que «no existe ningún endpoint de
   suscripción en el tenant» —lo dice por escrito— mientras la feature de suscripción existe y lo
   consume. El salto de la landing al producto se queda a medias por eso.
3. **Tres controles que llevan a un portazo mudo**, todos por el mismo motivo: el guard del router
   devuelve al tablero sin decir nada.
4. **Una promesa que la pantalla hace y no puede cumplir** que nadie había marcado: la descarga.

**¿Están listas para un cliente real?** Las cinco pantallas de «Mi suscripción», sí, con los puntos
§1.1–§1.4 arreglados. **El paso 6 de contratación, no**, y no por calidad de interfaz: porque enlaza a
unos Términos que no existen y en Colombia eso es la Ley 1581 de 2012, no una preferencia (§4.4).

---

## 1 · Barato y de alto valor

Todo esto se arregla sin backend, sin primitiva nueva y sin mover ninguna estructura.

### 1.1 · En mora, el mensaje empieza por la deuda y la negrita es la amenaza

**Bloqueante de tono.** Es el punto que el dueño puso por escrito y el único donde la implementación
falla contra él.

**Qué se lee hoy**, con `PAST_DUE` y cortesía viva:

> **Pago pendiente.** Tienes un saldo pendiente desde el 3 ago 2026. Sigues trabajando con
> normalidad. Te quedan 5 días de cortesía.

`estadoSuscripcion.ts:152-157` (y sus gemelos `:134-142`, `:144-150`) construyen la frase con la deuda
delante; `SuscripcionEstadoBanner.vue:63` pone en `<strong>` el rótulo —«Pago pendiente»—, así que **lo
único destacado visualmente es la amenaza**. La tranquilidad llega en tercera posición y en peso
normal.

**Y la propia especificación se contradice.** Su §8.1 dice literalmente: *«Lo que la clínica necesita
saber, en este orden: **(1) sigue trabajando con normalidad**, (2) desde cuándo debe… El punto (1) va
primero porque es el que quita el pánico»*. Su §6.1, en cambio, transcribe la frase con la deuda
delante y marca en negrita `**Sigues trabajando con normalidad.**`. La implementación copió §6.1 y
perdió las dos cosas: el orden **y** la negrita.

**Criterio:** NN/g H1 (visibilidad del estado del sistema) + el criterio de producto del dueño: *«el
modelo garantiza que nunca hay corte total»*. No es WCAG; es peor, es la llamada a soporte que se
evita o no se evita.

**Arreglo.** En `estadoSuscripcion.ts`, partir `EstadoPlan.frase` en dos campos —o exponer un
`fraseFuerte` como ya hacen `AvisoCupo` y `AvisoMedioPago`, que **ya tienen `fuerte`/`resto`**— y
reordenar. Textos exactos, para copiar:

| Caso | `fuerte` (va en `<strong>`) | `resto` |
|---|---|---|
| `PAST_DUE`, cortesía viva | `Sigues trabajando con normalidad.` | `Tienes un saldo pendiente desde el {pastDueSince} y te quedan {n} de cortesía.` |
| `PAST_DUE`, sin cortesía | `Sigues trabajando con normalidad.` | `Tienes un saldo pendiente desde el {pastDueSince} y se agotaron los días de cortesía. Conviene ponerse al día ya.` |
| `PAST_DUE`, sin fechas | `Sigues trabajando con normalidad.` | `Tienes un saldo pendiente.` |

El rótulo «Pago pendiente» **no desaparece**: sigue siendo `estado.rotulo` y alimenta la píldora de la
ficha de plan (`MiPlanView.vue:177`). Lo que cambia es que deja de ser lo primero y lo único en
negrita del banner. `READ_ONLY` (`:189-190`) ya está bien —empieza por lo que conservas— y es la
prueba de que el patrón correcto ya vive en el fichero: solo hay que aplicarlo al vecino.

**Coste:** ~15 líneas en un módulo puro + el `<strong>` de `SuscripcionEstadoBanner.vue:63` pasa a
`estado.fuerte`. La prueba unitaria que ya barre el vocabulario prohibido gana una aserción: **la
primera frase de todo estado `PAST_DUE` contiene «Sigues trabajando»**.

---

### 1.2 · El menú promete lo que el guard niega, y el portazo es mudo

**Bloqueante.** Y no es teórico: la migración 377 es la razón de que exista `accesoBloqueado.ts`.

**La cadena, verificada:**

- `useSidebarNav.ts:61-66` — la entrada «Mi suscripción» aparece con **cualquiera** de cuatro
  permisos. Correcto y bien razonado.
- `router/index.ts:392-394` — la ruta padre `suscripcion` exige **`subscription.read`**.
- `router/index.ts:555-558` — `if (required && !permissions.includes(required)) return
  redirect({ name: 'home' })`.

**Consecuencia:** una empresa cuyo ADMIN tiene `subscriptionBilling.read` pero no `subscription.read`
—el escenario exacto que la 377 documenta— **ve la entrada del menú, la pulsa y aterriza en el tablero
sin una sola palabra**. El bloque interior degrada con su hueco honesto (`SIN_PERMISO`), pero nunca
llega a pintarse porque el guard rebota antes.

Lo mismo, un nivel más abajo: `SuscripcionLayout.vue:34-50` pinta **los cinco enlaces siempre**. Con
`subscription.read` pero sin `entitlement.read`, «Cupos y consumo» es un enlace que devuelve al
tablero en silencio. Y otra vez en `SiguientesPasos.vue:17-36`, cuyas tres tarjetas van a `empleados`,
`agenda` y `caja` sin comprobar `EMPLOYEE_READ` / `APPOINTMENT_READ` / `CASHREGISTER_READ`.

**Criterio:** NN/g H1 y H9 (ayudar a reconocer y recuperarse). WCAG **§3.2.4 Consistent
Identification** de refilón, pero sobre todo `docs/ux/estado-solo-lectura.md` §2: un control que no
hace lo que dice es peor que su ausencia.

**Arreglo, en tres piezas, la primera obligatoria:**

1. **`SuscripcionLayout.vue`** — la tira se construye desde una lista con su permiso y se filtra:

   ```ts
   const SECCIONES = [
     { name: 'suscripcion-plan',         label: 'Mi plan',             permiso: PERMISSIONS.SUBSCRIPTION_READ },
     { name: 'suscripcion-cupos',        label: 'Cupos y consumo',     permiso: PERMISSIONS.ENTITLEMENT_READ },
     { name: 'suscripcion-cobros',       label: 'Mis cuentas de cobro',permiso: PERMISSIONS.SUBSCRIPTION_BILLING_READ },
     { name: 'suscripcion-medios-pago',  label: 'Medios de pago',      permiso: PERMISSIONS.SUBSCRIPTION_PAYMENT_METHOD_READ },
     { name: 'suscripcion-cotizaciones', label: 'Cotizaciones',        permiso: PERMISSIONS.QUOTE_READ },
   ] as const
   ```

   Se pinta solo lo que `useAuthorization().can(permiso)` autoriza. Si queda **una sola** sección, la
   tira no se pinta (una navegación de un elemento es ruido).

2. **`router/index.ts:392-394`** — el padre `suscripcion` pasa de `meta.permission:
   SUBSCRIPTION_READ` a **`meta.permissionsAny`** con los mismos cuatro de `useSidebarNav.ts:61-66`
   (el guard ya sabe leer `permissionsAny`, `:559-561`), y la hija `plan` recupera su
   `meta.permission: SUBSCRIPTION_READ` propia, que hoy hereda del padre. Así el menú y el guard
   dicen lo mismo, que es el defecto de fondo.

3. **El redirect deja de ser mudo.** Antes del `redirect({ name: 'home' })` de `:555-558`, un
   `useToast().warn()` con el texto que ya existe y está bien escrito:
   `'Tu rol no incluye ver esta pantalla'` / `'Pídeselo a quien administre los permisos de tu
   clínica.'` — es `SIN_PERMISO` de `accesoBloqueado.ts:31`, partido en título y cuerpo. **Es un
   cambio transversal de dos líneas que arregla las 30 pantallas del repositorio**, no solo estas.

**Coste:** 1 es media hora; 2 es una línea y media; 3 es el mejor cambio por línea de toda esta lista.
`SiguientesPasos.vue` se resuelve igual que 1, con `can()` sobre cada tarjeta.

---

### 1.3 · «Mi plan» ofrece tres escrituras que el estado del plan acaba de prohibir

**Grave.** Contradicción visible dentro de una misma pantalla.

`MiPlanView.vue:226-239` pinta **«Cambiar cantidad»** y **«Quitar»** en cada línea, y `:265-269` pinta
**«Pedir la baja de mi plan»**, todo dentro de `v-else-if="subscription"` y **sin ninguna condición
más**. Resultado, en los cuatro estados no felices:

| Estado del plan | Lo que dice el banner arriba | Lo que ofrece la pantalla debajo |
|---|---|---|
| `READ_ONLY` | «Por ahora **no puedes crear ni modificar**» | Cambiar cantidad · Quitar · Pedir la baja |
| Baja ya pedida (`cancelRequestedAt`) | «Pediste la baja el X» (ficha «Baja registrada», `:215-217`) | **Pedir la baja de mi plan**, otra vez |
| `CANCELLED` | «Tu plan quedó cancelado el X» | Las tres |
| `EXPIRED` | «Tu plan terminó el X y no se renovó» | Las tres |

El caso de la baja duplicada es el más caro: una auxiliar que no está segura de si la petición se
registró vuelve, ve el mismo botón, lo pulsa, y el `PATCH /cancel` viaja por segunda vez con un
`clientRequestId` **nuevo** (`MiPlanView.vue:59-61` genera uno por invocación). La llave de
idempotencia no protege de nada aquí.

**Criterio:** WCAG 2.2 **§3.3.4 Error Prevention (AA)** en su parte de *reversible/confirmed* —la
confirmación existe pero llega tarde—, NN/g H1, y `docs/ux/estado-solo-lectura.md` §1: en solo lectura
se **retira el control**, no se deja para que el servidor lo rechace.

**Arreglo:**

- Un `computed` en `MiPlanView.vue`, junto a `totalPlan`:
  ```ts
  /** Escrituras del plan: solo con el plan vivo, sin baja pedida y fuera de solo consulta. */
  const puedeModificarPlan = computed(() => {
    const s = subscription.value
    if (!s) return false
    if (s.status === 'READ_ONLY' || s.status === 'CANCELLED' || s.status === 'EXPIRED') return false
    return true
  })
  const puedePedirBaja = computed(() => puedeModificarPlan.value && !baja.value)
  ```
- Los dos botones de línea van bajo `v-if="puedeModificarPlan"`; el de baja, bajo
  `v-if="puedePedirBaja"`.
- **No se pintan deshabilitados**: un control apagado sin explicación es el defecto que
  `estado-solo-lectura.md` §2 documenta entero. Cuando `puedeModificarPlan` es falso, en su lugar va
  **una línea de texto que ya existe**, porque el banner del layout ya la está diciendo. Basta con no
  pintar nada: la explicación está tres bloques más arriba y es la razón de que ese banner exista.
- La única excepción: con **baja pedida y plan aún vivo**, bajo la ficha «Baja registrada» va
  `Pediste la baja el {fecha}. Si cambiaste de opinión, escríbenos.` + `Escríbenos`
  (`mailto:soporte@vetsoftware.co`) — no hay endpoint para deshacerla, y decirlo es mejor que callarlo.

**Coste:** dos `computed` y tres `v-if`. Media hora.

---

### 1.4 · La pantalla promete una descarga que no existe

**Grave.** Es la tercera promesa incumplida del lote, y **nadie la había marcado**.

`cobrosText.ts:28`, `CABECERA_SOLO_LECTURA`, pintado como banner permanente en
`CuentasCobroView.vue:88`:

> *«Las cuentas de cobro las emite VetSoftware. Aquí las consultas **y las descargas**; no se
> registran pagos desde esta pantalla.»*

Verificado: **cero ocurrencias** de `descarg|download|.pdf` en todo `src/features/suscripcion`. No hay
botón de descarga en el listado, ni en la ficha, ni un enlace al PDF fiscal. La única cosa parecida a
un documento que se enseña es el `externalCufe` en texto (`CuentaCobroDetalleView.vue:105-108`).

El daño concreto: una clínica que necesita su factura para la contabilidad lee esa frase, busca el
botón durante cinco minutos y llama a soporte. Es **exactamente el fallo que esa misma frase existía
para evitar** —era la aclaración que impide buscar el botón de «pagar»— y lo comete ella misma con
otro verbo.

**Criterio:** NN/g H1 y H2 (correspondencia entre el sistema y el mundo real). No es WCAG.

**Arreglo, dos líneas:**

```ts
export const CABECERA_SOLO_LECTURA =
  'Las cuentas de cobro las emite VetSoftware. Aquí puedes consultarlas; no se registran pagos ' +
  'desde esta pantalla. Si necesitas el PDF de tu factura, escríbenos.'
```

Y en `CuentasCobroView.vue:88`, junto al texto, un `<a class="ds-btn ds-btn--neutral ds-btn--snug"
href="mailto:soporte@vetsoftware.co">Escríbenos</a>`. Es el mismo patrón honesto que ya usan
`MediosPagoView.vue:119-122` y `CotizacionesView.vue:61-69`: **el repositorio ya sabe hacerlo, aquí
solo se olvidó**.

Cuando exista la descarga (§3, backend), la frase vuelve a decir «y las descargas» y el enlace se
convierte en un botón por fila.

---

### 1.5 · El paso vinculante dice tres cosas incompatibles a la vez

**Grave.** Es la costura más visible entre los dos agentes, y está en la pantalla que decide una
compra.

Orden de lectura real de `/dashboard/contratar` (`ContratarView.vue:271-275`):

1. `ContratarResumenTabla.vue:80-85` → **«Total del primer mes: $105.910»** en negrita.
2. `TrialLinesTable.vue:45-53` → **«Todo tu plan es gratis hasta el 27 de septiembre de 2026.»**
3. `DemoModeNotice.vue:51` → **«Modo demostración: no vamos a cobrarte nada.»**

Las tres son ciertas desde algún punto de vista y **ninguna dice desde cuál**. Una auxiliar con prisa
lee el importe grande, lee «gratis», lee «no vamos a cobrarte» y no sabe cuál manda. El rótulo «Total
del primer mes» es el peor de los tres, porque es literalmente falso: el primer mes es gratis.

**Criterio:** WCAG 2.2 **§3.3.4 Error Prevention (Legal, Financial, Data) (AA)** — la vía «Confirmed»
exige *revisar* la información antes de enviar, y una información que se contradice no es revisable.
NN/g, errores de formulario: nunca dos verdades sin jerarquía.

**Arreglo, sin mover una sola estructura:**

1. **Rótulo del total** — `ContratarResumenTabla.vue:82`:
   ```
   ANUAL:   'Lo que se cobrará al año, cuando termine la prueba'
   MENSUAL: 'Lo que se cobrará al mes, cuando termine la prueba'
   ```
   (hoy: `'Total del primer año'` / `'Total del primer mes'`).

2. **Una línea de cierre bajo la tabla de importes**, en `.ds-meta`, con el dato que resuelve la
   duda —la fecha ya está calculada en `ContratarExitoView.vue:37-40` como `primerCobro`, así que se
   sube a `contratacion.source.ts` y se reutiliza:
   > `Hoy no pagas nada. El primer cobro sería el {primerCobro}.`

3. **Orden del DOM**: `TrialLinesTable` **antes** que `ContratarResumenTabla`. Primero cuánto es
   gratis y hasta cuándo; después cuánto costará cuando deje de serlo. Es un intercambio de dos
   líneas en `ContratarView.vue:271-273`.

**Coste:** tres cambios de texto y un intercambio de orden. Una hora, y es probablemente el punto que
más conversión mueve de toda la lista.

---

### 1.6 · «Incluido en tu plan» dice gratis donde quiere decir facturado

**Grave**, y es hijo del anterior.

`TrialLinesTable.vue:71-74`: la columna **«Después»** imprime `Incluido en tu plan` siempre que
`precioDespues == null` — y `contratacion.source.ts:71-83` lo pone a `null` **en todas las líneas, sin
excepción**, con un comentario que lo justifica bien (no hay precio por módulo en ninguna fuente).

El problema no es el `null`: es la frase elegida. La cabecera de la columna dice «Después» —después de
la prueba— y la celda responde «Incluido en tu plan», que en castellano comercial significa **«no lo
pagas»**. La tabla entera queda leyéndose como *«Agenda gratis hasta el 27 de septiembre; después,
incluido»*, es decir, gratis para siempre. Es la sorpresa que la §6 de la especificación de la landing
declara como el fallo más caro posible: *«rompe la confianza de una cuenta recién creada»*.

**Arreglo:** una palabra.

```
<span v-if="l.precioDespues == null">Entra en el precio de tu plan</span>
```

Y la cabecera de columna pasa de `Después` a **`Cuando termine la prueba`**, que es lo que responde.
Nada más cambia: el día que exista `default_trial_days` con precio por artículo (§3), la rama del
`v-else` ya está escrita.

---

### 1.7 · El pie de la landing tiene dos palabras muertas y la honestidad vive en un comentario

**Menor**, pero es literalmente uno de los dos puntos que el dueño puso a comprobar.

`LandingFooter.vue:26-27` pinta `<span class="land-footer-soon">Privacidad</span>` y `<span
…>Términos</span>`. La decisión es **correcta y está bien argumentada** en el comentario de
`:5-14`: un enlace muerto falla §2.4.4 y enseña a no pulsar. Pero el usuario no lee comentarios. Lo
que ve son dos palabras en gris, con el mismo aspecto que un enlace roto, y **cero explicación**.

Lo mismo, mejor resuelto, en `ContratarView.vue:302-317`: ahí sí hay una frase visible («Todavía no
están publicadas en la web: pídenoslas en soporte@…»). El pie de la landing es el que se quedó sin
ella.

**Arreglo:** que sean destinos reales, que es más honesto que el texto inerte y además cierra §2.4.4
de verdad:

```html
<a href="mailto:soporte@vetsoftware.co?subject=Pol%C3%ADtica%20de%20privacidad">Privacidad</a>
<a href="mailto:soporte@vetsoftware.co?subject=T%C3%A9rminos%20del%20servicio">Términos</a>
```

Con una línea encima, en el mismo pie: `Te las enviamos por correo mientras se publican en la web.`
El día que existan las páginas, se cambian los dos `href` y se borra la línea.

---

### 1.8 · La casilla de términos: error prematuro y sin error en línea

**Menor de accesibilidad, molesto en uso.**

`ContratarView.vue:293-305`. Dos cosas:

1. **`@blur="terminosTocado = true"`.** Tabular *a través* de una casilla que todavía no has decidido
   marcar es suficiente para que salte «Tienes que aceptar los Términos para continuar». En un campo
   de texto, `@blur` significa «terminaste de escribir»; en una casilla no significa nada. **Es
   validación prematura**, que la convención del repositorio prohíbe por escrito (`CLAUDE.md`,
   §Convención de validación) y NN/g también. **Arreglo: quitar el `@blur`.** El `submit`
   (`:177`) ya marca `terminosTocado` y es el único momento en que ese error es información.

2. **El error solo existe en el `ErrorSummary`** (`:277`). El control lleva `aria-invalid`
   (`:298`) pero **no lleva `aria-describedby`**, y no hay mensaje en línea junto a la casilla.
   GOV.UK y el patrón de validación del repositorio exigen las dos cosas: resumen **y** error en el
   campo, con el mismo texto literal.
   **Criterio: WCAG 2.2 §3.3.1 Error Identification (A) · §3.3.3 Error Suggestion (AA).**
   **Arreglo:** un `<p :id="idErrorTerminos" class="ds-field-error">{{ errorTerminos }}</p>` bajo la
   casilla y `:aria-describedby="errorTerminos ? idErrorTerminos : undefined"` en el `<input>`.

**Añadido de redacción, y no es menor.** La casilla dice *«He leído y acepto los Términos del
servicio…»* cuando esos documentos **no se pueden leer** (§1.7). Pedirle a alguien que declare haber
leído algo inaccesible es un consentimiento viciado, y en Colombia el tratamiento de datos es Ley
1581. Mientras no existan las páginas, el texto honesto es:

> `Acepto los Términos del servicio y la Política de tratamiento de datos, y quiero recibirlos por
> correo antes de que empiece el cobro.`

---

### 1.9 · Los modales se quedan a medias cuando la escritura falla

**Grave** por la regla de casa: primero que no se pierda trabajo. Tres casos, un solo patrón.

**a) `CambiarCantidadModal` se queda trabado.** `CambiarCantidadModal.vue:83-84` pone
`guardando = true` y **nunca lo baja**: solo se reinicia en el `watch(open)` (`:67-75`). El padre,
`MiPlanView.vue:130-147`, en el `catch` lanza el toast y **no cierra el modal ni reinicia nada**.
Resultado: tras un fallo de red, «Cambiar cantidad» y **también «Cancelar»** (`:120-127`, ambos
`:disabled="guardando"`) quedan deshabilitados para siempre. El único escape es Escape o clic fuera.

**b) `AceptarCotizacionModal` pierde lo tecleado.** `CotizacionDetalleView.vue:65-69` cierra el modal
**tanto si la aceptación funcionó como si no** (`aceptarAbierto.value = false` está fuera del `if
(ok)`). Un 500 y el correo escrito desaparece; hay que volver a abrirlo y escribirlo otra vez. Y la
propuesta puede haberse aceptado a medias en el servidor sin que la pantalla lo refleje.

**c) `RevocarMedioModal` no bloquea el doble clic.** `RevocarMedioModal.vue:87-94` pone
`guardando = true`, emite —síncrono— y el `finally` lo devuelve a `false` **antes** de que
`confirmarRevocar` del padre (`MediosPagoView.vue:53-62`) haya terminado su `await`. El rótulo
«Revocando…» no llega a verse nunca y se puede pulsar dos veces sobre un `PATCH` de dinero.

**Criterio:** NN/g H1 y H5 (prevención de errores); WCAG 2.2 **§3.3.4 (AA)** en el caso (c), que es
una operación financiera.

**Arreglo — un solo patrón para los tres**, que es como el repositorio ya lo resuelve en
`useConfirmDialog` (`MiPlanView.vue:79-92` pasa `action:` y el diálogo gestiona `busyLabel` y el
fallo):

- El modal **expone** el estado de envío en vez de gestionarlo solo: `defineExpose({ terminar })`, o
  bien recibe `:enviando` como prop desde el padre, que es quien conoce el `await`. Lo segundo es más
  simple y no inventa API.
- El padre pone `enviando = true` antes del `await`, lo baja en `finally`, y **solo cierra en el
  camino feliz**.
- Concretamente: `MiPlanView.vue:130-147` y `CotizacionDetalleView.vue:65-69` mueven el cierre dentro
  del `if (ok)`, y `MediosPagoView.vue:53-62` ya lo hace bien (`revocarAbierto = false` está dentro
  del `try`, después del `await`) — a ese solo le falta pasarle el `enviando` al modal.

**Coste:** una tarde para los tres, y quita el único sitio de la feature donde se pierde trabajo.

---

## 2 · Vale la pena aunque cueste

### 2.1 · La contratación no sabe que «Mi suscripción» existe

**Es el hallazgo estructural de la revisión**, y responde directamente a *«¿se siente la misma
aplicación?»*. **Hoy, no.**

`contratacion.store.ts:72-78` lo dice por escrito:

> *«Se marca cuando la activación termina bien. Es la ÚNICA señal de la que hoy dispone el front para
> saber que la empresa ya tiene plan: **no existe ningún endpoint de suscripción en el tenant**.»*

**Esa frase era verdad cuando se escribió y dejó de serlo el mismo día.** `suscripcion.store.ts:37-64`
llama a `GET /subscriptions/current` y distingue con precisión sus tres respuestas: 200 (hay plan), 404
(`notFound`, no hay plan) y 403 (`forbidden`). Es exactamente la señal que la contratación necesita.

**Tres consecuencias reales, en orden de gravedad:**

1. **`contratada` es un `ref(false)` sin espejo.** El caso 6 de la especificación —«la empresa ya
   tiene plan activo»— solo se dispara si el usuario contrató **en esta misma pestaña y sin
   recargar** (`ContratarView.vue:104` lo alimenta con `contratada.value`). Una clínica que ya tiene
   plan y llega a `/dashboard/contratar` por un enlace pegado o por el enganche del login **ve el
   paso vinculante entero y puede «contratar» un segundo plan**. Hoy no hay endpoint detrás, así que
   el daño es un correo confuso a soporte; el día que lo haya, es un contrato duplicado.

2. **La pantalla de éxito no lleva a ninguna parte del producto que acaba de comprar.**
   `ContratarExitoView.vue:97-100` ofrece Empleados, Agenda y Caja — bien elegidas— y **ni una
   mención de «Mi suscripción»**, que es donde el usuario verá su plan, sus cupos y sus cuentas de
   cobro a partir de mañana. Es el momento de máxima atención del embudo, gastado sin enseñar la
   pantalla que evita la primera llamada a soporte.

3. **El banner de estado del plan no existe fuera de `/suscripcion`.** `SuscripcionEstadoBanner` vive
   en `SuscripcionLayout.vue:54` y en ningún otro sitio. Quien está en mora se entera **solo si entra
   a mirar su suscripción**, que es justo lo que no va a hacer. La especificación lo dejó fuera de
   alcance a propósito («el consumidor natural del banner», §8.2) y es correcto; pero conviene
   anotarlo como el siguiente paso natural.

**Arreglo, en el orden en que da valor:**

- **(a) Sembrar `contratada` desde el servidor.** En `ContratarView.vue`, antes de `cargar()`:
  `await useSuscripcionStore().load(true)` y `yaTienePlanActivo = subscription.value != null`. El
  store ya distingue 404 de 403, así que un rol sin `subscription.read` **no** bloquea la
  contratación por error —cae en `forbidden` y se conserva el comportamiento de hoy—. Sustituye
  literalmente la bandera en memoria por lo que dice el servidor, que es lo que el propio comentario
  del store pide («cuando exista, esta bandera se sustituye por lo que diga el servidor»).
  **Coste: ~10 líneas. Es la mitad del valor de este punto.**
- **(b) Una cuarta tarjeta en `SiguientesPasos`**, o mejor, un enlace bajo el bloque de importes de
  `ContratarExitoView.vue:71-79`:
  > `Tu plan, tus cupos y tus cuentas de cobro los tienes en` **Mi suscripción**.

  con `RouterLink` a `suscripcion-plan`, filtrado por permiso como en §1.2. **Coste: media hora.**
- **(c) Montar `SuscripcionEstadoBanner` en `AppLayout`**, alimentado por el mismo store, para que
  el estado de mora acompañe a la clínica por toda la app. **Es un trabajo aparte** —toca el armazón
  de las 30 pantallas y tiene su propio coste de rendimiento (una petición más en cada arranque)—,
  pero es el destino y conviene que quede escrito.

---

### 2.2 · La costura visual: la zona pública se cuela dentro de la app

**Grave para la pregunta «¿se siente la misma aplicación?»**, y ocurre en el único sitio donde las dos
mitades se tocan físicamente.

`ContratarView.vue:243-255`, la rama del caso 5 (intención perdida), monta `PlanesConfigurador` dentro
de `<div class="pub-scope ct-picker">`, y `:368-370` le fija `font-family: Inter`. Es decir: dentro de
una pantalla autenticada, con `.ds-page`, `.ds-display` y la paleta warm de `tokens.css`, se incrusta
un bloque con **Inter y la paleta `--pub-*`**.

`public-auth.css:146-156` declara literalmente lo contrario y con su motivo: *«no se usan las clases
`ds-*` aquí a propósito — mezclarlas traería Geist y la paleta warm a las pantallas de acceso»*. La
regla se ha respetado en una dirección y roto en la otra.

**Y no es una rama rara.** Es la que se ejecuta **siempre que la verificación del correo ocurrió en
otro dispositivo** —el móvil, que es donde se abre el correo—, que en un embudo real es una fracción
grande del tráfico. Quien vuelve al ordenador y entra ve, en su primera pantalla dentro del producto,
un bloque que parece de otra web.

**Arreglo, dos opciones:**

- **Barata y suficiente:** dejar `PlanesConfigurador` como está para `/planes` (zona pública) y
  escribir en `contratacion/components/` un `PlanPickerApp.vue` que reutilice **la misma lógica**
  —`planPricing.ts` ya es puro y no sabe de estilos— con marcado `ds-*`: `SectionCard`,
  `SegmentedRadio` para el ciclo (**existe en `components/ui/` y no se está usando**), `BaseField` +
  `BaseInput` para sedes y usuarios, `.ds-btn--primary` para continuar. Ninguna primitiva nueva.
  El `<style scoped>` cabe en 30 líneas de geometría, así que **no mueve el presupuesto de CSS**
  (hoy la distancia está en −3132, con techo 0: hay margen de sobra).
- **Más barata todavía, si hay prisa:** conservar el componente y **quitarle el `pub-scope` y el
  `font-family: Inter`**, dejando que herede la tipografía de la app. Corrige la mitad del salto
  (la fuente) y deja el resto (los `--pub-*` de sus propias clases), que es menos visible.

**Recomendación: la primera.** Es la diferencia entre un embudo y dos productos pegados.

---

### 2.3 · `formatMoney` se duplicó durante el trabajo en paralelo, y hay constancia escrita

**Menor hoy, caro mañana.** Es la cicatriz literal de los dos agentes.

`src/composables/money.ts:4-10` lleva esta cabecera:

> *«**Aviso de reconstrucción.** Este fichero lo creó el frente de `landing`/`contratacion` y quedó
> **sobrescrito por error** mientras se implantaba «Mi suscripción». Se ha reconstruido a partir de
> sus consumidores reales… **puede no ser byte a byte la original**.»*

Y el estado en que quedó: `money.ts:29-41` y `:43-57` declaran `formatMoney` y `formatMoneyExact` con
su propio `Intl.NumberFormat('es-CO', …)`, mientras `features/tienda/composables/pricing.ts:38-70`
mantiene **las mismas dos funciones con la misma configuración**. Un tercer `Intl.NumberFormat` vive
en `caja/composables/useCaja.ts:5`.

La aritmética sí se reexporta correctamente de `tienda/composables/money` (`money.ts:17-27`) —eso está
bien resuelto—. Lo que se duplicó es justo el formateador, que es **lo que la especificación de
suscripción pidió explícitamente que no se duplicara**: *«lo que no se hace es una tercera copia de
`Intl.NumberFormat('es-CO', …)`»* (§4).

**Hoy no hay divergencia visible**: las tres configuraciones coinciden, así que los importes se pintan
igual en la landing, en el paso 6, en las cuentas de cobro y en el punto de venta. **Es la semilla, no
el síntoma.** El día que alguien cambie `maximumFractionDigits` en una, dos pantallas del mismo flujo
mostrarán el mismo número distinto.

**Arreglo:** `features/tienda/composables/pricing.ts` reexporta `formatMoney` y `formatMoneyExact`
desde `@/composables/money` en vez de declararlos, y `useCaja.ts:5` los importa. Cero cambios en los
consumidores. **Coste: veinte minutos y una comprobación de que `vue-tsc` sigue limpio.**

Y una petición aparte, para el humano: la cabecera de `money.ts` dice que **el fichero original se
perdió** y que puede faltar superficie pública. Conviene que alguien del frente de `landing` confirme
que no había nada más ahí.

---

### 2.4 · `accessLevel` en crudo, en dos pantallas

**Menor**, pero es vocabulario de plataforma colado en la app del tenant, que es el punto 3 del
encargo.

`MiPlanView.vue:252` y `CuposView.vue:105`:

```html
<span class="ds-meta">{{ ent.accessLevel ?? '—' }}</span>
```

Se imprime el valor del enum tal cual: `FULL`, `READ_ONLY`, `NONE`. El `CLAUDE.md` del repositorio lo
prohíbe con todas las letras (*«**Nunca** uses el valor crudo del enum en la UI»*) y los tres módulos
`*Text.ts` de esta misma feature traducen sus **veinte** enums sin excepción —`dunningLabel`,
`eventoLabel`, `quoteStatusLabel`, `mandateStatusLabel`, `paymentStatusLabel`…—. Este es el único que
se escapó.

**Arreglo:** un mapa en `cuposText.ts`, junto a `EVENTO_LABELS`, con la misma caída al código en
mayúsculas que el resto del módulo:

```ts
const ACCESO_LABELS: Record<string, string> = {
  FULL: 'Completo',
  READ_ONLY: 'Solo consulta',
  LIMITED: 'Limitado',
  NONE: 'Sin acceso',
}
export function accesoLabel(nivel: string | undefined): string {
  if (!nivel) return '—'
  return ACCESO_LABELS[nivel] ?? nivel.toUpperCase()
}
```

Confirmar los valores reales del enum `AccessLevel` del backend antes de fijar el mapa; los que no
estén caen al código en mayúsculas, que es el comportamiento correcto y ya establecido.

---

## 3 · Necesita backend

Nada de esto bloquea las mejoras de arriba. Se recoge para que lo decida un humano; **no se ha abierto
ningún issue** (regla suspendida por orden del dueño).

| # | Qué falta | Qué desbloquea | Urgencia |
|---|---|---|---|
| 1 | **Un endpoint con el que la clínica contrate su propio plan.** `CreateQuoteUseCase` sigue en `hasRole('SYSTEM')`; `AcceptQuoteUseCase` ya admite al empleado del tenant. Preferencia: abrir `CreateQuoteUseCase` sobre la propia empresa y reutilizar `accept` + `clientRequestId`, que ya trae el rastro legal de aceptación (`acceptedAt`, `acceptedByEmail`, `acceptedIp`) | Que el paso 6 deje de ser una maqueta. Hoy `activarPlan` (`contratacion.source.ts:157-169`) **no llama a nada** y la pantalla lo dice (`ContratarExitoView.vue:89-94`), que es honesto pero no es un producto | **Alta** |
| 2 | **`GET /plans` público**, con la ruta literal en `PublicRoutes.BUSINESS` y puerto separado con `@NoAuthorizationRequired`. En el mismo cambio, **exponer `default_trial_days` por artículo**, que existe en la entidad y no está en `CatalogItemResponse` | Que el precio de la landing sea contrato y no contenido con sello, y que la columna «Cuando termine la prueba» de §1.6 pueda tener cifras en vez de una frase | Media |
| 3 | **La descarga del documento fiscal** del cliente (§1.4). Hoy solo se expone `externalCufe` en texto | Que la cabecera de cuentas de cobro pueda volver a prometer la descarga, y que la clínica no llame para pedir su factura | Media |
| 4 | **Una vía de baja durante la prueba.** Mientras no exista, el paso 6 no puede prometer «cancela cuando quieras» y dice la verdad (escríbenos) | Que WCAG §3.3.4 se cumpla también por la vía «Reversible», que es más fuerte que «Confirmed» | Baja |
| 5 | **Las dos páginas legales.** No es backend estrictamente, pero es la dependencia dura de §1.7 y §1.8 | Que el paso 6 se pueda publicar. Ley 1581 de 2012 | **Bloqueante para publicar** |

---

## 4 · Lo dejaría como está, y por qué

Esto no se toca. Decir que algo está bien es información, y estas pantallas son nuevas.

**4.1 · `MedidorCupo.vue` entero.** `<progress>` nativo con `<label for>`, cero ARIA a mano, el texto
`340 de 500 mascotas` siempre presente, y la barra que **no se pinta** cuando el límite es `null` en
vez de dibujar un 100 % inventado (`:41-51`). Es lo mejor de la feature. Ni un cambio.

**4.2 · La rama `capacitiesLegibles` de `CuposView.vue:70-78`.** Distinguir «no pudimos leer tus
cupos» de «no tienes topes» es el fallo más caro que esta pantalla podía cometer, y está evitado con
una rama explícita en vez de un `?? []`. Se conserva tal cual, incluido el `role="status"` sobre un
`.ds-banner--error`: es una condición de la cuenta, no un suceso.

**4.3 · `DemoModeNotice.vue`.** `<aside>` con encabezado real, no `role="alert"`, no descartable, el
icono `aria-hidden`, y la repetición exacta —una sola vez más, compacta, en el paso 7—. La decisión de
**no** poner un formulario de tarjeta falso está bien argumentada y es correcta por los tres motivos
que enumera. Que nadie lo «mejore» haciéndolo cerrable.

**4.4 · El hueco honesto del alta de medio de pago** (`MediosPagoView.vue:108-122`). Un formulario que
pidiera «el token de la pasarela» o el número de tarjeta sería peor que no tener el botón. El texto y
el canal de soporte son la respuesta correcta.

**4.5 · La sub-navegación como `<nav>` con `RouterLink`, no `role="tablist"`**
(`SuscripcionLayout.vue:34-50`). El razonamiento del APG es exacto y el `aria-current="page"` sale
gratis. **Solo se le añade el filtro por permiso de §1.2**; la forma se queda.

**4.6 · Los tres `*Text.ts`.** `estadoSuscripcion.ts`, `cuposText.ts`, `cobrosText.ts` y
`cotizacionesText.ts` traducen los veinte enums del dominio, nunca imprimen `undefined`, caen al
código en mayúsculas ante lo desconocido y no usan una sola palabra del vocabulario prohibido. El
único cambio que piden es el orden de la frase de mora (§1.1) y el mapa de `accessLevel` (§2.4).

**4.7 · `PriceDriftNotice` + el desmarcado de la casilla** (`ContratarView.vue:126-133`). Que un
cambio de precio desmarque los términos y mueva el foco al aviso es lo que convierte §3.3.4 en
cumplimiento y no en adorno. Y el comentario de `:117-123` explica un error real ya corregido —el
foco que no llamaba a nadie porque el nodo aún no existía—; conviene que ese comentario no se borre.

**4.8 · La tarea 0 de la zona pública, hecha.** `AuthField.vue` inyecta ahora el `FieldContext` de
`components/ui/fieldContext.ts` (`:1-60`), así que las **siete pantallas públicas** —login, registro,
verificación, las tres de recuperación y el cambio de contraseña— asocian etiqueta y error a su
control por primera vez. Era el riesgo nº 7 de la especificación de la landing y está cerrado. No se
toca.

**4.9 · Las tres correcciones de token de `public-auth.css`.** Verificadas aplicadas:
`--pub-ok-tx: #15803d` (`:31`), `--pub-err-tx-2` en uso para los errores de campo (`:203-211`), y el
pie subido a `--pub-ink-500`. Quedan cuatro consumidores de `--pub-ink-400` fuera de la tanda
—`SectionHead.vue:50`, `CheckEmailPanel.vue:76`, `RecuperarCodigoView.vue:178`,
`RecuperarContrasenaView.vue:174`—, todos a 4,05:1 sobre blanco: **deuda preexistente**, no de este
trabajo, y no se arregla desde aquí para no ensanchar el alcance.

**4.10 · Los dos `color: var(--amatista-700)` en `<style scoped>`.** `DocumentoCobroFila.vue:57` y
`CotizacionesView.vue:116`. A primera vista parecen la infracción de especificidad de
`AGENTS.md:103-122`, pero **no lo son**: van sobre una clase local (`.referencia`) de un
`<RouterLink>` que no lleva ninguna clase `ds-*`, así que no hay primitiva a la que ganarle. La causa
real es que **el tenant no tiene primitiva de enlace** (`grep ds-link primitives.css` → 0). Dejarlo
como está es correcto; si alguna vez se pide una `.ds-link` a `front-parity`, estos dos son sus dos
primeros consumidores. Verificado además que `stylelint` y `css:budget` los aceptan.

**4.11 · El presupuesto de CSS.** No hay que hacer nada: 367 SFC, distancia style−script **−3132**
con techo 0, cero cuerpos repetidos, cero SFC de más de 500 líneas. La landing partida en ocho
componentes desde el primer commit fue la decisión que lo sostiene, y hay margen de sobra para el
componente nuevo que pide §2.2.

---

## 5 · Cómo se verifica lo de arriba

Para `front-e2e-visual`. **Esta revisión no ejecutó ninguna de estas.**

**Unitarias (Vitest), sobre módulos puros:**

1. `estadoSuscripcion.ts` — para los tres casos de `PAST_DUE`, la **primera frase** de la salida
   contiene `Sigues trabajando` (§1.1). Es la aserción que impide que la regresión vuelva.
2. `cobrosText.ts` — `CABECERA_SOLO_LECTURA` **no contiene** la palabra `descarga` mientras no exista
   el endpoint (§1.4). Una prueba fea a propósito, que se borra el día que la descarga llegue.
3. `contratacion.source.ts` — `lineasDePrueba` con `trialDays` mixtos ordena ascendente y
   `pruebaUniforme` responde `false`; con todas iguales, `true`.
4. `MiPlanView` — montada con `status: 'READ_ONLY'`, **no** renderiza «Cambiar cantidad», «Quitar» ni
   «Pedir la baja»; con `cancelRequestedAt` puesto, no renderiza «Pedir la baja» (§1.3).
5. `SuscripcionLayout` — con solo `subscriptionBilling.read` en los permisos, la tira pinta **un**
   enlace, no cinco (§1.2).

**ARIA snapshots (Playwright, `toMatchAriaSnapshot`)** — es la única red que hay, porque **no existe
ninguna puerta de accesibilidad en el pipeline** de ninguno de los dos repositorios:

6. `/dashboard/contratar` — la casilla de términos expone `aria-describedby` apuntando a su error
   cuando el envío falla, y el resumen y el error en línea tienen **el mismo texto literal** (§1.8).
7. El orden de encabezados del paso 6 tras el intercambio de §1.5: `h1` «Confirma tu plan» → tabla de
   prueba → resumen de importes → aviso de demostración.
8. Recorrido de solo teclado desde el skip link de la landing hasta «Confirmar mi plan»,
   comprobando que el foco es visible en cada parada.

**Lo que sigue faltando y no se arregla desde aquí:** `@axe-core/playwright` sobre `/`, `/planes` y
las cinco rutas de suscripción, con el listón en cero violaciones serias o críticas. Sigue siendo el
mayor hueco del proyecto en esta materia.

---

## 6 · Fuentes

- **WCAG 2.2** — https://www.w3.org/TR/WCAG22/ · §3.3.1 Error Identification (A) · §3.3.3 Error
  Suggestion (AA) · §3.3.4 Error Prevention, Legal/Financial/Data (AA) —
  https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html ·
  §2.4.4 Link Purpose (A) · §2.5.8 Target Size (AA) —
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- **APG** — patrones de componente (Dialog, Disclosure, Radio Group) —
  https://www.w3.org/WAI/ARIA/apg/patterns/
- **GOV.UK** — patrón de validación y resumen de errores —
  https://design-system.service.gov.uk/patterns/validation/
- **NN/g** — heurísticas — https://www.nngroup.com/articles/ten-usability-heuristics/ · errores de
  formulario — https://www.nngroup.com/articles/errors-forms-design-guidelines/
- **Vue** — accesibilidad — https://vuejs.org/guide/best-practices/accessibility.html

**Internas, y mandan sobre las anteriores cuando hablan del repositorio:**
`docs/ux/suscripcion-tenant-especificacion.md` (§6.1, §8.1, §8.3, §9) ·
`docs/ux/landing-comercial-y-contratacion.md` (§4, §5, §6, §9, §10) ·
`docs/ux/reglas-de-interfaz.md` (R02, R04, R05, R14) · `docs/ux/patron-de-mensajes.md` (§3, §4) ·
`docs/ux/estado-solo-lectura.md` (§1, §2) · `AGENTS.md` §CSS (FE-08) · `CLAUDE.md` §Validación y
§Enums del dominio.
