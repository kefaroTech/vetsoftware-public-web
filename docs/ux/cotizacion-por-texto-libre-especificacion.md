# Cotización por texto libre — especificación de rediseño de landing, `/planes` y paso vinculante

**Repositorio:** `VetSoftwarePublicFront` (app del tenant, zona pública)
**Fecha:** 2026-08-31
**Autor:** auditoría de diseño y experiencia (solo lectura sobre `src/`)
**Implementa:** `front-feature`
**Estado:** especificación aprobable. Ninguna línea de `src/` se ha tocado al escribirla.

---

## 0. La frase que resume el cambio

> Hoy el producto **dice** «paga solo lo que uses» y la pantalla **ofrece primero** tres paquetes
> cerrados. Después de este cambio, lo primero que ve, lee y puede tocar un prospecto —en la
> landing y en `/planes`— es **una caja donde cuenta qué hace su clínica**; los paquetes siguen
> ahí, completos y con su precio, pero como **segunda vía rotulada como tal**.

Lo que **no** cambia: no se quita ningún paquete, no se crea ninguna ruta nueva, no se toca el
contrato de API, no se rompe la banda de continuación ni el aterrizaje del enlace de correo con
token, y no se sube ningún techo del presupuesto de CSS.

---

## Índice

1. [El terreno medido](#1-el-terreno-medido)
2. [Investigación: qué dice la evidencia](#2-investigación-qué-dice-la-evidencia)
3. [Auditoría de las tres pantallas](#3-auditoría-de-las-tres-pantallas)
4. [La especificación](#4-la-especificación)
5. [Textos exactos](#5-textos-exactos)
6. [Contrato de accesibilidad de las piezas nuevas](#6-contrato-de-accesibilidad-de-las-piezas-nuevas)
7. [Presupuesto de CSS: el reparto, con cifras medidas](#7-presupuesto-de-css-el-reparto-con-cifras-medidas)
8. [Lo que NO se toca](#8-lo-que-no-se-toca)
9. [Cómo se verifica](#9-cómo-se-verifica)
10. [Riesgos, no-objetivos y lo no ejecutado](#10-riesgos-no-objetivos-y-lo-no-ejecutado)

---

## 1. El terreno medido

Todo lo de esta sección está verificado leyendo el árbol el 2026-08-31. Donde hay una cifra, está
medida, no estimada.

### 1.1 Orden real de la landing

`src/features/landing/views/LandingView.vue:141-168`:

```
LandingTopbar
ResumeIntentBanner   (condicional)
<main id="contenido">
  LandingHero        → h1 + subtítulo + 2 CTA + 3 señales de confianza
  LandingValueGrid   → h2 «Lo que dejas de hacer a mano», 4 tarjetas
  LandingDayFlow     → h2 «Un día, de principio a fin», <ol> de 4 pasos
  LandingPlans       → h2 «Planes», conmutador de ciclo, 3 PlanCard, nota, enlace
  LandingFaq         → h2, 6 <details>
  LandingFinalCta    → h2 «Empieza hoy. Sin tarjeta.», 2 CTA
LandingFooter
```

**El texto libre no aparece en ninguna de las seis secciones.** La única superficie que insinúa
otra cosa que «elige un paquete» es el enlace `Comparar los tres planes en detalle`
(`LandingPlans.vue:90`), que lleva a `/planes` — donde el asistente sí está, pero eso no se
anuncia en ninguna parte de la landing.

### 1.2 `/planes` — dos superficies, un orden que las contradice

`src/features/landing/views/PlanesView.vue:108-163`:

| Orden DOM | Qué es | Peso visual |
|---|---|---|
| `h1` «Armemos el plan de tu clínica» | encabezado | `.pub-title` |
| `<p>` «Cuéntanos con tus palabras…» | subtítulo | `.pub-sub` |
| `<p>` moneda | letra pequeña | 12,5 px |
| `<AsistentePanel>` → `<AsistenteEntrada>` | **la entrada de texto libre** | `<label>` de **13 px**, sin encabezado propio |
| `<details open>` → `<summary>` «O elige uno de nuestros tres paquetes» | los paquetes | `<summary>` de **16 px, peso 700** |
| `<PlanesConfigurador>` | 3 tarjetas + ciclo + 2 números + importe grande | el bloque más pesado de la página |

El razonamiento de una sola ruta (`PlanesView.vue:25-38`) es correcto y **se conserva**: partir el
embudo en dos URLs obligaría a mantener dos pantallas de precio y haría ilegible la analítica del
paso 2. Lo que no se sostiene es la **jerarquía dentro** de esa ruta: el rótulo del contenido
principal pesa 13 px y el del contenido secundario pesa 16 px en negrita.

### 1.3 El paso vinculante

`src/features/contratacion/views/ContratarView.vue:107` — `h1` «Confirma tu plan».
`ContratarView.vue:144-155` — la rama de **recuperación**, cuando la intención se perdió:

```
<p class="ds-subtitle">Vamos a elegir el plan de tu clínica. Te lleva un minuto.</p>
<PlanesConfigurador … />
```

Esa rama se alcanza también con `motivoSinPropuesta === 'PERDIDA'` (`ContratarView.vue:123-132`),
es decir, **justo cuando el prospecto acaba de perder una propuesta a medida**. La única salida
que se le ofrece es el selector de paquetes. No hay un solo enlace de vuelta a `/planes` para
volver a escribir.

### 1.4 El estado real del asistente hoy

`src/features/asistente/api/asistente.source.ts:412-425`:

```
OUT_OF_DOMAIN  → FUERA_DE_DOMINIO
PROPOSAL       ─┐
DETERMINISTIC  ─┴→ misma clase «propuesta»   ← ⚠️
NOT_UNDERSTOOD → NO_ENTENDIDO (con aviso)
```

`PROPOSAL` y `DETERMINISTIC` **colapsan en la misma clase**, así que el front no puede
distinguirlas. Consecuencia con el acceso al modelo deshabilitado: el servidor responde
`DETERMINISTIC`, `origenDe()` (`asistente.source.ts:233-241`) marca las líneas como `BASE`, y la
pantalla las pinta bajo el encabezado **«Tu propuesta»** (`AsistentePanel.vue:275`) **sin un solo
aviso**. El aviso de `NO_ENTENDIDO` (`AsistentePanel.vue:277-285`) no cubre este caso.

Y la primera frase de la espera (`copy.content.ts:83`) es literalmente
**«Estamos leyendo lo que nos contaste.»** — hoy, en el 100 % de los casos, eso es falso.

### 1.5 Cifras del presupuesto de CSS — **medidas, no supuestas**

`node scripts/css-budget.mjs` sobre el árbol actual, ejecutado el 2026-08-31:

```
SFC analizados            389
Líneas <style>            22174
Líneas <script>           26247
Distancia style − script  -4073 (techo 0)
Cuerpos repetidos en >3 componentes  0 (techo 0)
SFC de más de 500 líneas   0 (techo 0)

FE-08 · presupuesto de CSS respetado
```

**Esto corrige la premisa del encargo.** La restricción `maxStyleMinusScript: 0` es un **agregado
de todo el repo**, y ese agregado tiene **4.073 líneas de holgura**. El presupuesto global **no es**
la restricción que muerde en este cambio. Las que sí muerden son las otras dos:

- **`maxSfcLines: 500` con `maxOversizedSfc: 0`** — cero excepciones. Tamaños actuales relevantes:
  `AsistentePanel.vue` **464** (36 de margen), `PlanesConfigurador.vue` 485 (15 de margen),
  `ContratarView.vue` 318, `AsistenteEntrada.vue` 308, `PlanesView.vue` 226, `LandingView.vue` 214,
  `LandingHero.vue` 148.
- **`maxDuplicateBodies: 3` / `maxDuplicateGroups: 0`** — un cuerpo de regla idéntico en más de 3
  componentes rompe el gate. `.land-cta`, `.land-cta--primary` y `.land-cta--ghost` ya viven
  duplicados en `LandingHero.vue:103-125` y `LandingFinalCta.vue:38-60`: **van por la segunda
  copia de tres permitidas**. Cualquier pieza nueva que copie ese botón acerca el gate al rojo.

---

## 2. Investigación: qué dice la evidencia

Cinco preguntas del encargo, con la fuente que las responde. Prefiero pocas y buenas; las que cito
las he consultado, no recordado.

### 2.1 Cómo se le pide a alguien que escriba en una caja vacía sin que la abandone

**Lo que funciona, por orden de fuerza de la evidencia:**

1. **Entradas preformuladas y pulsables que RELLENAN el campo.** Es el patrón **1D «Demonstrate
   possible system inputs»** del HAX Toolkit de Microsoft, la síntesis de más de veinte años de
   investigación en interacción persona-IA. Su enunciado literal: *«Show possible user inputs to
   demonstrate to the user what the system can do»*, y su criterio de uso incluye exactamente
   nuestro caso — *«users struggle to discover system capabilities»* y *«guiding input toward what
   the system understands more easily»*. Entre sus formas admitidas está la de *«clickable
   preformulated user inputs»*.
   El repositorio **ya tiene ese patrón implementado y razonado**: `RELLENOS_RAPIDOS`
   (`copy.content.ts:69-73`), con la nota de que **rellenan, no envían**, «un botón que dispara una
   llamada de pago con un texto que el usuario no ha leído es un gasto que él no autorizó». La
   especificación no inventa nada: **extiende ese patrón desde el cuadro de refinamiento hasta la
   primera caja**, que es donde el folio en blanco duele.

2. **Ejemplos AMPLIOS, no de nicho.** NN/g, estudio cualitativo de 6 participantes sobre 3
   asistentes: los prompts de ejemplo demasiado específicos *fueron ignorados*, y los usuarios
   ignoran *«information that doesn't seem immediately relevant»*. Su recomendación es usar
   ejemplos generales, que son *«more inviting for newcomers»*. Traducción a esta pantalla: los
   ejemplos deben ser situaciones de clínica reconocibles por cualquiera («consulta general,
   vacunas»), no casos raros («manejo de exóticos con protocolo de anestesia inhalada»).

3. **Texto de ayuda que enseña la FORMA de la respuesta, fuera del `placeholder`.** GOV.UK: *«Use
   hint text to show information that helps the majority of users answer the question»* y *«Keep
   each hint to a single short sentence»*. `AsistenteEntrada.vue:174-179` ya lo hace bien y deja
   escrito por qué el ejemplo no va en el `placeholder`. **Se replica literalmente, no se
   reinventa.**

4. **Longitud mínima insinuada, no impuesta.** `MIN_DESCRIPCION = 15` y su javadoc
   (`copy.content.ts:11-26`) ya resuelven esto con el argumento correcto: un umbral de 40 «castiga
   a quien escribe bien y corto, que es exactamente el usuario con prisa que este producto tiene».
   La insinuación va en la ayuda («Una o dos frases bastan»), **no** en un contador ni en un
   `minlength`.

**Lo que la evidencia dice sobre el tamaño del problema:** en el estudio de NN/g sobre chatbots de
sitio (9 usuarios moderados, sesiones de 60 min, 8 chatbots), los participantes *«rarely used site
AI chatbots, often didn't notice them»* y, sobre todo, **no experimentan para descubrir el valor**:
*«users wouldn't experiment to discover a chatbot's value»*. Un mensaje de bienvenida vago como
*«find any info you need»* no basta. La conclusión aplicable es dura: **si la caja no dice, con
ejemplos concretos, qué va a salir de ella, la mayoría no escribirá nada.**

### 2.2 Cómo se comunica la espera cuando detrás hay un modelo

Los umbrales de NN/g, sin adornos: indicador **por encima de ~1 s**; indicador indeterminado
(«looped») **reservado para 2–10 s**; barra con porcentaje **solo a partir de 10 s**; y para
acciones que se alargan, *«give users the option to stop the process, in case they decide they
cannot wait»*.

`AsistenteEspera.vue` **ya cumple esto y su javadoc lo razona mejor que la mayoría de los sistemas
de diseño**: una sola región `role="status"` con tres frases escalonadas (0 s / 3 s / 8 s), botón
de cancelar a los 8 s adelantado a propósito, sin barra de porcentaje inventada («cuando llega al
90 % y se queda, el usuario aprende que la aplicación miente»), y `skipGlobalLoader` para que el
prospecto pueda releer su texto durante la espera. **No se toca su mecánica.**

Lo único que falla es de **contenido, no de mecánica**: la frase de los 0 s afirma que se está
leyendo el texto (§1.4). Se corrige en §5.

### 2.3 Cómo se ofrece la alternativa determinista sin que compita

Tres criterios, y ninguno es «esconderla»:

- **No se esconde lo que la mayoría necesita.** GOV.UK sobre el componente `details`: *«Do not use
  the details component to hide information that the majority of your users will need.»* El precio
  es exactamente eso. El propio `PlanesView.vue:32-38` ya lo tiene escrito: los paquetes son el
  ancla de precio, y el flujo a medida «pide escribir un párrafo y esperar unos segundos **antes de
  ver una sola cifra**». Ese argumento es correcto y se conserva.
- **Pero tampoco se deja un `<details open>` estático.** NN/g sobre divulgación progresiva: la
  progresión al segundo nivel debe hacer falta *«on rare occasions»*, y advierte contra ofrecer
  *«multiple ways to progress to secondary options»*. Un `<details>` que siempre está abierto no es
  divulgación progresiva: es **un control sin estado que valga la pena alternar**, más un
  `<summary>` que finge ser encabezado sin serlo. Se sustituye por una `<section>` con `<h2>` de
  verdad (§4.3).
- **La jerarquía la hacen el ORDEN, el TIPO y el LENGUAJE, no el ocultamiento.** Es lo único que
  cambia de sitio: la caja de texto sube a peso de encabezado y los paquetes bajan a peso de
  sección secundaria, con una frase que los rotula como lo que son («ya armados», «cerrados»).

### 2.4 Cómo se gana confianza para escribir sobre el propio negocio en un formulario anónimo

- **Tranquilizar PEGADO al campo, no en el pie.** Baymard: la microcopia de tranquilidad junto al
  input sensible es lo que retira la objeción; su estudio de seguridad atribuye ~19 % del abandono
  a preocupaciones de confianza. El repositorio ya lo aplica en el correo
  (`AsistenteEntrada.vue:199-201`: «Te llega un enlace… No mandamos publicidad»).
- **Decir POR QUÉ se pregunta.** GOV.UK: *«make sure it's clear to users why you're asking each
  question»*.
- **No pedir el correo antes de que haya escrito.** Ya está razonado en
  `AsistenteEntrada.vue:15-20` y **es correcto**: pedirlo antes convierte la pantalla en un muro de
  captura de lead. La consecuencia de diseño para la landing es directa: **la caja del hero no pide
  correo y no envía nada.**
- **Ser franco sobre lo que el sistema puede y no puede hacer.** PAIR (Google): *«Be up-front about
  what your product can and can't do the first time the user interacts with it»*, y explícitamente
  **contra** el mensaje de tipo *«the only intelligent running app that uses deep neural machine
  learning»*. HAX **G2 — Make clear how well the system can do what it can do** — advierte que
  expectativas infladas producen *«frustration and even product abandonment»*.

### 2.5 Qué patrones fracasan — la parte más útil

| Patrón | Por qué fracasa | Fuente |
|---|---|---|
| **Convertir la cotización en un chat** | En el ensayo de usabilidad contrabalanceado de formularios sanitarios (20 profesionales, 60 pruebas, tres formatos), el formulario **de una sola página** obtuvo **SUS 76 (DE 15)**; el multipágina **67 (DE 17)**; el **conversacional, 57 (DE 24)** — y **83 errores con severidad media 3,0**, frente a **21 errores con severidad 1,76** del de una página. Conclusión de los autores: *«The digital single-page form outperformed the other two forms in almost all usability metrics.»* | JMIR / PMC8190652 |
| **Placeholder como etiqueta o como ejemplo** | Desaparece al escribir y se lee como valor ya introducido. Ya rechazado en `AsistenteEntrada.vue:174-175`. | práctica del repo + GOV.UK (hint ≠ placeholder) |
| **Respuestas largas y charlatanas** | *«It's just too wordy… I don't like reading all of that»*; el relleno cordial (*«'Great question!' and that kind of stuff, which drives me crazy»*) irrita. Los usuarios quieren la respuesta escaneable: listas, negrita, párrafos de 2–3 frases. | NN/g, *Less Chat, More Answer* |
| **Barra de progreso inventada** | Ya prohibido y razonado en `AsistenteEspera.vue:30-32`. Coincide con NN/g: el porcentaje solo cuando se conoce. | NN/g |
| **Ejemplos de nicho** | Fueron ignorados en el estudio; los usuarios descartan lo que no parece inmediatamente relevante. | NN/g, *New Users Need Support with Generative-AI Tools* |
| **Prometer lectura del texto cuando no la hay** | Es §1.4 de este documento y es el defecto más grave abierto hoy. | HAX G2, PAIR |
| **Ocultar el precio detrás del camino a medida** | Quien recorre el túnel y sale con una cifra fuera de presupuesto «se va habiendo trabajado gratis» — ya escrito en `PlanesView.vue:32-38`; el efecto de anclaje sostiene que la primera cifra vista fija el punto de referencia del juicio de precio. | razonamiento del repo + literatura de anclaje |

### 2.6 La decisión que la evidencia FUERZA

El hallazgo del ensayo JMIR es el que manda sobre la forma de la caja:

> **La entrada de texto libre se implementa como FORMULARIO —etiqueta visible, ayuda, `<textarea>`,
> botón de envío—, no como conversación.** Nada de burbujas, nada de «Hola, soy tu asistente»,
> nada de preguntas encadenadas de una en una.

Lo que se toma del mundo conversacional es **una sola cosa**: la caja de texto libre como puerta
principal. Todo lo demás —estructura, validación, foco, errores— sigue siendo el patrón de
formulario que este repositorio ya tiene documentado y probado.

### 2.7 Fuentes

| # | Fuente | URL |
|---|---|---|
| F1 | Microsoft HAX Toolkit — Pattern 1D, *Demonstrate possible system inputs* | https://www.microsoft.com/en-us/haxtoolkit/pattern/g1-d-demonstrate-possible-system-inputs/ |
| F2 | Microsoft HAX Toolkit — G2, *Make clear how well the system can do what it can do* | https://www.microsoft.com/en-us/haxtoolkit/guideline/make-clear-how-well-the-system-can-do-what-it-can-do/ |
| F3 | NN/g — *New Users Need Support with Generative-AI Tools* | https://www.nngroup.com/articles/new-AI-users-onboarding/ |
| F4 | NN/g — *What Is Your Site's AI Chatbot for? Users Can't Tell* | https://www.nngroup.com/articles/site-ai-chatbot/ |
| F5 | NN/g — *Less Chat, More Answer* | https://www.nngroup.com/articles/less-chat-more-answer/ |
| F6 | NN/g — *Progress Indicators Make a Slow System Less Insufferable* | https://www.nngroup.com/articles/progress-indicators/ |
| F7 | NN/g — *Progressive Disclosure* | https://www.nngroup.com/articles/progressive-disclosure/ |
| F8 | GOV.UK Design System — *Question pages* | https://design-system.service.gov.uk/patterns/question-pages/ |
| F9 | GOV.UK Design System — *Details* | https://design-system.service.gov.uk/components/details/ |
| F10 | Google PAIR, People + AI Guidebook — *Mental Models* | https://pair.withgoogle.com/chapter/mental-models/ |
| F11 | JMIR — *Comparing Single-Page, Multipage, and Conversational Digital Forms in Health Care: Usability Study* | https://pmc.ncbi.nlm.nih.gov/articles/PMC8190652/ |
| F12 | WCAG 2.2 (Recommendation) | https://www.w3.org/TR/WCAG22/ |

---

## 3. Auditoría de las tres pantallas

Once hallazgos, ordenados por severidad, no por fichero.

---

### H-01 · **Bloqueante** · La pantalla dice «Tu propuesta» sobre un carrito que nadie leyó

`src/features/asistente/api/asistente.source.ts:421` · `AsistentePanel.vue:275`

**Criterio:** HAX **G2** (F2) — *«Make clear how well the system can do what it can do»*; PAIR (F10)
— *«Be up-front about what your product can and can't do»*; heurística de Nielsen nº 1 (visibilidad
del estado del sistema).

**Impacto:** con el acceso al modelo deshabilitado —**el estado de hoy**— el servidor devuelve
`DETERMINISTIC`, el adaptador lo colapsa con `PROPOSAL` en la misma clase, y el prospecto ve su
párrafo arriba y debajo un encabezado que dice **«Tu propuesta»**. Nadie leyó su texto. Es la
promesa central del rediseño incumplida en silencio, en la pantalla que decide la compra, para el
100 % de los usuarios actuales. Y tiene coste de negocio directo: quien cree que se le leyó no
revisa las líneas, y contrata módulos que no va a usar — exactamente lo contrario del objetivo del
dueño.

**Arreglo:** ampliar el discriminante `ResultadoPropuesta` (`asistente.types.ts:370`) con
`leyoElTexto: boolean`, poblado en `asistente.source.ts:421` con
`respuesta.presentation === 'PROPOSAL'`. **No requiere cambio de contrato**: el campo ya llega. En
`false`, pintar el aviso de origen (§4.5) por encima de `PropuestaTabla`. Texto exacto en §5.

---

### H-02 · **Bloqueante** · La landing no ofrece el camino principal en ninguna de sus seis secciones

`LandingView.vue:153-166`

**Criterio:** heurística de Nielsen nº 2 (correspondencia entre el sistema y el mundo real) y nº 4
(consistencia); F4 — los usuarios **no experimentan** para descubrir el valor de una superficie que
no se les anuncia.

**Impacto:** el único camino que la landing enseña es «elige uno de tres paquetes». Quien no encaja
en ninguno se va, y quien encaja contrata de más. El asistente existe, funciona y está enrutado —
pero está a un clic no rotulado (`LandingPlans.vue:90`, «Comparar los tres planes en detalle»,
que además promete comparar planes, no describir tu clínica).

**Arreglo:** §4.2 — nuevo `LandingCotizador.vue` dentro del hero, por encima de todo lo demás.

---

### H-03 · **Grave** · En `/planes`, el rótulo del contenido secundario pesa más que el del principal

`PlanesView.vue:151` (`<summary>`, 16 px / 700) contra `AsistenteEntrada.vue:173` (`<label>`,
13 px / 600)

**Criterio:** WCAG 2.2 **§1.3.1 Info and Relationships (A)** — la importancia relativa que
transmite la presentación no está en la estructura; heurística nº 6 (reconocer antes que recordar).

**Impacto:** el ojo llega antes al bloque de paquetes que a la caja de texto, y el lector de
pantalla que navega por encabezados (**el modo de navegación mayoritario**) encuentra un solo
`<h1>` y ningún `<h2>` hasta el bloque de paquetes — porque `<summary>` **no es un encabezado**. Es
decir: **para un usuario de lector de pantalla, el contenido principal de `/planes` no existe en el
esquema de la página.** *Blast radius:* una pantalla, pero es el paso 2 de todo el embudo.

**Arreglo:** §4.3 — `<h2>` real para la entrada, `<h2>` real para los paquetes, `<details>`
sustituido por `<section aria-labelledby>`.

---

### H-04 · **Grave** · La recuperación de una propuesta perdida solo ofrece paquetes

`ContratarView.vue:124-155`

**Criterio:** heurística nº 3 (control y libertad del usuario) y nº 9 (ayudar a recuperarse de los
errores); GOV.UK (F8) — no obligar a rehacer trabajo ya hecho.

**Impacto:** el usuario perdió lo más caro que le pedimos —un párrafo sobre su negocio y una
espera— y la pantalla, cuyo propio comentario dice «un usuario que perdió un borrador no cometió
ningún fallo», le responde con el selector de paquetes y la frase **«Vamos a elegir el plan de tu
clínica»**. La salida que el aviso nombra («Vuelve a armarla desde el mismo equipo») **no tiene
enlace**: hay que teclear la URL.

**Arreglo:** §4.4 — enlace primario «Volver a contarnos qué necesitas» → `/planes`, colocado
**antes** del selector, y subtítulo reescrito.

---

### H-05 · **Grave** · La espera afirma leer un texto que no se lee

`src/features/asistente/content/copy.content.ts:83`

**Criterio:** HAX G2 (F2); heurística nº 1.

**Impacto:** «Estamos leyendo lo que nos contaste» es, hoy, falso siempre. Es una mentira pequeña y
por eso peor: instala la expectativa que H-01 luego incumple.

**Arreglo:** §5, fila E-1. Cambio de una constante, cero riesgo.

---

### H-06 · **Grave** · El copy de la landing y del paso vinculante habla de «elegir plan», no de «decir qué necesitas»

`LandingHero.vue:44` («Ver los planes») · `LandingPlans.vue:41-42` («Planes» / «Elige por el tamaño
de tu clínica») · `LandingFinalCta.vue:20-22` · `PlanesView.vue:114` · `ContratarView.vue:107,144`

**Criterio:** heurística nº 2 y nº 4. El lenguaje **es** la jerarquía: seis superficies distintas
enseñan al prospecto que la unidad de compra es el paquete.

**Impacto:** aunque se mueva la caja de texto arriba, el vocabulario de toda la zona pública sigue
diciendo lo contrario. En particular **«Elige por el tamaño de tu clínica, no por una lista de
funciones»** (`LandingPlans.vue:42`) es la negación literal del objetivo del dueño.

**Arreglo:** §5, tabla completa de textos.

---

### H-07 · **Grave** · El `<summary>` estático es un control de divulgación sin nada que divulgar

`PlanesView.vue:150-162`

**Criterio:** F7 (NN/g, divulgación progresiva: el segundo nivel debe necesitarse *«on rare
occasions»*, y no ofrecer varias vías al mismo contenido) y F9 (GOV.UK: `details` no es para lo que
la mayoría necesita). APG *Disclosure*: un disclosure tiene sentido cuando el estado plegado es un
estado útil.

**Impacto:** el atributo `open` es estático porque «abierto en escritorio y cerrado en móvil no se
puede expresar con un atributo estático» (comentario en `PlanesView.vue:146-149`). El resultado es
un control que solo puede empeorar la página: cerrarlo destruye el ancla de precio, y quien lo
cierra sin querer pierde los precios sin saber cómo volver.

**Arreglo:** §4.3.

---

### H-08 · **Menor** · El CTA principal del hero y el del cierre apuntan al camino secundario

`LandingHero.vue:44` · `LandingFinalCta.vue:20-22`

**Criterio:** heurística nº 6; el CTA primario **define** cuál es el camino principal.

**Impacto:** dos botones sólidos morados, con la máxima prominencia de la página, que dicen «Ver
los planes». Mientras eso siga así, cualquier caja de texto que se añada arriba es decoración.

**Arreglo:** §4.2 y §4.6.

---

### H-09 · **Menor** · La caja de texto no ofrece ninguna entrada preformulada

`AsistenteEntrada.vue:169-196`

**Criterio:** HAX Pattern **1D** (F1); F3 (ejemplos amplios).

**Impacto:** el folio en blanco. La ayuda enumera **seis dimensiones** («qué atiendes, si tienes
quirófano, si vendes alimento, si haces baños, cuántas sedes y cuántas personas trabajan») en una
frase de 24 palabras: eso es una lista de deberes, no un arranque. El patrón que lo resuelve **ya
existe en el repositorio** (`RELLENOS_RAPIDOS`, `copy.content.ts:58-73`) pero solo en el cuadro de
refinamiento, es decir, **solo se le ofrece a quien ya superó el folio en blanco**.

**Arreglo:** §4.2 (landing) y §4.3 (`/planes`), con la misma mecánica de rellenar-sin-enviar.

---

### H-10 · **Menor** · La espera puede parpadear en el camino determinista

`AsistenteEspera.vue:60-65` · `PawLoader.vue` · `PageLoader.vue`

**Criterio:** F6 — indicador solo por encima de ~1 s.

**Impacto:** verificado: **ni `PawLoader.vue` ni `PageLoader.vue` contienen ninguna guarda temporal**
(cero `setTimeout`). La respuesta determinista puede volver en decenas de milisegundos, y
`v-if="esperando"` monta y desmonta el bloque entero — un destello con salto de maquetación en la
pantalla más importante del embudo.

**Arreglo:** §4.5, punto 3.

---

### H-11 · **Nota** · `#planes` tiene el patrón de ancla con foco bien resuelto y hay que copiarlo, no reinventarlo

`LandingHero.vue:22-28` + `LandingPlans.vue:39,171-173`

**Criterio:** WCAG 2.2 §2.4.3 Focus Order (A).

**Impacto:** ninguno hoy; es la referencia. `irAPlanes()` mueve el **foco** además del scroll, y el
destino lleva `tabindex="-1"` con `:focus { outline: none }`. La pieza nueva debe usar exactamente
ese patrón para su propia ancla `#cotizador`.

---

## 4. La especificación

### 4.0 El principio rector, y las tres reglas que lo hacen operativo

> **Regla 1 — Orden.** En la landing y en `/planes`, la caja de texto libre aparece **antes** que
> cualquier tarjeta de paquete, en el orden del DOM y en el visual, que son el mismo. Nada de
> reordenar con rejilla (§1.3.2).
>
> **Regla 2 — Tipo.** El rótulo de la caja de texto es un **encabezado real** (`<h2>` en `/planes`,
> `<label>` a escala de encabezado en el hero). El rótulo de los paquetes nunca pesa más que él.
>
> **Regla 3 — Lenguaje.** El camino principal se nombra con verbos del usuario («cuéntanos»,
> «qué necesitas»); el secundario se nombra con lo que es («paquetes ya armados», «cerrados»).
> Ninguna superficie pública vuelve a decir «elige un plan» como acción primaria.

---

### 4.1 Mapa del cambio

| Fichero | Acción | Δ líneas aprox. |
|---|---|---|
| `src/features/landing/components/LandingCotizador.vue` | **NUEVO** | +150 (≈70 style / ≈55 script) |
| `src/features/landing/components/LandingHero.vue` | monta el cotizador; degrada «Ver los planes» a enlace | +6 / −8 |
| `src/features/landing/components/LandingPlans.vue` | reescribe el encabezado de sección y la nota | ±0 |
| `src/features/landing/components/LandingFinalCta.vue` | invierte los dos CTA | ±0 |
| `src/features/landing/views/PlanesView.vue` | `<details>` → `<section>` + `<h2>`; nuevo `h1`/subtítulo; foco al llegar sembrado | +12 / −18 |
| `src/features/asistente/components/AsistenteEntrada.vue` | `<h2>` propio + fila de ejemplos pulsables | +30 |
| `src/features/asistente/components/PropuestaOrigenAviso.vue` | **NUEVO** (aviso de origen, §4.5) | +55 |
| `src/features/asistente/components/AsistentePanel.vue` | monta el aviso de origen | **+3, ni una más** |
| `src/features/asistente/content/copy.content.ts` | `EJEMPLOS_COTIZADOR`, frase de espera, textos compartidos | +40 |
| `src/features/asistente/api/asistente.source.ts` + `asistente.types.ts` | `leyoElTexto` en el discriminante | +12 |
| `src/features/asistente/stores/propuesta.store.ts` | propaga `leyoElTexto` | +4 |
| `src/features/contratacion/views/ContratarView.vue` | enlace de vuelta + copy | +8 |

---

### 4.2 Landing — `LandingCotizador.vue` (pieza nueva)

#### 4.2.1 Qué es y qué NO es

Es **la caja de arranque**, no el asistente. Su única responsabilidad:

1. recoger el texto del prospecto,
2. dejarlo en `propuesta.store.texto` (que ya existe: `propuesta.store.ts:60`, `ref('')` en
   memoria),
3. navegar a `/planes`.

**No llama a ninguna API. No pide correo. No pide consentimiento. No genera propuesta.** Esto no es
una simplificación: es un requisito legal y de conversión.

- **Legal.** El texto libre viaja a un encargado en EE. UU., y eso exige dos autorizaciones
  separadas (Ley 1581 art. 9 y art. 26 lit. a) que ya están razonadas e implementadas en
  `AsistenteEntrada.vue:22-28`. Duplicarlas en el hero de la landing sería un muro de
  consentimiento sobre el primer pliegue; **no duplicarlas y enviar sería ilegal.** Por eso el
  texto **no sale del navegador** hasta `/planes`.
- **Conversión.** `AsistenteEntrada.vue:15-20` ya deja escrito que pedir el correo antes de que el
  prospecto haya escrito una palabra dispara el abandono. El mismo argumento aplica al
  consentimiento.
- **Arquitectura.** Se conserva intacta la decisión de `PlanesView.vue:25-38`: **una sola URL para
  el embudo, una sola pantalla de precio.** El hero es el pórtico, `/planes` sigue siendo el paso 2.

#### 4.2.2 Marcado exacto

Orden del DOM, que es el visual:

```
<section id="cotizador" tabindex="-1" class="land-cotizador">
  <form  (@submit.prevent)>
    <label for=…>            ← escala de encabezado (ver §4.2.4)
    <p id=…-ayuda>           ← una frase corta
    <textarea id=… rows="3" :maxlength="MAX_DESCRIPCION"
              :aria-describedby="…-ayuda [ …-error ]"
              :aria-invalid="…" />
    <p v-if="error" id=…-error role="alert">
    <p id=…-ejemplos-label>   ← «O empieza por aquí:»
    <ul aria-labelledby=…-ejemplos-label>
      <li><button type="button">  ×3   ← RELLENAN, no envían
    </ul>
    <button type="submit" class="ds-btn ds-btn--primary">
    <p class="…-tranquilidad">  ← microcopia de confianza
  </form>
  <p class="…-alterna">        ← enlace a #planes
</section>
```

#### 4.2.3 Comportamiento, caso por caso

| Situación | Qué hace | Por qué |
|---|---|---|
| Caja **vacía** + submit | Navega a `/planes` **sin error**. | El hero no puede ser una puerta cerrada. Quien solo mira debe poder avanzar; el mismo campo, más grande, le espera en el destino. Un error en el primer pliegue es un castigo por no haber decidido todavía. |
| Texto **no vacío pero < `MIN_DESCRIPCION` (15)** + submit | Error en línea, **no navega**, foco al `<textarea>`. | Lo intentó. Arreglarlo aquí cuesta un segundo; arreglarlo tras una navegación es una regañina en otra pantalla. GOV.UK (F8): el error se muestra al enviar, nunca al teclear. |
| Texto **válido** + submit | Escribe `texto` en el store y `router.push({ name: 'planes' })`. | Cero llamadas, cero espera. |
| Clic en un **ejemplo** | **Añade** al final del texto existente (con `' '` de separación si ya había algo); si estaba vacío, lo escribe. Después **mueve el foco al `<textarea>` con el cursor al final**. | HAX 1D (F1) + la regla del repo: rellenar, no enviar. **Nunca destruye texto tecleado** — es la prioridad nº 1 de esta aplicación. El salto de foco es lo que hace que un lector de pantalla anuncie el nuevo valor y que quien lo pulsó pueda seguir escribiendo; es un cambio de foco **esperado** tras una acción explícita, así que no infringe §3.2.2. |
| **Sin JavaScript / error de navegación** | El enlace «ver los tres paquetes» sigue siendo un ancla real a `#planes`. | La landing no puede depender del cotizador para enseñar precio. |

**Validación:** ni una comprobación mientras se teclea. Se marca `touched` al enviar (no al `blur`,
porque en una caja del hero el `blur` ocurre constantemente al mirar la página). Es una desviación
consciente de la convención `@blur` del repositorio y se documenta en el javadoc del componente.

#### 4.2.4 Jerarquía visual — los números

| Elemento | Antes | Después |
|---|---|---|
| `h1` del hero | `clamp(36px, 5.2vw, 62px)`, serif | **sin cambio** |
| Subtítulo | 16,5 px | **sin cambio** |
| **Etiqueta del cotizador** | — | **20 px / 700**, color `--pub-ink-900` |
| Ayuda del cotizador | — | 13 px, `--pub-ink-600` |
| `<textarea>` | — | **16 px** (por debajo, iOS hace zoom al enfocar), borde **2 px `--pub-ame-600`** |
| Botón de envío | — | `.ds-btn.ds-btn--primary`, `min-block-size: 48px` |
| **«Ver los planes»** | botón sólido morado, 48 px | **enlace de texto**, 14 px, bajo el bloque |
| «Ya tengo cuenta» | botón fantasma | **sin cambio** |

El borde de 2 px sobre `--pub-ame-600` se copia de `AsistenteEntrada.vue:263-268`, donde ya está
razonado contra **WCAG §1.4.11 No-text Contrast (AA, 3:1)**: `--pub-line` da 1,23:1 y no vale para
el borde de un control.

#### 4.2.5 Dónde se monta

Dentro de `LandingHero.vue`, **después** del `<p class="land-sub">` y **antes** de `.land-cta-row`
(que se reduce a «Ya tengo cuenta» + el enlace de texto). Sigue dentro de `<main id="contenido">`,
así que el enlace de salto y el orden de lectura no cambian.

`#cotizador` recibe `tabindex="-1"` y `:focus { outline: none }`, exactamente como `#planes`
(`LandingPlans.vue:39,171`), para que los anclajes que apuntan a él muevan el foco además del
scroll (H-11).

---

### 4.3 `/planes` — la jerarquía que ya se peleó, ahora ganada

#### 4.3.1 Estructura de encabezados resultante

```
h1  Armemos lo que tu clínica necesita          ← PlanesView, no se desmonta nunca
├── h2  Cuéntanos qué hace tu veterinaria       ← AsistenteEntrada (estado de entrada)
│                                                  se desmonta al llegar la propuesta
├── h2  Tu propuesta                            ← AsistentePanel (estado con propuesta), YA EXISTE
│   └── h3 …                                       PropuestaTabla, ya existe
└── h2  O empieza por un paquete ya armado      ← la sección de paquetes
```

Hoy hay **un solo `<h2>`** y solo cuando ya hay propuesta. Con esto, cada estado de la pantalla
tiene su encabezado y **el contenido principal aparece en el esquema de la página** (H-03,
WCAG §1.3.1).

El `<h2>` de la entrada va **dentro de `AsistenteEntrada.vue`**, no en la vista: se desmonta con
ella, que es lo correcto — y no rompe el argumento de `PlanesView.vue:110-113`, que solo exige que
el **`<h1>`** no viva dentro de un componente que se desmonta.

#### 4.3.2 Los paquetes: de `<details>` a `<section>`

Sustituir `PlanesView.vue:150-162` por:

```
<section class="pl-paquetes" aria-labelledby="paquetes-h2">
  <h2 id="paquetes-h2" class="pl-paquetes-h2">O empieza por un paquete ya armado</h2>
  <p class="pl-paquetes-sub">…</p>
  <PlanesConfigurador … />
</section>
```

**Por qué se quita el `<details>` en vez de cerrarlo:**

- Cerrarlo destruye el ancla de precio y contradice `PlanesView.vue:32-38`, cuyo razonamiento es
  correcto y se conserva. También lo prohíbe GOV.UK (F9): no ocultar lo que la mayoría necesita.
- Dejarlo abierto y estático es un control sin estado útil (H-07) y no aporta encabezado.
- **La jerarquía la hacen el orden, el tipo y el lenguaje.** Es lo que cambia:
  `.pl-paquetes-h2` a **17 px / 700** contra los **20 px / 700** del `<h2>` de la entrada, y un
  separador superior que ya existe (`border-block-start` en `.pl-paquetes`).

Coste neto de CSS: **negativo**. Desaparecen `.pl-paquetes-sum` y su `cursor: pointer`.

#### 4.3.3 Llegada desde el cotizador

Cuando `/planes` monta con `propuesta.store.texto` no vacío:

- El `<textarea>` de `AsistenteEntrada` **ya sale relleno** (es el mismo `v-model` sobre el mismo
  store, `AsistentePanel.vue:190-201`). No hay nada que implementar para eso.
- El **subtítulo de la vista cambia** al texto de §5 (fila P-2b), para que el prospecto entienda
  por qué su párrafo ya está ahí y qué falta.
- **El foco va al `<h1>`**, que recibe `tabindex="-1"`. Es la convención del repositorio
  (`ContratarView.vue:107`) y es lo correcto: llevarlo al campo de correo saltaría el encabezado y
  el lector de pantalla no sabría dónde está.
- Los ejemplos pulsables **no se muestran** si el campo ya trae texto: cumplieron su función y
  ocupan el sitio del correo.

---

### 4.4 Paso vinculante — `ContratarView.vue`

Dos cambios, ninguno estructural.

**1. La rama de recuperación deja de ser un callejón (H-04).** En `ContratarView.vue:144-155`, antes
del `<div class="pub-scope ct-picker">`:

```
<p class="ds-subtitle">{{ subtituloRecuperacion }}</p>
<p class="ct-volver">
  <RouterLink :to="{ name: 'planes' }" class="ds-btn ds-btn--primary">
    Volver a contarnos qué necesitas
  </RouterLink>
</p>
```

`subtituloRecuperacion` se calcula de `motivoSinPropuesta`, con los tres textos de §5 (C-2a/b/c).
El enlace va **antes** del selector: es el camino que el aviso de arriba ya nombra pero que hoy no
se puede pulsar.

**2. `h1` «Confirma tu plan» → «Confirma tu contratación».** Sirve a las dos ramas —paquete y
propuesta— sin usar la palabra «plan» como unidad de compra. El `h1` recibe el foco al montar
(`usePasoContratar`), así que es lo primero que se anuncia: importa que sea exacto.

**Lo que NO se toca aquí, y es deliberado:** el resto del paso 6 es idéntico para las dos formas de
entrada, y **tiene que serlo** — «es el mismo acto jurídico» (`ContratarView.vue:23-28`). La casilla
de términos, el botón separado, `TrialLinesTable`, `PriceDriftNotice`, `ErrorSummary` y la letra
pequeña se quedan exactamente como están. La vía «Confirmed» de **WCAG §3.3.4 Error Prevention
(Legal, Financial, Data), AA** ya está satisfecha y este cambio no la roza.

---

### 4.5 Honestidad en los dos estados — el aviso de origen (H-01, H-05, H-10)

**1. Discriminante.** En `asistente.types.ts:370`, la variante de propuesta pasa a
`{ clase: 'PROPUESTA'; propuesta: Propuesta; leyoElTexto: boolean }`. En
`asistente.source.ts:421`, `leyoElTexto: respuesta.presentation === 'PROPOSAL'`. Nada más: el campo
ya viaja en la respuesta (`asistente.types.ts:607`), **no hay cambio de contrato ni petición al
backend**.

**2. Componente nuevo `PropuestaOrigenAviso.vue`.** Recibe `leyoElTexto: boolean`. Con `true` no
pinta nada. Con `false`, un `.ds-banner.ds-banner--info` (o `--warning` si no existe el tono
`info`) con `role="status"` y el texto de §5 (fila A-1).

> **Va en un componente propio y no en `AsistentePanel.vue` por una razón medida, no estética:**
> `AsistentePanel.vue` tiene **464 líneas** y el techo es **500 con `maxOversizedSfc: 0`**. Quedan
> 36 líneas de margen para un fichero que ya es la máquina de estados de toda la feature. Un banner
> con su javadoc se come la mitad de ese margen y deja el siguiente cambio sin sitio. En
> `AsistentePanel.vue` entran **tres líneas**: el `import`, la etiqueta y su prop.

Se monta **inmediatamente después del `<h2 id="prop-h2">`** (`AsistentePanel.vue:275`) y antes del
aviso de `NO_ENTENDIDO`. Los dos avisos son **excluyentes** por construcción (`NO_ENTENDIDO` no
llega por esta rama), pero el orden importa si algún día dejan de serlo: primero de dónde salió,
luego qué pasó.

**3. La espera deja de mentir y deja de parpadear.**
- `FRASES_ESPERA[0]` → texto de §5, fila E-1.
- `AsistenteEspera` no se monta hasta **200 ms** después de entrar en la espera. Verificado: ni
  `PawLoader.vue` ni `PageLoader.vue` traen guarda temporal alguna. La guarda va **dentro de
  `AsistenteEspera.vue`** (un `ref` que pasa a `true` en un `setTimeout(200)` de `onMounted`, con
  `clearTimeout` en `onBeforeUnmount`, patrón que el propio fichero ya usa en su intervalo de
  500 ms), para no tocar la condición `v-if="esperando"` del panel. Umbral por F6: por debajo de
  ~1 s no hace falta indicador; 200 ms es el suelo prudente que evita el destello sin retrasar la
  percepción en el camino con modelo.

**4. La pantalla es útil sin lectura del texto.** Con `leyoElTexto === false`, el aviso invita
explícitamente a **revisar y quitar**, y `CatalogoManual` ya está montado debajo
(`AsistentePanel.vue:373-384`). El camino determinista deja de ser una promesa incumplida y pasa a
ser lo que realmente es: un punto de partida editable. **Eso es exactamente el objetivo del dueño —
contratar solo lo que se va a usar— cumplido incluso sin modelo.**

---

### 4.6 Landing — el resto de superficies

| Componente | Cambio | Motivo |
|---|---|---|
| `LandingHero.vue` | monta `<LandingCotizador>`; `.land-cta-row` se queda con «Ya tengo cuenta» (fantasma) + enlace de texto «o mira los tres paquetes» que conserva `irAPlanes()` | H-08. El CTA primario del hero pasa a ser el envío del cotizador. `irAPlanes()` **no se toca**: es el patrón de ancla-con-foco correcto (H-11) |
| `LandingPlans.vue` | nuevo `h2` y subtítulo (§5, L-3/L-4); la nota de precio gana una frase que devuelve a `#cotizador` con el mismo patrón de ancla-con-foco | H-06. Deja de decir «Elige por el tamaño de tu clínica» |
| `LandingFinalCta.vue` | primario → «Cuéntanos qué necesitas» hacia `#cotizador`; «Ver los planes» pasa a fantasma | H-08. La repetición del CTA al final del recorrido se mantiene, pero apuntando al camino principal |
| `LandingTopbar.vue` | **sin cambios** | El enlace «Planes» es navegación a una ruta que se llama así. Renombrarlo a «Precios» es defendible pero no cambia la jerarquía y toca una barra que aparece en todas las públicas |
| `LandingValueGrid`, `LandingDayFlow`, `LandingFaq`, `LandingFooter` | **sin cambios** | No contradicen el objetivo |
| `ResumeIntentBanner.vue` + `datosDeLaBanda` | **sin cambios, ni una línea** | Ver §8 |

---

## 5. Textos exactos

Quien implemente copia de aquí. Nada de reescribir «con sus palabras».

### Landing

| id | Dónde | Texto |
|---|---|---|
| L-1 | `LandingCotizador` — `<label>` | **Cuéntanos qué hace tu veterinaria y te decimos qué necesitas.** |
| L-2 | `LandingCotizador` — ayuda | Una o dos frases bastan. Qué atiendes, qué vendes, cuántas sedes. |
| L-2b | `LandingCotizador` — rótulo de ejemplos | O empieza por aquí: |
| L-2c | `LandingCotizador` — botón | Ver qué necesito |
| L-2d | `LandingCotizador` — tranquilidad, bajo el botón | Todavía no lo enviamos. En el siguiente paso lo revisas y decides. |
| L-2e | `LandingCotizador` — error (< 15 caracteres) | Con eso no nos alcanza. Escríbenos una o dos frases sobre lo que hace tu veterinaria. |
| L-2f | `LandingCotizador` — enlace alterno | ¿Prefieres no escribir? Mira los tres paquetes ya armados. |
| L-3 | `LandingPlans` — `h2` | Tres paquetes ya armados |
| L-4 | `LandingPlans` — subtítulo | Por si quieres una cifra rápida. Si prefieres pagar solo por lo que uses, cuéntanos arriba qué hace tu clínica. |
| L-5 | `LandingPlans` — final de la nota de precio | *(añadir)* También puedes decirnos con tus palabras qué necesitas y te armamos una propuesta. |
| L-6 | `LandingFinalCta` — `h2` | Empieza hoy. Sin tarjeta. *(sin cambio)* |
| L-7 | `LandingFinalCta` — CTA primario | Cuéntanos qué necesitas |
| L-8 | `LandingFinalCta` — CTA fantasma | Ver los tres paquetes |
| L-9 | `LandingHero` — enlace de texto | o mira los tres paquetes |

**L-2e es literalmente el mismo texto que `AsistenteEntrada.vue:82`.** Debe extraerse a
`copy.content.ts` y consumirse desde los dos sitios: el mismo fallo no puede tener dos redacciones
en dos pantallas del mismo embudo.

### Ejemplos pulsables — `EJEMPLOS_COTIZADOR` en `copy.content.ts`

| Texto | Long. | Comprobación |
|---|---|---|
| `Consulta general, vacunas y desparasitación` | 43 | ≥ 15 ✔ |
| `Tenemos quirófano y hospitalización` | 35 | ≥ 15 ✔ |
| `Vendemos alimento y hacemos peluquería` | 38 | ≥ 15 ✔ |

Los tres son **amplios**, no de nicho (F3), y describen situaciones que casi cualquier clínica
colombiana reconoce. Ninguno menciona una funcionalidad del producto: describen **la clínica**, que
es lo que se le pide al usuario.

> ⚠️ **La trampa que ya costó tiempo una vez.** `copy.content.ts:31-41` documenta que
> `RELLENOS_RAPIDOS` estuvo a punto de ofrecer botones que el servidor rechazaba por longitud. Aquí
> el riesgo es el mismo contra `MIN_DESCRIPCION = 15`. La prueba de §9 lo fija: **es obligatoria,
> no opcional.**

### `/planes`

| id | Dónde | Texto |
|---|---|---|
| P-1 | `PlanesView` — `h1` | Armemos lo que tu clínica necesita |
| P-2 | `PlanesView` — subtítulo, sin texto sembrado | Cuéntanos con tus palabras a qué se dedica tu veterinaria. Te proponemos los módulos que te sirven, con su precio. No te compromete a nada y no pedimos tarjeta. *(sin cambio)* |
| P-2b | `PlanesView` — subtítulo, **con** texto sembrado | Ya tenemos lo que nos contaste. Revísalo, déjanos un correo y te armamos la propuesta. No te compromete a nada y no pedimos tarjeta. |
| P-3 | `AsistenteEntrada` — `h2` nuevo | Cuéntanos qué hace tu veterinaria |
| P-4 | `AsistenteEntrada` — `<label>` | ¿A qué se dedica tu veterinaria? *(sin cambio)* |
| P-5 | `AsistenteEntrada` — ayuda | *(sin cambio)* |
| P-6 | Sección de paquetes — `h2` | O empieza por un paquete ya armado |
| P-7 | Sección de paquetes — subtítulo | Tres combinaciones cerradas, con su precio. Puedes ajustarlas antes de contratar. |

### Asistente — origen y espera

| id | Dónde | Texto |
|---|---|---|
| A-1 | `PropuestaOrigenAviso` (`leyoElTexto === false`) | **Este es un punto de partida, no una recomendación.** Lo armamos con lo más habitual en una clínica veterinaria, sin leer todavía lo que nos escribiste. Revísalo y quita lo que no vayas a usar. |
| E-1 | `FRASES_ESPERA[0]` | Estamos preparando tu propuesta. |
| E-2 | `FRASES_ESPERA[1]` (3 s) | Seguimos armando tu propuesta. Suele tardar unos segundos. *(sin cambio)* |
| E-3 | `FRASES_ESPERA[2]` (8 s) | Está tardando más de lo normal. Puedes cancelar y elegir un paquete. *(sin cambio)* |

**Sobre A-1.** Es franco sin ser derrotista, y **no dice «la IA está deshabilitada»**: eso es
información interna que no ayuda a nadie a decidir. Dice lo único que el usuario necesita saber
para actuar bien: **que esta lista no está personalizada y que debe revisarla**. Es HAX G2 (F2)
aplicado con el lenguaje de PAIR (F10). Y la frase inicial reutiliza la construcción que la pantalla
ya usa en `NO_ENTENDIDO` («Punto de partida, no una recomendación. Quita lo que no uses.»,
`AsistentePanel.vue:284`), de modo que las dos degradaciones hablan igual.

### Paso vinculante

| id | Dónde | Texto |
|---|---|---|
| C-1 | `h1` | Confirma tu contratación |
| C-2a | Subtítulo de recuperación, `motivoSinPropuesta === null` | Cuéntanos qué necesitas y te lo armamos, o elige uno de nuestros paquetes. |
| C-2b | Subtítulo, `'PERDIDA'` | Puedes volver a contarnos qué necesitas desde este equipo, o elegir uno de nuestros paquetes. |
| C-2c | Subtítulo, `'NO_DISPONIBLE'` | Puedes volver a contarnos qué necesitas, o elegir uno de nuestros paquetes. |
| C-3 | Enlace primario de recuperación | Volver a contarnos qué necesitas |

---

## 6. Contrato de accesibilidad de las piezas nuevas

Se comprueba pieza por pieza, no «al final».

### `LandingCotizador.vue`

| Requisito | Criterio | Cómo |
|---|---|---|
| Etiqueta programática | §1.3.1 (A), §3.3.2 (A) | `<label for>` visible; **nunca** `placeholder` como etiqueta |
| Ayuda asociada | §1.3.1 (A) | `aria-describedby` apunta a la ayuda **siempre**, y a la ayuda **+** el error cuando lo hay — mismo patrón que `AsistenteEntrada.vue:187` |
| Error asociado y anunciado | §3.3.1 (A) | `aria-invalid="true"` + `id` del error dentro de `aria-describedby` + `role="alert"` en el `<p>` del error. **El texto del error es idéntico al del resumen de `/planes`** (GOV.UK) |
| Sin validación prematura | §3.3.1 (A) + convención del repo | `touched` solo al enviar |
| Orden de foco = orden visual | §1.3.2 (A), §2.4.3 (A) | El DOM es el orden de lectura. **Prohibido** colocar los ejemplos antes del `<textarea>` en el DOM y después visualmente |
| Ejemplos como lista con nombre | §1.3.1 (A) | `<ul aria-labelledby>` sobre un `<p id>` con el rótulo; cada ejemplo es `<button type="button">` |
| Foco tras rellenar | §3.2.2 (A) | Foco al `<textarea>` con el cursor al final. Cambio de contexto **provocado por el usuario**, no automático |
| Tamaño de objetivo | §2.5.8 (AA, 24×24) | Botón de envío ≥ 48 px de alto (listón propio de la landing, `LandingHero.vue:101-102`); chips de ejemplo ≥ 44 px |
| Contraste del borde del control | §1.4.11 (AA, 3:1) | Borde 2 px sobre `--pub-ame-600` (5,38:1 documentado en `AsistenteEntrada.vue:263-264`). **Prohibido `--pub-line`** (1,23:1) |
| Zoom en iOS | §1.4.4 (AA) | `font-size: 16px` en el `<textarea>` |
| Anillo de foco | §2.4.7 (AA), §2.4.11 (AA) | El del `pub-scope`; **nada de `outline: none`** salvo en `#cotizador[tabindex="-1"]`, que nunca recibe foco por teclado |
| Movimiento | §2.3.3 (AAA) / §2.2.2 | Sin animación de entrada. Si se añade alguna, bajo la guarda global de `prefers-reduced-motion` |

### `PropuestaOrigenAviso.vue`

- `role="status"` (**no `alert`**: no ha fallado nada — mismo criterio que `AsistenteEspera.vue:24`).
- **No** recibe el foco: el foco tras la primera propuesta ya va al `<h2>` «Tu propuesta»
  (`AsistentePanel.vue:168-174`), y el aviso queda **inmediatamente después**, así que un lector de
  pantalla lo encuentra en la primera lectura hacia adelante. **Añadir un segundo salto de foco
  rompería una decisión ya razonada.**
- La negrita del inicio es `<strong>`, no CSS: es énfasis semántico.

### `/planes`

- Esquema de encabezados sin saltos: `h1 → h2 → h3`, verificado con instantánea ARIA (§9).
- El foco al llegar sembrado va al `<h1>` con `tabindex="-1"`, **no** a un campo.
- Al quitar el `<details>` desaparece un control del orden de tabulación: es una mejora, pero
  **debe verificarse que ninguna prueba dependía de él**.

---

## 7. Presupuesto de CSS — el reparto, con cifras medidas

### 7.1 La respuesta directa a la pregunta del encargo

**El presupuesto global no es la restricción que muerde.** Medido hoy: distancia
`style − script = −4073` contra un techo de `0` (§1.5). Hay **4.073 líneas de holgura agregada**.

Estimación del cambio completo: **+90 a +120 líneas netas** de distancia en el peor caso. Queda
sobre **−3.950**. El gate no se acerca al rojo.

### 7.2 Lo que sí muerde, y cómo se reparte

**A) `maxSfcLines: 500`, `maxOversizedSfc: 0`.** Es la restricción real.

> ⚠️ **El límite efectivo es `wc -l` ≤ 499, no 500.** El contador parte el fichero **entero** por
> saltos de línea, así que un fichero de 499 líneas terminadas en salto cuenta 500 y pone la cadena
> en rojo. Está documentado en `CLAUDE.md` («El techo de 500 líneas por SFC SÍ es un gate») y ya
> costó una tarea abandonada. Los márgenes de la tabla siguiente están calculados contra **499**.

Reparto obligatorio:

| SFC | Ahora | Después (est.) | Margen |
|---|---|---|---|
| `AsistentePanel.vue` | **464** | **467** | 32. **Solo tres líneas**, por eso el aviso va en componente aparte (§4.5) |
| `AsistenteEntrada.vue` | 308 | ~338 | 161 |
| `PlanesView.vue` | 226 | ~220 | 279 (**baja**: se va `.pl-paquetes-sum`) |
| `LandingHero.vue` | 148 | ~146 | 353 |
| `ContratarView.vue` | 318 | ~326 | 173 |
| `LandingCotizador.vue` | — | **~150** | 349 |
| `PropuestaOrigenAviso.vue` | — | **~55** | 444 |
| `PlanesConfigurador.vue` | 485 | **485** | **14. NO SE TOCA.** Ver aviso abajo |

> ⚠️ **`PlanesConfigurador.vue` está a 14 líneas del techo efectivo (499).** Nada de esta especificación lo
> modifica, y ninguna variante de la implementación debe hacerlo. Si aparece la tentación (por
> ejemplo, «bajar el peso visual de las tarjetas»), el cambio va a `PlanCard.vue` (177 líneas) o al
> contenedor, nunca al configurador.

**B) `maxDuplicateBodies: 3` / `maxDuplicateGroups: 0`.** Reglas duras para el implementador:

1. **`LandingCotizador` NO define su propio botón.** Usa `.ds-btn.ds-btn--primary`, que ya funciona
   dentro de `pub-scope` (precedente exacto: `AsistenteEntrada.vue:238`). Copiar `.land-cta--primary`
   sería la **tercera** copia de un cuerpo que ya está en `LandingHero.vue:115` y
   `LandingFinalCta.vue:50`, y dejaría el gate a una copia del rojo.
2. **El `<textarea>` no redefine el estilo de campo.** Se reutiliza la forma de
   `AsistenteEntrada.vue:265-278`. Si el implementador ve que va a copiar ese cuerpo por segunda
   vez, la salida correcta es **promoverlo a `public-auth.css` como `.pub-campo`** — ese fichero es
   la capa pública del tenant y **no es gemelo TR-02**, así que no invade el territorio de
   `front-parity`. (`tokens.css` y `primitives.css` **sí** lo son y **no se tocan**.)
3. **Los chips de ejemplo** reutilizan lo que ya exista de forma de chip
   (`BaseChip` / `RefinarCuadro`); solo se escribe CSS nuevo si no hay nada equivalente, y entonces
   se escribe **una vez**.

**C) `vetsoftware/no-duplicate-primitive` (stylelint).** Si el `<style scoped>` de cualquier pieza
nueva reescribe una primitiva, el commit no pasa. **Es la puerta correcta y no se esquiva.** El
color de los botones viaja en la clase de tono desde el marcado, nunca en el `scoped` — la trampa
de especificidad `(0,1,0)` vs `(0,2,0)` está documentada en `AGENTS.md:103-122` y aplica igual
aquí.

### 7.3 Si la implementación se desborda

Orden de las salidas, de mejor a peor:

1. Extraer la fila de ejemplos a `CotizadorEjemplos.vue` (~60 líneas). Se reutilizaría en `/planes`.
2. Promover la forma de campo público a `public-auth.css`.
3. **Nunca**: subir un techo de `css-budget.config.json`, ni añadir una excepción de stylelint, ni
   meter estilo en línea para esquivar el conteo del bloque `<style>`.

---

## 8. Lo que NO se toca

Cada línea es una decisión ya razonada en el árbol que esta especificación **conserva a propósito**.

| Pieza | Por qué se conserva |
|---|---|
| **Una sola URL para el embudo** (`PlanesView.vue:25-38`) | Dos URLs partirían la entrada, duplicarían la pantalla de precio y harían ilegible la analítica del paso 2. El cotizador del hero **no es una segunda pantalla del asistente**: es un campo que siembra el store y navega |
| **Los paquetes** | El dueño lo pidió expresamente. Y son el ancla de precio: el camino a medida pide un párrafo y una espera **antes de ver una cifra** |
| **`ResumeIntentBanner` y `datosDeLaBanda`** (`LandingView.vue:84-93`) | Cubren las dos formas de intención, con el requisito de `conocePropuesta` que impide prometer lo que el botón no puede cumplir. **Ni una línea.** Y `tests/unit/landing-banda-reanudar.spec.ts` debe seguir en verde sin tocarlo |
| **`recuperarDeEnlace()` en `LandingView.vue:59-61`** | Es donde aterriza el enlace del correo, que el backend arma contra la **raíz** con un token de 43 caracteres. El cotizador se monta dentro del hero, **por debajo** de ese `onMounted`, y no toca `texto` si ya hay una recuperación en curso |
| **El foco de `AsistentePanel`** (`AsistentePanel.vue:39-46,168-183`) | Dos ramas y una excepción, todas correctas: salto al `<h2>` tras propuesta y tras refinamiento; **sin salto** tras editar una línea a mano (§3.2.2), comunicado por `aria-live` (§4.1.3) |
| **La mecánica de `AsistenteEspera`** | Región `status` única, tres frases escalonadas, cancelar a los 8 s, sin barra de porcentaje. Solo cambia **el texto de la primera frase** y se añade la guarda de 200 ms |
| **Las dos casillas de consentimiento separadas** (`AsistenteEntrada.vue:22-28`) | Ley 1581 art. 9 y art. 26 lit. a. **No se agrupan, no se mueven al hero, no se dan por marcadas** |
| **`MIN_DESCRIPCION = 15`** | Su javadoc tiene razón: 40 castiga a quien escribe bien y corto |
| **El resto del paso 6** | Mismo acto jurídico para las dos entradas; §3.3.4 ya satisfecho por la vía «Confirmed» |
| **`tokens.css`, `primitives.css` y cualquier gemelo TR-02** | Territorio de `front-parity` |
| **`css-budget.config.json`, `eslint.config.ts`, `stylelint.config.mjs`, workflows** | No se tocan por iniciativa de una auditoría |

---

## 9. Cómo se verifica

**Puertas existentes** (deben quedar en verde; ninguna es opcional):

```
npm run quality        # lint + stylelint + vue-tsc + css:budget, encadenado y fail-fast
node scripts/css-budget.mjs   # esperado: distancia ≈ −3.950, 0 grupos duplicados, 0 SFC > 500
```

**Pruebas unitarias nuevas o ampliadas:**

| Fichero | Qué afirma | Por qué muerde |
|---|---|---|
| `tests/unit/asistente-copy.spec.ts` *(ampliar)* | Cada `EJEMPLOS_COTIZADOR[i].trim().length >= MIN_DESCRIPCION` | Es literalmente el fallo que `copy.content.ts:31-41` documenta como ya ocurrido: la interfaz ofrece un botón que su propia validación rechaza |
| `tests/unit/landing-cotizador.spec.ts` *(nuevo)* | (a) vacío + submit → navega, **cero** `role="alert"`; (b) 5 caracteres + submit → error visible, `push` **no** llamado; (c) texto válido → `store.texto` sembrado **y** `push({name:'planes'})`; (d) clic en ejemplo con texto ya escrito → **el texto previo sigue ahí** y se ha añadido | (d) es el caso que protege lo único que no se puede perder: el trabajo del usuario |
| `tests/unit/asistente-origen.spec.ts` *(nuevo)* | `presentation: 'DETERMINISTIC'` → el aviso A-1 está en el DOM; `'PROPOSAL'` → no está | Es H-01, el hallazgo bloqueante, convertido en aserción |
| `tests/unit/landing-banda-reanudar.spec.ts` *(sin tocar)* | Sigue en verde | La banda no se puede romper de rebote |

**Instantánea ARIA (Playwright, `toMatchAriaSnapshot`)** sobre `/planes` en el estado de entrada.
Es regresión de **semántica**, no de píxeles, y fija exactamente lo que H-03 arregla:

```
- heading "Armemos lo que tu clínica necesita" [level=1]
- heading "Cuéntanos qué hace tu veterinaria" [level=2]
- heading "O empieza por un paquete ya armado" [level=2]
```

**Comprobación de teclado, manual, cinco minutos:** Tab desde la barra de la landing debe llegar al
`<textarea>` del cotizador **antes** que a cualquier tarjeta de paquete; el enlace «mira los tres
paquetes» debe mover el **foco**, no solo el scroll; y en `/planes`, la navegación por encabezados
debe encontrar los tres `<h2>` del esquema de arriba.

**Recomendación de fondo, fuera del alcance de este cambio:** no hay **ninguna** puerta automática
de accesibilidad en el pipeline de este repositorio — ni `axe-core`, ni `@axe-core/playwright`, ni
`eslint-plugin-vuejs-accessibility`. H-03 es exactamente la clase de defecto que
`eslint-plugin-vuejs-accessibility` **no** detecta pero que una instantánea ARIA sí; y H-01 no lo
detecta ninguna herramienta, porque es un problema de verdad, no de marcado. Merece una decisión
propia, no un apéndice de esta especificación.

---

## 10. Riesgos, no-objetivos y lo no ejecutado

### Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R-1 | **El texto sembrado no sobrevive a una recarga.** `propuesta.store.texto` es un `ref('')` en memoria (`propuesta.store.ts:60`): sobrevive a la navegación SPA landing → `/planes`, **no** a un F5 | Es el comportamiento aceptado. Persistirlo obligaría a inventar una **tercera** forma de intención para la banda de continuación, que hoy solo conoce `PLAN` y `PROPUESTA`. **No se hace en este cambio**, y se declara aquí para que nadie lo descubra como bug |
| R-2 | Con el modelo deshabilitado, A-1 aparece **siempre** y puede leerse como que el producto no funciona | El texto está redactado para no sonar a avería: describe lo que hay («un punto de partida») y qué hacer («revísalo y quita»). Y `CatalogoManual` está justo debajo, así que la acción que propone es posible en el sitio |
| R-3 | Quitar el `<details>` deja los paquetes siempre visibles y alguien puede leerlo como que no cambió la jerarquía | La jerarquía la hacen orden + tipo + lenguaje (§4.0). Si tras publicar la medición dice que los paquetes siguen ganando, la siguiente palanca **no** es ocultarlos: es mover la sección de paquetes por debajo del catálogo manual |
| R-4 | El cotizador del hero puede leerse como «otro sitio donde escribir lo mismo» | Lo evita P-2b: al llegar a `/planes` el subtítulo reconoce explícitamente lo ya escrito y nombra lo único que falta (el correo) |
| R-5 | `AsistentePanel.vue` a 467/500 y `PlanesConfigurador.vue` a 485/500 dejan la feature sin margen | Declarado en §7.2. El siguiente cambio sobre esos dos ficheros **empieza** por extraer, no por añadir |

### No-objetivos declarados

- **No** se extrae ni un literal a un catálogo i18n. No hay `vue-i18n` en el repositorio y montarlo
  es un proyecto en sí.
- **No** se toca el contrato de API ni se pide nada al backend. `presentation` ya viaja.
- **No** se propone migrar a ninguna librería de UI.
- **No** se convierte nada en chat. §2.6 explica por qué, con números.
- **No** se abre ningún issue de GitHub.

### Lo NO ejecutado — declarado, no dado por bueno

- **No medí contraste.** Los ratios que cito (5,38:1 de `--pub-ame-600`, 1,23:1 de `--pub-line`)
  son los **documentados en el propio árbol** (`AsistenteEntrada.vue:263-264`), no un cálculo mío.
  La pieza nueva reutiliza esos mismos tokens, así que hereda el resultado; si el implementador
  introduce un color distinto, **hay que medirlo** contra §1.4.3 y §1.4.11.
- **No ejecuté `axe`, ni Playwright, ni la suite visual, ni `npm run quality`.** Lo único que
  ejecuté fue `node scripts/css-budget.mjs`, cuya salida está transcrita literal en §1.5.
- **No levanté el servidor de desarrollo.** Todo el dictamen sale de leer el árbol y contrastarlo
  con la norma.
- **No hay medición de comportamiento real** (analítica, prueba con usuarios) que respalde el
  reparto concreto de peso visual. Lo que respalda cada decisión es la evidencia de §2 y el
  razonamiento ya escrito en el propio código.
