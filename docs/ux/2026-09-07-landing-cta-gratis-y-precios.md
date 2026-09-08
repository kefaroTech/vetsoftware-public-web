# CTA de cuenta gratis y ruta a precios — especificación para `front-feature`

> **Encargo.** «Analiza okvet.co y organiza el front público para que funcione más o menos
> igual: un botón muy vistoso que diga que cree una cuenta gratis, y otra página o sección de
> la landing donde pueda ver los precios y armar el paquete en base a los módulos que escoja.»
>
> **Qué es esto.** Una especificación de implementación corta, con el marcado y los textos
> exactos. Quien la ejecuta es `front-feature`. Esta auditoría **no toca `src/`**.
>
> **Terreno verificado el 2026-09-07** con `codegraph_explore` sobre `LandingView.vue`,
> `LandingHero.vue`, `LandingTopbar.vue`, `LandingCotizador.vue`, `CotizadorCarril.vue`,
> `LandingFinalCta.vue`, `LandingPlans.vue`, `PlanesView.vue`, `SignupView.vue`,
> `RegisterForm.vue`, `SeleccionAside.vue` y `router/index.ts`. El terreno descrito en el
> encargo original ya no es exacto en un punto importante — ver §0 — así que esta spec parte
> de lo que el código tiene hoy, no de lo que el encargo resumía.

---

## §0 · Lo que el encargo no sabía: ya hay un CTA, y ya decide "plan primero"

El encargo asume que la landing no tiene ningún camino de conversión. **No es así.** Desde el
rediseño del 2026-09-04 (`docs/ux/2026-09-04-rediseno-lumbre-delta-embudo-publico.md`), la
tarjeta del cotizador tiene su propio CTA primario:

```vue
<!-- CotizadorCarril.vue:100 -->
<button type="submit" class="ds-btn ds-btn--primary lcc-cta">Empezar gratis</button>
```

que hace `router.push({ name: 'planes' })` (`LandingCotizador.vue:188`) tras guardar la
selección en `seleccionPortadaStore` (`:187`). Y `/planes` (`PlanesView.vue`) **ya es** «la
otra página donde armar el paquete en base a los módulos que escoja»: ciclo, sedes, personas,
combinaciones prearmadas y el precio calculado por el servidor. El segundo punto del encargo
está, en sustancia, resuelto.

**Lo que falta de verdad, y es exactamente lo que okvet hace y Lumbre no:**

1. **Ningún CTA vive en la barra superior.** `LandingTopbar.vue:26-32` solo tiene «Paquetes»
   (ancla), «Preguntas» (ancla) e «Iniciar sesión». Quien no baja hasta la tarjeta del
   cotizador —o entra por un enlace que no aterriza en el hero— no ve ningún botón de
   conversión.
2. **El hero no tiene ningún CTA.** `LandingHero.vue` es solo lockup + `h1` + bajada
   (`:20-54`); el propio comentario del fichero (`:12-16`) lo dice a propósito: «La acción
   principal no vive aquí: es la tarjeta del cotizador, que es una sección hermana». Esa
   decisión asumía que el cotizador siempre está a un scroll corto — cierto en escritorio,
   menos cierto en un móvil donde el hero + su imagen ya ocupan el primer pliegue.
3. **El CTA que existe promete "empezar", no "crear cuenta".** «Empezar gratis» es correcto
   pero es una promesa de proceso, no de resultado. El encargo pide explícitamente el
   resultado («que diga que cree una cuenta gratis»), que es también el texto que usa el
   propio `RegisterForm.vue:336` («Crear cuenta») y el `title` de la ruta
   (`router/index.ts:165`, «Crea tu cuenta — Lumbre»).

Esta spec no rehace el embudo: **añade el punto de entrada que falta**, dos sitios, mismo
texto, mismo destino.

---

## §1 · El CTA — texto, destino, jerarquía, tamaño

### 1.1 Texto exacto

> **Crea tu cuenta gratis**

Coletilla honesta, solo en el hero (en la barra no hay sitio y okvet tampoco la repite ahí):

> Sin tarjeta

Reutiliza el vocabulario ya existente en el repo (`SeleccionAside.vue:73`: «Prueba gratis. Sin
tarjeta.») — no se inventa una promesa nueva.

**Por qué no «Empezar gratis» aquí también.** Ese texto se queda, sin tocar, en
`CotizadorCarril.vue:100`: ahí el usuario ya marcó módulos y el verbo correcto es «empezar» con
lo que acaba de armar. El botón nuevo es el primer contacto, sin ningún módulo marcado
todavía, y ahí el verbo correcto es «crear cuenta» — es la acción real, y es la misma palabra
que usa el formulario al que lleva.

### 1.2 Destino: `/registro`, no `/planes`

```vue
<RouterLink :to="{ name: 'signup' }">Crea tu cuenta gratis</RouterLink>
```

**Verificado que no rompe nada al llegar sin selección.** `SignupView.vue:52-67` calcula
`seleccion` a partir de `route.query.plan` y de la intención guardada; si no hay ninguna de las
dos, `seleccion` es `null` y `SeleccionAside` simplemente no se pinta (`:96-102`) — el
formulario se ve exactamente como si el usuario hubiera llegado por su cuenta. `registration/
types/index.ts` (`RegisterUserRequest`) no lleva ningún campo de plan. Crear la cuenta es, de
verdad, gratis y sin selección previa — es la promesa exacta que hace okvet, y aquí es cierta
sin matices.

**Esto no compite con «plan primero» (`docs/ux/landing-comercial-y-contratacion.md` §3.1): lo
complementa.** El argumento de esa sección es contra un *único* camino «registro primero» que
obligara a rellenar 13 campos a ciegas. Aquí hay **dos caminos a la vez**: quien ya sabe que
quiere probar Lumbre pulsa «Crea tu cuenta gratis» y entra directo; quien quiere ver qué cuesta
antes sigue teniendo el cotizador y `/planes` delante, sin que nadie se lo bloquee. Es el mismo
patrón que ya usa `LandingHero.vue`/`LandingTopbar.vue` con «Iniciar sesión»: una salida rápida
al lado de la narrativa larga.

### 1.3 Dónde va

| Sitio | Qué se añade | Por qué |
|---|---|---|
| **Barra superior** (`LandingTopbar.vue`) | Botón primario, último elemento de `<nav class="land-nav">`, después de «Iniciar sesión» | Persistente en todo el scroll — es lo que okvet hace y hoy no existe aquí en ningún punto |
| **Hero** (`LandingHero.vue`) | Fila de acciones bajo `.land-sub`: el mismo botón + coletilla «Sin tarjeta» + un enlace secundario «Ver planes y precios» (§2) | Primer pliegue, antes de que nadie tenga que decidir bajar a la tarjeta del cotizador |
| **Tras cada bloque de valor** (`LandingValueGrid`, `LandingDayFlow`) | **No.** | Ver §3 |
| **`LandingFinalCta`** | **Sin cambio obligatorio.** Ya tiene su CTA («Armar mi propuesta» → `#cotizador`), dirigido a quien leyó la página entera y quiere configurar. Añadir aquí un segundo enlace «o crea tu cuenta directamente» es razonable pero **queda fuera de este PR**: es la sección menos visitada de la página y el hueco real está arriba | No duplicar trabajo donde no hay hueco que cerrar |

### 1.4 Jerarquía visual

- **Primario**: clase `ds-btn ds-btn--primary` (la misma que usa `CotizadorCarril.vue:100`).
  **No se declara un color nuevo en `<style scoped>`** — sería exactamente el error que
  `vetsoftware/no-duplicate-primitive` existe para rechazar (AGENTS.md, trampa de
  especificidad). Las clases nuevas (`.land-topbar-cta`, `.land-hero-cta`) son **solo
  geometría**: tamaño, `padding`, `white-space`.
- **Secundario** («Ver planes y precios» del hero, «Iniciar sesión» de la barra): enlace de
  texto plano en `--pub-ame-700` — igual que `.land-nav-link:hover` y `.sel-change` ya hacen.
  Nunca un segundo `ds-btn--primary` al lado del primero: dos botones del mismo peso visual no
  dicen cuál es la acción principal (heurística de Nielsen n.º 8, diseño minimalista;
  https://www.nngroup.com/articles/ten-usability-heuristics/).

### 1.5 Tamaño y contraste — WCAG 2.2 AA

Ya está medido para este mismo par de tokens en
`docs/ux/2026-09-04-rediseno-lumbre-delta-embudo-publico.md` §D.1 (método OKLCH → sRGB →
luminancia relativa, ejecutado el 2026-09-04):

| Ratio | Par | Veredicto |
|---|---|---|
| 6,28:1 | texto blanco / `amatista-600` (arranque del degradado) | §1.4.3 AA — pasa incluso el umbral de texto normal (4,5:1) |
| 7,09:1 | texto blanco / `oklch(49.1% .2412 292.6)` (fin del degradado) | §1.4.3 AA |
| 5,72–6,28:1 | anillo de foco `--ring` sobre los tres fondos donde cae este botón | §1.4.11 AA (mínimo 3:1) |

No hace falta volver a medir: es el mismo `ds-btn--primary` con el mismo degradado
(`--gradient-primary`, `tokens.css:426-430`), no una variante nueva.

**Tamaño (§2.5.8 Target Size, AA):** `ds-btn` ya garantiza ≥40 px de alto
(`primitives.css:30-60`). Para el hero, usar `ds-btn--lg` (52 px, igual que `.land-cta` de
`LandingFinalCta.vue:44` y `.lcc-cta` de `CotizadorCarril.vue`) — es el botón más importante de
la página, no debe ser el más pequeño. Para la barra, el `ds-btn` por defecto (≥40 px) basta.

### 1.6 Comportamiento en móvil

`LandingTopbar.vue` hoy **no tiene `flex-wrap` ni en `.land-topbar` ni en `.land-nav`**
(`:39-50`, `:72-77`): con marca + 3 enlaces + un botón nuevo en una fila sin envolver, por
debajo de ~380 px el conjunto se comprime o desborda. Esto no es hipotético: es la caja que ya
existe, a la que se le añade un elemento más ancho que un enlace de texto.

**Se pide explícitamente:**

1. `.land-topbar` pasa a `flex-wrap: wrap` con `row-gap` (ya tiene `gap: 16px`, basta con
   permitir el salto de línea).
2. El botón CTA lleva `flex-shrink: 0` — es lo único que no debe encogerse.
3. Por debajo de 600 px (el breakpoint que ya existe en `:96-100`), el CTA reduce a
   `ds-btn--sm` en vez de partir el texto.
4. Verificación manual a 320 px y 375 px (los dos anchos de referencia de Playwright del
   repo) de que no hay desbordamiento horizontal ni el botón queda cortado — **no ejecutado
   en esta auditoría**, queda para `front-e2e-visual` o para quien implemente.

---

## §2 · Precios y armado del paquete — decisión (c), las dos vías, con nombres que no choquen

**Ya existen dos superficies de precio** (no hay que crear ninguna desde cero):

- La landing misma: `LandingPlans.vue`, ancla `#planes`, sección «Combinaciones que se piden
  mucho» — combinaciones prearmadas con precio, ya visible sin salir de la página.
- La ruta `/planes` (`PlanesView.vue`): el configurador completo, módulo a módulo, con ciclo,
  sedes, personas y precio calculado por el servidor (`POST /quotes/preview`).

**El problema no es que falte una de las dos: es que el nombre "planes" se usa para las dos, y
hoy no hay ningún enlace directo a la segunda.** `LandingTopbar.vue:27` enlaza `#planes` (la
ancla, primera superficie); nadie enlaza a la ruta `/planes` salvo el botón «Empezar gratis»
tras marcar módulos. Se resuelve así, sin tocar la sección existente:

1. **Renombrar el enlace de la barra que hoy dice «Paquetes»** (`LandingTopbar.vue:27`) a
   **«Combinaciones»** — es literalmente el mismo texto que ya usa el `h2` de esa sección
   (`LandingPlans.vue:175`: «Combinaciones que se piden mucho»), así que el enlace deja de
   prometer algo distinto de lo que hay al llegar.
2. **Añadir un enlace nuevo, «Planes y precios»**, `RouterLink :to="{ name: 'planes' }"`, en la
   barra (entre «Combinaciones» y «Preguntas») y en el hero (junto al CTA, como enlace
   secundario, §1.3).

No hay riesgo de cupo: el cotizador de la landing corre con `useCotizador({ conPrecio: false })`
(`LandingView.vue:59`, motivo documentado en el propio fichero) y **no llama a
`/quotes/preview`**; solo `/planes` lo hace, y solo cuando el usuario decide entrar ahí — igual
que hoy.

### 2.2 Qué cambia en `/planes`

**Un titular que hoy miente un poco a quien llega en frío.** `PlanesView.vue:264` fija
`h1 = 'Esto es lo que te armamos'`, una frase que solo tiene sentido si algo se sembró antes
(desde el cotizador o desde una combinación). Con el enlace nuevo, una parte del tráfico va a
llegar **sin nada sembrado** — selección por defecto, cero módulos marcados — y «esto es lo que
te armamos» no describe eso.

El propio fichero ya rastrea la señal que hace falta:
`PlanesView.vue:83, llegoSembrado = textoLibre.value.trim().length > 0` (usada hoy solo para
decidir el foco, §D.3 del rediseño). Se reutiliza para el titular:

```ts
const h1 = computed(() => (llegoSembrado.value ? 'Esto es lo que te armamos' : 'Arma tu paquete'))
```

- Con siembra (viene del cotizador o de una combinación): **«Esto es lo que te armamos»**
  (sin cambio).
- Sin siembra (llega por «Planes y precios»): **«Arma tu paquete»** — es, además, el texto que
  el propio encargo sugiere.

> **Nota de implementación (2026-09-07).** `PlanesView.vue:264` ya no fijaba «Esto es lo que
> te armamos» en `develop` cuando se implementó esta spec: el commit `3935216`
> («la seleccion manda y el relato pasa a ser el rescate», 2026-09-05) lo había sustituido a
> propósito por un titular neutro — «Tu plan, con el precio exacto» — precisamente para que el
> `h1` dejara de atribuirse una selección que el visitante no había elegido. Por decisión del
> coordinador, el caso CON siembra conserva ese texto vigente de `develop` en vez de resucitar
> «Esto es lo que te armamos»; solo el caso SIN siembra es nuevo («Arma tu paquete»). Detalle
> en el issue #407 de `vetsoftware-public-web` (cerrado).

**El CTA de cuenta gratis al final ya existe.** `PlanesView.vue:164-166`:

```ts
const rotuloDeContinuar = computed(() =>
  destinoTrasElegir.value === 'contratar' ? 'Ir a confirmar' : 'Crear mi cuenta',
)
```

Un usuario sin sesión que llega, configura y pulsa «Continuar» ve el botón «Crear mi cuenta» —
que es, en sustancia, el mismo CTA de este documento, en el punto donde ya hizo su elección. No
hace falta ningún cambio aquí.

---

## §3 · Qué NO copiar de okvet, y por qué

| Elemento de okvet | Por qué no |
|---|---|
| «4.000 veterinarias en 24 países» | Cifra no medida. Lumbre no la tiene, y publicarla sin poder verificarla incumple el art. 30 de la Ley 1480 (protección al consumidor) — el mismo criterio que ya deja escrito `CotizadorCarril.vue` sobre no afirmar «lo que eligen otros clientes» sin dato medido. No se inventa una cifra para parecer okvet |
| «OkVet Pro» como segundo nivel | El modelo de Lumbre es modular por artículo, no por escalón fijo (`ItemType`: `MODULE`/`CAPACITY`/`ONE_TIME`/`BUNDLE`). Un «Pro» contradice el propio titular del hero: «Paga solo los módulos que tu negocio usa» |
| «Ver Video» | No existe ningún vídeo grabado. Un botón sin destino real es peor que su ausencia — es el mismo principio que ya llevó a arreglar los `href="#"` del pie de la landing vieja (`docs/ux/landing-comercial-y-contratacion.md` §1.1) |
| App móvil | No existe ninguna superficie móvil nativa; el repo es una SPA web. Prometerla es publicidad sobre algo que no se puede entregar |
| CTA repetido tras cada uno de los cuatro bloques de módulos | Repetir el mismo botón cada ~300 px funciona en un producto freemium de un solo clic (okvet). Crear una cuenta de empresa pesa más que eso, y la página ya tiene una narrativa («un día en tu clínica») que un botón cada bloque interrumpe sin necesidad — con el CTA ya persistente en la barra, no hace falta insistir |

---

## §4 · Ficheros a tocar, riesgo de presupuesto de CSS

| Fichero | Cambio | Riesgo de CSS budget |
|---|---|---|
| `src/features/landing/components/LandingTopbar.vue` (101 líneas) | Renombrar «Paquetes»→«Combinaciones»; añadir enlace «Planes y precios» (`RouterLink` a `planes`); añadir botón CTA `ds-btn ds-btn--primary land-topbar-cta`; `.land-topbar { flex-wrap: wrap }`, `.land-topbar-cta { flex-shrink: 0 }` | Bajo. +~15 líneas, sigue lejos de 499. **La clase `.land-topbar-cta` debe declarar solo geometría** (tamaño, no color) para no chocar con `vetsoftware/no-duplicate-primitive` |
| `src/features/landing/components/LandingHero.vue` (135 líneas) | Fila `.land-hero-actions` bajo `.land-sub`: CTA `ds-btn ds-btn--primary ds-btn--lg land-hero-cta` + `<span>Sin tarjeta</span>` + enlace secundario «Ver planes y precios» | Bajo. +~20 líneas. **Ojo con `maxDuplicateGroups: 0`**: si `.land-hero-cta` y `.land-topbar-cta` acaban con el mismo cuerpo de reglas byte a byte, el gate lo cuenta como grupo duplicado. Los tamaños ya son distintos por diseño (`ds-btn--lg` vs `ds-btn` por defecto, §1.5), así que no deberían coincidir — **verificar con `npm run css:budget` tras el cambio**, no asumirlo |
| `src/features/landing/views/PlanesView.vue` (433 líneas) | `h1` condicional a `llegoSembrado` (§2.2) | Bajo. +~5 líneas de script, cero CSS nuevo. Margen hasta 499: 66 líneas antes del cambio |
| `tests/unit/planes-esquema-encabezados.spec.ts` | Si asume `h1` fijo, hay que parametrizar el caso sin siembra | A verificar por quien implemente; no se ha leído este spec en esta auditoría |
| `tests/unit/landing-*.spec.ts` (topbar/hero no tienen test hoy: «⚠️ no covering tests found» en el blast radius de CodeGraph) | Nuevo spec que cubra el CTA: nombre accesible, `:to`, presencia en ambos componentes | Ninguno — son ficheros nuevos de test |

Ningún fichero tocado es gemelo TR-02 (`LandingHero`, `LandingTopbar`, `PlanesView` son
exclusivos del tenant), así que no hay coordinación con `front-parity` para este cambio
concreto.

---

## §5 · Criterios de aceptación

1. `LandingTopbar.vue` y `LandingHero.vue` contienen un control con nombre accesible exacto
   **«Crea tu cuenta gratis»** cuyo `to` resuelve a `{ name: 'signup' }`.
2. El control lleva la clase `ds-btn--primary` (o una que la componga) — no hay ningún color
   declarado en el `<style scoped>` de ninguno de los dos ficheros para este botón.
3. `LandingHero.vue` muestra el texto «Sin tarjeta» junto al CTA. `LandingTopbar.vue` no lo
   repite.
4. `LandingHero.vue` y `LandingTopbar.vue` contienen un enlace con nombre accesible «Planes y
   precios» cuyo `to` resuelve a `{ name: 'planes' }`.
5. El enlace que hoy dice «Paquetes» en `LandingTopbar.vue` pasa a decir «Combinaciones» y
   sigue apuntando a `#planes` (sin cambio de destino, solo de texto).
6. `PlanesView.vue`: con `route.query` vacío y sin intención guardada, el `h1` renderizado es
   «Arma tu paquete»; con `plan`/`ciclo`/`sedes`/`usuarios` en la query o con una intención
   vigente, el `h1` es «Esto es lo que te armamos».
7. Contraste: reutiliza `ds-btn--primary` sin overrides de color — no hace falta nueva medición
   (§1.5); un test que instancie el componente y compruebe la clase basta para que la garantía
   ya existente (`tests/unit/tokens-contrast.spec.ts`) siga cubriendo el caso.
8. Tamaño de objetivo: el CTA del hero mide ≥52 px de alto (`ds-btn--lg`); el de la barra,
   ≥40 px (`ds-btn` por defecto). Verificable por clase, sin necesidad de medir el DOM en
   tiempo de ejecución.
9. A 375 px de ancho, `LandingTopbar.vue` no produce desbordamiento horizontal — verificación
   visual de `front-e2e-visual` (Playwright, viewport móvil), no ejecutada en esta auditoría.
10. `wc -l` de los tres ficheros tocados ≤ 499.
11. `npm run css:budget` sigue en `0/0/0` (sin grupos duplicados, sin SFC de más de 500
    líneas, `maxStyleMinusScript: 0` no empeorado) — **no ejecutado en esta auditoría**, es la
    verificación que cierra el riesgo de §4.
12. `npm run quality` verde tras el cambio — **no ejecutado en esta auditoría**, corresponde a
    quien implemente.

---

## Comprobado y no comprobado en esta auditoría

| Comprobación | Estado |
|---|---|
| Marcado actual de `LandingHero`, `LandingTopbar`, `LandingCotizador`, `CotizadorCarril`, `LandingFinalCta`, `LandingPlans`, `PlanesView`, `SignupView`, `RegisterForm`, `SeleccionAside`, `router/index.ts` | **EJECUTADO** vía `codegraph_explore`, fuente verbatim |
| Contraste de `ds-btn--primary` sobre `--gradient-primary` | **NO recalculado** — reutilizado el cálculo ya ejecutado el 2026-09-04 en `2026-09-04-rediseno-lumbre-delta-embudo-publico.md` §D.1, mismo par de tokens |
| Ausencia de `flex-wrap` en `LandingTopbar.vue` | **EJECUTADO** — leído el `<style scoped>` completo del fichero |
| `npm run css:budget`, `npm run quality`, render en navegador, Playwright a 320/375 px | **NO EJECUTADO** — ninguno de los ficheros de `src/` se tocó en esta sesión |

