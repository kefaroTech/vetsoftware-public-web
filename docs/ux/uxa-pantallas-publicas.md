# Zona pública — auditoría visual de las 11 pantallas del escaparate

Alcance: `/` (y sus ocho secciones), `/planes`, `/legal/privacidad`, `/legal/terminos`, `/login`,
`/registro`, `/verify-email`, `/recuperar-contrasena`, `/recuperar-codigo`,
`/restablecer-contrasena`, `/cambiar-contrasena`. Seis viewports.

Método: se miraron las capturas de `_capturas/public/<viewport>/`, se cruzaron con
`uxa-metricas-public.json` y se dictaminó contra `docs/ux/uxa-rubrica-maquetacion.md`, la
especificación `docs/ux/landing-comercial-y-contratacion.md` y `docs/ux/reglas-de-interfaz.md`
(R01–R15). Lo sistémico del armazón y del catálogo `Base*`/`public/*` ya está en
`docs/ux/uxa-armazon-y-primitivas-tenant.md` y **no se repite**: cuando un defecto de aquí es una
instancia de uno de allí, se cita.

**Lo que NO se ejecutó**, y por tanto no se da por pasado: `axe`, árbol de accesibilidad, cálculo de
contraste nuevo, `npm run quality`, `vue-tsc`, Playwright. No se levantó ningún servidor.

**Cuatro avisos sobre el material de partida.**

1. `tablet-v` (768) es el estado mixto irreproducible descrito en la rúbrica §2.2/T2. **Ningún
   hallazgo de este informe se apoya solo en él.** `portatil` (1280) se trata como estado estrecho.
2. Durante la redacción, una segunda pasada de capturas estaba **regenerando**
   `_capturas/public/`: al terminar quedaban solo `escritorio/` y `portatil/` (41 de ~130 ficheros).
   Las observaciones de `tablet-h`, `movil-ancho` y `movil` de este informe se tomaron de la pasada
   anterior, que es la que corresponde al JSON de métricas. Si la nueva pasada cambia algo,
   los `fichero:línea` de código siguen siendo la prueba primaria.
3. **El JSON de métricas se regeneró entero** (`generado: 2026-09-04T05:54:25Z`) con dos criterios
   corregidos —`textoTruncado` solo cuenta elementos con texto propio, y `centradosRotos` solo mide
   hijos `static`/`relative`—, y **este informe se rehízo sobre esa versión**. Todas las cifras que
   se citan abajo salen del JSON vigente. Dos consecuencias, ambas incorporadas: el falso positivo
   de `.pub-shell` desapareció (§2), y **la evidencia numérica de H01 cambió a mejor** — la anterior
   citaba anchos de contenedor que el nuevo criterio ya no reporta; la de ahora son anchos de
   `<input>`, que son más concluyentes.
4. **Concurrencia:** hay agentes editando `src/` de `public-web` mientras esto se escribe. Las
   capturas y el JSON están congelados en el estado auditado y siguen siendo válidos como
   fotografía. **Todas las citas `fichero:línea` de este informe están verificadas sobre el árbol
   previo a esos arreglos** y hay que releerlas antes de aplicar un parche.

---

## 1. Hallazgos

### H01 · [bloqueante] `/registro` se pinta en una columna de 300 px en todo escritorio

> **Qué está mal** — `src/features/registration/views/SignupView.vue:115`
> **Criterio:** rúbrica §4 «impide completar la tarea»; §3.8 (contenido aplastado, no recortado);
> desviación de `landing-comercial-y-contratacion.md` §7 (el registro es el final del embudo).
> **Impacto:** todo visitante que llegue a `/registro` desde la landing, el `login` o la barra
> superior, en **1440, 1280 y 1024 px** — los tres viewports más anchos de los seis.

```css
.reg-lane {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);   /* SignupView.vue:115 */
}
```

El carril lateral se pinta con `v-if="seleccion"` / `v-else-if="traePropuesta"`
(`SignupView.vue:92,99`). **Cuando no hay ninguno de los dos —el camino normal, «Crear cuenta»
desde la landing— la rejilla se queda con un solo hijo, `RegisterForm`, que se auto-coloca en la
PRIMERA columna: los 300 px fijos.** La segunda columna, `minmax(0,1fr)`, se queda vacía con los
~740 px restantes. Por debajo de 960 px la media query `SignupView.vue:128-131` lo colapsa a `1fr`
y el formulario recupera el ancho completo.

Lo que se ve en `_capturas/public/escritorio/registro__lleno.png` y
`_capturas/public/tablet-h/registro__lleno.png`:

- las etiquetas **«Departamento *» y «Ciudad *» se solapan** y se leen «DepartamentoCiudad *»
  (`solapamientos` está a cero porque son celdas contiguas cuyo texto desborda, no cajas
  superpuestas: esto solo se ve mirando la captura);
- los tres `select` de geografía muestran **una única letra, «S»**, en vez de «Selecciona…»;
- «Correo fiscal» muestra `facturac`, «Dirección» muestra `Cra 12 #`, «Email» muestra `ana@cli`;
- los textos de ayuda caen a 4–5 líneas de dos palabras.

**Confirmado en el JSON vigente sin depender del ojo, y esto es lo que cierra la ficha.** Ancho de
los `<input>` del mismo formulario, `objetivosPequenos`, estado `lleno`:

| Campo | a **1440 px** | a **390 px** |
|---|---|---|
| `input#reg-password` | **16,5 × 21** | 207 × 21 |
| `input#reg-company-identifier` | **50,5 × 21** | 241 × 21 |
| `input#reg-fiscal-email` | **50,5 × 21** | 241 × 21 |
| `input#reg-company-contact-number` | **50,5 × 21** | 241 × 21 |
| `input#reg-employee-email` | **50,5 × 21** | 241 × 21 |
| `input#v-9` (dirección) | **50,5 × 21** | 241 × 21 |
| `input#reg-company-name` | 167 × 21 | 241 × 21 |
| `input#reg-employee-name` | 167 × 21 | 241 × 21 |

**El campo de contraseña del alta mide 16,5 px de ancho en un monitor de 1440 px y 207 px en un
móvil de 390: es 12,5 veces más estrecho en escritorio que en el teléfono.** Cabe poco más de un
carácter, y eso coincide exactamente con lo que muestra la captura (dos puntos y el ojo). Otros
cinco campos —incluidos el correo fiscal y el correo del administrador, que hay que releer antes de
enviarlos— quedan en 50,5 px.

Y la segunda prueba, independiente de cualquier criterio de medida: **el mismo formulario mide
1818 px de alto en un 1440×900 y 1578 px en un 760×1024** — la versión de escritorio es 240 px más
alta que la de móvil.

*(La versión anterior de este informe citaba `form.reg-card cw=298` y `select#reg-country-id
sw=97 cw=61`, tomados del JSON previo. Aquellas lecturas eran correctas, pero el criterio
regenerado de `textoTruncado` ya no reporta contenedores ni `<select>`, así que se sustituyen por
las de arriba, que sí están en el JSON vigente. El hecho físico —una columna de rejilla fija de
300 px— lo prueba el CSS y lo confirman las capturas, y no depende de ninguna de las dos medidas.)*

`_capturas/public/movil/registro__lleno.png` está perfecto: una columna, campos completos, todo
legible. El defecto es exclusivamente de escritorio.

**Arreglo** (`front-feature`, `SignupView.vue`, no toca ningún gemelo TR-02):

```css
.reg-lane {
  display: grid;
  grid-template-columns: 1fr;          /* base: una sola columna */
  gap: 22px;
  align-items: start;
  width: 100%;
  max-width: 1060px;
  margin: 0 auto;
  max-height: 100%;
}

/* El carril solo existe cuando hay selección o propuesta; sin él el formulario
   ocupa el ancho entero en vez de la ranura fija que la rejilla le reservaba. */
.reg-lane:has(> aside) {
  grid-template-columns: 300px minmax(0, 1fr);
}

@media (width <= 960px) {
  .reg-lane:has(> aside) { grid-template-columns: 1fr; }
}
```

Si `:has()` no se quiere usar, la alternativa equivalente es una clase condicional en el `<div>`
(`:class="{ 'reg-lane--con-carril': seleccion || traePropuesta }"`) y colgar de ella
`grid-template-columns`.

**Además, el comentario de `SignupView.vue:89-90` miente y hay que corregirlo:** dice «En escritorio
la rejilla lo coloca a la derecha», pero con `300px 1fr` y el `<aside>` primero en el DOM el carril
cae en la columna IZQUIERDA. Ni `SeleccionAside.vue` ni `RegisterForm.vue` declaran `grid-column` ni
`order` (verificado por `grep`).

**Verificación posterior:** una prueba de `boundingBox()` en `e2e/` sobre `form.reg-card` a 1440 px
exigiendo `width >= 640`, y una línea base visual de `/registro` a escritorio.

---

### H02 · [grave] En `/planes`, por debajo de 900 px el importe total y «Continuar» caen al final de una página de 5.067 px

> **Qué está mal** — `src/features/landing/views/PlanesView.vue:407` y `:476-479`
> **Criterio:** rúbrica §3.2b generalizada (el grupo «elección + importe» queda partido) y §3.4c
> («si hay que hacer scroll para llegar al botón que cierra la tarea, es defecto»); NN/g H1
> *Visibility of system status*. La tabla de severidades §4 no produce `grave` por sí sola aquí:
> **el grado es un juicio, los hechos no.**
> **Impacto:** todo visitante en móvil —el viewport con más tráfico real del escaparate— en la
> pantalla que decide la venta.

`.pl-grid` es `minmax(0,1fr) 360px` y colapsa a `1fr` en `@media (width <= 900px)`. En el DOM el
resumen va **después** del configurador, así que al colapsar se apila al final.
`PlanesResumenAside.vue:165` declara `position: sticky`, pero un elemento sticky que es el último de
la página no puede pegarse a nada.

Medido: `/planes` a 390 px tiene `scrollHeight = 5067` con `innerHeight = 844` — **seis pantallas
de scroll**, y el bloque «SOLO LO QUE MARCASTE / Núcleo + 4 módulos / $ 189.000 / Continuar» está en
la última (`_capturas/public/movil/planes__lleno.png`). A 760 px son 3.444 px, 3,4 pantallas.

Y la propia pantalla se contradice: su bajada dice, literal, «Ajusta lo que quieras. **El importe de
la derecha se mueve contigo**, y no te compromete a nada». Por debajo de 900 px no hay derecha, y el
importe no se mueve con nadie: está a 4.700 px.

**Arreglo** (`front-feature`, `PlanesView.vue` + `PlanesResumenAside.vue`): en la banda
`(width <= 900px)`, el resumen se parte en dos. El desglose completo se queda donde está, y se añade
una barra condensada anclada abajo con lo único que decide: el total y la acción primaria.

```css
@media (width <= 900px) {
  .pl-resumen-barra {
    position: sticky;
    bottom: 0;
    z-index: var(--z-sticky);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
    background: var(--pub-surface);
    border-top: 1px solid var(--pub-line-strong);
  }
}
```

Contenido exacto de la barra: `$ 189.000` + `+ IVA al mes` a la izquierda, `Continuar` a la derecha.
Nada más — «Volver» no entra. El texto de la bajada se mantiene solo si el resumen sigue a la
derecha; por debajo de 900 px tiene que cambiar a «El importe se actualiza mientras eliges».

---

### H03 · [grave] El campo de texto de toda la zona pública solo acepta el toque en 21 de sus 41 px de alto

> **Qué está mal** — `src/components/public/AuthInput.vue:91-102` y `:131-140`
> **Criterio:** WCAG 2.2 §2.5.8 Target Size (Minimum), AA — **salvado por la excepción de
> espaciado**, así que no es incumplimiento; rúbrica §3.5, recomendación de producto de 44 px
> (`armazon-tablet-especificacion.md` §5.6). Nielsen H7 *Flexibility and efficiency of use*.
> **Impacto:** **8 SFC** consumen `AuthInput` (`LoginForm`, `RegisterAdminSection`,
> `RegisterCompanySection`, `CambiarContrasenaView`, `RecuperarCodigoView`,
> `RecuperarContrasenaView`, `RestablecerContrasenaView`, `AuthSelect`), o sea **7 de las 11
> pantallas de este informe**. No está reportado en `uxa-armazon-y-primitivas-tenant.md`.

```css
.pub-input { padding: 10px 12px; }        /* AuthInput.vue:95 — la caja visible: 41 px */
.pub-input input { flex: 1; border: none; }  /* :131-140 — el objetivo real: 21 px */
```

`.pub-input` es un `<div>`, no un `<label>`, y no tiene manejador de clic. Los 10 px de padding
superior y los 10 px de inferior **no enfocan nada**: el usuario ve un control de 41 px y la mitad
superior e inferior no responden. Las métricas lo registran en todas las pantallas de
autenticación como `input#v-4 265x21`, `input#v-5 265x21`, `input#v-9 50.5x21`.

No es incumplimiento de §2.5.8 porque un objetivo de 265×21 px pasa la excepción de espaciado (un
círculo de 24 px centrado en su caja no llega a tocar otro objetivo), y así hay que decirlo. Pero es
exactamente el defecto que el proyecto ya se tomó en serio en el fichero de al lado: el ojo de la
contraseña lleva `min-width: 24px; min-height: 24px` con un comentario que cita §2.5.8
(`AuthInput.vue:142-155`). El campo, que es lo que se pulsa cien veces más, se quedó fuera.

**Arreglo** (`front-feature`, un solo fichero, cero cambio visual): mover el padding vertical del
contenedor al propio `<input>`, para que la caja del control coincida con la caja que se ve.

```css
.pub-input {
  padding: 0 12px;          /* era 10px 12px */
}

.pub-input input {
  padding: 10px 0;          /* la altura pulsable pasa a ser la altura visible */
}
```

`.pub-input-ico` y `.pub-input-eye` no cambian: siguen centrados por `align-items: center`.

**Verificación:** `e2e/a11y-publicas.spec.ts` ya sujeta el ojo con `boundingBox()`; copiar ese
`describe` para el `input` exigiendo `height >= 40`.

---

### H04 · [menor] Los tres precios de las tarjetas de plan quedan a tres alturas distintas — y el precio es el ancla de la comparación

> **Qué está mal** — `src/features/landing/components/PlanCard.vue:76-121` y
> `src/features/landing/components/LandingPlans.vue` (`.land-plans-grid`)
> **Criterio:** rúbrica §3.1 (desplazamiento > 8 px que no pasa el test de intención: no es un valor
> de `--space-*`, no se repite idéntico entre hermanos, no hay causa declarada); ley de proximidad
> de Gestalt aplicada a la comparación por columnas.
> **Impacto:** todo visitante con más de 980 px de ancho — escritorio, portátil y tablet
> horizontal —, en el momento exacto en que compara tres precios.
> **Prueba:** `_capturas/public/escritorio/landing-seccion-planes__lleno.png`.

Medido sobre la captura (escala 1120/1440; cifras en px CSS, ±3):

| | Pack Spa | Pack Clínica (destacada) | Pack Clínica completa |
|---|---|---|---|
| Insignia «LA QUE MÁS ELIGEN» | no | sí | no |
| Bajada | 1 línea | 2 líneas | 2 líneas |
| **Desfase del título** | 0 | **+51** | 0 |
| **Desfase del precio** | 0 | **+76** | **+22** |

Las dos causas son independientes y se suman: la insignia ocupa una ranura que solo existe en la
tarjeta central (≈51 px), y la bajada envuelve a dos líneas en dos de las tres (≈22 px por línea).
El resultado es que **$ 179.000, $ 189.000 y $ 449.000 —los tres números que el visitante ha venido
a comparar— están a tres alturas distintas.** Los CTA sí alinean, porque `PlanCard.vue:192` les
pone `margin-top: auto`; nadie hizo lo equivalente por arriba.

En `movil` el defecto desaparece: las tarjetas se apilan y no hay comparación por columnas
(`_capturas/public/movil/landing-seccion-planes__lleno.png`, correcto).

**Arreglo** — rejilla compartida, no retoques por tarjeta. `subgrid` es Baseline desde 2023 y
resuelve las dos causas de una vez:

```css
/* LandingPlans.vue */
.land-plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: auto auto auto auto 1fr auto;  /* insignia · nombre · bajada · precio · lista · CTA */
  gap: 18px;
}

/* PlanCard.vue — la tarjeta deja de ser un flex y hereda las filas de la rejilla */
.pub-plan-card {
  display: grid;
  grid-row: span 6;
  grid-template-rows: subgrid;
  row-gap: 14px;
}
```

Con eso la fila de la insignia existe (vacía) también en las tarjetas sin insignia, y la fila de la
bajada mide lo que la bajada más larga. `margin-top: auto` en el CTA deja de hacer falta: lo hace la
fila `1fr`.

**Alternativa sin `subgrid`**, si se prefiere no depender de él: reservar la ranura de la insignia
con un `<p class="pub-badge pub-badge--fantasma" aria-hidden="true">` vacío en las no destacadas —
no con `visibility: hidden` sobre texto real— y fijar `min-height` a `.land-plan-tagline` igual a
dos líneas.

---

### H05 · [menor] El pie de la landing no comparte contenedor con ninguna de sus secciones

> **Qué está mal** — `src/features/landing/components/LandingFooter.vue:36`
> **Criterio:** rúbrica §3.1, banda 0,5–8 px y su test de intención; §3.2d (caras desiguales sin
> motivo escrito).
> **Impacto:** todos los viewports, en la última franja de la página. Es un defecto de 12 px, del
> tipo que la rúbrica describe como «se lee como avería, no como intención».

```css
.pub-section  { padding: clamp(48px, 7vw, 88px) clamp(20px, 5vw, 44px); }  /* public-auth.css:359-361 */
.land-footer  { padding: 56px 32px 40px; }                                 /* LandingFooter.vue:36 */
```

Las seis secciones (`valor`, `dia`, `planes`, `preguntas`, `cierre` y la cabecera de cada una) usan
`.pub-section`, con padding horizontal fluido. El pie usa un 32 px fijo. Resultado:

| Viewport | Sangrado de sección | Sangrado del pie | Desfase |
|---|---|---|---|
| 1440 / 1280 / 1024 | 44 | 32 | **12 px a la izquierda** |
| 760 | 38 | 32 | 6 px a la izquierda |
| ~640 | 32 | 32 | 0 (el único punto donde alinea) |
| 390 | 20 | 32 | **12 px a la derecha** |

Es decir: el pie **nunca** alinea salvo en un ancho concreto, y a 390 px se desalinea en sentido
contrario. Verificado en `_capturas/public/escritorio/landing-seccion-pie__lleno.png` contra
`landing-seccion-valor__lleno.png` y `landing-seccion-cierre__lleno.png`.

**Arreglo** (`front-feature`, una línea):

```css
.land-footer { padding: 56px clamp(20px, 5vw, 44px) 40px; }
```

`ResumeIntentBanner.vue:70` ya lo hace bien (`padding: 14px clamp(20px, 5vw, 44px)`) — el pie es el
único que se salió.

**Recomendación de fondo, y es la que más rinde:** el sangrado horizontal de la zona pública está
escrito **cuatro veces** con tres valores distintos (`.pub-section` `clamp(20,5vw,44)`,
`.land-footer` `32`, `.pub-doc-page` `clamp(1.25rem,5vw,2.75rem)`, `.pub-topbar` `40`). No hay
ningún `--container-*` ni `--gutter-*` en `tokens.css` (rúbrica §7.6). Un token de canal en
`public-auth.css` —no en `tokens.css`, que es gemelo TR-02— cierra la familia entera.

---

### H06 · [menor] La rejilla de valor se queda en cuatro columnas hasta 720 px

> **Qué está mal** — `src/features/landing/components/LandingValueGrid.vue:52-55` y `:82-86`
> **Criterio:** rúbrica §3.6 («< 45 caracteres en un bloque de ≥ 3 líneas») llevado al extremo;
> §1.4.10 Reflow no se incumple (no hay scroll en dos dimensiones), pero la medida sí colapsa.
> **Impacto:** la banda 721–980 px, que incluye el viewport `movil-ancho` (760) — el corte dominante
> del tenant, con 16 usos en el árbol (rúbrica §2.1).

```css
.land-value-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
@media (width <= 720px) { .land-value-grid { grid-template-columns: 1fr; } }
```

De cuatro columnas a una, sin escalón intermedio. A 760 px el ancho útil de `.pub-section` es
760 − 2×38 = 684; con tres huecos de 16 px quedan **159 px por tarjeta**, y con los 20 px de padding
propio (`.land-value-card`, `:58-63`) el texto dispone de **119 px**. A `font-size: 13.5px` eso son **≈ 18 caracteres por
línea**: los 100 caracteres de «Cada módulo tiene su precio y su casilla. Si tu clínica no
hospitaliza, no hay una línea de hospitalización en tu recibo.» caen a más de diez renglones.

Se corrobora sin la captura con las alturas medidas de la sección: 285 px de contenido a 1024 px y
**350 px a 760 px** — la sección crece al estrecharse porque las columnas no se reducen en número.

**Arreglo** (`front-feature`, una regla): añadir el escalón de dos columnas.

```css
@media (width <= 980px) {
  .land-value-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (width <= 560px) {
  .land-value-grid { grid-template-columns: 1fr; }
}
```

980 y 560 no son valores nuevos: 980 es el corte que ya usa `LandingPlans.vue:330` para el mismo
tipo de rejilla, y 560 está entre los seis cortes compartidos por los dos repos (rúbrica §2.1).

---

### H07 · [menor] `.ds-table-scroll` no desplaza nada: en 19 de sus 21 usos la tabla se estruja en vez de desbordarse

> **Qué está mal** — `src/assets/styles/primitives.css:753` (la primitiva) y sus consumidores;
> instancia visible en `src/features/contratacion/components/TrialLinesTable.vue:85-88`
> **Criterio:** R15 (`reglas-de-interfaz.md:1142`) —«una tabla ancha se desplaza, no se recorta»—
> queda **nominalmente** cumplido y **materialmente** vacío; rúbrica §3.6 (medida < 45 caracteres en
> un bloque de ≥ 3 líneas). WCAG §1.4.10 exceptúa las tablas de datos, así que **no es
> incumplimiento AA**.
> **Impacto sistémico:** `.ds-table-scroll` tiene **21 usos** en `public-web`. Solo **dos** dan a su
> tabla un ancho mínimo: `LabHistory.vue:268` (`min-width: 640px`) y `MedicamentosView.vue:264`
> (`min-width: 560px`). En los **19 restantes** el contenedor con `overflow-x: auto` no puede
> desbordarse nunca, porque la tabla se contrae hasta caber.
> **Prueba visible dentro de mi alcance:** `_capturas/public/movil/planes__lleno.png`.

```css
/* primitives.css:753 — la primitiva entera */
.ds-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

`overflow-x: auto` solo hace algo si el hijo es más ancho que el padre. Sin un `min-width` en el
`<table>`, la maquetación de tabla reparte el ancho disponible entre las columnas y **envuelve el
texto**: el contenedor de scroll existe, la barra no aparece nunca y la tabla se estruja.

La instancia que se ve: la tabla «Cuándo empieza a costar» de `/planes`
(`TrialLinesTable.vue:85-88`, tres consumidores: `/planes`, `/dashboard/contratar` y
`/dashboard/contratar-exito`) está correctamente envuelta en `.ds-table-scroll`. Aun así, a 390 px
sus tres columnas (`Módulo` / `Gratis hasta` / `Después`) se reparten el ancho y «Se cobra dentro
del total del plan» —el texto que dice que el día 15 te cobran— cae a **siete renglones de una
palabra**. Cada fila pasa de ~28 px a ~120 px de alto; cinco filas ocupan media pantalla.

**Arreglo — el de la primitiva primero, porque es el que cierra los 19 casos.** No se toca
`primitives.css` (es gemelo TR-02 y la regla `no-duplicate-primitive` protege el resto): se añade
una **variante** en el mismo fichero, que es donde vive la familia, y se replica en el admin
(`front-parity`):

```css
/* La primitiva de arriba solo desborda si la tabla tiene un ancho mínimo: sin él
   la maquetación de tabla contrae las columnas y `overflow-x` no llega a activarse.
   El valor lo pone el consumidor con `--ds-table-min`; el suelo es el de una tabla
   de tres columnas legible. */
.ds-table-scroll > table {
  min-width: var(--ds-table-min, 560px);
}
```

En `TrialLinesTable.vue` basta entonces con `style="--ds-table-min: 520px"` en el
`.ds-table-scroll`, o nada si el suelo sirve.

**Y con eso queda pendiente la otra mitad de R15, que ya está redactada y no se reabre aquí:**
`.ds-table-scroll` no lleva `tabindex="0"`, `role="region"` ni nombre accesible, así que en cuanto
empiece a desplazarse de verdad la región no será alcanzable por teclado (§2.1.1 A, regla
`scrollable-region-focusable` de axe-core). Está como issue nº 4 en `reglas-de-interfaz.md:1324` y
como **H06** en `uxa-armazon-y-primitivas-tenant.md`. **Los dos arreglos tienen que ir en el mismo
cambio**: activar el desplazamiento sin darle teclado convierte una tabla apretada en una tabla
inalcanzable.

**Alternativa si se prefiere no desplazar en móvil** (mejor para una tabla de solo tres columnas):
por debajo de 560 px, cada fila se convierte en tres pares etiqueta/valor apilados, sin tabla y sin
scroll. Exige `data-etiqueta` en cada `<td>` y mandar el `<thead>` a `.ds-sr-only`, no a
`display: none`.

---

### H08 · [menor] `/planes` muestra dos botones primarios a la vez en escritorio

> **Qué está mal** — «Ver mi propuesta» (columna izquierda) y «Continuar» (aside derecho)
> **Criterio:** rúbrica §3.4a, verbatim: «dos o más botones con tratamiento primario visibles
> simultáneamente en la misma región»; Hick's Law.
> **Impacto:** 1440 y 1280 px, primera pantalla de `/planes`, antes de hacer scroll.
> **Prueba:** `_capturas/public/escritorio/planes__lleno.png` — los dos son sólidos, del mismo
> violeta, y ambos están sobre la línea de flotación.

Hacen cosas distintas: uno envía el texto libre para que se recalcule la propuesta, el otro avanza
al paso 2 con lo que ya está marcado. Con el mismo tratamiento, el visitante con prisa pulsa el que
tiene más cerca.

**Arreglo:** «Continuar» es la acción que cierra la tarea de la pantalla y se queda como primaria.
«Ver mi propuesta» baja a secundaria — en el vocabulario del fichero, `.ds-btn` sin `--primary`, con
el tono suave que ya usan las tarjetas de plan no destacadas (`land-plan-cta--suave`,
`PlanCard.vue:114` y `:209`). No se cambia ningún literal.

---

### H09 · [menor] La equis que cierra el banner de error mide 15 × 15 px, y su hermano del mismo directorio ya está arreglado

> **Qué está mal** — `src/components/public/AuthBanner.vue:83-93` (`padding: 0`) y `:44` (`X` a
> `:size="15"`)
> **Criterio:** WCAG 2.2 §2.5.8 (AA) — **la excepción de espaciado lo salva**, no es
> incumplimiento; rúbrica §3.5, recomendación de 44 px en banda táctil.
> **Impacto:** `AuthBanner` lo consumen **5 SFC** (`AuthField`, `LoginForm`, `RegisterForm`,
> `CambiarContrasenaView`, `RestablecerContrasenaView`): el banner de error de `/login`,
> `/registro`, `/cambiar-contrasena` y `/restablecer-contrasena`.
> **Prueba:** `_capturas/public/escritorio/registro__lleno.png` y `movil/registro__lleno.png`; el
> JSON lo registra como `button.pub-banner-close 15x15` en las seis capturas de `/registro`.

Triaje honesto: alrededor de esa equis no hay ningún otro objetivo dentro de un círculo de 24 px
—el `select` más cercano está a ~190 px—, así que la excepción de espaciado de §2.5.8 se aplica y
**no hay incumplimiento AA**. Lo que sí hay es una incoherencia interna: en el mismo directorio,
`AuthInput.vue:142-155` resolvió el caso idéntico con

```css
min-width: 24px;
min-height: 24px;
```

y un comentario que cita el criterio. `AuthBanner` se quedó sin ello.

**Arreglo:** copiar esas dos declaraciones a `.pub-banner-close`. No mueve nada: el botón ya es
`display: grid; place-items: center` y `flex-shrink: 0`, así que crecer a 24 px lo centra sobre el
mismo eje y el banner ya tiene 11 px de padding vertical para absorberlo.

---

### H10 · [menor] `/login` se presenta como el panel de la plataforma, no como la puerta de la clínica

> **Qué está mal** — `src/features/auth/views/LoginView.vue:42` y `:44`
> **Criterio:** desviación del embudo de `landing-comercial-y-contratacion.md` §7.7 («Ya tengo
> cuenta» lleva aquí); NN/g H2 *Match between system and the real world*.
> **Impacto:** todo cliente que vuelve. Es la pantalla que cierra el ciclo de la venta.
> **Prueba:** `_capturas/public/escritorio/login__vacio.png`.

```html
<div class="pub-eyebrow">Panel administrativo</div>          <!-- LoginView.vue:42 -->
<p class="pub-sub">Accede al panel para administrar Lumbre.</p>   <!-- :44 -->
```

Esto es `public-web`, la aplicación del tenant. Quien entra aquí administra **su clínica**, no
Lumbre. El visitante llega desde la landing —donde acaba de leer «Empieza hoy. Sin tarjeta»— y se
encuentra con el rótulo interno del proveedor. Las demás pantallas de autenticación sí lo hacen
bien: `/cambiar-contrasena` abre con «PRIMER INGRESO / Crea tu contraseña».

**Arreglo** (dos literales; no hay catálogo i18n en el repo, van en el template):

- eyebrow: `Tu clínica`
- bajada: `Entra con tu código de empleado y tu contraseña.`

Se mantiene «Empleado» como etiqueta del campo, que sí es el vocabulario del usuario.

Relacionado, no duplicado: `uxa-armazon-y-primitivas-tenant.md` H07 cubre el `meta.title` de 65
rutas; esto es el cuerpo de la pantalla, no el título del documento.

---

### H11 · [menor] Las tres tarjetas de plan llevan el mismo rótulo, contra lo que la especificación pide por escrito

> **Qué está mal** — `src/features/landing/components/PlanCard.vue:119`
> **Criterio:** desviación literal de `landing-comercial-y-contratacion.md:826`: «**un único**
> control: `<RouterLink>` con el texto **«Empezar con Esencial»** — nombra el plan, no dice
> "Elegir"». WCAG §2.4.4 Link Purpose (In Context) se cumple por el `aria-describedby`, así que no
> hay incumplimiento.
> **Impacto:** `/` sección planes, todos los viewports.
> **Prueba:** `_capturas/public/escritorio/landing-seccion-planes__lleno.png` — tres botones
> idénticos, «Marcar estos módulos».

`PlanCard.vue:115` sí pone `:aria-describedby="tituloId"`, que resuelve el lado del lector de
pantalla. Lo que no resuelve es lo visual: en una comparación de tres columnas, tres rótulos
idénticos obligan a volver a subir la vista para saber qué se está eligiendo, justo en el clic que
convierte.

**Arreglo:** `Marcar los de {{ plan.name }}` — «Marcar los de Pack Clínica». Se mantiene el verbo
«marcar», que es el del modelo modular vigente (no el «Empezar con» de la especificación, escrita
antes del configurador), y se cumple la parte de la regla que importa: el rótulo nombra el plan.
El `aria-describedby` se conserva.

---

### H12 · [nota] El hero centra un titular de 3–4 líneas y una bajada de 4–5

> **Qué está mal** — `src/features/landing/components/LandingHero.vue:98` (`max-width: 26ch`) y
> `:112` (`max-width: 52ch`)
> **Criterio:** rúbrica §3.3a: «se centra solo lo que ocupa ≤ 2 líneas en el viewport más estrecho;
> si un bloque centrado envuelve a 3 líneas o más en cualquiera de los viewports, es defecto». La
> misma §3.3a lista el hero de la landing entre lo que **sí** se centra, y §4 regla 4 impide que un
> problema estético suba de `menor`. Por eso queda en `nota`.
> **Prueba:** `escritorio/landing-seccion-heroe__lleno.png` (h1 a 3 líneas, bajada a 4);
> `movil/landing-seccion-heroe__lleno.png` (h1 a 4, bajada a 5).

El repo ya razonó la mitad del problema por escrito (`LandingHero.vue:17-19`: «El titular sube a
26ch y la bajada baja a 52ch porque el texto centrado tolera menos medida que el alineado a la
izquierda»). Lo que falta es la otra mitad: estrechar la medida no reduce el número de líneas, lo
aumenta. La bajada tiene 197 caracteres.

**Arreglo — y aquí el cambio de contenido rinde más que el de CSS.** Partir la bajada en dos frases
y dejar en el hero solo la primera:

> Agenda, historia clínica, hospitalización, inventario y facturación DIAN son módulos separados,
> cada uno con su precio.

Los dos períodos restantes («Marca los que uses y verás el total ahora mismo. Si dejas de usar uno,
lo apagas.») ya están dichos, casi palabra por palabra, en la sección `valor` que viene justo
después. Con eso la bajada cae a 2 líneas en escritorio y 3 en móvil sin tocar `52ch`.

---

## 2. Lo que se comprobó y NO es hallazgo

Esto se declara para que nadie lo vuelva a mirar.

| Sospecha | Verdicto | Prueba |
|---|---|---|
| **`/cambiar-contrasena` recorta 140 px** (`sw=1580 cw=1440` sin desborde de documento) | **No es defecto, y ya no aparece en la métrica.** Lo recortado es `div.pub-blob` (`public-auth.css:82`), un `position: absolute; pointer-events: none` con `radial-gradient` colocado **a propósito** en `PublicLayout.vue:24` a `right: -140px`, y cortado por el `overflow: hidden` de `.pub-shell` (`public-auth.css:72-83`). **Ese recorte es el mecanismo por el que el documento no desborda, no el defecto**: no se pierde ni un carácter. El desfase era exactamente **+140 / +160 px en los seis viewports** —independiente del contenido, la firma de un adorno de tamaño fijo—, y el criterio regenerado de `textoTruncado` (solo elementos con texto propio) ya no lo reporta | `escritorio/cambiar-contrasena__vacio.png`; el JSON vigente da 2 truncados en esa ruta, los dos `.ds-sr-only` |
| **Objetivos < 24 × 24 px** — 780 apariciones brutas en mis once rutas | **Triadas una a una abajo, en §2.1. Reales: dos familias, y ninguna es incumplimiento AA.** El recuento bruto no vale como hallazgo | §2.1 |
| **`li.land-trust-item`, «centrado roto», desviación 7 px, ×3** — el único caso de centrado que queda en toda la zona pública, y ya bajo el criterio corregido | **No es defecto, y el número lo demuestra.** `.land-trust-item` es `inline-flex` con un `::before` de **6 px** y `gap: 8px` (`LandingHero.vue:130-142`): la canaleta de la viñeta mide 14 px, y **7 px es exactamente su mitad**. Lo que el arnés mide es la distancia entre el centro de la caja del `<li>` y el centro de su texto, que en cualquier lista con viñeta es siempre media canaleta. Idéntico en los seis viewports, lo que confirma que es geométrico y no de maquetación: el `<ul>` está centrado (`justify-content: center`, `:118-127`) y la fila se ve centrada. **Ninguna otra ruta pública tiene un solo caso de centrado** | `escritorio/landing-seccion-heroe__lleno.png`; `centradosRotos` = 0 en las otras diez rutas |
| **Medida de línea de los legales** | **Correcta, sin hallazgo.** `.pub-doc` y `.pub-doc-foot` fijan `max-width: 66ch` (`public-auth.css:476` y `:635`) con el porqué escrito citando §1.4.8, y todo el cuerpo va en `rem`/`ch`/`em` por §1.4.4 y §1.4.12 (`:462-465`). El ancho aparente de la captura es mayor porque **Inter no cargó en el arnés** (`fonts.googleapis.com` → `ERR_FAILED`) y el `ch` del fallback es más ancho | `escritorio/legal-privacidad__lleno.png` |
| **~300 px de hueco antes de «Crear cuenta» en `/registro`** | **Artefacto del arnés**, no se reporta. Es el iframe de reCAPTCHA (`RegisterForm.vue:321-322`) reservando caja sin poder pintarse: `google.com` es inalcanzable en el entorno de captura, igual que las fuentes | consola: 3× `501` a `/api/v1/countries` y 2× `ERR_FAILED` a `fonts.*` |
| **País / Departamento / Ciudad vacíos en `/registro`** | **Artefacto del arnés.** `GET /api/v1/countries` devuelve **501** tres veces. El ancho de esos selects sí es real (H01); su contenido vacío no | `red` del JSON |
| **La 4.ª tarjeta de `valor` se ve más pálida que las otras tres** | **No confirmado, no se reporta.** No hay `animation-delay` ni `.pub-reveal` en `LandingValueGrid.vue`, así que no puede ser un escalonado de entrada. La explicación más probable es el borde `--pub-line` a 1,23:1 sobre blanco, ya abierto como **public-web #115**, más el remuestreo de la captura. No se pudo repetir en otro viewport porque el directorio estaba regenerándose | — |
| **Desbordamiento horizontal** | **Cero en las 126 capturas de la zona pública.** `documentElement.scrollWidth == innerWidth` en todas. Ningún contenedor de scroll alcanzable ni fuera de pantalla | `jq` sobre `documento` y `scrollers` |
| **Estados (§3.7, que va antes que la geometría)** | Nada que reportar. No aparece ningún indicador de espera que no sea `PawLoader` en las 126 capturas; `/verify-email` pinta el error con su acción de salida («Volver a registrarme» + «Ir a iniciar sesión»), y `LandingPlans.vue:184`, `:198` y `:201` tiene los tres estados separados —error con botón de reintento, carga, y vacío distinto del error—, que es exactamente R05 y R14 | `escritorio/verify-email__lleno.png` |

### 2.1 · Triaje completo de los objetivos < 24 × 24 px

El arnés marca **780 apariciones** en mis once rutas (suma de las 12 capturas por ruta: 6 viewports
× 2 estados). El recuento bruto no es un hallazgo — la rúbrica §3.5 exige aplicar antes las
excepciones de §2.5.8, y aquí se llevan casi todo. Triaje exhaustivo, y las cuentas cuadran al
elemento:

**`/legal/privacidad` (166) y `/legal/terminos` (160) — los dos recuentos más altos, cero reales.**
Son los enlaces del índice de contenidos y las referencias internas del documento, de 19 px de alto.
No los salva la excepción «Inline» —un renglón de índice no está dentro de una frase— sino la **de
espaciado, y se puede calcular en vez de estimar**: `.pub-doc-toc ol` es `font-size: 0.9375rem`
(15 px, `public-auth.css:567-571`) y hereda `line-height: 1.7` de `.pub-doc` (`:479`), o sea
**25,5 px entre centros de renglón**. Un círculo de 24 px centrado en un enlace llega a 12 px de su
centro; el borde del enlace siguiente está a 16 px. **No se tocan, con 4 px de margen.** Los dos
enlaces del pie del documento (95,8 × 21 y 143 × 21) están separados por `gap: 1.25rem` en
`.pub-doc-foot` (`:634-643`): tampoco.
*Fragilidad que conviene anotar:* si alguien bajara ese `line-height` de 1,7 a 1,6, los centros
caerían a 24 px y las dos páginas legales pasarían a incumplir §2.5.8 de golpe. Es una dependencia
tácita entre una propiedad tipográfica y un criterio AA, y nadie la vigila.

**`/planes` (158) — cero reales.**

| Familia | Apariciones | Veredicto |
|---|---|---|
| `input` 20×20 (módulos), 16×16 (ciclo), 18×18 (combinaciones) | 48 + 24 + 18 = **90** | **FP.** `<label>` envolvente en los tres: `LandingSelectorModulos.vue:115-129` (con el porqué escrito en `:10-18` y `:184`), `CicloFieldset.vue:29-36`, `PlanesConfigurador.vue:129-135`. El objetivo es la fila entera |
| `input#v-4-tratamiento` / `input#v-4-transferencia`, 18×18 | 12 + 12 = **24** | **FP, y bien resuelto.** `LegalConsentCheckbox.vue:130-131` usa `<label class="pub-consent" :for="idCasilla">` que **envuelve** la casilla **y además** la referencia por `for`: doble asociación. El objetivo es el label con todo su texto |
| `a` 297,2×17 y 129,1×16, `inline=true` | 14 + 6 = **20** | **FP.** Enlaces a la política **dentro de la frase** del consentimiento → excepción «Inline» |
| `a.pub-footer-back` 101,1×18 | **12** | **FP.** Solo en su lado del pie (`PublicLayout.vue:57`, `:141-147`, `justify-content: space-between`) → excepción de espaciado |
| `a` «Inicia sesión» 77,9×16 de la barra superior | **12** | **FP.** Aislado arriba a la derecha; el texto «¿Ya tienes cuenta?» que lo precede no es objetivo → excepción de espaciado |

**`/registro` (144) — una familia real, y es H09.**

| Familia | Apariciones | Veredicto |
|---|---|---|
| Los ocho `<input>` del formulario, todos de 21 px de alto | **96** | **Reales, pero no por §2.5.8**: un objetivo de 241×21 px pasa la excepción de espaciado. Son **H03** (la altura pulsable es 21 de 41) y, en escritorio, **H01** (el ancho cae a 16,5 y 50,5 px) |
| `button.pub-banner-close` 15×15 | **12** | **El único objetivo pequeño en las dos dimensiones de toda la zona pública.** La excepción de espaciado lo salva —el control más cercano está a ~190 px—, así que no es incumplimiento AA. Es **H09** |
| `a.pub-footer-back` + `a` «Inicia sesión» ×2 (una en frase, una en la barra) | 12 + 12 + 12 = **36** | **FP**: Inline la del pie de la tarjeta, espaciado las otras dos |

**`/` (138) — cero reales.** 48 casillas de módulo (20×20) y 24 radios de ciclo (16×16) con `<label>`
envolvente, más 66 enlaces del pie (`Paquetes`, `Preguntas`, `Privacidad`, `Términos`,
`soporte@kefaro.tech`) marcados `inline=true` y además separados por `gap: 20px`
(`LandingFooter.vue:53-58`): doble excepción.

**`/login` (72) y las cuatro de recuperación (36 cada una, 24 en `/cambiar-contrasena`, 12 en
`/verify-email`)** — los mismos `<input>` de 21 px (H03) más `pub-footer-back` y los enlaces
auxiliares, todos con la excepción de espaciado. Los dos «¿Olvidaste tu código?» / «¿Olvidaste tu
contraseña?» de `/login`, pese a compartir renglón, tienen los centros a ~166 px: no se rozan.

**Dos familias que se me señalaron y que no son mías:** `a.pub-footer-back` (**78 apariciones** en
todo el repo, siempre 101,1 × 18) es **falso positivo 78 de 78**, por lo dicho arriba; y
`a.referencia` (**245**, todas `inline=true`) es falso positivo 245 de 245 **y además no aparece en
ninguna ruta pública** — vive entera en la aplicación autenticada, así que no consume cupo aquí.

**Resumen: de 780 apariciones brutas, dos familias merecen cambio** —el alto pulsable del campo
(H03, 96 en `/registro` más las de las otras seis pantallas) y la equis del banner (H09, 12)— **y
ninguna de las dos es un incumplimiento de §2.5.8 AA**, porque a las dos les aplica la excepción de
espaciado. Eso se dice tal cual: son mejoras de comodidad respaldadas por la recomendación de 44 px
de `armazon-tablet-especificacion.md` §5.6, no infracciones.

---

## 3. Qué implementar, en qué orden

Todo es de **`front-feature`** sobre `public-web`, **con una sola excepción: H07 toca
`primitives.css`, que es gemelo TR-02 y por tanto es de `front-parity`**, con réplica byte a byte
obligatoria en el admin. Ninguna otra ficha toca `tokens.css` ni `primitives.css`.

Ningún cambio sube los techos de `css-budget.config.json`: H01, H05, H06 y H08 son sustituciones de
línea; H04 cambia dos reglas por dos reglas; H03 y H09 son dos declaraciones cada uno; H02 es el
único que añade bloque, y va en el SFC de la vista, no en la capa compartida.

| Orden | Ficha | Fichero | Tamaño |
|---|---|---|---|
| 1 | H01 | `features/registration/views/SignupView.vue` | 4 líneas de CSS + 1 comentario corregido |
| 2 | H02 | `features/landing/views/PlanesView.vue`, `components/PlanesResumenAside.vue` | bloque nuevo de media query + marcado condensado |
| 3 | H03 | `components/public/AuthInput.vue` | 2 líneas |
| 4 | H04 | `features/landing/components/LandingPlans.vue`, `PlanCard.vue` | 6 líneas |
| 5 | H05 | `features/landing/components/LandingFooter.vue` | 1 línea |
| 6 | H06 | `features/landing/components/LandingValueGrid.vue` | 1 media query |
| 7 | H09 | `components/public/AuthBanner.vue` | 2 líneas |
| 8 | H08, H10, H11 | `PlanesView.vue`, `LoginView.vue`, `PlanCard.vue` | literales y una clase |
| 9 | H07 | `assets/styles/primitives.css` (**gemelo TR-02 → `front-parity`**) + `features/contratacion/components/TrialLinesTable.vue`; va junto con H06 de `uxa-armazon-y-primitivas-tenant.md` | 1 regla nueva en la primitiva + 1 atributo |
| 10 | H12 | `features/landing/components/LandingHero.vue` | un literal |

**Puertas que lo sujetarían después**, en orden de coste:

1. Una prueba de `boundingBox()` en `e2e/` para H01 (`form.reg-card` ≥ 640 px a 1440) y para H03
   (`.pub-input input` ≥ 40 px de alto). Es el patrón que `e2e/a11y-publicas.spec.ts:169-184` ya usa
   para el ojo de la contraseña: se copia, no se inventa.
2. Líneas base visuales de `/registro` y `/planes` a `escritorio` y a `movil`. Hoy la suite visual
   no fotografía ninguna de las dos (ver la nota de sesión sobre el punto ciego de la suite).
3. Una comprobación de que los tres `[data-testid="plan-card"] .pub-price` comparten `rect.top`
   a 1440 px. Cierra H04 y no se puede eludir con un retoque local.

---

## 4. Issue propuesto, redactado y **no abierto**

Se comprobó con `gh issue list --search` en `kefaroTech/vetsoftware-public-web` que no hay
duplicado: nada aparece para «registro», «reg-lane», «planes resumen», «AuthBanner» ni «pub-input».
Los más cercanos son **#280** (la landing sin entrada directa a «Crear cuenta») y **#295/#296/#298**
(el paso vinculante), y ninguno solapa.

**Título**

> El formulario de registro se pinta en una columna de 300 px en escritorio porque la rejilla le
> reserva la ranura del carril que no existe

**Cuerpo**

> `SignupView.vue:115` declara `grid-template-columns: 300px minmax(0, 1fr)` para colocar el carril
> lateral y el formulario. El carril solo se pinta con `v-if="seleccion"` o
> `v-else-if="traePropuesta"` (`:92,99`). Cuando no hay ninguno de los dos —el camino normal de
> «Crear cuenta» desde la landing, la barra superior o `/login`— la rejilla se queda con un solo
> hijo, `RegisterForm`, que se auto-coloca en la primera columna: **los 300 px fijos**. La segunda
> columna queda vacía con los ~740 px restantes.
>
> Se reproduce a 1440, 1280 y 1024 px. Por debajo de 960 px la media query `:128-131` lo colapsa a
> `1fr` y desaparece.
>
> **Lo que se ve a 1440 px:** las etiquetas «Departamento *» y «Ciudad *» se solapan y se leen
> «DepartamentoCiudad *»; los tres selects de geografía muestran una sola letra, «S»; «Correo
> fiscal», «Dirección» y «Email» muestran su placeholder truncado.
>
> **Medido**, sin depender de la captura — ancho de los `<input>` del mismo formulario:
>
> | Campo | 1440 px | 390 px |
> |---|---|---|
> | `input#reg-password` | **16,5 × 21** | 207 × 21 |
> | `input#reg-company-identifier` | **50,5 × 21** | 241 × 21 |
> | `input#reg-fiscal-email` | **50,5 × 21** | 241 × 21 |
> | `input#reg-company-contact-number` | **50,5 × 21** | 241 × 21 |
> | `input#reg-employee-email` | **50,5 × 21** | 241 × 21 |
> | `input#v-9` (dirección) | **50,5 × 21** | 241 × 21 |
> | `input#reg-company-name` | 167 × 21 | 241 × 21 |
> | `input#reg-employee-name` | 167 × 21 | 241 × 21 |
>
> El campo de contraseña del alta mide **16,5 px de ancho en un monitor de 1440 y 207 px en un móvil
> de 390**: 12,5 veces más estrecho en escritorio que en el teléfono, y no cabe ni un carácter. Y el
> formulario entero mide **1818 px de alto en 1440×900 frente a 1578 px en 760×1024**: la versión de
> escritorio es 240 px más alta que la de móvil.
>
> **Arreglo propuesto:** que la base de `.reg-lane` sea `grid-template-columns: 1fr` y que las dos
> columnas se activen solo cuando exista el carril, con `.reg-lane:has(> aside)` o con una clase
> condicional en el `<div>`.
>
> **Nota aparte:** el comentario de `:89-90` dice que «en escritorio la rejilla lo coloca a la
> derecha», y es falso: con `300px 1fr` y el `<aside>` primero en el DOM, el carril cae en la
> columna izquierda. Ni `SeleccionAside.vue` ni `RegisterForm.vue` declaran `grid-column` ni
> `order`.
>
> **Verificación:** una prueba de `boundingBox()` sobre `form.reg-card` a 1440 px exigiendo
> `width >= 640`, más una línea base visual de `/registro` a escritorio — hoy la suite visual no
> fotografía esta pantalla.
