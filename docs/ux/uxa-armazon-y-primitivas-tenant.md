# Armazón, catálogo `Base*` y zona pública — auditoría de la capa que repite

Ámbito: lo que heredan **todas** las pantallas del tenant, no las pantallas. Árbol auditado:
worktree `MainVetSoftware-uxaudit/public-web`, rama `audit/ux-screens-public`, HEAD `32e88ef`
(merge de public#317, rebranding a Lumbre). Todas las rutas de este documento son de ese repo.

Autoridad, por este orden: `docs/ux/reglas-de-interfaz.md` (R01–R15, gemelo TR-02) → WCAG 2.2 →
APG → literatura. Donde una regla propia ya decidió, manda ella.

No se ejecutó nada: ni dev server, ni Playwright, ni `quality`, ni `test:coverage`. Todo lo de
aquí se decide leyendo, salvo las dos medidas marcadas como **no medidas** en H10.

---

## 0. Lo que hay que corregir del encargo antes de leer los hallazgos

El encargo llegaba con cuatro huecos «verificados» que **el árbol desmiente**. No son hallazgos:
son trabajo ya hecho que no debe volver a abrirse.

| Se daba por ausente | Estado real en `32e88ef` |
|---|---|
| Skip link | **Existe**, `src/components/layout/AppLayout.vue:25` (autenticado) y `src/components/public/PublicLayout.vue:22` (pública) |
| `aria-describedby` en formularios | **Existe y resuelve**, `src/components/ui/BaseField.vue:44,99-104` vía `FieldContext`; el gemelo público, `src/components/public/AuthField.vue:49,83-88` |
| Focus trap en `ModalShell` | **Existe**, `src/composables/useModalFocus.ts:47-64`, montado en `src/components/ui/ModalShell.vue:188` |
| `prefers-reduced-motion` global en el tenant | **Existe**, `src/assets/styles/base.css:108-119`, selector universal, cubre los 402 SFC. R06 cerrado |

Y una quinta del brief compartido: **Vuetify ya no pinta nada**. Cero `v-btn`/`v-card`/
`v-text-field`/`v-select`/`v-dialog`/`v-container` en los 402 SFC; lo único que queda es el
`<v-app>` de `src/App.vue:17,42`. La premisa de «dos sistemas de estilo chocando en el
escaparate» está muerta: la zona pública corre entera sobre `public-auth.css` y sus 34 tokens
`--pub-*`. Ver H11.

**Lo que sí queda de la ley propia, sin cerrar y con número:** #108 (SearchableSelect sin
combobox), #133 (títulos de ruta), #112 (giros infinitos en la capa pública), #64 (traza en
errores en línea), el 4(b) redactado y nunca abierto (`.ds-table-scroll`), #57/#44 (ninguna
puerta de accesibilidad en el pipeline). Los hallazgos de abajo los citan por su número en vez
de repetirlos, y añaden **solo el delta medido hoy**.

### Qué cubren ya las dos suites que se pidió leer

`e2e/a11y-publicas.spec.ts` (185 líneas) cubre, **solo en las 8 pantallas públicas**: enlace de
salto como primer tabulable con salto de foco real a `#contenido` (×8), `document.title` en `/`
y `/planes` más la no-persistencia del título al salir, `<label for>` que enfoca, error atado
por `aria-describedby` con `aria-invalid` que empieza en `false`, región viva `polite` y no
`alert`, `aria-required` + texto «(obligatorio)», y el ojo de contraseña a ≥24×24 con cambio de
nombre accesible. **No cubre ni una sola pantalla autenticada.**

`e2e/movimiento-reducido.spec.ts` (303 líneas) cubre, midiendo estilo computado en `/login`:
que `.pub-spin` queda en 1 iteración y con duración >0 y <1 ms, que `.pub-reveal` y
`.ds-skeleton` se apagan con `none` por sus guardas locales (excepción fijada a propósito), que
una transición de `<style scoped>` queda acortada, que **`transitionend` sigue llegando**, y un
bloque de control sin la preferencia. **No comprueba que el bloque global de `base.css:108-119`
siga existiendo** — es el agujero que R06 «Sin verificar» ya declara, y sigue abierto.

Nada de lo de abajo duplica ninguna de las dos.

---

## 1. Hallazgos

### H01 · [bloqueante] El selector de sede no tiene nombre accesible y desaparece en tablet

`src/features/branches/components/BranchSelector.vue:11-19` y `:40-44`

**Criterio.** WCAG 2.2 §1.3.1 Información y relaciones (A) y §4.1.2 Nombre, función, valor (A):
el rótulo visible «Sede» es un `<span class="bs-label">` (`:12`), no un `<label for>` ni un
`aria-labelledby`. El `BaseSelect` no va envuelto en `BaseField`, así que la inyección de
`FieldContext` devuelve `null` y `describedBy`/`labelId` quedan vacíos
(`src/components/ui/BaseSelect.vue:40`): el nombre accesible del combobox acaba siendo su propio
contenido — «Todas las sedes», o el nombre de una sede. Un lector de pantalla anuncia «Norte -
Bogotá, cuadro combinado» sin decir jamás **de qué** es ese combo.

Y la segunda mitad, que es la grave: `@media (width <= 1024px) { .branch-selector { display:
none } }` (`:40-44`). **En tablet el selector no se ve ni se puede cambiar**, y el comentario de
`:38-39` confirma que la sede persistida sigue aplicando como contexto de las peticiones. No hay
banner: `src/components/layout/` no tiene `AppHeader` —solo `AppLayout`, `AppSidebar`,
`SidebarBrand`, `SidebarNavItem`, `SidebarSubItem`, `SidebarUserCard`— así que **ninguna otra
superficie del armazón dice sobre qué sede se está escribiendo**.

**Impacto.** Es el control que decide dónde aterriza la escritura clínica. En el dispositivo que
el encargo describe —tablet, una mano, animal delante— el veterinario escribe una consulta, una
vacuna o una receta contra una sede que no puede ver ni corregir. Que el producto ya tenga
`AppointmentBranchConfirm.vue:21` («Sede distinta a la del menú») demuestra que el equipo sabe
que confundir la sede es un fallo real; el aviso solo aparece en la agenda, y solo si el
formulario ofrece el selector. **Alcance: las 71 rutas nombradas del tenant** heredan el armazón,
y todas las que escriben con `branchId` heredan la ambigüedad. Prioridad 1 del encargo: que no se
pierda trabajo.

**Arreglo.** Dos piezas, las dos en `src/` (trabajo de `front-feature`):

1. Envolver el `BaseSelect` en `BaseField` con `label="Sede"` y retirar el `<span>`, o —si la
   maquetación del raíl no admite el `BaseField`— pasar `aria-label="Sede"`. La primera opción es
   la correcta: `BaseField` ya publica `labelId` por contexto y `BaseSelect` ya lo consume; no
   hay componente nuevo.
2. **Retirar el `display: none` de `:40-44`.** En el raíl de 72 px el selector no cabe con
   etiqueta, pero sí como botón de icono `Building2` que abre el mismo `BaseSelect`, con el
   nombre de la sede activa en `aria-label` y en un `title`; y con la inicial o el código corto
   de la sede visible bajo el icono, que es lo que hace que se entienda sin leer. Un hueco
   honesto (R14) sería no ofrecer el cambio; ocultar el estado activo no lo es.

Verificación posterior: un caso de `e2e/` que a 1024 px de ancho localice
`getByRole('combobox', { name: /sede/i })` y lo encuentre visible; y otro que a 1440 px afirme
que el nombre accesible contiene «Sede» y no solo el nombre de la sucursal.

---

### H02 · [bloqueante] El ojo de la contraseña del armazón autenticado no se puede usar con teclado

`src/components/ui/BaseInput.vue:97-106`, en concreto `tabindex="-1"` en `:101`

**Criterio.** WCAG 2.2 §2.1.1 Teclado (A): «All functionality of the content is operable through
a keyboard interface». El botón que revela la contraseña está deliberadamente sacado del orden de
tabulación, así que **la función solo existe para quien usa ratón**. No hay control equivalente
en la página. Añadido: §2.5.8 Target Size (AA) — el botón es `display: grid; place-items: center;
padding: 0` (`:194-198`) sobre un icono de 15 px, es decir ~15×15 CSS px frente a los 24×24
exigidos, y sin acogerse a ninguna de las cinco excepciones del criterio (no es *inline*, no está
determinado por el agente de usuario, y no hay control equivalente).

**Lo que lo convierte en incumplimiento de regla propia y no en hueco:** el gemelo funcional de la
zona pública **ya lo arregló, por los dos lados**. `src/components/public/AuthInput.vue:78-86` no
pone `tabindex` y `:151-154` declara `min-width: 24px; min-height: 24px` con el comentario que
cita §2.5.8; y `e2e/a11y-publicas.spec.ts:169-184` lo sujeta con `boundingBox()`. El arreglo está
escrito, probado y a un directorio de distancia — y no se replicó al catálogo que usa la
aplicación entera.

**Alcance.** `BaseInput` lo consumen **51 SFC**. Los `type="password"` que pasan por él son
**10**, y ninguno está en `components/public/`: `features/auth/components/LoginForm.vue`,
`features/auth/views/CambiarContrasenaView.vue` (×2),
`features/auth/views/RestablecerContrasenaView.vue` (×2),
`features/employees/components/EmployeeFormModal.vue` (×2),
`features/employees/components/ResendInvitationModal.vue` (×2),
`features/registration/components/RegisterAdminSection.vue`. Es decir: **el alta de un empleado y
el cambio de contraseña propia**, que son las dos pantallas donde una contraseña mal tecleada se
paga con un bloqueo de cuenta.

**Arreglo.** En `src/components/ui/BaseInput.vue` (trabajo de `front-feature`):
borrar `tabindex="-1"` de `:101` y añadir a `.reveal` (`:193-201`) `min-width: 24px;
min-height: 24px`. Nada más: el `aria-label` conmutado de `:102` ya es correcto y ya cambia con el
estado. Verificación: copiar el `describe('§2.5.8 Target Size — el ojo de la contraseña')` de
`e2e/a11y-publicas.spec.ts:169-184` apuntando a `/cambiar-contrasena`, añadiendo un aserto de
`toBeFocused()` tras tabular desde el input.

---

### H03 · [grave] `SearchableSelect` sigue sin patrón de combobox, y dentro de un modal el teclado se escapa del diálogo

`src/components/ui/SearchableSelect.vue:181-283` · issue abierto **public-web #108**

El issue está abierto y bien redactado; **no lo repito**. Lo que aporta esta pasada es el delta
medido hoy, que lo agrava y cambia a quién señala el arreglo:

1. **No hay navegación con flechas, en absoluto.** El único `@keydown` del panel es
   `escape` sobre el buscador (`:211`). No hay `ArrowDown`/`ArrowUp`/`Home`/`End`, ni
   `aria-activedescendant`. La única forma de llegar a una opción es tabular por los
   `<button class="item">` de `:216-226`, uno por opción — el APG del patrón *Combobox* pide
   exactamente lo contrario: el foco se queda en el control y las flechas mueven el resaltado.
2. **Escape solo funciona desde el buscador.** Con el foco en una opción, `closeToTrigger`
   (`:126-130`) es inalcanzable. APG *Combobox*: «Escape: Closes the popup and returns focus to
   the combobox» — y R02 lo eleva a regla propia, con el camino de abandono explícitamente
   separado precisamente «para que no se olvide».
3. **Sin recuento de resultados.** `Sin coincidencias` (`:215`) es un `<div>` fuera de toda
   región viva: quien escribe a ciegas en el buscador no recibe nada. §4.1.3 Mensajes de estado
   (AA).
4. **Y la consecuencia nueva:** `useModalFocus` atrapa el Tab escuchando en el `.overlay`
   (`ModalShell.vue:188`), **no en `window`**, decisión deliberada y documentada en
   `src/composables/useModalFocus.ts:37-45` para no inutilizar los paneles teletransportados.
   Correcta. Pero como el punto 1 obliga a **tabular** por las opciones, y el panel vive en
   `<body>` fuera del overlay, tabular por la lista dentro de un modal **saca el foco del
   diálogo hacia la página de detrás**. Los dos defectos por separado son molestos; juntos hacen
   que el control sea inoperable con teclado en los **11 modales** donde vive:
   `acciones/modals/{Imaging,Lab,Spa,Surgery,Vaccine}FormModal.vue`,
   `consulta/nueva/modals/{Imaging,LabTest,Receta,Surgery,Vaccination}Modal.vue` y
   `laboratorio/components/LabHistory.vue`. Son las pantallas de vacuna, cirugía y **receta**.

**El arreglo ya no es el que dice #108.** El issue manda copiar `AppSelect` de la consola; hoy
sobra: **`src/components/ui/BaseSelect.vue` es, en este mismo catálogo, una implementación
completa del patrón** — `role="combobox"` + `aria-haspopup="listbox"` (`:242-243`),
`aria-activedescendant` (`:249-251`), `<ul role="listbox">` con `<li role="option">` y
`aria-selected` (`:263-276`), flechas, `Home`/`End`, `Enter`/`Espacio`, `Escape` con retorno de
foco y typeahead con ventana de 600 ms (`:137-207`). Portar `onKeydown`, `move`,
`scrollHighlightedIntoView` y el marcado de lista de `BaseSelect` a `SearchableSelect` es el
arreglo entero, y elimina de paso el problema 4 porque deja de hacer falta tabular.

Añadir además, sobre el buscador de `:205-212`: `role="combobox"` con `aria-expanded`,
`aria-controls` al panel, y un `<span class="ds-sr-only" aria-live="polite">` con
`{{ filtered.length }} resultados` / `Sin coincidencias`.

**Alcance:** 11 SFC consumen `SearchableSelect`. Trabajo de `front-feature` (`src/`, no gemelo).
Actualizar #108 con este delta antes de implementarlo.

---

### H04 · [grave] La navegación principal no es un landmark y no anuncia la ruta activa

`src/components/layout/AppSidebar.vue:123` · `src/components/layout/SidebarNavItem.vue:20-48`

Tres defectos de la misma pieza, y ninguno está cubierto por R01–R15 (R14 vigila que el sidebar no
invente cifras; nada vigila su semántica):

1. **No hay landmark de navegación.** El menú es un `<aside>` (`AppSidebar.vue:123`), que expone
   el rol `complementary`. Un barrido de todo `src/` da **cero** `<nav>` y **cero**
   `role="navigation"` en `src/components/layout/`; los siete `<nav>` del repo están en
   `Pagination`, la landing, el índice de los legales y el sub-menú de suscripción. El menú
   principal de la aplicación —el que decide todo— es la única navegación que no se anuncia como
   tal, así que el atajo «ir a la navegación» de cualquier lector no lo encuentra. §1.3.1 (A).
2. **Ninguna entrada dice cuál es la actual.** `aria-current` aparece **3 veces en todo el
   repo** y ninguna en el armazón (`landing/components/PasosEmbudo.vue:45` y dos comentarios). El
   estado activo viaja solo por `:class="{ active }"` (`SidebarNavItem.vue:23`), que se pinta con
   fondo y sombra interior (`:74-81`): **color y nada más**. §4.1.2 (A) y §1.4.1 Uso del color
   (A).
3. **`expandable` no se anuncia.** `SidebarNavItem` recibe `expandable` y `expanded`
   (`:9-10`) y con ellos solo gira un chevron (`:33-47`). El `<button>` no emite `aria-expanded`
   ni `aria-controls`, y el sub-menú que abre es un `<div class="sub-list">` hermano
   (`AppSidebar.vue:150,181,224,245`). Pulsar «Consulta» con un lector abre cuatro entradas
   nuevas sin decir absolutamente nada. §4.1.2 (A).

Hay una cuarta consecuencia que no es de norma sino de trabajo: los ~20 destinos de primer nivel
son `<button @click="router.push(...)">` y no `RouterLink`, así que **no tienen `href`**: no se
abren en pestaña nueva, no se copia su enlace y no se recuperan con el gesto de vuelta del
navegador. En una clínica donde la caja está en una pestaña y la historia en otra —escenario que
el propio R08 usa como argumento— eso es fricción diaria. Y `RouterLink` pone `aria-current="page"`
**solo**, que es justo lo que `SuscripcionLayout.vue:23` ya documenta como motivo para haberlo
elegido allí.

**Alcance: las 71 rutas nombradas del tenant.** El armazón se monta en todas.

**Arreglo** (todo en `src/`, `front-feature`):

- `AppSidebar.vue:123`: `<aside>` → `<nav class="sidebar ds-stack" aria-label="Navegación
  principal">`. El nombre es obligatorio en cuanto haya más de un `<nav>` en la página, y con
  `Pagination` los hay.
- `SidebarNavItem.vue`: añadir prop `to?: RouteLocationRaw`; cuando venga, renderizar
  `<RouterLink :to>` en lugar de `<button>` — hereda `aria-current="page"` sin escribirlo. Los
  cuatro acordeones (`Consulta`, `Procedimientos`, `Tienda`, `Compras`) siguen siendo `<button>`
  y añaden `:aria-expanded="expanded"` y `:aria-controls="listId"`, con el `id` correspondiente
  en el `<div class="sub-list">` de `AppSidebar`. `SidebarSubItem` ya es `RouterLink`
  (`:14`): solo hay que dejar de forzar `:class="{ active }"` como único canal.
- Migrar los `@click="router.push({ name: '…' })"` de `AppSidebar.vue` a `:to`. «Nueva consulta»
  (`:151-160`) se queda en `<button>`: tiene lógica de borrador (`goNuevaConsulta`, `:76-95`) y
  no es una navegación pura.

---

### H05 · [grave] «Cerrar sesión» no se alcanza tabulando hacia delante

`src/components/layout/SidebarUserCard.vue:64-90`

El menú (`:66-73`, `role="menu"`) se declara en el DOM **antes** que el botón que lo abre
(`:75-89`). Con el foco en el disparador, `Tab` va al elemento siguiente en orden de documento —
y el menú queda detrás. El `role="menuitem"` de «Cerrar sesión» (`:68`) solo se alcanza con
`Shift+Tab`, o sea: en la dirección contraria a la que abre el menú.

Encima, el patrón *Menu Button* del APG no está: al abrir no se mueve el foco al primer ítem
(`toggle()`, `:33-35`, solo conmuta el booleano), no hay flechas, no hay `Home`/`End`, y aunque
`Escape` cierra (`:50-52`) **no devuelve el foco al disparador** — que es literalmente R02, la
regla propia del repo, y su ficha dice que vale «para el camino de éxito y para el de abandono».

**Criterio.** WCAG 2.2 §2.4.3 Orden del foco (A); §4.1.2 (A) para el `role="menu"` sin su
interacción; R02 del repositorio.

**Impacto.** Cerrar sesión es la operación de seguridad del turno: en una clínica el equipo
comparte máquina, y quien navega con teclado no encuentra la salida en la dirección natural.
**Alcance: las 71 rutas**, el componente vive en el armazón.

**Arreglo** (en `src/`, `front-feature`): mover el `<transition>` del menú **después** del
`<button>` en el template y reposicionarlo con CSS (`.user-menu` ya es `position: absolute` con
`bottom: calc(100% + 8px)`, `:155-166` — el cambio de orden en el DOM no mueve un píxel); en
`toggle()`, cuando pase a abierto, `nextTick(() => primerMenuItem?.focus())`; añadir
`ArrowDown`/`ArrowUp`/`Home`/`End` sobre los ítems; y en `onKeydown` (`:50-52`), tras cerrar,
`userCardBtn.focus()`. Reutilizar el criterio de `SearchableSelect.closeToTrigger` para no
inventar un tercer patrón.

---

### H06 · [grave] 17 regiones desplazables sin teclado — el 4(b) redactado que nunca se abrió

`src/assets/styles/primitives.css` (`.ds-table-scroll`), 17 usos en 15 SFC

**Criterio.** WCAG 2.2 §2.1.1 Teclado (A); regla `scrollable-region-focusable` de axe-core: un
contenedor con `overflow-x: auto` que no es enfocable no se puede desplazar sin ratón, y las
columnas de la derecha quedan literalmente fuera de alcance.

Esto está redactado en `docs/ux/reglas-de-interfaz.md`, «Issues por abrir», punto 4(b), con la
cifra de **11 usos**. Verificado hoy: **17**, y **cero** con `tabindex` o `role="region"`.
`ListBody.vue:196`, `LibroComprasView.vue:91`, `ContratarResumenTabla.vue:126,145`,
`TrialLinesTable.vue:86`, `FeDocumentDetail.vue:206`, `DocumentosView.vue:123`,
`ReportesView.vue:136,162,186,248`, `MedicamentosView.vue:136,191`, `CotizacionesView.vue:127`,
`CuentasCobroView.vue:118`, `ImpuestosView.vue:153,213`. El issue lleva desde el 2026-08-20 sin
abrirse y el alcance ha crecido un 55 % mientras tanto; entre lo nuevo está el **resumen de
contratación**, que es una tabla de dinero.

**Arreglo.** El del propio documento, sin cambios: la primitiva `.ds-table-scroll` gana
`tabindex="0"` y `role="region"` **desde el marcado** —no desde el CSS, que no puede poner
atributos— más un nombre accesible por consumidor. Como `primitives.css` es **gemelo TR-02**, la
decisión de la primitiva es de **`front-parity`** y se replica en el admin (donde llega vía
`AppTable`); los 17 marcados son de `front-feature`. El nombre accesible de cada uno tiene que
llevar el sujeto de la tabla (R04), no «Tabla».

---

### H07 · [grave] 65 de las 71 rutas siguen llamándose «Lumbre»

`src/router/index.ts:724-728` y los seis `title:` de `:106,130,147,153,246,258`

**Criterio.** WCAG 2.2 §2.4.2 Página titulada (A). Issue **public-web #133**, que sigue abierto.

Delta de esta pasada, y es el que importa: **la maquinaria ya aterrizó**. `router/index.ts:724`
declara `TITULO_POR_DEFECTO = 'Lumbre'` y `:728` asigna `document.title` en cada navegación; el
mecanismo está sujeto por `e2e/a11y-publicas.spec.ts:72-105`, incluido el caso de que el título
anterior no se quede pegado. Lo que no aterrizó es la cobertura: de las **71 rutas nombradas**,
solo **6** declaran `meta.title`, y las seis son de la zona pública (landing, planes, los dos
legales, y los dos pasos de contratación). **Toda la aplicación autenticada cae al literal.**

Eso deja #133 en el peor estado posible: cerrado a ojos de quien mire el commit del mecanismo,
abierto para 65 rutas. Con caja en una pestaña e historia clínica en otra —el escenario que el
propio R08 usa como argumento— siguen siendo indistinguibles.

**Arreglo** (`src/router/index.ts`, `front-feature`): un `meta.title` por ruta nombrada, con la
forma que ya usan las seis existentes (`«Pantalla — Lumbre»`). Los detalles con parámetro
(historia, cuenta, documento) necesitan título dinámico: `meta.title` como función de `to`, o
asignación desde la vista al resolver el dato — y hasta que el dato llegue, el genérico, nunca un
sujeto inventado (R14). Verificación: extender el `describe('§2.4.2 Page Titled')` de
`e2e/a11y-publicas.spec.ts` con una tabla de rutas autenticadas, o —más barato y de rejilla— una
prueba unitaria que recorra el árbol de rutas y falle si alguna nombrada carece de `meta.title`.

---

### H08 · [menor] El combobox de `BaseSelect` no declara qué lista controla

`src/components/ui/BaseSelect.vue:236-260` (disparador) y `:262-285` (panel teletransportado)

El disparador declara `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded` y
`aria-activedescendant` — pero **no `aria-controls`** (ni `aria-owns`). Y el `<ul
role="listbox">` se teletransporta a `<body>` (`:262`), así que **no es descendiente del
combobox en el DOM**. WAI-ARIA 1.2 exige que el elemento con `aria-activedescendant` contenga al
elemento referido o lo relacione con `aria-controls`/`aria-owns`; el patrón *Combobox* del APG
lista `aria-controls` como propiedad obligatoria del control. Sin ese puente, el resaltado que
`:249-251` calcula correctamente puede no llegar a anunciarse en absoluto.

Es un atributo, y es el único defecto de la mejor primitiva del catálogo — la que H03 propone
como plantilla, así que conviene arreglarlo **antes** de portarla.

**Alcance: 43 SFC** consumen `BaseSelect`, más `BranchSelector` (H01).
**Arreglo** (`front-feature`): dar `id` propio al `<ul>` (`:${controlId}-listbox`) y añadir
`:aria-controls="open ? \`${controlId}-listbox\` : undefined"` al disparador.

---

### H09 · [menor] La página actual de la paginación se distingue solo por color

`src/components/ui/Pagination.vue:74-82`

El botón de la página en curso recibe `class="num active"` (`:78`) y nada más: ni
`aria-current="page"`, que es lo que el APG y el patrón de paginación de cualquier sistema de
referencia usan para esto. La distinción visual es fondo amatista + peso 500 (`:168-173`), es
decir **color y tipografía**. §4.1.2 (A) por el estado no expuesto, y §1.4.1 Uso del color (A)
por el canal único. Menor porque el número sigue leyéndose y `.summary` (`:50`) da el rango, pero
el rango tampoco es región viva: al cambiar de página no se anuncia nada (§4.1.3, AA).

Detalle adjunto: el `…` de `:73` es texto real sin `aria-hidden`, así que se anuncia como
«puntos suspensivos horizontales» entre número y número.

**Alcance: 7 SFC.** **Arreglo** (`front-feature`): `:aria-current="p === page ? 'page' :
undefined"` en `:74-82`; `aria-hidden="true"` en el `<span class="dots">`; y `aria-live="polite"`
en `.summary` de `:50`, que ya contiene el texto exacto que hay que anunciar. Los objetivos
táctiles de este componente **sí cumplen** §2.5.8 (`min-width: 28px; height: 28px`, `:140-141`):
no se toca.

---

### H10 · [menor] Los sub-elementos del menú quedan por debajo del objetivo táctil mínimo

`src/components/layout/AppSidebar.vue:429-444` (`.sub-item-btn`) y `:423-427` (`.sub-list`)

`.sub-item-btn` declara `padding: 3px 10px` con `font-size: 12.5px` y un icono de 14 px
(`:158`): la caja resultante ronda los **21 px de alto**, por debajo de los 24×24 de §2.5.8
Target Size (Minimum), AA. Y la excepción de espaciado no le sirve: `.sub-list` tiene `gap: 1px`
(`:424`), así que los círculos de 24 px de dos filas contiguas se cortan. Tampoco es *inline*, ni
lo determina el agente de usuario, ni hay control equivalente.

El hermano `.sub-item` de `SidebarSubItem.vue:21-33` lleva `padding: 7px 10px` sobre el mismo
tipo y sale en ~29 px: **cumple**. Es decir, el defecto es que un botón se separó de su patrón,
no que el patrón esté mal — el arreglo es igualar el padding a 7 px.

**No medido:** las alturas son una derivación del `line-height` normal del navegador, no una
medida tomada en un render. Se verifica con `boundingBox()` en un caso de Playwright; no se
ejecutó ninguno (el encargo lo prohibía). El mismo caso debería medir `.nav-item`
(`SidebarNavItem.vue:57`, `padding: 4px 10px` sobre icono de 17 px → ~25 px, **al filo**) y
`.notif-item` (`AppSidebar.vue:380`, `padding: 9px 11px` → holgado).

**Alcance: las 71 rutas** (armazón), y el número de sub-elementos varía con los permisos.
**Arreglo** (`front-feature`): `.sub-item-btn` a `padding: 7px 10px`, igualándolo a `.sub-item`.

---

### H11 · [menor] Vuetify carga su hoja entera y su propio tema para cero componentes

`src/plugins/vuetify.ts:1,17-48` · `src/App.vue:17,42` · `src/assets/styles/app.css:8-12`

Censo: **cero** `v-btn`, `v-card`, `v-text-field`, `v-select`, `v-textarea`, `v-checkbox`,
`v-dialog` y `v-container` en los 402 SFC. Lo único que queda es el `<v-app>` contenedor. Y sin
embargo `vuetify.ts:1` hace `import 'vuetify/styles'` —la hoja completa, en la ruta crítica de
**todas** las pantallas— y `:41-48` configura `defaults` para seis componentes que no existen.

Lo que lo hace un hallazgo y no una nota de limpieza es `:17-29`: un tema de ocho colores en
sRGB, con el comentario que lo dice sin rodeos — «Espejo en sRGB de los tokens de `tokens.css`,
no una paleta aparte. **Ningún gate comprueba automáticamente que los dos coincidan**». Es una
tercera fuente de color del producto (junto a `tokens.css` y los 34 `--pub-*` de
`public-auth.css`), sin vigilancia y sin consumidores. Cumple exactamente la definición de R11
—un valor que existe fuera del token y por tanto fuera del alcance de cualquier guarda— pero por
el lado de un fichero de configuración, que es donde R11 no llega.

**Criterio.** Guía de rendimiento de Vue (LCP: no cargar en la ruta crítica lo que no se usa);
R11 por analogía para la paleta duplicada. No hay criterio WCAG: `<v-app>` no rompe nada hoy.

**Arreglo.** No es de esta auditoría decidir la retirada, y no debe hacerse a ciegas: `<v-app>`
puede estar sosteniendo el `color-scheme` o alguna cascada de la zona pública, y
`app.css:8-12` todavía tiñe `.v-field--focused`. Lo ejecutable es: (1) confirmar con un `build`
+ una pasada de la galería visual que retirar `<v-app>` no mueve ningún píxel; (2) si no lo
mueve, retirar el plugin, `app.css` y la dependencia en el mismo cambio; (3) si lo mueve,
sustituir `import 'vuetify/styles'` por la importación de estilos de los componentes realmente
usados y **borrar `customTheme`**, que es lo que no tiene defensa posible. Trabajo de
`front-feature`, coordinado con `front-e2e-visual` por las líneas base.

---

### H12 · [nota] `reglas-de-interfaz.md` afirma cuatro cosas que el árbol ya desmiente

`docs/ux/reglas-de-interfaz.md` (gemelo TR-02, byte a byte con el del admin)

El documento se verificó el 2026-08-20 y dice expresamente que manda el código. Manda:

| Ficha | Lo que dice | Lo que hay en `32e88ef` |
|---|---|---|
| R02, «Sin verificar» (~172) | «`ModalShell` **sigue sin retener el foco** […] no hay focus trap en ninguno de los dos repos» | La trampa existe: `src/composables/useModalFocus.ts:47-64`, montada en `ModalShell.vue:188` con `@keydown.capture`, y con retorno de foco por cadena de respaldo (`:71-101`). **Lo que sigue siendo cierto es que nada la prueba.** |
| R06 (~500) | La guarda global está en `main.css:80-91` | Está en `src/assets/styles/base.css:108-119` tras el split DS-06, y `base.css` se declara a sí mismo gemelo TR-02 (`:5-7`), así que **admin-web #74 puede estar cerrado también** — hay que comprobarlo antes de trabajar en él |
| R06, deuda (~520) | **Cinco** giros infinitos en la capa pública | Hoy quedan **tres** ficheros: `assets/styles/public-auth.css:152`, `components/public/AuthSelect.vue:132`, `components/public/PrimaryButton.vue:70`. `RestablecerContrasenaView` y `VerifyEmailView` ya no aparecen. **public-web #112 debe reducirse a tres**, no cerrarse |
| «Lo que quedó abierto» (~1290) | #115 (borde de campo a 1,23:1) y #114 (`--text-subtle` a 4,17:1) | Los dos arreglados en el árbol: `tokens.css:66` declara `--warm-450` y las primitivas lo consumen (`BaseInput.vue:144`, `BaseSelect.vue:328`, `SegmentedRadio.vue:128`, `Pagination.vue:137`, `SearchableSelect.vue:469`); `tokens.css:76,175` deja `--text-subtle` en `--warm-500` al 52 %. **Verificar y cerrar** |

Y una omisión que la propia «Puertas que faltan» nº 10 ya anticipa: el manifiesto TR-02 no
declara `ModalShell.vue`, y ahora tampoco `src/assets/styles/base.css` ni
`src/composables/useModalFocus.ts`, los dos nacidos gemelos y los dos declarándolo en su propio
docblock. Tres ficheros gemelos de facto sin gate que detecte la divergencia.

**Arreglo.** Actualizar las cuatro fichas —trabajo de documentación, no de `src/`— y dar de alta
los tres ficheros en el manifiesto (**`front-parity`**).

---

## 2. Lo que está bien y no se toca

Se enumera porque media docena de estas piezas parecen «mejorables» a ojo y no lo son:

- **`BaseField` + `fieldContext.ts`** (`BaseField.vue:36-64,91-104`). La convención documentada
  está completa: etiqueta asociada por `for`, `aria-describedby` que resuelve de verdad y por
  inyección —no por slot, que es lo que dejaba fuera a 119 consumidores—, `aria-invalid`,
  `aria-required` apagado en solo lectura, asterisco decorativo con `(obligatorio)` en
  `.ds-sr-only`, y región viva **persistente** y `polite` con `display: contents` para no mover la
  pila. **61 SFC** la heredan. No sustituir; completar donde falte.
- **`BaseSelect`** — patrón *Combobox* del APG completo salvo H08.
- **`SegmentedRadio`** (`:36-118`) — patrón *Radio Group* del APG completo y correcto:
  `role="radiogroup"` nombrado por `aria-labelledby` contra el `labelId` del contexto (porque
  `<label for>` es inerte sobre un `<div>` con rol), tabindex móvil de una sola tabulación,
  flechas con selección que sigue al foco, `Home`/`End`, `Espacio`, y `aria-checked`. Es la
  respuesta a la pregunta del encargo: **no son botones disfrazados**.
- **`ModalShell` + `useModalFocus` + `useModalLayer` + `useModalHistory`** — `role`
  conmutable a `alertdialog`, `aria-modal`, `aria-labelledby`/`aria-describedby`, Escape
  condicionado y solo para el modal superior de la pila, foco inicial resoluble, trampa de Tab,
  retorno de foco con cadena de respaldo, confirmación antes de descartar (FORM-07) y entrada de
  historial para que «atrás» cierre. **78 SFC.** Intocable sin réplica en el admin.
- **`ErrorSummary`** (`:1-27,44-58`) — patrón de GOV.UK correcto: enlaces al `id` del **control**,
  texto **literal** del error en línea, orden explícito del DOM y no de claves, y `focus()` que
  mueve el foco de verdad.
- **`PawLoader`** (`role="status"` + `aria-label` + `.ds-sr-only`, guarda local en `:122-126`) y
  **`PageLoader`** (`role="alert" aria-busy aria-live="assertive"`).
- **R05, punto 1: limpio.** Cero ocurrencias de `error(titulo, getProblemDetailMessage(e))`
  escrito a mano en `src/`; las 33 llamadas a `.error(` restantes son literales de pantalla
  legítimos y hay 40 usos de `errorFrom`. El pendiente de R05 es #64 (los errores **en línea**),
  no los avisos flotantes.
- **R06, loader único: limpio en la aplicación autenticada.** Los únicos giros que quedan son los
  tres de la capa pública de H12.
- **Medida de línea de los legales: correcta.** `public-auth.css:476,635` capan la prosa a
  `66ch`, dentro de la horquilla de 45–75 caracteres. No hay hallazgo ahí.

---

## 3. Qué implementar, en qué orden y quién

### Lista B — `front-feature` (propio de `public-web`, nada gemelo)

| # | Trabajo | Ficheros | Alcance |
|---|---|---|---|
| 1 | **H02** · quitar `tabindex="-1"` del ojo + `min-*: 24px` | `ui/BaseInput.vue:101,193-201` | 10 campos de contraseña / 51 consumidores |
| 2 | **H01** · nombre accesible del selector de sede + no ocultarlo en tablet | `branches/components/BranchSelector.vue:11-19,40-44` | 71 rutas |
| 3 | **H05** · orden del DOM del menú de cuenta + foco al abrir + retorno en Escape | `layout/SidebarUserCard.vue:64-90,33-52` | 71 rutas |
| 4 | **H04** · `<nav>` con nombre, `RouterLink` con `aria-current`, `aria-expanded`/`aria-controls` | `layout/AppSidebar.vue:123,134-338`, `layout/SidebarNavItem.vue` | 71 rutas |
| 5 | **H08** · `aria-controls` en el combobox (**antes** del 6) | `ui/BaseSelect.vue:236-260,262` | 43 + `BranchSelector` |
| 6 | **H03** · portar el teclado de `BaseSelect` a `SearchableSelect` + recuento por `aria-live` | `ui/SearchableSelect.vue:181-283` | 11 SFC, 11 modales · actualiza #108 |
| 7 | **H06(b)** · `tabindex`/`role="region"`/nombre en los 17 marcados | 15 SFC listados en H06 | 17 tablas · abre el 4(b) |
| 8 | **H07** · `meta.title` en las 65 rutas autenticadas | `router/index.ts` | 65 rutas · cierra #133 |
| 9 | **H09** · `aria-current="page"` + `aria-hidden` en `…` + `aria-live` en el resumen | `ui/Pagination.vue:50,73,74-82` | 7 SFC |
| 10 | **H10** · `.sub-item-btn` a `padding: 7px 10px` | `layout/AppSidebar.vue:429-444` | 71 rutas |
| 11 | **H11** · censo y retirada de Vuetify (coordinar con `front-e2e-visual`) | `plugins/vuetify.ts`, `App.vue:17,42`, `assets/styles/app.css` | 402 SFC |
| 12 | **H12(c)** · reducir #112 de cinco giros a tres | los tres ficheros de H12 | 3 ficheros |

Del 1 al 4 son de nivel A y afectan al armazón: entran primero, y los cuatro juntos son un
cambio pequeño. El 5 va antes que el 6 porque el 6 copia del 5.

### Lista A — `front-parity` (gemelos TR-02, réplica obligatoria en el admin)

| Trabajo | Fichero gemelo | Por qué es de paridad |
|---|---|---|
| **H06(a)** · `.ds-table-scroll` deja de ser solo `overflow-x` y pasa a exigir `tabindex`/`role` desde el marcado | `src/assets/styles/primitives.css` | Gemelo byte a byte; en el admin llega vía `AppTable` |
| **H12** · alta de `ModalShell.vue`, `src/assets/styles/base.css` y `src/composables/useModalFocus.ts` en el manifiesto TR-02 | manifiesto | Tres gemelos de facto sin gate de divergencia |
| **H12** · actualizar las cuatro fichas caducadas de `reglas-de-interfaz.md` | `docs/ux/reglas-de-interfaz.md` | El documento es gemelo y se mantiene gemelo |
| Verificar si **admin-web #74** ya está cerrado por el split DS-06 | `base.css` | Si el gemelo llegó al admin, el issue murió solo |

### `ModalShell` — no se toca en esta tanda

Es **gemelo de facto no declarado**, byte a byte con el del admin. Esta auditoría **no propone
ningún cambio suyo**: la trampa de foco, el retorno, la pila de capas y la confirmación de cierre
están bien. Lo único pendiente es de `front-parity`: darlo de alta en el manifiesto, junto con sus
dos composables. Cualquier cambio futuro suyo se replica en `VetSoftwareFront` en el mismo PR o
rompe la paridad.

### Issue redactado para abrir (no abierto por esta auditoría)

> **`kefaroTech/vetsoftware-public-web` — El selector de sede no se nombra y desaparece en tablet:
> se escribe historia clínica sin saber en qué sede**
>
> `src/features/branches/components/BranchSelector.vue:12` pone el rótulo «Sede» en un `<span>`,
> no en un `<label for>`, y el `BaseSelect` de `:13-18` no va dentro de un `BaseField`, así que la
> inyección de `FieldContext` es `null` y el combobox se queda sin nombre accesible: un lector
> anuncia «Norte - Bogotá, cuadro combinado» sin decir de qué. WCAG 2.2 §1.3.1 y §4.1.2, nivel A.
> Y `:40-44` lo oculta entero por debajo de 1025 px de ancho, con la sede persistida siguiendo
> activa como contexto de las peticiones: en tablet —el dispositivo de planta— no hay **ninguna**
> superficie del armazón que diga sobre qué sede se escribe, porque `src/components/layout/` no
> tiene cabecera. Escenario: se registra una vacuna en la sede equivocada y no hay señal en
> pantalla. Que `features/agenda/components/AppointmentBranchConfirm.vue:21` ya avise de «Sede
> distinta a la del menú» confirma que el riesgo es conocido, pero solo cubre la agenda. Para
> cerrarlo: envolver en `BaseField label="Sede"` (o `aria-label="Sede"`), y en el raíl colapsado
> sustituir el `display:none` por un control de icono con la sede activa en el nombre accesible y
> su código corto visible. **No comprobado:** si alguna vista de detalle muestra hoy la sede del
> registro. Regla en `docs/ux/reglas-de-interfaz.md` § R14 (hueco honesto antes que dato
> inventado) y § R04 (el nombre lleva el sujeto).

---

## 4. Puertas que verificarían esto después

Ninguna se implementa aquí; se dejan especificadas y **no se ejecutó ninguna**.

1. **Extender `e2e/a11y-publicas.spec.ts` a la aplicación autenticada.** Hoy sus ocho pantallas
   son todas públicas, y todo lo de H01–H05 vive detrás del login. El helper ya existe:
   `e2e/helpers/sesion.ts` (`enrutarApi`, `instalarSesion`, `SEDES`, `perfilSimulado`).
2. **ARIA snapshots (`toMatchAriaSnapshot`) del armazón**, en las dos bandas (1440 y 1024 px).
   Fijan de una vez el `<nav>` nombrado, el `aria-current` de la ruta activa, el `aria-expanded`
   de los acordeones y la presencia del selector de sede — sin comparar píxeles. Es la puerta nº 9
   de `reglas-de-interfaz.md`, aplicada a la pieza que más se hereda.
3. **Prueba de rejilla sobre el router**: toda ruta nombrada tiene `meta.title`. Gramatical, sin
   navegador, cierra H07 para siempre.
4. **Prueba de rejilla sobre `.ds-table-scroll`**: ningún uso sin `tabindex`. Mismo patrón que
   `tests/unit/loader-guard.spec.ts`, que ya barre todo `src/`.
5. **`eslint-plugin-vuejs-accessibility` en `warn`** (#57 / #44) — es el prerrequisito de que H04,
   H05 y H09 no vuelvan en la próxima pantalla. Nace en verde.
