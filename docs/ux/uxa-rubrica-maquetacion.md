# Rúbrica de maquetación — el patrón de medida de las ~150 capturas

Con qué se juzga si una pantalla está «bien colocada, bien espaciada, bien alineada, bien
centrada», de forma que dos auditores mirando la misma captura lleguen al mismo verdicto.

**Esto no es una auditoría.** No se miró ninguna pantalla al escribirlo. Es la regla con la que se
miran.

## Orden de autoridad — no negociable

Cuando dos fuentes digan cosas distintas, gana la de arriba.

1. **WCAG 2.2**, criterios de nivel A y AA. Es lo único que produce severidad *bloqueante* por sí
   solo.
2. **`docs/ux/reglas-de-interfaz.md`** (R01–R15, gemelo byte a byte en los dos repos), y con él
   `patron-de-mensajes.md`, `patron-de-busqueda-en-listado.md` y, para el armazón,
   `VetSoftwareFront/docs/ux/armazon-tablet-especificacion.md`. Es la ley interna, ya acordada y ya
   verificada contra este código.
3. **`tokens.css` y `primitives.css`** (gemelos TR-02). La escala del proyecto manda sobre la
   escala de cualquier sistema de referencia.
4. **Literatura externa** (Primer, NN/g, Gestalt, WCAG AAA como umbral no vinculante). Entra
   **solo donde 1–3 no han decidido nada**, y cuando entra se dice.

En cada dimensión de abajo hay una línea **Autoridad** que dice cuál de los cuatro escalones fija
el número. Si dice «propio», el umbral lo pone esta rúbrica y se declara de dónde sale.

**Lo que esta rúbrica NO redescubre.** `reglas-de-interfaz.md` ya tiene su tabla «Lo que quedó
abierto» (línea 1282), sus «Issues por abrir» (1324) y sus «Puertas que faltan, por orden de
coste» (1401). Un hallazgo que ya esté ahí **se cita por su número de issue y no se reabre**. Los
que más van a aparecer en estas capturas: **public-web #115** (borde de campo a 1,23:1),
**public-web #134** (anillos de foco escritos dentro de un `<style scoped>`), **admin-web #74**
(movimiento reducido que no alcanza a las primitivas), **public-web #57 / admin-web #44** (ninguna
puerta de accesibilidad en el pipeline).

---

## 1 · La escala real del proyecto

Extraída de `src/assets/styles/tokens.css` (gemelo TR-02, verificado idéntico byte a byte entre
`admin-web` y `public-web` el 2026-09-04) y de `primitives.css` (también idéntico).

### 1.1 Espaciado — 21 escalones, `tokens.css:245-265`

```
2  3  4  5  6  7  8  9  10  11  12  14  16  18  20  22  24  26  28  32  40   (px)
```

| Reparto | Valores | Cuántos |
|---|---|---|
| Múltiplos de 4 | 4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 40 | 9 de 21 (43 %) |
| Pares fuera de 4 | 2 · 6 · 10 · 14 · 18 · 22 · 26 | 7 de 21 (33 %) |
| **Impares** | **3 · 5 · 7 · 9 · 11** | **5 de 21 (24 %)** |

**No es una escala: es un inventario.** Lo dice el propio archivo en su cabecera
(`tokens.css:6-9`): «Todos los valores de este archivo fueron EXTRAÍDOS del CSS scoped existente
(no se inventó ninguno)». Es decir, se tokenizó lo que había, no se diseñó una progresión. Eso es
una decisión defendible de migración —hace el cambio visualmente nulo— pero tiene una consecuencia
directa para esta rúbrica: **la escala no puede usarse para distinguir «valor legítimo» de «valor
arbitrario», porque contiene casi todos los enteros entre 2 y 12.** Ver §7.1.

Y los escalones fuera de rejilla no son residuales, son los que más se usan. Censo de
`var(--space-N)` en los `.vue` de `public-web`:

| Token | Usos | | Token | Usos |
|---|---|---|---|---|
| `--space-6` | 34 | | `--space-16` | 30 |
| `--space-14` | 34 | | `--space-8` | 29 |
| `--space-10` | 32 | | `--space-12` | 27 |

Dos de los tres primeros (`14`, `10`) están fuera de la rejilla de 4.

**Adopción real del token de espaciado: ~11 %.** En los `.vue` de `public-web` hay **219**
usos de `var(--space-*)` frente a **1.749** declaraciones de `padding`/`margin`/`gap`/`inset` con
px crudo. *(Método: `grep` sobre `.vue`, sin `.css`. El denominador incluye `1px` de borde y
`inset`, así que sobreestima algo; restringido a `padding|margin|gap` da ≈1.596. En cualquiera de
las dos medidas el orden de magnitud es el mismo.)*

Además, los SFC usan **11 valores de espaciado que el catálogo de tokens ni siquiera contiene**:
`13 · 15 · 30 · 34 · 36 · 38 · 48 · 50 · 52 · 56 · 60` px.

### 1.2 Tipografía — 22 escalones, `tokens.css:196-220`

```
10  11  12  13  14  15  16  17  18  19  20  21  22  24  25  26  28  30  32  34  36  44  56   (px)
```

En `rem`, a propósito (`tokens.css:186-190`: `px` absoluto rompería §1.4.4 Resize Text). Los cinco
escalones de medio píxel (10,5 · 11,5 · 12,5 · 13,5 · 14,5) **fueron retirados** en DS-05 y su
sustituto está escrito en el archivo (`tokens.css:222-227`).

**Altura de línea: no existe como escala.** El único token es `--leading-display: 1.05`
(`tokens.css:239`), para titulares. **No hay `--leading-body`, ni `--leading-tight`, ni nada para
texto corrido.** Todo el cuerpo de la aplicación hereda `line-height: normal` del navegador (≈1,2
en Inter) salvo dos excepciones escritas a mano: `.ds-dialog-body` a `1.55` (`primitives.css:1600`)
y `PageHeader.vue:36` a `1.5`.

**Consecuencia operativa: en este proyecto no existe rejilla vertical y no se puede exigir.** Una
rúbrica que pidiera «que las alturas de línea caigan en la rejilla» estaría midiendo algo que el
sistema no puede producir. Lo que sí se puede exigir es la **relación** entre espacios (§3.2), que
no depende de una rejilla.

Pesos: `400 / 500 / 600 / 700`. Tracking: `-0.015em` / `-0.01em`.

### 1.3 Radios, sombras, anillo de foco

- Radios (`tokens.css:87-90, 271-278`): `5 · 6 · 7 · 8 · 9 · 10 · 11 · 12 · 14 · 16` px, más
  `999px` (píldora) y `50%` (círculo). Diez valores entre 5 y 16 px: la misma densidad excesiva que
  el espaciado.
- Sombras: `--shadow-xs`, `-sm`, `-primary`, `-primary-soft`, `-modal` (`tokens.css:283-288`).
- Anillo de foco: `--ring` y `--ring-danger` (`tokens.css:302-303`), dos capas de 2 px + 2 px.
  **Su umbral ya está fijado por R03** (`reglas-de-interfaz.md:179`): ≥ 3:1 medido contra la
  superficie real, por §1.4.11 (AA). Esta rúbrica no lo redefine.
- **Aviso de numeración, ya resuelto en el repo:** §2.4.11 es *Focus Not Obscured (Minimum)*, AA
  —verificado hoy contra el Understanding del W3C—; el criterio de apariencia del foco es
  **§2.4.13, AAA**. `tokens.css:290-301` y R03 ya lo distinguen correctamente, y R03 avisa por
  escrito de que **no se vuelva a «corregir»** (cerrado en public-web #132). Cualquier informe que
  escriba «2.4.11 Focus Appearance» está citando mal.

### 1.4 Contenedores y rejillas

| Primitiva | Geometría | Línea |
|---|---|---|
| `.ds-page--contained` | `max-width: 1180px`, `padding: 24px 28px`, centrado | `primitives.css:512` |
| `.ds-page--wide` | `max-width: 1240px` | `primitives.css:518` |
| `.ds-head` | fila, `align-items: flex-end`, `space-between`, `gap: 16`, `margin-bottom: 16` | `primitives.css:528` |
| `.ds-detail-head` | fila, `align-items: center`, `gap: 12`, `margin-bottom: 24` | `primitives.css:551` |
| `.ds-grid-2` | 2 col. `minmax(0,1fr)`, `gap: 14px 16px`, colapsa a 1 col. en `<= 640px` | `primitives.css:630` |
| `.ds-detail-grid` | 2 col. `minmax(0,1fr)`, `gap: 10px 24px`, colapsa a 1 col. en `<= 560px` | `primitives.css:636` |
| `.ds-stack--8/10/14/16/18` | columna con `gap` de 8·10·14·16·18 | `primitives.css:966-982` |
| `.ds-stack-mobile` | apila en columna, **solo dentro de `<= 760px`** | `primitives.css:687` |
| `.ds-table-scroll` | `overflow-x: auto` — la primitiva de R15 | `primitives.css:753` |

> **Deriva de líneas ya detectable:** R15 (`reglas-de-interfaz.md:1130`) cita `.ds-table-scroll` en
> `primitives.css:684-687`; hoy está en **753**. El propio documento avisa («si algún
> `fichero:línea` no cuadra, manda el código»). No es un defecto de producto; es un aviso para no
> copiar números de línea de aquel documento sin releer.

Los dos contenedores anchos (1180 / 1240) están **escritos a mano en `primitives.css`, no
tokenizados**: no hay `--container-*` en `tokens.css`.

---

## 2 · Puntos de corte y los cuatro viewports de captura

### 2.1 El sistema declara UN punto de corte; el código tiene 21

**Declarado:** uno solo, **1024 px**. `VetSoftwareFront/src/stores/viewport.store.ts:11`
(`COMPACT_MAX_WIDTH`), y `armazon-tablet-especificacion.md` §3 lo confirma y lo blinda: «Sigue
habiendo uno solo: 1024 px… No se separa "tablet" de "móvil", y es una decisión, no una omisión».

**Real, en `public-web`** (censo de `@media` sobre `src/`, 21 anchos distintos):
`440 · 480 · 520 · 560 · 600 · 620 · 640 · 720 · 760 · 768 · 820 · 860 · 880 · 900 · 960 · 980 ·
1000 · 1024 · 1080 · 1100 · 1280`. El más usado con diferencia es **760 px (16 usos)**, seguido de
720 (15) y 640 (11).

**Real, en `admin-web`** (9 anchos): `520 · 560 · 640 · 680 · 760 · 900 · 1024 · 1100 · 1279`. El
más usado es **680 px (10 usos)**.

Los dos repos comparten `520 · 560 · 640 · 760 · 1024 · 1100`; todo lo demás diverge.

### 2.2 Las tres trampas de los viewports elegidos — léelas ANTES de dictaminar nada

Los cuatro viewports de captura son **1440 · 1280 · 768 · 390**.

**T1 · A 1280 px, los dos fronts caen a lados opuestos del mismo corte.**

- `public-web/src/features/dashboard/components/home/StatsRow.vue:58` → `@media (width <= 1280px)`.
  `<=` es inclusivo: **a 1280 la regla SÍ se aplica**, la captura muestra la disposición colapsada.
- `admin-web/src/features/dashboard/views/DashboardView.vue:473` → `@media (width <= 1279px)`.
  **A 1280 la regla NO se aplica**, la captura muestra la disposición expandida.

Mismo concepto, un píxel de diferencia, resultado opuesto, y justo en un viewport de captura.
**Regla para el auditor: cualquier diferencia entre la consola y el tenant observada a 1280 px es
inadmisible como hallazgo hasta comprobar si nace de estas dos líneas.** Y una captura tomada
exactamente sobre el borde de una media query no es reproducible: basta con que el navegador
reserve barra de scroll para que el viewport de maquetación se desplace y la captura cambie de
rama sin que nadie toque el código.

**T2 · A 768 px no se ve el móvil del tenant, y tampoco su tablet.**

Seis SFC de `public-web` usan `@media (width <= 768px)` —inclusivo, **sí dispara a 768**—:
`LandingHero`, `RolesView`, `PermissionTree`, `PermissionToolbar`, `EditRoleHeader`,
`EditPermissionsModal`.

Pero el corte dominante del tenant es **760 px, con 16 usos, incluida la primitiva
`.ds-stack-mobile` (`primitives.css:687`)**. A 768 px, `<= 760px` **no** dispara. Resultado: la
captura de 768 px muestra los seis ficheros de arriba ya en modo estrecho y **todos los
consumidores de `.ds-stack-mobile` todavía en modo ancho** — una mezcla que no corresponde a
ninguna decisión de diseño y que no se ve en ningún dispositivo real más que en ese intervalo de
8 px.

**Regla: a 768 px no se dictamina «esto no colapsa en tablet».** Si un bloque parece que debería
apilarse y no lo hace, es candidato a T2, no a defecto. Se marca **[requiere 2ª captura]** y se
pide a 760 px o a 720 px.

**T3 · El único corte que el sistema decidió —1024 px— no se fotografía.**

1440 y 1280 caen en la banda de escritorio (`>= 1025`); 768 y 390 caen en la banda de cajón
(`<= 1024`). Se cubren las dos bandas, sí, pero **el borde no**, y el borde es donde vive todo el
riesgo: 1023 frente a 1025 es el cambio de sidebar persistente a cajón modal
(`armazon-tablet-especificacion.md` §3). Ninguna de las cuatro capturas prueba ese cambio.

**Recomendación operativa (no bloquea esta tanda):** añadir **1024** a la lista de viewports, y
mover 768 → **760**. Con eso los cuatro cortes reales del sistema quedan cubiertos y desaparecen T1
y T2. Si no se puede, todo hallazgo de disposición a 768 y a 1280 sale con la marca
**[borde de media query]**.

### 2.3 El mínimo prometido, que calibra la severidad de las 390 px

`armazon-tablet-especificacion.md` §3, literal: «El mínimo declarado de la consola sigue siendo
768 px (`AppLayout.vue:40`); por debajo el armazón no se rompe, simplemente **no se promete**».

**Consecuencia dura: en `admin-web`, un defecto de maquetación a 390 px es una `nota`, no un
`grave`** — salvo que haga perder trabajo o incumpla un criterio A/AA (§4). La consola de
plataforma es una herramienta de escritorio y el proyecto ya lo decidió por escrito. En
`public-web` no hay tal exención: el tenant se usa con el animal delante y 390 px es un viewport
de primera clase.

---

## 3 · Las dimensiones, con su umbral y su fuente

### 3.1 Alineación

**Autoridad: propia.** No hay regla del repo sobre alineación. El umbral se deriva de la escala del
propio proyecto y de cómo el propio código produce fracciones de píxel.

| Diferencia entre bordes del mismo grupo | Verdicto |
|---|---|
| **≤ 0,5 px** | **No es defecto.** Ruido de maquetación fraccionaria. |
| **> 0,5 px y < 8 px** | **Defecto**, salvo que pase el test de intención de abajo. |
| **≥ 8 px, repetido e igual a un token** | Escalonado deliberado. No es defecto. |

**Por qué el suelo está en 0,5 px y no en 0.** Este código genera sub-píxeles por construcción, no
por descuido: `SectionCard.vue:51,91` usa `clamp(22px, 2vw + 12px, 36px)`, que entre 500 y 1200 px
de viewport devuelve un valor fraccionario; `.ds-grid-2` y `.ds-detail-grid`
(`primitives.css:630,636`) reparten con `minmax(0, 1fr)`, que ante un contenedor de ancho impar
deja medio píxel en una columna. Exigir 0 px sería reportar la aritmética del navegador.

**Por qué la banda 0,5–8 px es defecto, y aquí está la respuesta a los grupos de `rect.left` que
difieren entre 1 y 6 px.** Un desplazamiento de 1 a 6 px **no puede ser intención**, por dos
razones independientes:

1. **No lo produce la escala.** El escalón más pequeño del proyecto es 2 px, y el más pequeño que
   alguien usaría como sangrado deliberado es mucho mayor. Un borde desplazado 3 px no es
   `--space-3` aplicado a propósito: es la suma o la resta de dos fuentes de espacio distintas.
2. **No se lee como intención.** Por debajo del umbral en que el ojo decide «esto está desplazado a
   propósito», un desalineado se lee como avería. Es peor que un desplazamiento grande, porque el
   grande comunica algo y el pequeño solo comunica descuido.

Y esa banda es exactamente la **huella dactilar de dos fuentes de padding que se encuentran**. El
caso testigo está en la primitiva más consumida del tenant: `SectionCard.vue` da a su cabecera
`padding: 20px clamp(22px, 2vw + 12px, 36px)` (`:51`) y a su cuerpo `padding: clamp(...)` en las
cuatro caras (`:91`). A 1440 px eso es **cabecera 20 px arriba/abajo contra cuerpo 36 px**: el
título queda 16 px más pegado al divisor que el contenido, en las **28 pantallas** que consumen
`SectionCard`.

**Test de intención — para llamar «deliberado» a un desplazamiento hay que responder SÍ a las
tres:**

1. ¿El desplazamiento **es igual a un valor de `--space-*`**?
2. ¿Se **repite idéntico** en todos los hermanos del grupo? (dos filas a 4 px y una a 5 px = no)
3. ¿Hay una **causa declarada** en el marcado —nivel de anidamiento, canaleta de icono, sangrado de
   sub-elemento— que un tercero pueda señalar sin adivinar?

Si alguna es «no», es descuadre.

**Cómo se mide en una captura.** Se agrupan los elementos que comparten columna visual —el borde
izquierdo de las tarjetas de una pila, las etiquetas de un formulario, los títulos de sección— y se
compara su `rect.left` (o `rect.right` para lo alineado a la derecha, como `.ds-actions`,
`primitives.css:558`). Un solo elemento fuera del grupo es el defecto; si **todo** el grupo difiere
de otro grupo, eso no es alineación, es §3.2.

### 3.2 Espaciado y ritmo vertical

**Autoridad: mixta.** El signo de la relación está cited; el factor también, y esta es la parte que
más va a decidir dictámenes.

**(a) Valor legítimo.** Todo espacio debería salir de `var(--space-*)`. Pero —§1.1— la escala
contiene casi todos los enteros de 2 a 12, así que **«está en la escala» no discrimina casi nada**.
Por eso el criterio operativo NO es «¿es un valor de la escala?» sino:

| Caso | Verdicto |
|---|---|
| Valor de la escala, escrito como `var(--space-N)` | Correcto |
| Valor de la escala, escrito como px crudo | `nota` de deuda, **no** defecto visual (es el 89 % del código) |
| Valor **fuera** de la escala (`13 · 15 · 30 · 34 · 36 · 38 · 48 · 50 · 52 · 56 · 60`) | `menor`, y **`grave` si rompe la relación de (b)** |
| Valor fuera de escala **con motivo escrito** en el CSS | Correcto. Es la salida legítima del repo. |

El último renglón es importante y es doctrina de la casa: `primitives.css` está lleno de
excepciones justificadas por escrito, y el criterio del proyecto (R13,
`reglas-de-interfaz.md:966`) es que **un apagado de regla se acota y lleva motivo escrito**. Un
valor fuera de escala documentado no se reporta.

**(b) Ritmo vertical — la relación, que es lo único exigible aquí.** Como no hay escala de
`line-height` (§1.2), no hay rejilla vertical y no se puede pedir. Lo que sí se exige es la
proporción entre el espacio *dentro* de un grupo y el espacio *entre* grupos:

> **espacio entre grupos ≥ 1,5 × espacio dentro del grupo.**

- **El signo** (dentro < entre) es la **ley de proximidad** de Gestalt: «Objects that are near, or
  proximate to each other, tend to be grouped together» (lawsofux.com/law-of-proximity, consultado
  2026-09-04). Si el hueco interno iguala o supera al externo, el agrupamiento se invierte y el
  usuario lee las filas mal apareadas. Es el defecto de espaciado más frecuente y el más visible en
  una captura.
- **El factor 1,5** no es de cosecha propia: es el de **WCAG 2.2 §1.4.8 Visual Presentation
  (AAA)**, verbatim: *«Paragraph spacing is at least 1.5 times larger than the line spacing»*
  (Understanding 1.4.8, consultado 2026-09-04). Aquí se **generaliza** de «párrafo/línea» a
  «grupo/elemento»; **esa generalización sí es propia** y se declara. El nivel es AAA y el criterio
  admite cumplirse por agente de usuario, así que **incumplirlo no es un fallo de conformidad**: se
  usa como umbral de rúbrica, no como acusación normativa.

Con la escala del proyecto el factor es siempre alcanzable: `8→12`, `10→16`, `12→18`, `14→24`,
`16→24`, `18→28`, `20→32`.

**(c) Simetría arriba/abajo de un bloque.** Un encabezado pertenece a lo que le sigue, no a lo que
le precede. Por tanto **su espacio inferior debe ser estrictamente menor que su espacio superior**;
si son iguales, el título flota entre dos secciones y no se sabe cuál titula. Mismo fundamento
(proximidad). Umbral: `superior ≥ 1,5 × inferior`. `.ds-title` (`primitives.css:594`) ya lo cumple
por construcción (`margin: 0 0 6px`, y el espacio superior lo pone el contenedor); lo que hay que
vigilar es que el contenedor no lo anule.

**(d) Contenedor con caras desiguales.** Un padding que no sea simétrico en el eje horizontal, o
cuyo par vertical difiera del de un hermano directo, es defecto salvo motivo escrito. Es el caso
`SectionCard` de §3.1.

### 3.3 Centrado

**Autoridad: propia**, con un precedente del repo que la respalda.

**(a) Cuándo centrar.** El texto centrado pierde el borde izquierdo común, que es el ancla que el
ojo usa para volver al principio de la línea siguiente; el coste crece con cada línea.

> **Regla: se centra solo lo que ocupa ≤ 2 líneas en el viewport MÁS ESTRECHO de la tanda
> (390 px).** Si un bloque centrado envuelve a 3 líneas o más en cualquiera de los cuatro
> viewports, es defecto.

El repo ya llegó a esta conclusión por su cuenta, dos veces:

- `LandingHero.vue:17` deja escrito el porqué: «El titular sube a 26ch y la bajada baja a 52ch
  porque el texto centrado…» — es decir, se estrechó la medida **precisamente porque está
  centrado**.
- `.ds-empty--boxed` (`primitives.css:491`) declara `text-align: start` mientras que `.ds-empty`
  (`:460`) declara `center`: la variante con más texto abandonó el centrado a propósito.

Nunca se centra: texto de formulario, etiquetas, celdas de tabla, mensajes de error en línea, listas.
Sí se centra: estados vacíos cortos (`.ds-empty`), diálogos de confirmación, el hero de la landing.

**(b) Centrado óptico frente a matemático.** `place-items: center` reparte el espacio por igual;
el ojo no centra por espacio, centra por masa visual. Tres casos, con umbral distinto cada uno:

| Contenido del contenedor | Regla | Umbral para llamarlo defecto |
|---|---|---|
| **Glifo con eje de simetría vertical** (×, +, círculo, casa, engranaje) | matemático = óptico | desviación **> 2 px** del centro geométrico |
| **Glifo sin eje** (▶ `Play`, `Send`, `Search` con mango, flechas) | el centro óptico está **desplazado hacia la masa**, hasta ~1/12 del lado | una desviación **en ese sentido y dentro de 1/12** es correcta: **no se reporta**. Solo se reporta si va en sentido contrario, o si supera 1/12 |
| **Texto de una línea centrado verticalmente** | la caja de línea reserva sitio para descendentes aunque no los haya | **≤ 1,5 px** por debajo del centro no es defecto |

Para el `.ds-icon-btn` del proyecto (28×28, `primitives.css:1082-1086`) ese 1/12 son **≈ 2,3 px**;
para un objetivo de 44 px, **≈ 3,7 px**.

**Estos tres números son convención de oficio, no norma citable, y se declaran como propios.** Su
única función es impedir que un auditor reporte como defecto un ajuste óptico correcto, que es el
falso positivo más caro de esta dimensión. Los iconos son **Lucide**, dibujados sobre un `viewBox`
de 24 con márgenes homogéneos, así que la mayoría cae en la primera fila de la tabla.

### 3.4 Densidad y jerarquía

**Autoridad: mixta.** La forma la fija el repo (`.ds-head`); el fundamento, Hick y Fitts.

**(a) Una sola acción primaria por región.** `.ds-head` (`primitives.css:528`) codifica el patrón:
título a un lado, **una** acción al otro. Hick's Law — «The time it takes to make a decision
increases with the number and complexity of choices» (lawsofux.com, consultado 2026-09-04).

> **Defecto: dos o más botones con tratamiento primario (`.ds-btn--primary`, `.ds-btn--solid`,
> `.ds-btn--danger-solid`) visibles simultáneamente en la misma región.** Si compiten, ninguno es
> primario y el usuario con prisa pulsa el que le queda más cerca, no el que necesita.

**(b) La jerarquía visual tiene que coincidir con la jerarquía de la tarea.** Comprobación
ejecutable sobre una captura, sin interpretación:

1. Localiza los **tres tamaños de letra más grandes** presentes.
2. Pregunta: ¿el mayor identifica **el sujeto de la tarea** (el animal, la consulta, el documento)
   o identifica **el nombre de la pantalla**?
3. Si el nombre de la pantalla es mayor que el sujeto, **la jerarquía está invertida**.

Este proyecto tiene el caso sistémico ya medido, y saldrá en decenas de capturas: `.ds-display`
—el título de pantalla que pinta `PageHeader.vue:10`— es `--text-display` = **36 px**
(`primitives.css:572`, `tokens.css:207`), mientras que el título de una tarjeta de contenido,
`SectionCard.vue:74`, es **14,5 px**. El rótulo de la pantalla es **2,5×** el dato que el usuario
vino a leer. `PageHeader` tiene **46 consumidores** y `SectionCard` **28** (blast radius por
CodeGraph). No se reporta 46 veces: se reporta **una vez, como sistémico**, con el alcance.

**(c) Cuánta información por pantalla.** No hay un número universal defendible y no se va a
inventar uno. Lo que sí se exige, para una app usada con prisa y a una mano:

- **La acción que resuelve la tarea de la pantalla se ve sin desplazar** en 1440 y en 768. Si hay
  que hacer scroll para llegar al botón que cierra la tarea, es defecto.
- **La paginación no se lleva por delante la densidad.** `usePaged.ts:13` fija `pageSize = 8` por
  defecto en el tenant. Ocho filas en un listado clínico a 1440×900 dejan la mitad inferior de la
  pantalla vacía y multiplican los clics; Fitts penaliza cada uno. Es `nota` sistémica —decisión de
  producto, no defecto de maquetación— pero se registra una vez.

### 3.5 Objetivos táctiles — dos números, dos severidades

**Autoridad: WCAG (el suelo) + `armazon-tablet-especificacion.md` §5.6 (la recomendación).** Los
dos ya existen; esta rúbrica no inventa ninguno.

| | Número | Fuente | Severidad si se incumple |
|---|---|---|---|
| **Suelo normativo** | **24 × 24 px CSS** | WCAG 2.2 **§2.5.8 Target Size (Minimum), AA** (verbatim del Understanding, consultado 2026-09-04) | **grave**, o **bloqueante** si además impide completar la tarea |
| **Recomendación de producto** | **44 × 44 px CSS** en la banda `<= 1024px` | `VetSoftwareFront/docs/ux/armazon-tablet-especificacion.md` §5.6 y criterios de aceptación 21–22 | **menor** |

**No son la misma severidad y no se mezclan.** §5.6 lo dice sin rodeos: «§2.5.8 Target Size
(Minimum) es 24×24 px CSS en AA; **44×44 es la cifra de comodidad, no la norma**».

**Antes de reportar un objetivo por debajo de 24, aplica la excepción de espaciado**, que es
normativa y verbatim: *«Undersized targets… are positioned so that if a 24 CSS pixel diameter
circle is centered on the bounding box of each, the circles do not intersect another target»*. Un
icono de 22 px aislado **cumple**. Dos de 22 px pegados, no. Las otras cuatro excepciones
(equivalente, en línea, control del agente de usuario, esencial) también aplican.

**Casos ya conocidos — no los redescubras:**

- `.ds-icon-btn` es **28×28** (`primitives.css:1085-1086`), replicado en 17 SFC. **Cumple el suelo
  de 24, no llega a 44.** Es la acción por fila de tabla, o sea el control que más se pulsa con
  prisa. Sale como `menor` sistémico, una sola vez, con su alcance. *(Referencia: 28 px es
  exactamente el `--control-small-size` de GitHub Primer — es un tamaño de control legítimo, no un
  error; el reparo es dónde se usa.)*
- `.logout-btn` a **22×22** (`admin-web/src/components/layout/SidebarUserCard.vue:72-84`).
  §5.6 **ya lo analizó** y concluyó que probablemente lo salva la excepción de espaciado, negándose
  a darlo por incumplimiento firme. **No se vuelve a abrir**; si aparece en una captura, se cita
  §5.6.

### 3.6 Medida de línea

**Autoridad: WCAG §1.4.8 (AAA) como techo citable + convención tipográfica para el intervalo
cómodo.**

- **Techo citable: 80 caracteres.** WCAG 2.2 §1.4.8 Visual Presentation, verbatim: *«Width is no
  more than 80 characters or glyphs (40 if CJK)»*. Es **AAA** y satisfacible por agente de usuario:
  sirve como umbral de rúbrica, **no** como incumplimiento.
- **Intervalo cómodo: 45–75 caracteres**, con óptimo hacia 66. Es convención tipográfica
  consolidada (Bringhurst) y **se declara como tal**: no la he verificado contra una fuente
  primaria en esta sesión, así que **no se cita como norma**. El número que se usa para dictaminar
  es el 80 de §1.4.8.

| Medida | Verdicto |
|---|---|
| 45–75 caracteres | Correcto |
| 76–80 | `nota` |
| **> 80** | **`menor`**, y `grave` si es texto que hay que leer para trabajar (instrucción, mensaje de error, consentimiento) |
| **< 45** en un bloque de ≥ 3 líneas | `nota` — columna demasiado estrecha, el ojo salta de línea de más |

**Cálculo en una captura, sin abrir el navegador:** `caracteres ≈ ancho_del_bloque_px ÷
(0,5 × font-size_px)`. El 0,5 em es el avance medio de Inter para texto en español; es una
aproximación y se declara como tal. Si el resultado queda entre 75 y 85, se mide de verdad antes de
reportar.

**Estado del proyecto en esta dimensión:** solo **cuatro sitios de todo `public-web`** expresan la
medida en `ch`, y **los cuatro están en la capa pública/landing/auth**, ninguno en la aplicación
autenticada:

- `assets/styles/public-auth.css:476,635` → `66ch`
- `features/facturacion/components/enablement/SectionHead.vue:47` → `60ch`
- `features/landing/components/LandingHero.vue:98,112` → `26ch` / `52ch`
- `features/asistente/components/AsistenteEspera.vue:109` → `max-inline-size: 44ch`

El caso a vigilar en la app autenticada es **`PageHeader.vue:34-36`**: `.lead` con
`max-width: 540px` y `font-size: 13.5px` → **≈ 80 caracteres**, justo en el techo de §1.4.8, y en
**46 pantallas**.

### 3.7 Estados: carga, vacío, error, éxito

**Autoridad: enteramente del repo.** Aquí la rúbrica **no fija umbrales ni textos**: remite. Un
informe que invente un literal de mensaje está fuera de norma.

**Carga — R06** (`reglas-de-interfaz.md:445`):

- **`PawLoader` y solo `PawLoader`.** Prohibidos los spinners genéricos, los iconos de Lucide
  girando (`Loader`, `Loader2`, `RefreshCw`) y las rotaciones CSS sueltas. **Cualquier otro
  indicador de espera en una captura es defecto por R06**, sin discusión.
- Retardo **200 ms**, visible mínimo **300 ms** (`stores/loader.store.ts:26-27`). Son los umbrales
  que impiden el parpadeo.
- Umbrales de referencia de NN/g (verbatim, consultado 2026-09-04): **0,1 s** «the limit for
  having the user feel that the system is reacting instantaneously»; **1,0 s** «the limit for the
  user's flow of thought to stay uninterrupted»; **10 s** «the limit for keeping the user's
  attention focused on the dialogue», y por encima hace falta indicador de porcentaje y forma de
  interrumpir. Concuerda con el umbral de Doherty (< 400 ms) de Laws of UX.
- **Excepción viva que no se reporta:** los cinco giros infinitos de la capa pública y de
  autenticación están enumerados como deuda aceptada en `loader-guard.spec.ts` y abiertos en
  **public-web #112**.

**Vacío:**

- Nunca una pantalla en blanco. NN/g, verbatim: *«Do not default to totally empty states. This
  approach creates confusion for users»*. Debe llevar mensaje de estado y, si procede, la acción
  que lo llena.
- **«Sin resultados de búsqueda» ≠ «no hay registros»**, y son textos distintos: lo fija
  `patron-de-busqueda-en-listado.md` **§4**. Confundirlos es el defecto F5 de ese documento
  (`ListBody.vue:158`), ya identificado.
- Primitivas: `.ds-empty` y sus variantes (`primitives.css:460-497`).

**Error — R05** (`reglas-de-interfaz.md:354`), tres reglas que se comprueban en la captura:

1. El error **se pinta antes que el vacío**: una pantalla que falló y muestra el estado vacío es
   defecto (es el caso de public-web #110).
2. El error **no se aplasta a un literal**: sale de `errorFrom()` y **arrastra su identificador de
   traza**.
3. **Si dice «inténtalo de nuevo», hay un botón que lo intenta** (`patron-de-mensajes.md` §6,
   regla 2).

**Éxito y canal — `patron-de-mensajes.md`:**

- La regla de decisión de cuatro preguntas (§1) fija el **tono**; nadie decide por gusto.
- El canal lo decide la **persistencia, no la severidad** (§2): *¿el mensaje sigue siendo verdad
  treinta segundos después?* → banner. Si no → toast.
- Tres reglas duras de §2 que se ven en una captura: **si lleva botón que hay que pulsar, es
  banner**; **un éxito rutinario nunca es banner**; un éxito es banner solo si el usuario tiene que
  llevarse un dato (nº de factura, comprobante).
- **Cuándo no poner nada** (§3): si la mutación repinta la evidencia en la misma pantalla en menos
  de un segundo, no hay mensaje visual — pero sí anuncio invisible (`.ds-sr-only` con
  `role="status"`), por §4.1.3 Status Messages (AA).
- **Los literales están en §6.** No se inventan.

### 3.8 Responsive y desbordamiento

**Autoridad: R15 + `armazon-tablet-especificacion.md` §8 + WCAG §1.4.10.**

**¿El desbordamiento horizontal es siempre bloqueante? No, y la distinción es normativa.**

WCAG 2.2 §1.4.10 Reflow (AA) pide presentar el contenido «without requiring scrolling in two
dimensions» a 320 px de ancho, **pero exceptúa explícitamente el contenido que necesita disposición
bidimensional, y nombra las tablas de datos** (verbatim del Understanding, consultado 2026-09-04:
«data tables (not individual cells)»). Tres casos, tres severidades:

| Qué se ve | Verdicto | Fundamento |
|---|---|---|
| **El documento entero se desplaza en horizontal** (`documentElement.scrollWidth > innerWidth`) | **bloqueante** | §1.4.10 (AA), y `armazon…` §8 criterio 2 lo exige a cero |
| **Una tabla ancha se desplaza dentro de `.ds-table-scroll`** | **correcto, no es defecto** | R15: «una tabla ancha se desplaza, no se recorta»; excepción explícita de §1.4.10 |
| **Una tabla queda recortada** (`overflow: hidden`, columnas inalcanzables) | **bloqueante** | R15. Impacto clínico literal de R15: se pierden importe y acciones «sin barra, sin sombra, sin ninguna señal de que falta algo» |

**Y la mitad que R15 deja abierta, que también se ve en una captura:** `.ds-table-scroll` no lleva
`tabindex="0"` ni `role="region"` ni nombre accesible, así que la región no se puede desplazar sin
ratón — WCAG §2.1.1 (A), regla `scrollable-region-focusable` de axe-core. Afecta a 11 usos del
tenant y a todas las tablas de la consola vía `AppTable`. **Ya está redactado como issue nº 4 en
`reglas-de-interfaz.md:1324`**: se cita, no se reabre.

**Contenedores de scroll — los criterios ya están fijados** en `armazon-tablet-especificacion.md`
§8, criterios 1–6, y no se sustituyen por otros. Los tres que se ven en una captura o se miden en
el JSON:

1. Cero scroll de documento en toda vista de listado.
2. `documentElement.scrollWidth <= innerWidth` en las dos orientaciones.
3. Con el cajón cerrado, **exactamente un** contenedor de scroll vertical, y es `main#contenido`.

**Qué es limitación aceptada a 390 px:**

- En **`admin-web`**: casi todo, por §2.3 — la consola promete 768 px hacia arriba. Los defectos de
  disposición a 390 salen como `nota`.
- En **`public-web`**: nada. Es el viewport de un auxiliar con el móvil en una mano.
- **En los dos**: una tabla de datos que se desplaza en horizontal (arriba), y el corte de un
  contenido que necesita dos dimensiones por naturaleza (un plano, una gráfica). Ambos exentos por
  §1.4.10.

### 3.9 Foco y contraste — no se redefinen aquí

Ya tienen regla y ya tienen puerta que **mide**. Se citan, no se re-derivan:

- **Anillo de foco: R03** (`reglas-de-interfaz.md:179`) — ≥ 3:1 medido contra la superficie real,
  por §1.4.11 (AA). Token `--ring` a 4,50:1 y `--ring-danger` a 5,16:1 sobre `--warm-50`.
- **Color de texto: R10** (`:716`) — se mide antes de entrar, remedio en un solo sitio. §1.4.3 (AA):
  4,5:1 texto normal, 3:1 texto grande.
- **Un estado no reescribe un token a mano: R11** (`:804`).

Lo único que esta rúbrica añade es **el aviso de numeración de §1.3**: §2.4.11 es *Focus Not
Obscured*; el de apariencia es §2.4.13 (AAA).

---

## 4 · Tabla de severidades

Es lo que hace comparables los informes de auditores distintos. **La severidad la fija la columna
«criterio», no la impresión visual.**

| Severidad | Criterio que la produce | Ejemplos en esta rúbrica |
|---|---|---|
| **Bloqueante** | Incumple un criterio WCAG de **nivel A**; **o** impide completar la tarea; **o** hace perder trabajo ya introducido | Tabla recortada (R15, §1.4.10 + §2.1.1); scroll horizontal del documento; el error de red presentado como estado vacío (R05); loader que no cede y bloquea la pantalla; contenido inalcanzable a 390 en el tenant |
| **Grave** | Incumple un criterio **AA**; **o** rompe una regla R01–R15; **o** invierte la lectura de un grupo | Objetivo por debajo de **24×24** sin excepción aplicable (§2.5.8 AA); anillo de foco por debajo de 3:1 (R03); indicador de espera que no es `PawLoader` (R06); espacio interno ≥ espacio externo (§3.2b) en un grupo que decide una acción clínica; medida > 80 car. en texto que hay que leer para trabajar |
| **Menor** | Fricción medible que no incumple AA ni una R | Desalineado de 0,5–8 px que no pasa el test de intención (§3.1); valor fuera de escala sin motivo escrito; objetivo entre 24 y 44 px en banda táctil (§5.6); jerarquía tipográfica invertida; medida 76–80 caracteres |
| **Nota** | Deuda, mejora o limitación ya aceptada por el proyecto | px crudo en vez de `var(--space-*)`; `pageSize = 8`; cualquier defecto de disposición **a 390 px en `admin-web`** (§2.3); medida < 45 caracteres |

**Cuatro reglas de aplicación, para que dos auditores no diverjan:**

1. **Un defecto que nace de una primitiva se reporta UNA vez, como sistémico, con su alcance**
   (`SectionCard` = 28 pantallas, `PageHeader` = 46, `.ds-icon-btn` = 17 SFC). Nunca una ficha por
   pantalla. Máximo 12 hallazgos por informe.
2. **Un defecto ya listado en «Lo que quedó abierto» (`reglas-de-interfaz.md:1282`) o en «Issues
   por abrir» (`:1324`) no es un hallazgo nuevo**: se cita por su número y no consume cupo.
3. **Toda observación tomada a 1280 o a 768 px lleva la marca `[borde de media query]`** hasta
   descartar T1/T2 (§2.2).
4. **Prioridad cuando dos principios chocan**, del brief y del contexto clínico: 1) que no se pierda
   trabajo, 2) que se entienda sin leer, 3) que sea bonito. Un problema estético nunca sube por
   encima de `menor`.

---

## 5 · Cómo se aplica — el procedimiento del auditor

Contra una captura y contra el JSON de métricas (`uxa-metricas-admin.json`,
`uxa-metricas-public.json`). **En este orden**, porque cada paso descarta trabajo del siguiente.

1. **Identifica la pantalla y el viewport.** Si el viewport es **1280** o **768**, marca el informe
   entero con `[borde de media query]` y relee §2.2 antes de continuar. Si es **390 en
   `admin-web`**, el techo de severidad de todo lo puramente visual baja a `nota` (§2.3).
2. **Descarta lo ya conocido.** Pasa la lista de «Lo que quedó abierto» y «Issues por abrir» de
   `reglas-de-interfaz.md`. Lo que caiga ahí no es hallazgo: es una cita.
3. **Estados primero, antes de mirar geometría** (§3.7). ¿Hay un indicador de espera que no sea
   `PawLoader`? ¿Un vacío donde debería haber un error? ¿Un texto de mensaje que no está en el
   catálogo de `patron-de-mensajes.md` §6? Un defecto de estado le gana a cualquier defecto de
   maquetación y suele hacer inútil medir el resto.
4. **Desbordamiento** (§3.8). En el JSON: `documentElement.scrollWidth > innerWidth` → bloqueante,
   se para y se reporta. Tabla que se desplaza dentro de `.ds-table-scroll` → correcto, no se toca.
5. **Objetivos táctiles** (§3.5). Del JSON, todo `rect` interactivo con `width < 24 || height < 24`.
   Antes de reportar, **aplica la excepción de espaciado** (círculo de 24 px de diámetro). Separa en
   dos listas: «< 24, grave» y «24–44 en banda táctil, menor». No las mezcles.
6. **Alineación** (§3.1). Agrupa los `rect.left` por columna visual. Descarta ≤ 0,5 px. A lo que
   quede entre 0,5 y 8 px, aplícale el test de intención de tres preguntas. Lo que no lo pase, es
   `menor`; si todo un grupo se desplaza respecto a otro, no es alineación, salta a 7.
7. **Ritmo vertical** (§3.2b). Para cada grupo visible: mide el hueco interno y el externo. Si
   `externo < 1,5 × interno`, hay defecto de agrupamiento. Comprueba también la asimetría
   arriba/abajo de los encabezados.
8. **Medida de línea** (§3.6). Solo en los bloques de texto corrido: `ancho ÷ (0,5 × font-size)`.
   Entre 75 y 85, mide de verdad antes de reportar.
9. **Centrado** (§3.3). Primero el (a): ¿hay texto centrado de ≥ 3 líneas? Luego el (b), y **sé
   conservador**: un icono asimétrico desplazado hacia su masa dentro de 1/12 del lado es correcto y
   no se reporta.
10. **Jerarquía y densidad** (§3.4). Los tres tamaños mayores; ¿el mayor es el sujeto o el rótulo de
    la pantalla? ¿Hay más de un botón primario en la misma región?
11. **Agrupa antes de escribir.** Cualquier hallazgo que se repita en más de dos pantallas se
    reescribe como uno solo, sobre la primitiva, con el número de consumidores. Doce fichas como
    máximo.
12. **Declara lo no ejecutado.** Contraste calculado, árbol de accesibilidad, `axe` — si no se
    corrió, se dice. Nunca se da por pasada una puerta que no se ejecutó.

---

## 6 · Fuentes — cuáles respondieron y cuáles no

Consultadas el **2026-09-04** desde este entorno.

**Respondieron y están citadas con su texto:**

- WCAG 2.2, Understanding **2.5.8 Target Size (Minimum)** — 24×24 y las cinco excepciones.
- WCAG 2.2, Understanding **1.4.10 Reflow** — 320/256 px y la excepción de tablas de datos.
- WCAG 2.2, Understanding **1.4.8 Visual Presentation** (AAA) — 80 caracteres, `line-height` ≥ 1,5,
  y el factor **1,5× entre párrafos** que sostiene §3.2b.
- WCAG 2.2, Understanding **2.4.11 Focus Not Obscured (Minimum)** y **2.4.13 Focus Appearance** —
  usadas para fijar la numeración correcta (§1.3).
- **GitHub Primer**, primitivas de tamaño — base de 4 px; escala `2,4,6,8,12,16,20,24,28,32,36,40,
  44,48,64,80,96,112,128`; alturas de control 24/28/32/40/48.
- **NN/g**, tres límites de tiempo de respuesta (0,1 / 1 / 10 s).
- **NN/g**, diez heurísticas de usabilidad.
- **NN/g**, diseño de estados vacíos.
- **Laws of UX**: índice (Fitts, Hick, Doherty < 400 ms, sobrecarga de elección, carga cognitiva) y
  la ficha de **Ley de Proximidad**.

**NO respondieron — declarado, y por eso NO se cita de memoria:**

- **IBM Carbon, escala de espaciado** (`carbondesignsystem.com/elements/spacing/overview/`, dos
  intentos, con y sin ancla). Devuelve la página truncada: es una SPA y el extractor no obtiene el
  contenido. **La escala de Carbon no aparece en esta rúbrica.** La comparación de §7.1 se hace
  contra **Primer**, que sí respondió.
- **GOV.UK Design System** — **tres intentos, tres `ECONNRESET`**, sobre tres rutas distintas
  (`/styles/spacing/`, `/patterns/validation/`, `/components/error-summary/`). El dominio parece
  inalcanzable desde este entorno. **No se cita ningún número de GOV.UK.** No hace falta: la regla
  que importaba —que el texto del resumen de errores coincida **literalmente** con el error en
  línea— ya está incorporada al repositorio y se cita desde ahí:
  `src/components/feedback/ErrorSummary.vue:5`, comentario literal *«Texto EXACTO del error en
  línea. No se reformula: GOV.UK exige coincidencia literal»*.

**Fuente usada sin verificar, y declarada:** el intervalo de **45–75 caracteres** por línea
(Bringhurst). Se menciona como convención de oficio; **el umbral con el que se dictamina es el 80
de WCAG §1.4.8**, que sí está verificado.

---

## 7 · Discrepancias entre la escala del proyecto y la literatura

Son hallazgos de pleno derecho, obtenidos **sin mirar una sola pantalla**. Ninguno figura en «Lo
que quedó abierto» de `reglas-de-interfaz.md`, así que ninguno es un duplicado.

### 7.1 La escala de espaciado no discrimina — 21 escalones para un rango de 38 px

**Qué pasa** — `tokens.css:245-265`. El proyecto declara 21 pasos entre 2 y 40 px, incluidos los
impares **3, 5, 7, 9 y 11**. Primer (verificado hoy) usa 4 px de base y salta
`2,4,6,8,12,16,20,24,28,32…`: **no tiene ningún impar y no tiene 10, 14, 18, 22 ni 26**. La escala
de este proyecto contiene **casi todos los enteros entre 2 y 12**.

**Por qué importa, y no es un reparo estético.** Una escala sirve para que «fuera de escala» sea
detectable. Con 21 escalones tan juntos, **cualquier valor que alguien escriba está casi seguro
dentro de la escala**, así que el token deja de ser una restricción y pasa a ser un diccionario.
Esa es la razón de que §3.2a **no** pueda usar «¿está en la escala?» como criterio y tenga que
apoyarse en la relación entre espacios.

**Causa, documentada por el propio repo** (`tokens.css:6-9`): los valores se extrajeron del CSS
existente para que migrar fuera visualmente nulo. Fue la decisión correcta para migrar; el paso que
falta es **cerrar la escala después**.

**Y no es deuda dormida**: `--space-14` (34 usos) y `--space-10` (32) están entre los tres más
usados. Consolidar la escala movería píxeles en pantallas reales, así que hace falta línea base
visual antes.

### 7.2 No existe escala de altura de línea, y el 89 % del espaciado se escribe en px crudo

**Qué pasa.** El único token de interlineado es `--leading-display: 1.05` (`tokens.css:239`), para
titulares. No hay ninguno para cuerpo. El resto de la aplicación hereda `normal` (≈1,2) salvo dos
valores a mano: `1.55` (`primitives.css:1600`) y `1.5` (`PageHeader.vue:36`).

Y el espaciado apenas pasa por el token: **219 usos de `var(--space-*)` frente a ~1.749
declaraciones con px crudo** en los `.vue` de `public-web` (~11 % de adopción). Los SFC usan además
**11 valores que el catálogo no contiene**: `13, 15, 30, 34, 36, 38, 48, 50, 52, 56, 60`.

**Por qué importa.** Sin interlineado tokenizado **no hay rejilla vertical posible**, y por eso esta
rúbrica no la exige (§1.2): pedirla sería medir algo que el sistema no puede producir. WCAG §1.4.8
(AAA) sugiere ≥ 1,5 dentro de párrafo; el cuerpo de esta app corre a ≈1,2. **No es incumplimiento
—es AAA y satisfacible por el agente de usuario— pero sí es el techo de legibilidad del producto.**

### 7.3 Dos tamaños de letra retirados sobreviven en las dos primitivas más consumidas

**Qué pasa.** DS-05 retiró los cinco escalones de medio píxel y dejó escrito el sustituto
(`tokens.css:222-227`). Dos de ellos siguen vivos como literales, precisamente en las primitivas de
mayor alcance:

- `src/components/ui/SectionCard.vue:74` → `font-size: 14.5px` (era `--text-xl`, retirado → debía
  ser `--text-2xl`, 15 px). **28 consumidores.**
- `src/components/ui/PageHeader.vue:34` → `font-size: 13.5px` (era `--text-md`, retirado → debía ser
  `--text-lg`, 14 px). **46 consumidores.**

Ambos ficheros escriben además su espaciado en px crudo (`24px`, `20px`, `14px`, `6px`, `2px`) y sus
radios a mano (`14px`, `9px`).

**Por qué importa.** Un escalón retirado que sigue vivo en 74 pantallas hace falso el inventario:
`tokens.css` afirma que esos tamaños ya no existen. Y como `px` es absoluto, esquiva el motivo por
el que la escala está en `rem` (§1.4.4 Resize Text, AA) — no es un incumplimiento por sí solo, pero
es exactamente el patrón que la escala en `rem` quería impedir.

### 7.4 La jerarquía tipográfica está invertida respecto a la tarea clínica

**Qué pasa.** El rótulo de la pantalla (`.ds-display` = `--text-display` = **36 px**,
`primitives.css:572`) es **2,5 veces** el título de la tarjeta que contiene el dato del paciente
(`SectionCard.vue:74`, **14,5 px**). En una app clínica el sujeto es el animal, no el nombre del
módulo — que el usuario ya sabe, porque acaba de navegar hasta él.

**Alcance:** los 46 consumidores de `PageHeader` × los 28 de `SectionCard`. Es sistémico y se
reporta una sola vez.

**Criterio:** NN/g H6 *Recognition rather than recall* —«minimize the user's memory load by making
elements, actions, and options visible»— y H8 *Aesthetic and minimalist design* —«every extra unit
of information competes with relevant units and diminishes their visibility»— (ambas verbatim,
consultadas hoy).

### 7.5 El sistema tiene un punto de corte declarado y veintiuno reales, y ninguno de los cuatro viewports fotografía el declarado

Ya desarrollado en §2. En resumen: **1024 px** es el único corte que el proyecto decidió
(`viewport.store.ts:11`, `armazon-tablet-especificacion.md` §3) y **no está entre los cuatro
viewports**; a cambio, **dos de los cuatro (1280 y 768) caen exactamente sobre bordes de `@media`**,
uno de ellos con los dos repos a lados opuestos (`1279` en la consola, `1280` en el tenant).

**Por qué importa:** es la fuente clásica de la captura engañosa, y afecta a la mitad de las
capturas de esta tanda. Mitigación en §2.2; recomendación: sustituir **768 → 760** y añadir
**1024**.

### 7.6 El contenedor de contenido no está tokenizado y no acota la medida de línea

`.ds-page--contained` (1180 px) y `.ds-page--wide` (1240 px) están escritos a mano en
`primitives.css:512-519`; no hay ningún `--container-*` en `tokens.css`. Y solo **cuatro sitios de
todo el tenant** expresan la medida en `ch`, **los cuatro fuera de la aplicación autenticada**
(§3.6). El caso frontera es `PageHeader.vue:34-36` (`540px` a `13.5px` ≈ **80 caracteres**), en 46
pantallas: justo en el techo de §1.4.8.

---

## 8 · Lo que esta rúbrica no cubre

- **Contraste.** Ya es de R03 / R10 / R11, y hay una prueba que **mide** en los dos repos
  (`tests/unit/tokens-contrast.spec.ts`) — aunque las dos copias no son gemelas, que es la primera
  fila de «Puertas que faltan». No se re-deriva aquí.
- **Semántica, teclado y foco**: R01, R02, R04 y `armazon-tablet-especificacion.md` §6. Una captura
  estática no los prueba; hace falta `axe` o ARIA snapshots, y **no hay ninguna puerta de
  accesibilidad en el pipeline** (public-web #57 / admin-web #44).
- **Ningún número de esta rúbrica se midió ejecutando la aplicación.** Todo sale de leer
  `tokens.css`, `primitives.css`, los `@media` del árbol y los documentos de `docs/ux/`, el
  2026-09-04, sobre los worktrees `MainVetSoftware-uxaudit/{admin-web,public-web}`. No se levantó
  servidor, no se corrió Playwright, no se corrió `axe`, no se calculó ningún contraste nuevo.
