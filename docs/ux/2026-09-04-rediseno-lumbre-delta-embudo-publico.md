# Rediseño Lumbre — delta exacto del embudo público

**Fecha:** 2026-09-04 · **Repo:** `VetSoftwarePublicFront` (`develop`, `1a9f807`, árbol limpio)
**Alcance:** `src/features/landing/**`, `src/features/contratacion/**`, `src/features/asistente/**`
**Fuente que manda:** prototipo NUEVO (`landing-NUEVO.dc.html`, 915 líneas). El prototipo ANTERIOR
(`landing-prototipo.dc.html`, 859 líneas) solo sirve para distinguir qué ya está implementado.

**Naturaleza de este documento.** Es una **especificación de implementación**, no una auditoría.
Quien la ejecuta es `front-feature`; los gemelos TR-02 (`tokens.css`, `primitives.css`,
`css-budget.mjs`) los toca `front-parity`; las pruebas, `front-e2e-visual`. Aquí no se ha
modificado ni una línea de `src/`.

**Qué se midió y qué no.**

| Comprobación | Estado |
|---|---|
| Contraste WCAG de los pares de color del prototipo | **EJECUTADO** — cálculo OKLCH → sRGB → luminancia relativa, script desechable en el scratchpad. Tabla en §D.1 |
| Lectura del prototipo nuevo y `diff` contra el anterior | **EJECUTADO** |
| Inventario de ficheros y conteo de líneas por SFC | **EJECUTADO** (`wc -l`) |
| `npm run quality`, `css:budget`, `test:unit`, Playwright, `ds:audit`, dev server | **NO EJECUTADO** — fuera del encargo. Las estimaciones de §F son estáticas |
| Árbol de accesibilidad real en un navegador | **NO EJECUTADO** — el dictamen sale del marcado |

---

## §0 · Lo que YA está hecho y no hay que volver a hacer

Va primero porque reduce el delta a la mitad y evita trabajo duplicado.

**La marca ya está puesta.**

- Wordmark «Lumbre» en `--font-display` 17px/600 — `LandingTopbar.vue:22-24,58-63`.
- Lockup en el hero con `<picture>`, WebP 480/768/**1024** y PNG de respaldo —
  `LandingHero.vue:32-52`. Los seis ficheros existen ya en `public/brand/`.
- Pie «Lumbre · Colombia» + `soporte@kefaro.tech` — `LandingFooter.vue:19,25`.

**La tipografía ya está puesta.** `tokens.css:110-111`: `--font-sans: 'Inter', …` y
`--font-display: 'Poppins', 'Inter', system-ui`. JetBrains Mono no existe en el repo, que es lo
correcto: es chrome del prototipo.

**La paleta ya está puesta, y token por token.** `tokens.css:16` fija `--hue: 277`. Los quince
colores OKLCH del encargo **ya son tokens vigentes**. Esta tabla es el mapa de traducción
obligatorio: en el `<style scoped>` va el token, nunca el literal.

| Valor del prototipo | Token del repo | Definido en |
|---|---|---|
| `#f5f3ff` fondo de página | `--brand-canvas` | `tokens.css:211` |
| `oklch(51.1% 0.2301 277)` primario | `--amatista-600` / `--pub-ame-600` | `tokens.css:48` |
| `oklch(42% 0.16 277)` acento y enlace | `--amatista-700` / `--pub-ame-700` | `tokens.css:49` |
| `oklch(32% 0.12 277)` hover | `--amatista-800` / `--pub-ame-800` | `tokens.css:50` |
| `oklch(97% 0.015 277)` tinte suave | `--amatista-50` / `--pub-tint-50` | `tokens.css:26` |
| `oklch(94% 0.029 277)` tinte medio | `--amatista-100` / `--pub-tint-100` | `tokens.css:27` |
| `oklch(88% 0.059 277)` borde tinte | `--amatista-200` / `--pub-tint-bd` | `tokens.css:28` |
| `oklch(78% 0.113 277)` casilla apagada | `--amatista-300` | `tokens.css:29` — **NO como borde de control, §D.2** |
| `oklch(86% 0.0161 255.8)` borde | `--warm-300` / `--border-strong` | `tokens.css:66` |
| `oklch(92.9% 0.0126 255.5)` borde suave | `--warm-200` / `--border` | `tokens.css:65` |
| `oklch(20.8% 0.0398 265.8)` tinta | `--warm-900` / `--text` / `--pub-ink-900` | `tokens.css:98` |
| `oklch(35% 0.0384 260.7)` | `--warm-700` / `--pub-ink-700` | `tokens.css:93` |
| `oklch(44.6% 0.0374 257.3)` | `--warm-600` / `--text-muted` / `--pub-ink-600` | `tokens.css:92` |
| `oklch(52% 0.0336 257)` | `--warm-500` / `--text-subtle` / `--pub-ink-500` | `tokens.css:89` |
| `oklch(54% 0.0326 256.9)` | `--text-placeholder` | `tokens.css:249` |
| `oklch(99% 0.005 255.5)` campo | `--warm-50` | `tokens.css:62` |
| `linear-gradient(135deg, …51.1% .2301 277, …49.1% .2412 292.6)` | `--gradient-primary` | `tokens.css:426-430` |
| `0 1px 2px rgb(50 20 80/8%), 0 6px 16px -6px oklch(40% .18 277/50%), inset…` | `--shadow-primary` | `tokens.css:351` |

> **Consecuencia dura.** Ningún literal OKLCH nuevo entra en un `<style scoped>`. Tres puertas lo
> rechazan: `stylelint` con `vetsoftware/no-duplicate-primitive`,
> `tests/unit/control-border-tokens.spec.ts` (lista blanca de tokens de borde medidos) y
> `scripts/brand-palette-check.mjs`, que corre dentro de `npm run quality`.

**Lo que ya diverge del prototipo A PROPÓSITO y no se toca** (detalle en §C.2): filas de módulo con
`<input type="checkbox">` en vez de `aria-pressed`, borde de campo de 2 px `--pub-ame-600` en vez
de 1 px gris, stepper de cuatro pasos, y las respuestas 2 y 3 de la FAQ.

---

## §A · Inventario de deltas, fichero a fichero

Leyenda: **SC** sin cambios · **COPY** cambia texto · **CSS** cambia estilo · **EST** cambia
estructura · **DEL** se elimina · **NEW** nuevo.

### A.1 · `src/features/landing/**`

| Fichero | Qué tiene hoy | Qué pide el prototipo | Veredicto |
|---|---|---|---|
| `views/LandingView.vue` | Composición; el cotizador vive dentro de `LandingHero` (`:174`), luego `ValueGrid`, `DayFlow`, `Plans`, `Faq`, `FinalCta` (`:175-187`) | El cotizador sale del hero y pasa a ser **sección hermana** entre el hero y la rejilla de valor | **EST** — mover `<LandingCotizador :cotizador="cotizador" />` a `land-main`, después de `<LandingHero />` |
| `components/LandingHero.vue` | Una columna centrada: lockup arriba (`:32-52`), `h1` (`:54-57`), bajada (`:59-63`), cotizador (`:65`), lista de confianza (`:67-69`). CSS `text-align:center`, `max-width:720px` (`:74-81`), lockup `clamp(200px,26vw,320px)` (`:99-103`) | **Dos columnas**: lockup a la izquierda (`flex:0 0 auto`, `clamp(140px,16vw,200px)`, `sizes="(width <= 900px) 140px, 200px"`), `h1`+bajada a la derecha (`flex:1 1 440px`), texto alineado a la izquierda, contenedor `max-width:1240px`, `gap:44px`, `align-items:center`. Sin cotizador y sin lista de confianza dentro | **EST + COPY + CSS** |
| `components/LandingCotizador.vue` | Tarjeta de 560 px con `h2` (`:117`), encuadre (`:119-122`), `<textarea rows=3>` **con valor sembrado** (`:60-66,132-142`), selector siempre visible (`:145-150`), dos contadores (`:152-167`), `BloquePrecioVivo` (`:169-183`), CTA (`:185-187`) y pie (`:188-191`) | Tarjeta de dos columnas, `max-width:1240px`. Izquierda: etiqueta, ayuda, `<textarea rows=6 min-height:150px>` **sin valor**, ejemplo en `placeholder`, y bloque de propuesta + selector **solo si hay texto**. Derecha: carril pegajoso (`position:sticky; top:28px`) con «Cómo funciona» (3 pasos), «Listo: N módulos marcados» condicionado a que haya texto, CTA «Ver propuesta» y pie. **Sin contadores y sin bloque de precio** | **EST + COPY + CSS** — el fichero con más trabajo del rediseño |
| `components/BloquePrecioVivo.vue` | 250 líneas: cifra en vivo, `desde`/`calculando`, salto de paquete, fallo, región viva (`:110-143`) | **No aparece en la landing** | **DEL de la landing** — hoy su único llamador es `LandingCotizador.vue:169`. Ver §C.4 antes de borrar el fichero |
| `components/ContadorCantidad.vue` | Contador accesible completo: `aria-disabled` en topes, `aria-label` por unidad, `input[type=number]` (`:72-127`) | **No aparece en la landing**; sigue en `/planes` vía `PlanesTarjetaModulos` | **SC** — el fichero no se toca; solo deja de instanciarse en el hero |
| `components/LandingSelectorModulos.vue` | Núcleo como `<p>` con nombre «— incluido siempre» + precio (`:93-97`); filas `<label><input checkbox>` con nombre + **precio** (`:115-129`); siembra una sola área abierta (`:79-88`) | Núcleo con **nombre + descripción larga**, sin precio. Filas **sin precio** en la landing y **con precio** en `/planes`. Nota «Porque lo mencionaste» bajo el nombre de las filas detectadas. Se abren **todas** las áreas con detección | **EST + COPY** — hacen falta dos props nuevas: `conPrecio: boolean` y `detectados: string[]`; y `abiertas` pasa a ser controlable desde fuera |
| `components/AreaPlegable.vue` | `<h3><button aria-expanded aria-controls aria-labelledby aria-describedby>` + insignia dentro del nombre accesible (`:57-80`) | Idéntico en función; solo cambian tipografías, que ya son tokens | **SC** |
| `components/LandingValueGrid.vue` | 4 tarjetas; la 3.ª reescrita a propósito (`:25-28`, motivo en `:8-11`) | 4 tarjetas; la 3.ª vuelve a prometer baja automática | **COPY parcial** — 3 de 4 cambian; la 3.ª **NO** (§C.1) |
| `components/LandingDayFlow.vue` | 4 pasos en `<ol>` (`:10-27`) | 4 pasos; cambian los textos 1, 2 y 3 | **COPY** |
| `components/LandingFaq.vue` | 8 `<details>`; sedes y DIAN se leen del catálogo (`:55-71`); las respuestas 2 y 3 reescritas (`:78-85`, motivo en `:17-20`) | 8 preguntas; cambian 1, 2 y 3 | **COPY parcial** — la 1 sí; la 2 y la 3 **NO** (§C.1) |
| `components/LandingFinalCta.vue` | `h2` + párrafo + ancla a `#cotizador` (`:14-29`) | Texto idéntico | **SC** — salvo que la sección del cotizador cambie de `id` |
| `components/LandingTopbar.vue` | Wordmark Lumbre + 3 enlaces (`:20-33`) | Idéntico | **SC** |
| `components/LandingFooter.vue` | «Lumbre · Colombia» + 5 enlaces (`:18-27`) | Igual, más Privacidad/Términos que el prototipo no dibuja pero son obligación legal (`:4-14`) | **SC** |
| `components/LandingPlans.vue` | Rejilla de `PlanCard` + letra pequeña «Todas parten del núcleo (…)» (`:143-146`) | El prototipo **borra** esa letra pequeña y renombra «núcleo» | **COPY** — se reescribe, no se borra (§C.1) |
| `components/PlanCard.vue` | Conteo «Núcleo + N módulos» (`:50-53`), sufijo `+ IVA {{ciclo}}` (`:93`), insignia «La que más eligen» (`:81`) | Conteo «Clientes y mascotas + N módulos», sufijo «al mes, IVA incluido» | **COPY** + §C.3 |
| `components/PlanesCombinaciones.vue` | 3 opciones compactas con precio y sufijo de ciclo (`:70`) | Igual, con los presets renombrados | **COPY** — los nombres vienen del servidor (§C.7) |
| `views/PlanesView.vue` | `h1` «Esto es lo que te armamos» (`:264`), bajada (`:265-267`), rótulo de moneda «…, sin IVA» (`:270`) | `h1` igual; bajada nueva; el rótulo de moneda pasa a IVA incluido | **COPY** + §C.3 |
| `components/PlanesTarjetaModulos.vue` | Selector + contadores + ciclo, con las unidades incluidas en el rótulo | Igual: «Sedes · 1 incluida», «Personas · 2 incluidas» ya salen del catálogo | **SC** |
| `components/PlanesResumenAside.vue` | `sufijo` = `+ IVA al mes` (`:52-54`), conteo «Núcleo + N» (`:56-60`), rótulo «Solo lo que marcaste» (`:110`) | «al mes, IVA incluido»; «Clientes y mascotas + N módulos»; rótulo igual | **COPY** + §C.3 |
| `components/SeleccionAside.vue` | «Estimado: X + IVA al mes» (`:67-68`) | IVA incluido | **COPY** + §C.3 |
| `components/PasosEmbudo.vue` | 4 rótulos: `['Tu clínica','Tu cuenta','Verifica tu correo','Confirmar']` (`:17`) | 3 rótulos: `Tu negocio · Confirmar · Listo` | **COPY parcial** — paso 1 → «Tu negocio». Los cuatro pasos **se quedan** (§C.1) |
| `components/ResumeIntentBanner.vue` | Banda «sigue donde lo dejaste» | El prototipo no la modela: no tiene estado persistido | **SC** |
| `composables/useCotizador.ts` | `nombreParaLector()` «Solo el núcleo» / «Núcleo y N módulos» (`:145-149`); anuncio «Desde X más IVA al mes» (`:232-238`) | Vocabulario nuevo + IVA incluido | **COPY** (en TS) + §C.3 |
| `composables/planPricing.ts` | `sufijoCiclo()` (`:237-239`), `importeEstimado()` (`:251-253`), `MONEDA_DE_FACTURACION` (`:52`) | Se conservan; hace falta un `sufijoConImpuesto(ciclo)` nuevo | **NEW (función)** — §C.3 |
| `composables/cotizadorLineas.ts` | Cesta, paquete que coincide, incluidas por eje | Sin cambios: alimenta `/planes` | **SC — no retirar** (§C.4) |
| `api/cotizacion.source.ts` | Seam de `POST /quotes/preview` (`:102-120`) | Sin cambios: alimenta `/planes` y el paso 6 | **SC — no retirar** (§C.4) |
| `composables/anclaConFoco.ts`, `usePlanes.ts`, `stores/plans.store.ts`, `content/plans.content.ts`, `api/plans.source.ts`, `types/*` | — | — | **SC** |
| `composables/deteccionModulos.ts` | **no existe** | Detección por palabra clave a principio de palabra | **NEW** — §C.5 |

### A.2 · `src/features/contratacion/**`

| Fichero | Qué tiene hoy | Qué pide el prototipo | Veredicto |
|---|---|---|---|
| `views/ContratarView.vue` | 467 líneas; paso vinculante completo | `h1` «Un paso y ya está», bajada nueva, bloque «Tu negocio» con cuatro campos | **COPY** — ojo al techo de 500 líneas (§F) |
| `components/ContratarResumenAside.vue` | «Lo que confirmas», conteo, selección, apagados, desglose, «Hoy pagas $ 0» (`:87-108`) | Igual, más una fila de IVA y una de total dentro del `<aside>` | **COPY + EST menor** |
| `components/ContratarResumenTabla.vue` | Subtotal / IVA (19 %) / Total por mes cuando termine la prueba / Lo que se te cobra hoy (`:168-193`) | «IVA incluido (19%)» y «Total al mes» | **COPY** — pero es la prueba documental del desglose (§C.3) |
| `components/LetraPequenaPaso6.vue` | Dos frases: documentos enlazados arriba (`:39-42`); baja por correo (`:44-47`, motivo en `:19-22`) | Una frase distinta bajo la casilla | **COPY parcial** — la 2.ª frase **no se sustituye** (§C.1) |
| `components/TrialLinesTable.vue` | Fechas de prueba por módulo; «Sin prueba · se cobra desde el primer día» | «Se cobra desde el primer día, sin prueba» | **COPY** |
| `components/SiguientesPasos.vue` | 3 tarjetas filtradas por permiso (`:21-40`); el fallback cita «tu clínica» (`:56-57`) | Mismos 3 títulos y textos que hoy | **COPY mínimo** — solo «clínica» → «negocio» en `:57` |
| `views/ContratarExitoView.vue` | `h1` «Listo. Reservaste N módulos.» (`:80`); importes `subtotal + IVA impuesto = total` (`:97-99`) | `h1` «Listo. Reservaste tu plan con N módulos.»; línea con total e IVA incluido | **COPY** + §C.3 |
| `components/PriceDriftNotice.vue` | «Cuando lo elegiste: X + IVA al mes» / «Ahora: Y + IVA al mes» (`:50,54`) | El prototipo no lo modela | **INTOCABLE en estructura, COPY forzado** — §C.2 y §C.3 |
| `components/ConfirmarBloqueadoNotice.vue`, `DemoModeNotice.vue` | — | — | **SC — INTOCABLES** (§C.2) |
| `composables/*`, `stores/*`, `api/contratacion.source.ts`, `types/*` | — | — | **SC** |

Dos intocables que se consumen desde `ContratarView` pero **no viven en esta feature**:
`src/features/legal/components/LegalConsentCheckbox.vue` y
`src/components/feedback/ErrorSummary.vue`. Su contrato no cambia (§C.2).

### A.3 · `src/features/asistente/**`

| Fichero | Qué tiene hoy | Qué pide el prototipo | Veredicto |
|---|---|---|---|
| `components/AsistentePanel.vue` | Orquesta los estados del asistente | No lo modela | **SC — INTOCABLE** (§C.2) |
| `components/AsistenteEntrada.vue` | `h2` «Cuéntanos qué hace tu veterinaria» (`:232`), etiqueta «¿A qué se dedica tu veterinaria?» (`:234`), error (`:100`), CTA «Ver mi propuesta» (`:315`) | Vocabulario «negocio» | **COPY** — rompe `planes-esquema-encabezados.spec.ts:92,99` |
| `components/AsistenteFueraDeDominio.vue` | «Parece que tu negocio no es una veterinaria ni un centro de cuidado animal» (`:68-70`) | El prototipo invita explícitamente a un petshop de barrio | **SC pero en conflicto** — §C.6 |
| `content/copy.content.ts` | `ERROR_TEXTO_CORTO` cita «tu veterinaria» (`:86`) | «negocio» | **COPY** |
| `components/Propuesta*.vue`, `Catalogo*.vue`, `Comparador*.vue`, `Refinar*.vue`, `MotivoIa.vue`, `Asistente{Caido,Espera,Limite}*.vue` | Pintan lo que devuelve el servidor | Nombres nuevos de módulo | **SC** — el cambio es de datos, no de plantilla (§C.7) |
| `content/catalogo.content.ts`, `composables/*`, `stores/*`, `api/*`, `types/*` | — | — | **SC** |

---

## §B · Copy literal, hoy → nuevo

⚠ marca **compromiso de facturación o legal**: no se implementa sin firma del negocio.

### B.1 · Landing — hero

| Elemento | Hoy (repo) | Nuevo (prototipo) |
|---|---|---|
| `h1` | «Paga solo los módulos que tu **clínica** usa. **Ni uno más.**» — `LandingHero.vue:54-57` | «Paga solo los módulos que tu **negocio** usa. **Ni uno más.**» |
| Bajada | «Agenda, historia clínica, hospitalización, inventario y facturación DIAN son módulos separados, cada uno con su precio. **Marca los que uses y verás el total ahora mismo.** Si dejas de usar uno, lo apagas.» — `:59-63` | «Agenda, historia clínica, hospitalización, inventario y facturación DIAN son módulos separados, cada uno con su precio. Si dejas de usar uno, lo apagas.» (**se cae la promesa del total en vivo**, coherente con quitar el precio de la landing) |
| `alt` del lockup | «Lumbre — Gestiona lo que cuidas» — `:45` | idéntico |

### B.2 · Landing — tarjeta del cotizador

| Elemento | Hoy | Nuevo |
|---|---|---|
| `h2` de la sección | «Arma tu plan y mira el precio» — `LandingCotizador.vue:117` | *(el prototipo no dibuja `h2`; ver §D.5: se conserva uno, adaptado)* → «Arma tu plan» |
| Encuadre | «Arma tu propio plan. **Solo el núcleo es obligatorio** — los otros N módulos los enciendes uno a uno.» — `:119-122` | *(desaparece; su contenido se reparte entre la fila del núcleo y el carril «Cómo funciona»)* |
| Etiqueta del campo | «Cuéntanos qué hace tu veterinaria» — `:125` | «**¿Qué hace tu negocio?**» |
| Ayuda | «Está escrito un ejemplo: bórralo y cuéntanos lo tuyo. Si prefieres ir a lo concreto, abre el área que te interese y marca lo que uses.» — `:128-131` | «Clínica, spa, guardería, petshop o todo a la vez: escríbelo con tus palabras y te proponemos los módulos que encajan.» |
| Valor sembrado | «Somos una clínica de barrio: consulta general, vacunación y algo de estética los sábados. Dos personas en mostrador y una sola sede.» — `:60-62` | **se elimina**; pasa a `placeholder` |
| `placeholder` | *(no hay)* | «Somos un petshop de barrio: baño y estética, vendemos alimento y accesorios, y los sábados viene un veterinario a consulta.» |
| Título de propuesta (con detección) | *(no existe)* | «Con eso te proponemos **N** módulo/módulos» |
| Ayuda de propuesta (con detección) | *(no existe)* | «Marcados abajo. Quita lo que no uses o abre otra área para añadir.» |
| Título de propuesta (sin detección) | *(no existe)* | «No reconocimos ningún módulo en tu texto» |
| Ayuda de propuesta (sin detección) | *(no existe)* | «Abre el área que te interese y marca lo que uses.» |
| Fila del núcleo | «{nombre del catálogo} — incluido siempre» + precio — `LandingSelectorModulos.vue:95-96` | «**Clientes y mascotas**» + descripción «Los datos de cada dueño, sus mascotas y el historial de lo que le has hecho a cada una. Va siempre incluido.» **sin precio** |
| Nota de fila detectada | *(no existe)* | «Porque lo mencionaste» |
| Insignia de área | «N de M» / *(vacía)* | «N de M» / «**ninguno**» |

### B.3 · Landing — carril derecho (todo nuevo)

| Elemento | Nuevo |
|---|---|
| Eyebrow | «CÓMO FUNCIONA» (mayúsculas por CSS, texto en minúscula: «Cómo funciona») |
| Paso 1 | «Nos cuentas qué hace tu negocio.» |
| Paso 2 | «Marcamos los módulos que encajan y tú los ajustas.» |
| Paso 3 | «En la pantalla siguiente ves el precio y las fechas de prueba.» |
| Aviso con texto escrito | «**Listo: N módulos marcados.** Sigue y te mostramos qué cuesta.» |
| CTA | «Ver propuesta» *(hoy: «Ver mi propuesta y las fechas de prueba», `LandingCotizador.vue:186`)* |
| Pie del CTA ⚠ | «Prueba gratis y sin tarjeta. No te compromete a nada.» *(hoy: «Prueba gratis, sin tarjeta. Precio orientativo en pesos colombianos: el exacto lo ves antes de confirmar.», `:189-191`)* |

⚠ **El pie nuevo pierde la reserva de «precio orientativo».** Eso era defendible cuando la landing
enseñaba una cifra; con la cifra fuera, la reserva ya no protege nada en esa pantalla y su
supresión es correcta. Pero «**no te compromete a nada**» es una afirmación jurídica nueva sobre la
pantalla de entrada: debe revisarla el negocio.

### B.4 · Landing — lista de confianza

Los tres puntos son idénticos a hoy (`LandingHero.vue:23-27`): «Enciendes y apagas módulos cuando
quieras» · «Sin plan mínimo ni módulos atados» · «Tus datos en Colombia, cifrados». **Cambia el
sitio**: del hero pasan a debajo de la tarjeta del cotizador.

### B.5 · Landing — rejilla de valor (§B)

| # | Hoy (`LandingValueGrid.vue`) | Nuevo | Acción |
|---|---|---|---|
| 1 | «Pagas por módulo, no por plan» / «…Si tu **clínica** no hospitaliza…» `:15-18` | «…Si tu **negocio** no hospitaliza…» | cambiar |
| 2 | «Empiezas por dos y creces cuando toque» / «Muchas **clínicas** arrancan con agenda **e historia clínica**…» `:20-23` | «Muchos **negocios** arrancan con **agenda y caja**…» | cambiar |
| 3 ⚠ | «**Quitar módulos no te cambia de plan**» / «Si dejas de usar el spa en temporada baja, **escríbenos y lo damos de baja**. El resto de tu clínica sigue igual.» `:25-28` | «Quitar es tan fácil como poner» / «Dejas de usar el spa en temporada baja, **lo apagas y ese módulo desaparece del siguiente cobro**.» | **NO cambiar** — §C.1 |
| 4 | «Nada agrupado a la fuerza» / «No hay módulo que solo se venda acompañado de otros tres que no necesitas.» `:30-32` | idéntico | sin cambio |

### B.6 · Landing — «Un día, de principio a fin» (§C)

| Hora | Hoy (`LandingDayFlow.vue:10-27`) | Nuevo |
|---|---|---|
| 8:00 | «Llega el primer **paciente**.» / «Está en la agenda desde ayer.» | «Llega la primera **mascota**» / «Está en la agenda desde ayer.» |
| 8:15 | «La consulta.» / «Anotas peso, motivo y tratamiento. La historia se escribe sola.» | «**La atienden**» / «**Consulta, baño o vacuna: lo que anotas queda en su ficha.**» |
| 8:40 | «El cobro.» / «**La consulta** pasa a la cuenta del propietario. Facturas si hace falta.» | «El cobro» / «**El servicio** pasa a la cuenta del propietario. Facturas si hace falta.» |
| 20:00 | «Cierras caja.» / «Cuadra, porque nadie tuvo que apuntar nada en un papel.» | idéntico |

> Nota de estilo: el repo pone punto final al título de cada paso, el prototipo no. Es una
> divergencia menor; se sigue el repo por consistencia con el resto de la página.

### B.7 · Landing — combinaciones (§D)

| Elemento | Hoy | Nuevo |
|---|---|---|
| `h2` | «Combinaciones que se piden mucho» | idéntico |
| Bajada | «Atajos para marcar varios módulos de una vez, no paquetes cerrados. Al elegir uno puedes quitar lo que no uses y el precio baja.» | idéntica |
| Píldora mensual | «Mes a mes» | idéntica |
| Píldora anual ⚠ | «Un año · 2 meses gratis» | idéntica — **verificar que el catálogo real cumple 10 mensualidades** |
| Insignia | «La que más eligen» — `PlanCard.vue:81` | idéntica |
| Conteo | «Núcleo + N módulos» — `PlanCard.vue:53` | «**Clientes y mascotas** + N módulos» |
| Sufijo ⚠ | «+ IVA al mes» — `PlanCard.vue:93` | «al mes, **IVA incluido**» |
| Último punto de la lista | *(desde el catálogo)* | «Quita en el siguiente paso lo que no uses» |
| CTA de tarjeta | *(hoy: elegir/ver)* | «Marcar estos módulos» |
| Letra pequeña ⚠ | «Todas parten del núcleo (X al mes) con 2 personas y 1 sede. Cada sede adicional cuesta Y al mes y cada persona adicional Z al mes.» — `LandingPlans.vue:143-146` | **el prototipo la borra** — se conserva reescrita: «Todas parten de **clientes y mascotas** (X al mes) con 2 personas y 1 sede…» (§C.1) |

**Presets** — nombre y tagline (los publica el servidor, §C.7):

| Código | Hoy | Nuevo |
|---|---|---|
| `PRESET_SPA` | «Estética y guardería» / «**Lo mínimo para** agendar, atender y cobrar el spa» | «Estética y guardería» / «**Para** agendar, atender y cobrar el spa» |
| `PRESET_CLINIC` | «Consulta de barrio» / «Agenda, historia clínica, vacunación y mostrador» | idéntico |
| `PRESET_FULL` | «**Clínica con hospitalización**» / «**Los 13 módulos, de la cirugía a la facturación DIAN**» | «**Clínica completa**» / «**Todo: desde la cirugía hasta la factura electrónica**» |

### B.8 · Landing — FAQ (§E), las ocho

| # | Pregunta | Hoy (`LandingFaq.vue`) | Nuevo | Acción |
|---|---|---|---|---|
| 1 | ¿Tengo que contratar módulos que no uso? | «No. Solo se cobra **el núcleo** y los módulos que marcaste. Los demás quedan apagados y no aparecen en tu recibo.» `:76` | «No. Se cobra **la parte de clientes y mascotas, que va siempre**, y solo los módulos que marcaste. Los demás quedan apagados y no aparecen en tu recibo.» | **cambiar** |
| 2 ⚠ | ¿Puedo quitar un módulo si dejo de usarlo? | «Sí. Hoy el ajuste **lo hacemos nosotros**: escríbenos a `soporte@kefaro.tech`, nos dices cuál y lo damos de baja.» `:80` | «Sí, y **deja de cobrarse en el siguiente cobro**. Tus datos de ese módulo se conservan por si lo vuelves a encender.» | **NO cambiar** — §C.1 |
| 3 ⚠ | ¿Y si más adelante necesito uno más? | «Igual: nos escribes a `soporte@kefaro.tech` y lo activamos. Antes de encenderlo te confirmamos qué cuesta.» `:84` | «Lo marcas y se activa. **Solo pagas los días que falten para el siguiente cobro, no el mes entero.**» | **NO cambiar** — §C.1 |
| 4 ⚠ | ¿Tengo que poner una tarjeta para probarlo? | «No. La prueba no pide datos de pago.» `:88` | idéntica | sin cambio |
| 5 | ¿Qué pasa cuando se acaba la prueba? | «Te avisamos por correo antes. Cada módulo tiene su propia fecha y las verás todas antes de confirmar.» `:92` | idéntica | sin cambio |
| 6 ⚠ | ¿Sirve para varias sedes? | Compuesta desde el catálogo `:55-63`: «Sí. Las sedes se cuentan y se cobran por sede: la primera va incluida y cada una de más cuesta {precio} al mes.» | «…cada una más cuesta $ 35.000 al mes.» (**cifra clavada**) | **conservar la versión del repo** — la cifra se lee, no se escribe |
| 7 ⚠ | ¿Emite factura electrónica DIAN? | Compuesta desde el catálogo `:65-71`: «Sí, con tu resolución de facturación. Es un módulo aparte: {precio} al mes y **se cobra desde el primer día**.» | idéntica con cifra clavada | **conservar la versión del repo** |
| 8 | ¿Dónde están mis datos? | «En Colombia, cifrados, y son tuyos. Puedes pedir que te los exportemos.» `:98` | idéntica | sin cambio |

### B.9 · Landing — cierre (§F) y pie

| Elemento | Hoy | Nuevo |
|---|---|---|
| `h2` | «Marca lo tuyo. Deja el resto.» — `LandingFinalCta.vue:18` | idéntico |
| Párrafo | «Empieza con dos módulos si eso es lo que usas y añade el resto cuando haga falta. La prueba corre por módulo y verás cada fecha antes de confirmar.» `:20-22` | idéntico |
| CTA | «Armar mi propuesta» `:25` | idéntico |
| Pie | «Lumbre · Colombia» + Paquetes · Preguntas · Privacidad · Términos · `soporte@kefaro.tech` — `LandingFooter.vue:19-26` | «Lumbre · Colombia» + Paquetes · Preguntas · `soporte@kefaro.tech` — **se conservan los dos legales** |

### B.10 · `/planes` — configurador

| Elemento | Hoy | Nuevo |
|---|---|---|
| Stepper ⚠ | «Tu clínica · Tu cuenta · Verifica tu correo · Confirmar» — `PasosEmbudo.vue:17` | «Tu negocio · Confirmar · Listo» → **solo se renombra el paso 1** (§C.1) |
| `h1` | «Esto es lo que te armamos» — `PlanesView.vue:264` | idéntico |
| Bajada | «Ajusta lo que quieras. El importe se actualiza mientras eliges, y no te compromete a nada.» `:265-267` | «Cambia lo que quieras: el precio de la derecha se mueve contigo. Nada de esto te compromete.» |
| Moneda ⚠ | «Todos los precios están en pesos colombianos (COP), **sin IVA**.» `:270` | «Todos los precios están en pesos colombianos (COP), **IVA incluido**.» |
| Etiqueta del textarea | «¿A qué se dedica tu veterinaria?» — `AsistenteEntrada.vue:234` | con texto: «Lo que nos contaste» · sin texto: «Cuéntanos qué hace tu negocio» |
| `h2` de módulos | «Tus módulos» — `PlanesView.vue:295` | idéntico + subtítulo «Contratas **N de 13**. Quita lo que no uses y el total baja al instante.» → **el 13 se cuenta, no se clava** |
| Contador de sedes | «Sedes · 1 incluida» | «Sedes · 1 incluida» |
| Contador de personas | «Personas que lo usan · 2 incluidas» | «**Personas** · 2 incluidas» |
| `h2` de pruebas | «Cuándo empieza a costar» `:317` | idéntico |
| Subtítulo de pruebas | «Estas son las fechas si contratas hoy.» `:318` | «Cada módulo tiene su propia prueba y no terminan el mismo día. Estas son las fechas si contratas hoy.» |
| Fila sin prueba ⚠ | «Sin prueba · se cobra desde el primer día» | «Se cobra desde el primer día, sin prueba» |
| Fila con prueba | «Gratis hasta el {fecha}» | idéntica |
| `h2` de combinaciones | «O parte de una combinación conocida» `:326-332` | idéntico |
| `<aside>` rótulo | «Solo lo que marcaste» — `PlanesResumenAside.vue:110` | idéntico |
| `<aside>` conteo | «Núcleo + N módulos» / «Solo el núcleo» `:56-60` | «Clientes y mascotas + N módulos» / «**Solo clientes y mascotas**» |
| `<aside>` sufijo ⚠ | «+ IVA al mes» `:53` | «al mes, IVA incluido» |
| `<aside>` fila «Hoy pagas» ⚠ | «Hoy pagas $ 0» `:133-134` | idéntica |
| `<aside>` línea de fuera | «No pagas los otros N módulos del producto.» `:71-72` | idéntica |
| `<aside>` prueba ⚠ | «Prueba gratis y sin tarjeta. El primer cobro sería el {fecha}.» `:141` | idéntica |
| `<aside>` botones | «Continuar» / «Volver» `:160,170` | idénticos |
| Desglose: rótulo del núcleo | nombre del catálogo | «Clientes y mascotas» (§C.7) |

### B.11 · Contratación — paso vinculante

| Elemento | Hoy | Nuevo |
|---|---|---|
| `h1` | *(en `ContratarView`)* | «Un paso y ya está» |
| Bajada ⚠ | — | «Creas la cuenta y confirmas en la misma pantalla. **No pedimos tarjeta.**» |
| Rótulo del bloque | «Tu clínica» | «**Tu negocio**» |
| Campo 1 | «Nombre de la clínica» / `Veterinaria San Marcos` | «**Nombre del negocio**» / `Mascotas San Marcos` |
| Campo 2 | «Ciudad» / `Medellín` | idéntico |
| Campo 3 | «Tu correo» / `tu@clinica.co` | «Tu correo» / `tu@negocio.co` |
| Campo 4 | «Contraseña» / `Mínimo 8 caracteres` | idéntico |
| Nota del NIT ⚠ | — | «El NIT y los datos de facturación los pedimos cuando emitas tu primera factura, no ahora.» |
| Título de pruebas | — | «Los **N** módulos que activas, y cuándo empieza a costar cada uno» |
| Casilla legal ⚠ | «He leído y acepto los [términos del servicio] y la [política de tratamiento de datos].» | idéntica — **`LegalConsentCheckbox` es intocable** (§C.2) |
| Letra pequeña ⚠ | dos frases, `LetraPequenaPaso6.vue:39-47` | «Al confirmar reservas estos N módulos con los precios de esta pantalla, y solo estos. Si algo cambia antes de la activación te lo decimos y vuelves a confirmar. Para quitar un módulo o cancelar, escríbenos a `soporte@kefaro.tech`.» → **se AÑADE, no sustituye** (§C.1) |
| `<aside>` rótulo | «Lo que confirmas» — `ContratarResumenAside.vue:88` | idéntico |
| `<aside>` línea de selección | «Mes a mes · 1 sede · 3 personas» `:57-63` | idéntica |
| `<aside>` apagados | «Los otros N módulos quedan apagados y no se cobran.» `:73` | idéntica |
| `<aside>` IVA ⚠ | «IVA (19 %)» — `ContratarResumenTabla.vue:121` | «IVA incluido (19%)» |
| `<aside>` total ⚠ | «Total por mes, cuando termine la prueba» `:183-184` | «Total al mes» |
| `<aside>` hoy ⚠ | «**Hoy pagas $ 0.** El primer cobro sería el {fecha}, y te avisamos por correo antes.» `:103-105` | idéntica |
| Botón principal | «Confirmar y activar» | idéntico |
| Botón secundario | «Cambiar la selección» | idéntico |

### B.12 · Contratación — éxito

| Elemento | Hoy | Nuevo |
|---|---|---|
| Insignia | «Reservado» — `ContratarExitoView.vue:76` | idéntica |
| `h1` | «Listo. Reservaste N módulos.» `:80` | «Listo. Reservaste **tu plan con** N módulos.» |
| Bajada ⚠ | «{plan}. {módulos} son los módulos que quedan reservados para **{empresa}**.» `:84-89` | «**Ni uno más: los otros N quedan apagados hasta que los enciendas tú.** Te acabamos de mandar un correo para verificar tu cuenta.» |
| `h2` | «Qué se va a cobrar, módulo por módulo» `:92` | idéntico |
| Línea de importes ⚠ | «{ciclo} · {subtotal} + IVA {impuesto} = **{total}** · Primer cobro previsto: {fecha}» `:97-102` | «{ciclo} · **{total}** {sufijo}, **IVA incluido**. Primer cobro previsto: {fecha}. Te avisamos por correo antes.» |
| «Qué hacer ahora» | 3 tarjetas: «Invita a tu equipo» / «Para que cada persona entre con su usuario»; «Crea tu primera cita» / «La agenda del día empieza aquí»; «Configura tu caja» / «Antes del primer cobro del mostrador» — `SiguientesPasos.vue:21-40` | **idénticas** (el prototipo pone punto final; el repo no) |
| Fallback sin permisos | «…Quien administre los permisos de tu **clínica** puede…» `:56-57` | «…de tu **negocio**…» |
| Número de oferta ⚠ | «Ya registramos tu contratación con el número **X**, válida hasta el {fecha}. Para dejar los módulos encendidos en tu cuenta escríbenos a `soporte@kefaro.tech` con ese número.» `:116-126` | «Guardamos tu contratación con el número **X**. Si necesitas algo, escríbenos a `soporte@kefaro.tech` con ese número.» → **NO cambiar** (§C.1: la frase del repo dice lo que de verdad falta) |

---

## §C · Riesgos y contradicciones

### C.1 · Copy del prototipo que NO se puede implementar tal cual (seis casos)

Todos tienen el mismo patrón: el prototipo describe un producto que el backend todavía no es, y el
repo ya corrigió esa promesa una vez, con el motivo escrito en el propio fichero. Reimplantar el
texto del prototipo sería **volver a publicar un compromiso comercial incumplible**.

1. **FAQ 2 — «deja de cobrarse en el siguiente cobro».** El repo dice «el ajuste lo hacemos
   nosotros: escríbenos». Motivo escrito en `LandingFaq.vue:17-20`: facturación no cumple hoy la
   baja automática. **Veredicto: no cambiar.** Solo se adapta el vocabulario si la frase menciona
   «clínica», que no es el caso.
2. **FAQ 3 — «Solo pagas los días que falten para el siguiente cobro».** Es prorrateo. El repo lo
   retiró por lo mismo. **No cambiar.**
3. **Tarjeta de valor 3 — «lo apagas y ese módulo desaparece del siguiente cobro».** Idéntico
   problema; motivo en `LandingValueGrid.vue:8-11`. **No cambiar.**
4. **Stepper de 3 pasos.** El prototipo funde el alta con la verificación de correo. En el producto
   real la verificación **es un paso propio** (`PasosEmbudo.vue:6-8`). Un indicador de progreso que
   promete tres pasos y entrega cuatro es §3.2 (coherencia) y además hace abandonar. **Se renombra
   el paso 1 a «Tu negocio» y se dejan los cuatro.**
5. **Letra pequeña del paso 6.** El prototipo la sustituye por una frase que no habla ni de dónde
   están los documentos legales ni de cómo darse de baja. Las dos frases del repo cubren
   obligaciones concretas (Ley 1581 de 2012; WCAG §3.3.4 vía «Confirmed»,
   `LetraPequenaPaso6.vue:19-22`). **La frase del prototipo se AÑADE encima; las dos existentes se
   conservan.**
6. **Letra pequeña de los paquetes y párrafo de éxito.** El prototipo borra
   `LandingPlans.vue:143-146` (base, sedes y personas incluidas) y ablanda el aviso de
   `ContratarExitoView.vue:116-126` («para dejar los módulos encendidos escríbenos»). Las dos
   frases son la verdad operativa de hoy. **Se reescriben con el vocabulario nuevo; no se borran.**

Además, dos cifras del prototipo están **clavadas** y en el repo se leen del catálogo: los
$ 35.000 de sede adicional (FAQ 6, `LandingFaq.vue:40-63`) y los $ 39.000 de DIAN (FAQ 7,
`:50-71`). Clavarlas es exactamente el defecto que ese código existe para evitar. **Se conserva la
composición desde el catálogo.**

### C.2 · Componentes intocables y cómo encaja el rediseño alrededor

| Componente | Por qué es intocable | Cómo encaja el rediseño |
|---|---|---|
| `LegalConsentCheckbox` (`src/features/legal/components/`) | Es el consentimiento con versión de documento. Cambiar su marcado o sus enlaces altera qué se acepta | El bloque «Tu negocio» y la tabla de pruebas se maquetan **alrededor**, en tarjetas hermanas. La casilla mantiene su propia tarjeta |
| `PriceDriftNotice` | `role="alert"` + `tabindex="-1"` + foco programático; es el aviso de que el precio cambió entre pantallas | **Excepción obligada:** sus dos «+ IVA» (`:50,54`) sí hay que cambiar por coherencia (§C.3). Es un cambio de **texto dentro de la plantilla**, sin tocar roles, foco ni props |
| `ConfirmarBloqueadoNotice` | Explica por qué no se puede confirmar. Es la mitad «motivo» del botón bloqueado | Se conserva íntegro. El botón nuevo del `<aside>` lo referencia por `aria-describedby` (§D.5) |
| `DemoModeNotice` | Aviso de que la activación no es automática. Aparece exactamente dos veces y nunca más (`ContratarExitoView.vue:107`) | No se toca ni se mueve |
| `ErrorSummary` (`src/components/feedback/ErrorSummary.vue`) | Resumen de errores de formulario con foco y enlaces a los campos | El bloque «Tu negocio» sigue usándolo. **No se sustituye por errores solo en línea** |
| `SiguientesPasos` | Filtra las tres tarjetas por permiso (`:42-50`); sin permiso no pinta una rejilla vacía | Solo cambia el literal «clínica» de `:57`. El filtrado y el fallback se conservan |
| `AsistentePanel` (y su lógica) | Máquina de estados del asistente: recuperación por token, fuera de dominio, límite, caído, refinar | El rediseño **no lo toca**. El textarea del hero y el del panel siguen compartiendo `useAsistente().texto`, que es lo que hace que el relato viaje de la landing a `/planes` |

**Regla general para el implementador:** de estos siete, seis no se abren. `PriceDriftNotice` se
abre **solo** para las dos cadenas de IVA.

### C.3 · El cambio a IVA incluido — dónde está hoy y qué hay que hacer

**Qué presenta hoy el repo: subtotal SIN impuesto, en todas partes salvo el paso 6.** Nueve sitios:

| # | Sitio | Qué dice hoy | Qué cifra pinta |
|---|---|---|---|
| 1 | `PlanesResumenAside.vue:52-54` | `+ IVA al mes` | `cotizacion.subtotal` (vía `importe`) |
| 2 | `BloquePrecioVivo.vue:119` | `+ IVA {{sufijoCiclo}}` | `cotizacion.subtotal` |
| 3 | `PlanCard.vue:93` | `+ IVA {{sufijoCiclo}}` | `precioBase(plan, ciclo)` |
| 4 | `SeleccionAside.vue:67-68` | `Estimado: X + IVA al mes` | `estimado.subtotal` |
| 5 | `PriceDriftNotice.vue:50,54` | `X + IVA al mes` (×2) | importes de la intención |
| 6 | `ContratarExitoView.vue:97-99` | `subtotal + IVA impuesto = total` | las tres |
| 7 | `PlanesView.vue:270` | «…, sin IVA.» | rótulo de pantalla |
| 8 | `ContratarResumenTabla.vue:168-193` | Subtotal / IVA (19 %) / Total | las tres |
| 9 | `useCotizador.ts:232-238` | anuncio «Desde X más IVA al mes» | `subtotal`, **región viva** |

**El error que hay que NO cometer.** El prototipo calcula `iva = subtotal − subtotal / 1.19` y
`total = subtotal`, es decir, trata su `subtotal` como **importe bruto**. En el repo NO lo es:
`componerCotizacion` (`cotizacion.source.ts:76-86`) mapea `subtotalAmount` → `subtotal`,
`taxAmount` → `impuesto` y `totalAmount` → `total`, y el subtotal del servidor es **neto**. Aplicar
la fórmula del prototipo sobre el subtotal del repo **bajaría todos los precios publicados un
16 %** sin que ningún gate lo notara.

**Lo que hay que hacer, exactamente.**

1. **Cambiar la cifra, no la fórmula.** Donde hoy se pinta `subtotal` y se rotula «+ IVA», hay que
   pintar `total` y rotular «IVA incluido». En las cuatro pantallas con cotización viva
   (`#1`, `#2`, `#4`, `#9`) el `total` **ya viene del servidor**: no se calcula nada en el cliente.
   Esto es más correcto que el prototipo, no menos.
2. **`planPricing.ts`:** añadir `export function sufijoConImpuesto(ciclo: Ciclo): string` que
   devuelva `'al mes, IVA incluido'` / `'al año, IVA incluido'`. Todos los sitios lo consumen; no
   se escribe la cadena a mano en ninguna plantilla.
3. **`useCotizador.ts:136-138`:** `importe` pasa a `importeEstimado(cotizacion.value?.total)`.
   Ojo: `explicarSalto` (`:174-195`) y `anterior` (`:229`) comparan subtotales; **se comparan
   totales o se comparan subtotales, pero no se mezclan**. Lo más barato es dejar la comparación
   en subtotal (es interna, no se pinta) y cambiar solo lo que sale a pantalla.
4. **`PlanCard.vue` (#3) y `SeleccionAside.vue` (#4) son estimaciones locales**, no del servidor:
   ahí sí hace falta el impuesto, y `calcularEstimado` ya devuelve `total` (`planPricing.ts:202-212`,
   con `plan.taxRate`). Se pinta `estimado.total`, nunca una división por 1,19.
5. **`ContratarResumenTabla` (#8) NO se colapsa.** Un desglose Subtotal / IVA / Total es la prueba
   documental de qué se cobra y con qué tarifa. Lo que cambia es el rótulo de la última fila
   («Total al mes, cuando termine la prueba» → mantener la coletilla, que es verdad) y el del IVA
   («IVA (19 %)» → «IVA incluido (19 %)»). El aviso de `:111-122` sigue vigente: **sin `taxRate`
   publicado se escribe «IVA» a secas**, nunca un porcentaje deducido.
6. **`PriceDriftNotice` (#5)** compara «lo que viste» contra «lo que vale». Si una pantalla pasa a
   IVA incluido y la otra no, el aviso comparará peras con manzanas. Por eso este componente,
   pese a ser intocable, **debe cambiar sus dos cadenas en el mismo commit** que #1.
7. **`importeVistoMensual`** (`PlanesView.vue:218-219`) guarda hoy `cotizacion.subtotal`. Si la
   pantalla pasa a mostrar `total`, **decidir explícitamente qué se guarda** y que el paso 6
   compare lo mismo. Guardar el subtotal y enseñar el total significa que el usuario ve una cifra y
   el aviso de deriva vigila otra.

> ⚠ **Consecuencia legal, señalada expresamente.** «IVA incluido» sobre una cifra es una
> **afirmación tributaria**. Tres condiciones antes de publicarlo: (a) que el `taxRate` del catálogo
> sea realmente 19 y no un artículo `EXEMPT`/`EXCLUDED` — `CatalogoTaxTreatment` tiene tres valores
> (`catalogo.types.ts:40`) y una cesta mixta no tiene un único «19 %»; (b) que el desglose siga
> disponible antes de confirmar (#8), porque el comprador tiene derecho a ver la base gravable; y
> (c) firma del negocio. Si (a) no se puede garantizar, el rótulo correcto es «IVA incluido» **sin
> porcentaje**, con el porcentaje solo en la tabla del paso 6, línea a línea.

### C.4 · La desaparición del precio en la landing — qué se retira y qué NO

**Respuesta corta: la llamada a `POST /quotes/preview` deja de hacer falta EN EL HERO, y en ningún
sitio más. No se retira ni una línea de `cotizacion.source.ts`.**

- `previsualizarCotizacion` (`cotizacion.source.ts:102-120`) tiene **un solo llamador**,
  `useCotizador.pedir()` (`useCotizador.ts:211-253`), y `useCotizador` lo consumen cuatro sitios:
  `LandingView.vue:55`, `LandingCotizador.vue`, `LandingHero.vue` y **`PlanesView.vue:57-73`**.
  Quitarlo del hero deja `/planes` intacto, que es donde vive el precio a partir de ahora.
- `cotizadorLineas.ts` (`cestaDeCotizacion`, `paqueteQueCoincide`, `modulosDelPaquete`,
  `incluidasDelEje`, `unidadesExtra`) sigue siendo la fuente de la cesta que viaja al servidor y de
  las unidades incluidas que rotulan los contadores. **No se retira nada.**
- `esLimiteDeCotizaciones` / `segundosDeEspera` (`:135-155`) siguen protegiendo el 429 en
  `/planes`, donde ahora se concentra todo el tráfico de cotización. **No se retiran.**

**Lo que sí se puede retirar, con cuidado:**

| Pieza | Se puede retirar | Condición |
|---|---|---|
| `<BloquePrecioVivo>` de `LandingCotizador.vue:169-183` | **sí** | Es la instancia, no el fichero |
| `BloquePrecioVivo.vue` (fichero, 250 líneas) | **sí**, queda sin llamadores | Solo si `/planes` no lo va a reutilizar. Hoy `/planes` usa `PlanesResumenAside`. Retirarlo también obliga a borrar `tests/unit/landing-bloque-precio.spec.ts` |
| Los dos `<ContadorCantidad>` de `LandingCotizador.vue:152-167` | **sí** | El fichero se queda: lo usa `PlanesTarjetaModulos` |
| `sedes`/`usuarios` del cotizador del hero | **no** | `useCotizador` los expone y `/planes` los usa. Si el hero deja de escribirlos, se quedan en su valor inicial y la cesta sale con 1/1, que es lo que se quiere |

**Lo que hay que decidir y no es obvio.** Con el hero sin precio, `useCotizador` en `LandingView`
sigue disparando un `POST /quotes/preview` por cada casilla marcada, para una cifra que ya nadie
pinta. Son peticiones anónimas contra un endpoint con límite por IP
(`QUOTE_PREVIEW_RATE_LIMITED`). **Recomendación: en la landing, montar el cotizador en un modo sin
red** — una bandera `useCotizador({ conPrecio: false })` que salte el `watch` de `programar()`
(`:276`). No es opcional: gastar el cupo de cotizaciones de la IP en la portada hace que el
prospecto llegue a `/planes` ya limitado, y ahí el precio sí importa.

### C.5 · La detección por palabras clave — dónde vive y qué no puede hacer

El prototipo trae 13 listas de claves y un algoritmo de «principio de palabra» con su motivo
escrito (`hora` cazaba «ahora», `fía` cazaba «radiografías»). Tres problemas al llevarlo al repo:

1. **Las claves son datos de negocio, no de presentación.** Hoy `PublicCatalogItemResponse`
   (`catalogo.types.ts:51-77`) no trae ningún campo de palabras clave. O se añade al contrato, o
   viven en `content/catalogo.content.ts`, que es exactamente el sitio donde el repo ya guarda «lo
   que el diseño necesita y `GET /catalog` no publica» (`catalogo.types.ts:17-31`). **Recomendación:
   `content/catalogo.content.ts`, con comentario de por qué y un issue para subirlas al contrato.**
2. **Ya existe un detector, y es el asistente.** `POST` al asistente devuelve una propuesta
   razonada, con motivo por módulo (`MotivoIa.vue`). La detección local es un **eco barato** que
   funciona sin red y sin consentimiento — y ese es su valor: `LandingCotizador.vue:19-25` explica
   que el texto del hero **no sale del navegador** por Ley 1581 art. 9 y 26 lit. a). Una detección
   por regex local es la única forma de proponer módulos en el hero sin pedir dos autorizaciones
   sobre el primer pliegue. **Es la decisión correcta; hay que dejarla escrita.**
3. **El algoritmo del prototipo tiene un bug.** El bucle de `detectados()` mezcla `desde`/`pos` de
   forma que `desde` se asigna pero nunca se usa. Funciona por casualidad (`t.indexOf(k, desde)`
   nunca se evalúa con el `desde` correcto porque el `return true` sale antes en el caso normal).
   **Al portarlo se escribe con `RegExp` y `\b` Unicode**, que es lo que el propio prototipo
   describe en prosa:
   `new RegExp('(?<![\\p{L}\\p{N}])' + escapar(clave), 'iu')`. Con `u` y lookbehind, soportado en
   todos los navegadores objetivo.

Reglas de comportamiento que hay que respetar tal cual las describe el prototipo:

- Al reescribir el texto, la propuesta **se recalcula desde cero** y los toggles manuales se
  pierden. Es agresivo pero coherente: el prototipo lo documenta.
- Se **abren** las áreas con detección; si no hay ninguna, se abre `atencion`. Esto choca con
  `LandingSelectorModulos.vue:79-88`, que hoy abre **una sola** área y lo justifica por el orden de
  tabulación. **Conflicto real:** abrir cuatro áreas son trece paradas de tabulación antes del CTA.
  Recomendación: abrir solo las áreas **con detección** (que en el caso típico son una o dos), y
  mantener «una sola» como fallback sin detección.

### C.6 · «Negocio» contra la guarda de fuera de dominio

El prototipo invita literalmente a un **petshop** («Somos un petshop de barrio: baño y estética,
vendemos alimento y accesorios…») y renombra todo a «negocio». Pero
`AsistenteFueraDeDominio.vue:68-70` sigue diciendo: «Parece que tu negocio **no es una veterinaria
ni un centro de cuidado animal**. Lumbre está hecho solo para eso.»

Un prospecto que escriba **exactamente el placeholder del hero** puede acabar en esa pantalla dos
clics después. Es la peor contradicción de todo el rediseño: la portada promete e invita, el paso
siguiente rechaza.

**Qué hay que hacer:** el cambio no es de copy sino de **política de dominio**. Antes de publicar
el vocabulario «negocio», el negocio tiene que decidir si un petshop sin veterinario es cliente. Si
lo es, la guarda del asistente (servidor) y el texto de `AsistenteFueraDeDominio` tienen que
ampliarse a «cuidado animal» en sentido amplio. Si no lo es, **hay que cambiar el placeholder** por
uno que no prometa lo que se va a rechazar. **No se puede publicar el placeholder nuevo sin
resolver esto.**

### C.7 · Lo que es dato del servidor y no copy del front

Nueve de los renombres del prototipo **no se pueden implementar en el front**. Salen de
`GET /catalog` (`PublicCatalogItemResponse.name` / `.shortLabel` / `areas[].nombre`) y de
`GET /plans`:

| Código | Hoy (`name` / `short`) | Nuevo |
|---|---|---|
| `CORE` | «Núcleo: clientes y mascotas» / «Núcleo» | «Clientes y mascotas» / «Clientes y mascotas» |
| `LAB_IMAGING` | «Laboratorio e imagen diagnóstica» | «Laboratorio y radiografías» |
| `SERVICES` | «Servicios, tarifas y promociones» | «Tarifas y promociones» |
| `CASH_REGISTER` | «Caja y punto de venta» / «Caja y mostrador» | «Caja y ventas» / «Caja y ventas» |
| `INVENTORY` | «Inventario y kardex» | «Inventario de productos» |
| `OPEN_ACCOUNTS` | «Cuentas abiertas y cartera» / «Cartera» | «Cuentas por cobrar» / «Por cobrar» |
| área `atencion` | «Atención a los pacientes» | «Atención a las mascotas» |
| `PRESET_FULL` | «Clínica con hospitalización» | «Clínica completa» |
| `PRESET_SPA` (tagline) | «Lo mínimo para agendar…» | «Para agendar…» |

Además, el prototipo pinta una **descripción larga bajo el núcleo** («Los datos de cada dueño, sus
mascotas y el historial…»). El contrato sí tiene `description` (`catalogo.types.ts:55`), hoy sin
uso en el selector. **No hay que inventar el texto en el front: hay que sembrarlo en
`catalog_items.description` y leerlo.**

**Riesgo de coordinación:** si el front publica «Clientes y mascotas» clavado y el servidor sigue
mandando «Núcleo: clientes y mascotas», la pantalla dirá una cosa y el desglose del `<aside>`
—que usa el rótulo del servidor, `PlanesResumenAside.vue:80-84`— dirá otra, en la misma vista. **El
renombrado va en el backend o no va.**

---

## §D · Accesibilidad (WCAG 2.2 AA)

### D.1 · Contraste real, calculado

Método: OKLCH → OKLab → sRGB lineal → sRGB con la codificación estándar → luminancia relativa
`0.2126R + 0.7152G + 0.0722B` → `(L1+0.05)/(L2+0.05)`. Umbrales: **§1.4.3** 4,5:1 texto normal /
3:1 texto grande; **§1.4.11** 3:1 para bordes de control, iconos y estados.

| Ratio | Par | Uso en el prototipo | Veredicto |
|---|---|---|---|
| 17,84 | `warm-900` / `#fff` | `h1`, títulos sobre tarjeta | AA |
| 16,27 | `warm-900` / `#f5f3ff` | `h1` sobre el lienzo | AA |
| 11,31 | `warm-700` / `#fff` | etiquetas de campo 13 px | AA |
| 7,56 | `warm-600` / `#fff` | cuerpo 14 px | AA |
| 6,90 | `warm-600` / `#f5f3ff` | bajada del hero 17 px | AA |
| 6,92 | `warm-600` / `amatista-50` | pasos del carril pegajoso 14 px | AA |
| 5,50 | `warm-500` / `#fff` | ayuda 13 px, resumen de área 12 px | AA |
| 5,04 | `warm-500` / `amatista-50` | eyebrow «Cómo funciona» 12 px | AA |
| 5,05 | `warm-500` / `warm-100` | insignia «ninguno» 12 px | AA |
| 5,02 | `warm-500` / `#f5f3ff` | pie 13 px | AA |
| **4,91** | `--text-placeholder` / `warm-50` | **placeholder del textarea** | AA, pero **por 0,41 de margen** — ver D.3 |
| **4,23** | `--text-placeholder` / `amatista-100` | **texto de «Confirmar y activar» deshabilitado** | **NO llega a 4,5:1** — ver D.6 |
| 8,94 | `amatista-700` / `#fff` | nota «Porque lo mencionaste» 12 px, enlaces | AA |
| 8,18 | `amatista-700` / `amatista-50` | acento sobre tinte suave | AA |
| 10,99 | `amatista-800` / `amatista-100` | píldora «La que más eligen» 12 px | AA |
| 13,14 | `amatista-800` / `#fff` | número del paso en círculo blanco | AA |
| 6,28 | `#fff` / `amatista-600` | texto del botón primario, parada clara | AA |
| 7,09 | `#fff` / `oklch(49.1% .2412 292.6)` | texto del botón primario, parada oscura | AA |
| 8,94 | `#fff` / `amatista-700` | check del núcleo sobre su círculo | AA |
| 5,72 | `amatista-600` / `#f5f3ff` | anillo de foco sobre el lienzo | §1.4.11 OK |
| 6,28 | `amatista-600` / `#fff` | anillo de foco sobre tarjeta | §1.4.11 OK |
| 5,74 | `amatista-600` / `amatista-50` | anillo sobre el carril pegajoso | §1.4.11 OK |
| **2,04** | `amatista-300` / `#fff` | **casilla APAGADA del prototipo (1,5 px)** | **FALLA §1.4.11** — D.2 |
| 3,79 | `amatista-450` / `#fff` | el mínimo que el repo ya fijó (A11Y-09) | §1.4.11 OK |
| 1,53 | `warm-300` / `#fff` | borde de tarjeta y **de campo** del prototipo | ver D.2 |
| 1,49 | `warm-300` / `warm-50` | borde del textarea sobre su propio relleno | ver D.2 |
| 1,45 | `amatista-200` / `#fff` | borde tinte sobre blanco | decorativo, OK |
| 1,32 | `amatista-200` / `amatista-50` | borde de la fila del núcleo | decorativo, OK |
| 1,23 | `warm-200` / `#fff` | borde suave de tarjeta de valor | decorativo, OK |

Los cuatro últimos son **bordes decorativos de contenedor**, no de control: §1.4.11 no los alcanza
y no hay nada que corregir.

### D.2 · Los dos bordes del prototipo que SÍ fallan §1.4.11 — y que ya están resueltos en el repo

**[bloqueante] Borde del `<textarea>` y de los `<input>` a 1,49:1** — el prototipo pinta
`border:1px solid oklch(86% 0.0161 255.8)` sobre un relleno `oklch(99% 0.005 255.5)`.
**Criterio:** WCAG 2.2 §1.4.11 Non-text Contrast (AA) — el límite de un campo es lo que lo
identifica como control; el relleno no ayuda (1,03:1 contra la tarjeta blanca).
**Impacto:** todo el embudo público. Un campo cuyo límite no se ve deja de parecer un campo.
**Arreglo:** ya existe. `.pub-campo` usa `border-width: 2px` y `.pub-campo-rest` usa
`border-color: var(--pub-ame-600)` = 6,28:1 (`public-auth.css:344-363`). **Se conserva el borde del
repo y se ignora el del prototipo.** Además hay un gate que lo impide:
`tests/unit/control-border-tokens.spec.ts` rechaza `--warm-300` como borde de control.

**[bloqueante] Casilla apagada a 2,04:1** — el prototipo dibuja la casilla a mano con
`border:1.5px solid oklch(78% 0.113 277)` (`amatista-300`).
**Criterio:** §1.4.11 (AA). El propio `tokens.css:32-41` documenta que `--amatista-300` mide 1,98:1
y por eso se creó `--amatista-450` (3,79:1) como piso de bordes.
**Arreglo:** ya existe y es mejor: `LandingSelectorModulos.vue:121-126` usa
`<input type="checkbox">` nativo, cuyo cuadro lo dibuja el agente de usuario y no tiene el
problema. **No se sustituye por un `<span>` estilado.**

**[grave] `aria-pressed` en las filas de módulo.** El prototipo usa
`<button aria-pressed>` para cada módulo (`landing-NUEVO.dc.html:100`).
**Criterio:** WAI-ARIA 1.2 + APG. `aria-pressed` se anuncia «botón, pulsado» y significa **acción
con efecto inmediato**; aquí es un **valor de formulario con consecuencia económica**, cuya
semántica es `checkbox`. Además, un `button` no aparece en el modo formularios del lector.
**Impacto:** las 13 filas × 2 pantallas.
**Arreglo:** conservar el `<label><input type="checkbox">` de hoy, cuyo motivo está escrito en
`LandingSelectorModulos.vue:10-24`. **El único `aria-*` del prototipo que sí se conserva es el
`aria-expanded` de la cabecera de área**, que ya está en `AreaPlegable.vue:62` con `aria-controls`,
`aria-labelledby` y `aria-describedby` — más completo que el prototipo.

### D.3 · El placeholder pasa a ser la única instrucción, y eso es una regresión

**[grave] El ejemplo se muda del valor al `placeholder`** — hoy `LandingCotizador.vue:60-66`
siembra el ejemplo como valor y `:126-131` explica por escrito que «la ayuda va FUERA del
placeholder: un placeholder desaparece al escribir y se lee como un valor ya introducido».
El prototipo hace justo lo contrario.
**Criterio:** WCAG 2.2 §3.3.2 Labels or Instructions (A) + §1.4.3 (el placeholder mide 4,91:1,
suficiente pero al límite) + el patrón de formularios del W3C, que desaconseja el placeholder como
única instrucción.
**Impacto:** quien empieza a escribir pierde el ejemplo; quien usa lupa o alto contraste lo pierde
antes.
**Arreglo, y sí es compatible con el prototipo:** el prototipo **también** trae una línea de ayuda
persistente encima del campo («Clínica, spa, guardería, petshop o todo a la vez: escríbelo con tus
palabras…»). Esa línea es la instrucción y va en `aria-describedby`; el placeholder es solo el
ejemplo. Con las dos cosas la regla se cumple. **Lo que no se puede hacer es quedarse solo con el
placeholder.**

**Efecto colateral que hay que arreglar en el mismo commit:** `PlanesView.vue:83`
(`llegoSembrado = textoLibre.value.trim().length > 0`) decide a dónde va el foco al llegar a
`/planes`. Hoy es `true` prácticamente siempre porque el hero sembraba. Sin siembra pasa a ser
`false` para quien no escribió, y el `<h1>` deja de recibir foco. **Revisar `:92-94`: con el campo
vacío, el foco debe ir igualmente al `<h1>`** — de lo contrario quien navega con lector aterriza en
`/planes` sin saber dónde está (§2.4.3 Focus Order, A).

### D.4 · El selector que aparece y desaparece al escribir

**[grave] Aparición de contenido sin anuncio.** Con `tieneTexto` falso no hay selector; al escribir
el primer carácter aparecen el bloque de propuesta, las cuatro áreas y —en el carril— «Listo: N
módulos marcados». Es un cambio de contexto disparado por la escritura.
**Criterio:** WCAG 2.2 §4.1.3 Status Messages (AA) y §3.2.2 On Input (A).
**Arreglo, tres piezas:**

1. **No mover el foco.** §3.2.2 prohíbe el cambio de contexto automático al escribir. El campo
   conserva el foco siempre.
2. **Anunciar el resultado, una sola vez y con retardo.** El bloque de propuesta
   («Con eso te proponemos N módulos» + su ayuda) es un **`role="status"` / `aria-live="polite"`
   con `aria-atomic="true"`**. Con **debounce de 500 ms desde la última tecla** — el mismo
   `PREVIEW_DEBOUNCE_MS` que ya usa `useCotizador.ts:29` — para que no se anuncie letra a letra.
   Ese es el único anuncio del bloque.
3. **«Listo: N módulos marcados» NO lleva región viva.** Es un eco visual del anterior; dos
   regiones vivas para un gesto son dos locuciones que se pisan, que es exactamente el criterio ya
   escrito en `AreaPlegable.vue:23-25` y `BloquePrecioVivo.vue:26-29`. Va con `aria-hidden="true"`
   o simplemente sin `aria-live`.

**Y el selector debe estar en el DOM aunque esté vacío**, o al menos su encabezado: si el bloque
entero desaparece, el índice de encabezados del lector cambia de forma al teclear.

### D.5 · La nota «Porque lo mencionaste» — sí se anuncia, y ya está resuelto

**[menor] La nota es información, no decoración.** Va dentro del `<label>` de la fila, después del
nombre, en `--amatista-700` a 12 px (8,94:1, AA).
**Criterio:** §1.4.1 Use of Color (A) — la nota es texto, no solo color, así que cumple. §4.1.2.
**Arreglo:** el `<label>` envolvente ya hace que el nombre accesible de la casilla sea «Agenda de
citas Porque lo mencionaste» — que es exactamente lo que hace falta oír. **No hace falta `aria-label`
ni región viva.** Lo único a vigilar: que la nota **no** entre en el nombre accesible de la
**cabecera de área**, que ya está compuesto con `aria-labelledby` a mano (`AreaPlegable.vue:64`).

### D.6 · «Confirmar y activar» deshabilitado

**[grave] El prototipo usa `disabled` y un texto a 4,23:1.**
**Criterio:** §1.4.3 (AA) para el texto —`--text-placeholder` sobre `--amatista-100` no llega a
4,5:1— y §2.4.3 / §3.3.1 para el foco: `disabled` saca el botón del orden de tabulación, así que
quien llega a él con el teclado se queda sin saber por qué no puede seguir.
**Arreglo, ya resuelto en el repo y hay que replicarlo, no reinventarlo:**
`PlanesResumenAside.vue:153-168` usa `aria-disabled="true"` + `aria-describedby` a un párrafo
**visible** con el motivo, y el manejador hace no-op. Misma receta aquí, con
`ConfirmarBloqueadoNotice` como texto del motivo. Para el contraste: el texto del botón apagado
sube a `--warm-600` sobre `--amatista-100` (≈ 7,3:1) o el fondo baja a `--warm-100`.
**El motivo tiene que ser visible, no solo para el lector** (`PlanesResumenAside.vue:164-167`).

### D.7 · El importe, la región viva y los 400 ms

**[nota] Los 400 ms de `PlanesConfigurador` son de `ANUNCIO_MS`, no un debounce del cálculo.**
En `useCotizador.ts:37-44` está escrito: el debounce de la petición son 500 ms (`:29`), y
`ANUNCIO_MS = 400` es la **distancia mínima entre dos locuciones**, porque dos respuestas separadas
por 80 ms se pisan en el lector. `PlanesConfigurador.vue:53,80-85` aplica lo mismo con su propio
temporizador: la cifra que se PINTA cambia al instante y la que se ANUNCIA va 400 ms detrás.
**Al pasar a IVA incluido esto no cambia.** Lo único que cambia es el texto compuesto en
`useCotizador.ts:232-238`, que pasa de «Desde X más IVA al mes» a «X al mes, IVA incluido».
**Regla que hay que preservar:** una sola región viva por pantalla, `aria-live="polite"` +
`aria-atomic="true"`, y la cifra con `aria-hidden` mientras el estado no sea firme
(`PlanesResumenAside.vue:114,121`).

### D.8 · Orden del DOM del `<aside>` en móvil

**[grave] El `<aside>` va después en el DOM y `position:sticky` lo saca de sitio en móvil.**
En el prototipo, configurador y contratación son `display:flex; flex-wrap:wrap` con el contenido
(`flex:1 1 400px`) antes del `<aside>` (`flex:1 1 320px`). Al colapsar, el `<aside>` cae **al
final** de la página: quien decide la compra tiene que rodar hasta abajo para ver el precio y el
botón.
**Criterio:** §1.3.2 Meaningful Sequence (A) — el orden del DOM es correcto y **no se debe alterar
con `order:`**, porque el orden visual y el de lectura tienen que coincidir (§1.3.2 + §2.4.3).
**Arreglo, ya resuelto en el repo:** `.pub-barra-accion` (`PlanesResumenAside.vue:144-162`)
reubica el botón y el importe en una barra anclada abajo cuando la rejilla colapsa, **sin
duplicarlo en el DOM**, y el eco del importe va `aria-hidden`. **Se replica esa primitiva en el
`<aside>` de contratación**; lo que no se hace es mover el `<aside>` arriba con `order`.

### D.9 · Objetivos táctiles y foco (§2.5.8 / §2.4.11)

**[nota] Los tamaños del prototipo cumplen con margen.** Cabecera de área 56 px, fila de módulo
46 px, botón `−`/`+` 40×40, enlaces de la topbar 40 px de alto, CTA 52 px. Todo por encima de
24×24 CSS px. **Lo que hay que vigilar en la implementación** es la fila de módulo **sin precio**:
al quitar la columna de la derecha, si el `<label>` deja de ser `width:100%` el objetivo se
encoge al ancho del texto. Debe seguir siendo `display:flex; width:100%`
(`LandingSelectorModulos.vue:185-193`).

**[nota] El anillo de foco.** El prototipo usa `outline: 2px solid oklch(51.1% .2301 277)` con
`outline-offset: 2px`. En el repo eso es `.pub-focus-ring` / `--ring`, ya medido y con gate
(`tests/unit/tokens-contrast.spec.ts`, mínimo 3:1). Los tres fondos donde va a caer miden
5,72 / 6,28 / 5,74:1. **No hay nada que cambiar.**

### D.10 · Nombre accesible de los botones `−` / `+`

**[nota] Ya está bien y coincide con el prototipo.** `ContadorCantidad.vue:86,110` compone
`aria-label="Una sede menos"` / `"Una sede más"` a partir de `unidadSingular`, exactamente como el
prototipo. **No se toca.** Lo que el prototipo no tiene y el repo sí —y hay que conservar— es el
`<input type="number">` real entre los dos botones (`:94-104`, motivo en `:14-21`): con
`MAX_CANTIDAD_LINEA = 10.000`, un `<span>` obligaría a pulsar `+` treinta y nueve veces para llegar
a cuarenta sedes.

---

## §E · Plan de fases

Ordenado por dependencias. «BE» = necesita backend.

### Fase 0 — Decisiones de negocio (bloquea a 1, 4 y 6)

Ningún código. Tres firmas:

1. **Vocabulario y dominio** (§C.6): ¿un petshop sin veterinario es cliente? De la respuesta salen
   el placeholder, el copy y la guarda del asistente.
2. **IVA incluido** (§C.3): confirmación tributaria y de qué pasa con artículos `EXEMPT`/`EXCLUDED`.
3. **Las tres promesas del prototipo que hoy no se cumplen** (§C.1): prorrateo, baja automática y
   stepper de tres pasos. Por defecto **no se implementan**.

**Criterio de aceptación:** las tres decisiones escritas y fechadas en este documento.
**Rompe:** nada.

### Fase 1 — Copy y vocabulario, puro front

Todos los literales «clínica/veterinaria/paciente» → «negocio/mascota», los textos de B.1, B.5,
B.6, B.10, B.11, B.12; el conteo «Núcleo + N» → «Clientes y mascotas + N» en
`PlanCard.vue:50-53`, `PlanesResumenAside.vue:56-60`, `BloquePrecioVivo.vue:58-62`,
`useCotizador.ts:145-149`; y el paso 1 del stepper.
**No entra:** nada de §C.1.

**Criterio de aceptación:** `npm run test:unit` verde tras actualizar las aserciones; ni un
«clínica» ni un «veterinaria» en `features/landing`, `features/contratacion` salvo los de dominio
real (`AsistenteFueraDeDominio`).
**Rompe:** `landing-bloque-precio.spec.ts:115-133`, `landing-combinaciones.spec.ts:240-242`,
`landing-cotizador.spec.ts:139-143,176`, `planes-esquema-encabezados.spec.ts:92,99`,
`use-cotizador.spec.ts:202`, `router-planes-sin-plan.spec.ts:94`.

### Fase 2 — Paleta y tipografía

**No hay trabajo.** Ya está en `tokens.css` (§0). Lo único: barrer los `<style scoped>` del embudo
buscando literales de color que no sean token. `stylelint` y `brand:palette` ya lo vigilan.

**Criterio de aceptación:** `npm run stylelint:strict` y `npm run brand:palette` verdes.
**Rompe:** nada.

### Fase 3 — Estructura del hero (puro front, CSS)

`LandingHero` a dos columnas; el cotizador sale a sección hermana en `LandingView`; la lista de
confianza baja debajo de la tarjeta. Ajustar el `sizes` del lockup a
`(width <= 900px) 140px, 200px` y el `clamp` a `clamp(140px,16vw,200px)`.

**Criterio de aceptación:** el hero mide `max-width:1240px`; a ≤ 900 px las dos columnas apilan y
el lockup queda arriba; el orden del DOM sigue siendo lockup → `h1` → bajada.
**Rompe:** las líneas base visuales de la landing, si existen (`front-e2e-visual`).

### Fase 4 — Detección por palabras clave + selector condicionado (puro front) — depende de 0 y 1

`composables/deteccionModulos.ts` nuevo con `RegExp` y lookbehind Unicode (§C.5); claves en
`content/catalogo.content.ts`; `LandingSelectorModulos` con props `conPrecio` y `detectados`;
bloque de propuesta con `role="status"` y debounce de 500 ms (§D.4); textarea a `rows=6` con
`placeholder` y ayuda persistente (§D.3); arreglo del foco de `PlanesView.vue:92-94`.

**Criterio de aceptación:** con el campo vacío no hay selector y el CTA sigue llevando a `/planes`
(la decisión de `LandingCotizador.vue:33-37` se conserva: vacío no es error); escribir
«baño y estética» marca `GROOMING`; escribir «ahora» **no** marca `SCHEDULING`; escribir
«radiografías» marca `LAB_IMAGING` y **no** `OPEN_ACCOUNTS`.
**Rompe:** `landing-selector-modulos.spec.ts`, `landing-cotizador.spec.ts` entero (el campo ya no
llega sembrado).

### Fase 5 — Retirar el precio de la landing (puro front) — depende de 3 y 4

Quitar `BloquePrecioVivo` y los dos `ContadorCantidad` del hero; carril derecho con «Cómo
funciona», «Listo: N módulos marcados» y CTA «Ver propuesta»; **modo sin red del cotizador en la
landing** (§C.4).

**Criterio de aceptación:** cargar `/` y marcar cinco casillas produce **cero** peticiones a
`/quotes/preview`; `/planes` sigue cotizando igual.
**Rompe:** `landing-bloque-precio.spec.ts` (se borra si el componente se retira),
`landing-cotizador.spec.ts`, `regiones-vivas.spec.ts` si cubre la landing.

### Fase 6 — IVA incluido (puro front, decisión de negocio) — depende de 0

Los nueve sitios de §C.3, `sufijoConImpuesto()` nuevo, decisión sobre `importeVistoMensual`.
**Todo en un solo commit**: dejar dos pantallas con criterios distintos hace mentir a
`PriceDriftNotice`.

**Criterio de aceptación:** ninguna pantalla del embudo dice «+ IVA» ni «sin IVA»; el desglose
Subtotal/IVA/Total del paso 6 sigue existiendo; la cifra grande de `/planes` es
`cotizacion.total` y no una división por 1,19; el aviso de deriva compara las dos cifras del mismo
criterio.
**Rompe:** `planes-propuesta-resumen.spec.ts`, `contratar-resumen-tabla.spec.ts`,
`contratar-view.spec.ts`, `use-cotizador.spec.ts:202`, `plan-pricing.spec.ts`.

### Fase 7 — Renombrado del catálogo (**BE**) — independiente, se puede lanzar en paralelo desde la Fase 0

Los nueve renombres de §C.7 en `catalog_items.name` / `.short_label`, `catalog_areas.name` y los
nombres de preset; y sembrar `catalog_items.description` para el núcleo.

**Criterio de aceptación:** `GET /catalog` devuelve «Clientes y mascotas» y el front no clava
ningún nombre. Verificado también en la consola de plataforma, que lee el mismo catálogo.
**Rompe:** `tests/helpers/catalogo-embudo.ts` y todo lo que dependa de él;
`asistente-catalogo.spec.ts`, `cotizador-lineas.spec.ts`, `contratacion-lineas.spec.ts`.

### Fase 8 — Guarda de dominio (**BE**) — solo si la Fase 0 dice que un petshop es cliente

Ampliar la clasificación de fuera de dominio del asistente y el texto de
`AsistenteFueraDeDominio.vue:63-70`.

**Criterio de aceptación:** el texto exacto del `placeholder` del hero, pegado en el asistente,
**no** cae en fuera de dominio.
**Rompe:** `asistente-seam.spec.ts:213-228`.

---

## §F · Presupuesto de CSS

Techos vigentes (`scripts/css-budget.config.json`): `maxStyleMinusScript: 0`,
`maxDuplicateBodies: 3`, `maxDuplicateGroups: 0`, `maxSfcLines: 500`, `maxOversizedSfc: 0`. Es un
**trinquete**: los números solo bajan. La estimación de abajo es estática — el script **no se
ejecutó**.

**Veredicto: se pone rojo por dos vías distintas, y las dos son evitables.**

### F.1 · `maxSfcLines: 500` con `maxOversizedSfc: 0` — el riesgo inmediato

| SFC | Hoy | Margen | Presión del rediseño |
|---|---|---|---|
| `PlanesConfigurador.vue` | **485** | **15** | Ninguna directa; pero cualquier retoque lo revienta |
| `PlanesView.vue` | **480** | **20** | Copy de la bajada y la moneda: ±0. **Seguro si solo cambia texto** |
| `ContratarView.vue` | **467** | **33** | `h1`, bajada, «Tu negocio», nota del NIT: **+10/+15 líneas → 482. Pasa raspando** |
| `LandingCotizador.vue` | 296 | 204 | **La fase 3+5 le suma una columna, un carril pegajoso, 3 pasos y 2 estados condicionales: +180/+230 líneas → 480-530. RIESGO ALTO** |
| `LandingSelectorModulos.vue` | 231 | 269 | 2 props, la nota y la descripción del núcleo: +50 → 281. Sin riesgo |
| `LandingHero.vue` | 162 | 338 | Pierde el cotizador, gana rejilla de dos columnas: −20/+40. Sin riesgo |

**Dónde repartir el CSS, y no es negociable en `LandingCotizador`:**

1. **Extraer el carril derecho a `CotizadorCarril.vue`** (~90 líneas): eyebrow, `<ol>` de tres
   pasos, aviso «Listo: N módulos marcados», CTA y pie. No tiene estado propio: dos props
   (`nModulos`, `tieneTexto`) y un `emit('continuar')`. Es el mismo criterio que
   `LandingView.vue:23-28` ya aplicó («se parte en componentes desde el primer commit, no cuando
   crezca»).
2. **Extraer el bloque de propuesta a `PropuestaDetectada.vue`** (~45 líneas): los dos textos, el
   `role="status"` y el debounce del anuncio. Al ser el sitio de la región viva, tenerlo aislado
   es además lo que impide que alguien le añada una segunda.
3. `LandingCotizador` se queda en ~200 líneas: campo, ayuda, error, selector y composición.

Con eso, ningún SFC del embudo pasa de 500.

### F.2 · `maxStyleMinusScript: 0` — el riesgo agregado, y el más caro

El techo es **global del repo**, no por fichero: la suma de líneas de `<style>` no puede superar la
suma de líneas de `<script>`. Está exactamente en 0 de margen. El rediseño es, en su mayor parte,
**CSS nuevo sin script nuevo**: rejillas de dos columnas, carriles pegajosos, un `<ol>` numerado
con círculos, tarjetas con degradado. Ese es el perfil que revienta el gate.

**Cómo se compensa, por orden de rendimiento:**

1. **Retirar CSS al mismo tiempo que se añade.** La fase 5 borra `BloquePrecioVivo.vue`, que está
   **medido en 107 líneas de `<script>` contra 105 de `<style>`**: retirarlo entero devuelve
   **−105 al agregado de estilo y −107 al de script**, es decir un saldo de **+2 a favor del
   presupuesto**, no el colchón grande que podría parecer. El margen de verdad lo dan los bloques
   `.lcot-cantidades` y `.lcot-precio` de `LandingCotizador.vue:261-270` y el CSS del hero centrado
   de `LandingHero.vue:74-103`, que sí se borran sin borrar script. **Aun así conviene hacer la
   fase 5 antes o junto con la 3, no después: así el agregado nunca sube antes de bajar.**
2. **Meter las estructuras repetidas en `primitives.css`, no en `scoped`.** Tres candidatas claras,
   que ya se repiten entre landing y `/planes`:
   - el **carril pegajoso** (`position:sticky; top; padding; radio; borde`) → `.ds-rail`;
   - la **lista numerada con círculo** de «Cómo funciona» → `.ds-steps`;
   - el **par etiqueta/importe a los lados** — ya existe como `.pub-row-split`
     (`PlanesResumenAside.vue:128`), reutilizarlo en vez de escribirlo otra vez.
   Esto es **trabajo de `front-parity`**, no de `front-feature`, porque `primitives.css` es gemelo
   TR-02 y cualquier añadido va byte a byte en los dos repos.
3. **Nada de color en el `<style scoped>`.** El color va en clases de tono (`ds-tone--*`) aplicadas
   desde el marcado, incluido el estado por defecto. Una regla base en `scoped` pesa `(0,2,0)` con
   el `[data-v-…]` y le gana siempre a la primitiva global `(0,1,0)`: escribir color ahí es escribir
   un bug de especificidad, no un estilo.
4. **`maxDuplicateBodies: 3`**: el cuerpo del CTA primario aparece en el prototipo cuatro veces
   (carril del hero, cierre, `<aside>` del configurador, `<aside>` de contratación). En el repo eso
   es `.ds-btn.ds-btn--primary`, ya existente. **Cuatro copias literales de ese cuerpo pondrían el
   contador en 4 y el gate en rojo.** Se usa la primitiva.

**Conclusión de §F:** el rediseño **no** pone el presupuesto en rojo si se cumplen tres cosas —
partir `LandingCotizador` en tres, hacer la fase 5 antes que la 3, y subir el carril y los pasos a
`primitives.css` vía `front-parity`. Si se implementa como una traducción literal del prototipo,
fichero a fichero, se pone rojo con casi total seguridad.

---

## §G · Issues propuestos (redactados, sin abrir)

No se ha abierto ninguno. Se dejan escritos para que los decida el humano.

**1. `[a11y] El placeholder no puede ser la única instrucción del campo del hero`** — §D.3.
Tipo: bug. Bloquea la fase 4. Incluye el arreglo del foco de `PlanesView.vue:92-94`.

**2. `[a11y] El selector que aparece al escribir necesita región viva con debounce`** — §D.4.
Tipo: bug. WCAG §4.1.3 / §3.2.2.

**3. `[a11y] «Confirmar y activar» deshabilitado: 4,23:1 y fuera del orden de tabulación`** — §D.6.
Tipo: bug. WCAG §1.4.3 / §2.4.3.

**4. `[negocio] Definir si un petshop sin veterinario es cliente`** — §C.6.
Tipo: decisión. Bloquea el placeholder y el vocabulario «negocio».

**5. `[negocio/legal] Pasar todo el embudo público a IVA incluido`** — §C.3.
Tipo: decisión + cambio. Nueve sitios; el subtotal del servidor es neto, no bruto.

**6. `[backend] Renombrar nueve entradas del catálogo comercial`** — §C.7.
Tipo: cambio de datos. Incluye `catalog_items.description` para el núcleo.

**7. `[front] Partir LandingCotizador antes de crecerlo`** — §F.1.
Tipo: deuda preventiva. Extraer `CotizadorCarril.vue` y `PropuestaDetectada.vue`.

**8. `[parity] Subir el carril pegajoso y la lista de pasos a primitives.css`** — §F.2.
Tipo: design system. Gemelo TR-02: va en los dos repos.

---

## Anexo · Qué NO cambia y por qué, en una línea cada uno

- `ModalShell`, `tokens.css`, `primitives.css`, `css-budget.mjs` — gemelos TR-02, los toca
  `front-parity`.
- `LegalConsentCheckbox`, `ConfirmarBloqueadoNotice`, `DemoModeNotice`, `ErrorSummary`,
  `AsistentePanel` — intocables (§C.2).
- `cotizacion.source.ts`, `cotizadorLineas.ts`, `usePlanes.ts`, `plans.store.ts` — siguen
  alimentando `/planes` (§C.4).
- `ContadorCantidad.vue`, `AreaPlegable.vue`, `PasosEmbudo.vue` (salvo un rótulo) — su
  accesibilidad ya es superior a la del prototipo.
- Las respuestas 2 y 3 de la FAQ, la tarjeta de valor 3, la letra pequeña de paquetes y del paso 6,
  el aviso de activación del éxito — compromisos que hoy no se pueden cumplir (§C.1).
