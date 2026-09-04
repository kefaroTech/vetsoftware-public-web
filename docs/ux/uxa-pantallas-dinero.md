# Dinero y administración del tenant — auditoría de maquetación sobre capturas

> Alcance: `/dashboard/suscripcion/*`, `/dashboard/contratar*`, `/dashboard/empresa`,
> `/dashboard/empleados`, `/dashboard/roles`, `/dashboard/caja`, `/dashboard/tienda/*`,
> `/dashboard/compras/*`, `/dashboard/cuentas*`, `/dashboard/facturacion/*`,
> `/dashboard/catalogos/medicamentos` y sus diálogos.
>
> Método: lectura de las capturas de `_capturas/public/<viewport>/`, contraste contra
> `docs/ux/uxa-rubrica-maquetacion.md`, `reglas-de-interfaz.md` (R01–R15),
> `patron-de-mensajes.md`, `suscripcion-tenant-especificacion.md` y `estado-solo-lectura.md`, y
> verificación en el árbol de `MainVetSoftware-uxaudit/public-web`. **No se ejecutó nada**: ni
> servidor, ni Playwright, ni `axe`, ni cálculo de contraste. Ver §4.
>
> Lo sistémico del armazón y del catálogo `Base*` está en
> `uxa-armazon-y-primitivas-tenant.md` y **no se repite**: aquí solo se dice dónde se ve y
> cuánto cuesta (§3).

---

## 1 · Sobre el material de prueba

Las capturas se rehicieron **dos veces** durante esta auditoría. La tanda válida es la última:
**684 capturas, 0 fallidas, 6 viewports** (`uxa-resumen-public.json`, `totales`). De las 32
combinaciones ruta/estado inservibles quedan **3**, y dos son de este bloque (§5).

`uxa-metricas-public.json` también se regeneró, con dos criterios corregidos que **cambian el
dictamen** y por eso se declara:

- **Centrado**: antes metía en los límites del grupo a hijos fuera de flujo (el `.ds-sr-only`
  absoluto de los botones). Ya no. Los casos que quedan son reales y se han triado en §4.
- **Texto cortado**: antes marcaba cualquier contenedor con `scrollWidth > clientWidth`. Ahora
  solo elementos con nodo de texto propio. Esto **retira** los `header.ds-head` y `div.ds-page`
  que la tanda anterior señalaba en `/dashboard/tienda/inventario`; lo que allí hay es otra cosa
  y es H01.

Confirmado además en esta pasada: **0 capturas con tipografía de respaldo**, así que los juicios
sobre medida de línea, elipsis y «¿cabe el rótulo?» de este informe se sostienen.

**Aviso sobre los `fichero:línea`, y no es una formalidad.** Este worktree está **compartido con
otros agentes que sí escriben en `src/`**: durante la redacción de este informe, `git status`
pasó de limpio a 43 ficheros modificados, y `primitives.css` ganó 15 líneas en dos sitios
(`@@ -41,0 +42,6 @@` y `@@ -757,0 +764,9 @@`), desplazando **todas** sus referencias. Las
citas de este documento se han **revalidado una a una contra el árbol al cerrarlo**: 11 de
`primitives.css` y 17 de componentes, comprobando que la línea citada contiene lo que se dice que
contiene. Aun así, y como ya avisa `reglas-de-interfaz.md`: **si algún `fichero:línea` no cuadra,
manda el código**. Los selectores y los literales citados son estables; los números, no.

---

## 2 · Hallazgos

Doce fichas, por severidad. Lo sistémico va agrupado con su alcance.

---

### H01 · [bloqueante] Entre 761 y ~1300 px la acción primaria del inventario queda fuera de la pantalla, y la tabla se recorta sin scroll

`src/features/tienda/views/InventarioView.vue:399-400,430` · `src/assets/styles/primitives.css:534-540`
· `src/features/tienda/components/InventoryProductsTable.vue:111,356,375-378`

**Prueba.** `_capturas/public/tablet-h/dashboard-tienda-inventario__lleno.png` (1024×768): el botón
`Categorías` está cortado por el borde derecho y **`+ Nuevo producto` no aparece en absoluto**;
la columna de acciones de la tabla queda seccionada en x=1024.
`_capturas/public/portatil/dashboard-tienda-inventario__lleno.png` (1280×800): de
`+ Nuevo producto` solo se ve una franja de ~14 px.
`_capturas/public/movil-ancho/dashboard-tienda-inventario__lleno.png` (760×1024): **correcto** —
la barra se apila y todo se alcanza.

**Criterio.** WCAG 2.2 §1.4.10 Reflow (AA) y §2.1.1 Teclado (A) — el control no es alcanzable por
ningún medio. R15 de `reglas-de-interfaz.md`: «una tabla ancha se desplaza, no se recorta».
Rúbrica §3.8, fila «una tabla queda recortada → bloqueante».

**Mecanismo, y por qué la banda es exactamente esa.**

1. `.ds-head` (`primitives.css:534`) es `display:flex` **sin `flex-wrap`**.
2. `.head-actions` (`InventarioView.vue:399-400`) añade `flex-shrink: 0`, y sus seis controles
   llevan `.ds-btn--nowrap` (`:231,240,247`). El grupo no puede ni encogerse ni envolver.
3. El único punto de corte que lo arregla es `@media (width <= 760px)`
   (`InventarioView.vue:430`, vía `.ds-stack-mobile`, `primitives.css:694`).
4. La tabla tiene el mismo problema por otra vía: `InventoryProductsTable.vue:375-378` declara
   `.ds-table { display:block; overflow-x:auto }` **dentro de `@media (width <= 760px)`**
   (`:356`), y la vista **no la envuelve en `.ds-table-scroll`**. Por encima de 760 px la tabla
   de 9 columnas no tiene contenedor de desplazamiento de ninguna clase.

Resultado: **la banda 761–~1300 px queda sin salida**, y contiene el ancho de portátil más común
(1280) y **el único punto de corte que el proyecto decidió** (1024,
`viewport.store.ts:11`) — el del mostrador.

**Impacto.** En la tablet del mostrador no se puede dar de alta un producto ni abrir el detalle
de stock de ninguna fila. Prioridad 1 del encargo: se pierde trabajo, y ni siquiera hay forma de
intentarlo.

**Arreglo** (`front-feature`, `src/`, nada gemelo):

1. `InventarioView.vue:399` → `.head-actions { flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end }`.
   Envuelve en cuanto no cabe, en cualquier ancho, sin depender de un `@media`.
2. Envolver `<table class="ds-table">` de `InventoryProductsTable.vue:111` en
   `<div class="ds-table-scroll">` (`primitives.css:759`) **fuera de todo `@media`**, y borrar
   el bloque `:375-378`, que pasa a sobrar.
3. Ese `.ds-table-scroll` nuevo entra en el censo de H06 de
   `uxa-armazon-y-primitivas-tenant.md`: nace ya con `tabindex="0"`, `role="region"` y
   `aria-label="Productos del inventario"`.

**Verificación posterior** (`front-e2e-visual`): un caso que a 1024 y a 1280 afirme
`await expect(page.getByRole('button', { name: 'Nuevo producto' })).toBeInViewport()`.

---

### H02 · [bloqueante] `/dashboard/cuentas` no se puede pintar: un `TypeError` de render blanquea la lista mientras la pantalla afirma que hay 25 cuentas y $ 128.450.900 pendientes — y el tenant no tiene ninguna barrera de error

`src/features/cuentas/views/CuentasListaView.vue:159-232` · `src/components/ui/BaseTabPanel.vue`
· **cero** `onErrorCaptured` / `app.config.errorHandler` en todo `src/`

**Estatus del material.** `lleno` y `vacio` de `/dashboard/cuentas` son **2 de las 3
combinaciones que siguen sin captura válida** tras dos tandas
(`uxa-resumen-public.json`, `capturasNoUsables`), y el motivo declarado por el arnés es
*«`Cannot read properties of undefined (reading 'length')` en un campo anidado»*. **Por eso esta
ficha no juzga la maquetación de ninguna captura**: la maquetación de esa pantalla queda
declarada como no auditada en §5. Lo que sí se reporta —y es más grave que cualquier defecto de
maquetación— es que **la pantalla no se puede pintar**, y que eso ha sido reproducible en las dos
tandas, con dos árboles distintos.

**Evidencia.** Traza recogida por el arnés en la 1.ª tanda:

```
pageerror: TypeError: Cannot read properties of undefined (reading 'length')
[Vue warn]: Unhandled error during execution of render function
  at <BaseTabPanel name="cuentas" value="activas">
  at <CuentasListaView …>
```

Y en la captura de la 2.ª tanda que llegó a tomarse antes de descartarse, la pantalla mostraba
cabecera, pestañas `Activas 25` / `Cerradas 0`, el banner
«**25** cuentas abiertas · saldo acumulado pendiente **$ 128.450.900**» y el buscador, con el
cuerpo **completamente vacío**: ni tarjetas, ni esqueleto, ni estado vacío, ni banner de error.

**Criterio.** NN/g, estados vacíos, verbatim: *«Do not default to totally empty states»*.
Heurísticas 1 y 9 de Nielsen. WCAG 2.2 §4.1.3 Mensajes de estado (AA): el fallo no se anuncia por
ningún canal. R05: el error se pinta, no se calla.

**Lo que lo convierte en bloqueante sistémico y no en un bug de una pantalla.** Las cuatro ramas
de la vista (`:189` esqueleto, `:196` sin resultados, `:203` vacío, `:216` tarjetas) son
exhaustivas **solo si nada revienta**. Un `TypeError` en el `v-for` tumba el subárbol entero, y
la barrera que lo contendría **no existe en ninguna parte del tenant**:

```
grep -rn 'onErrorCaptured\|errorHandler' src/   →  0 resultados
```

Es decir: **cualquier campo inesperado del backend en cualquier fila de cualquier listado del
tenant blanquea esa región sin decir nada**. Aquí toca las cuentas a crédito, y la contradicción
interna es lo peor: el banner y la pestaña afirman 25 cuentas y 128 millones pendientes; el
cuerpo dice cero; y el usuario no tiene forma de saber cuál miente.

**Arreglo** (`front-feature`), en dos piezas y en este orden:

1. **La barrera, que es la que quita el bloqueo y protege a las otras 70 rutas.** Un
   `ErrorBoundary.vue` en `src/components/feedback/` con
   `onErrorCaptured((e) => { fallo.value = e; return false })` que pinte
   `<div class="ds-banner ds-banner--error" role="alert">` con el texto de
   `patron-de-mensajes.md` §6 y un botón «Reintentar» que fuerce el remontaje por `:key`.
   Envolver con él el `<slot />` de `BaseTabPanel.vue` y el cuerpo de `ds-page`. Registrar
   además `app.config.errorHandler` en `src/main.ts` para que el fallo llegue a la telemetría en
   vez de morir en la consola.
2. **La causa concreta**: el `.length` sobre un campo anidado opcional en la ruta de render.
   `useInfiniteList.ts:55` inicializa `items` a `[]`, así que el culpable **no es** `accounts`;
   hay que reproducirlo con `enrutarApi` de `e2e/helpers/sesion.ts` y darle `?? []`.

**No ejecutado:** no se reprodujo el fallo con navegador. La línea exacta del `.length` queda por
localizar y **es el primer paso del arreglo**.

---

### H03 · [bloqueante] Nueve vistas de dinero pintan el error **y** el estado vacío a la vez: la pantalla que falló afirma «No hay facturas registradas»

`src/features/employees/views/EmpleadosView.vue:330` + `components/EmpleadosTable.vue:52-57` ·
`compras/views/LibroComprasView.vue:89,110` · `compras/views/FacturasProveedorView.vue:176,202,278` ·
`facturacion/views/DocumentosView.vue:121,169` · `tienda/views/InventarioView.vue:255` ·
`cuentas/views/CuentasListaView.vue:148` · `cuentas/views/CuentasDetalleView.vue:91` ·
`medicamentos/views/MedicamentosView.vue:133`

**Prueba.** `_capturas/public/escritorio/dashboard-empleados__lleno.png`: banner rojo
«Error al cargar empleados» y, **debajo, dentro de la tabla**, «Aún no hay empleados registrados
en esta empresa.» Las dos afirmaciones a la vez, y la segunda es falsa.

**Criterio.** R05, punto 1: «El error se pinta ANTES que el vacío: una pantalla que falló y
muestra el estado vacío es defecto». Rúbrica §3.7. WCAG 2.2 §3.3.1 (A) por el estado del sistema
mal identificado, y §4.1.3 (AA) porque **ninguno de los nueve banners lleva `role="alert"`**.

**Por qué NO es un duplicado de public-web #110.** #110 cubre `ListBody` y su tabla dice
«arreglado en el árbol». Estas nueve vistas **no pasan por `ListBody`**: cada una escribe su
propio `v-if="error"` seguido de contenido **incondicional**, de modo que las dos ramas coexisten
por construcción. Y es peor que #110, porque #110 sustituía el vacío por el error y aquí se
enseñan los dos.

**Impacto.** En `LibroComprasView` el literal es «Sin compras en el periodo»; en
`FacturasProveedorView`, «No hay facturas registradas» y «No hay cuentas por pagar pendientes».
Son **afirmaciones contables** sobre un periodo. Un auxiliar que cierra el mes lee que no hubo
compras cuando lo que pasó es que la petición falló. Alcance: **9 vistas, 10 literales vacíos**,
todas de dinero o de administración.

**Y el desorden que lo acompaña: SEIS tratamientos del mismo error conviven.**

| Clase | Dónde | Qué es |
|---|---|---|
| `.ds-banner--error` | empleados, inventario, cuentas, medicamentos | la primitiva correcta (`primitives.css:202-243`) |
| `.ds-banner--sm ds-banner--error` | los modales de acciones y de tienda | variante legítima |
| `.ds-server-error` | `LibroComprasView`, `FacturasProveedorView` | segunda primitiva (`primitives.css:1149`), 12 usos |
| `.error-banner` | `facturacion/views/DocumentosView.vue:248-256` | **copia escrita en `<style scoped>`** |
| `.banner-error` | `roles/views/RolesView.vue:159,199` | **cuarta copia, otro nombre** |
| `.banner.error` | 8 SFC de `employees` e `historia-clinica` | quinta variante |

Y **ninguno de los nueve ofrece reintento ni arrastra la traza**, mientras que en el mismo
repositorio `CuentasCobroView.vue:100-114` hace las tres cosas bien (`role="alert"`,
`errorTraceId`, botón «Reintentar»). Ese es el modelo, y está a dos ficheros de distancia.

**Defecto adjunto.** `employees.store.ts:47` usa como respaldo el literal
`'Error al cargar empleados'`, que incumple la regla 1 de `patron-de-mensajes.md` §6: «Nunca
empieza por "Error:"». El tono lo dan el color, el icono y el `role`; el texto se gasta en el
hecho.

**Arreglo** (`front-feature`). Patrón único, copiado literalmente de `CuentasCobroView.vue:98-134`:

```
<div v-if="error" class="ds-banner ds-banner--error" role="alert"> … {{ traceId }} … [Reintentar] </div>
<p v-else-if="isEmpty" class="ds-empty ds-empty--tight"> {{ literal }} </p>
<div v-else> … contenido … </div>
```

El `v-else-if` es lo que cierra el defecto: hoy son dos `v-if` independientes. Sustituir
`.ds-server-error`, `.error-banner`, `.banner-error` y `.banner.error` por `.ds-banner--error`, y
borrar los bloques `scoped` de `DocumentosView.vue:248-256` y `RolesView.vue:199`. Cambiar el
respaldo de `employees.store.ts:47` a `'No pudimos cargar los empleados'`.

---

### H04 · [grave] 35 cabeceras de columna de dinero alineadas a la izquierda sobre cifras a la derecha — y en 24 el `class="ds-num"` está escrito y es código muerto

**La primitiva existe y está bien**: `.ds-num` (`primitives.css:1333-1336`,
`text-align:right; font-variant-numeric:tabular-nums`) y su refuerzo
`.ds-table th.ds-num` (`:1302-1304`). El problema es que **cuatro bloques `<style scoped>` la
anulan en la cabecera**, **tres tablas no la aplicaron nunca** y **tres tablas más no la usan en
absoluto**.

**Prueba visual, la más clara de todo el informe:**
`_capturas/public/escritorio/dashboard-compras-libro__lleno.png` — el rótulo `BASE` está en
x≈621 y su columna de cifras termina en x≈743: **122 px de separación entre la cabecera y lo que
titula**. Igual en `IMPUESTO`, `RETENCIÓN`, `TOTAL`, `PAGADO` y `SALDO`. Se reproduce a 1024 en
`tablet-h/dashboard-compras-libro__lleno.png`, y en
`escritorio/dashboard-compras-facturas__lleno.png` (`TOTAL` en 785, cifras terminando en 932) y
`escritorio/dashboard-suscripcion-cobros__lleno.png` (`PENDIENTE` en 1049, cifras en 1195).

**Criterio.** Rúbrica §3.1 (test de intención: el desplazamiento no equivale a ningún
`--space-*`, no se repite igual entre hermanos y no tiene causa declarada → descuadre) y §3.2b
(ley de proximidad: la cabecera queda más cerca de la columna vecina que de la suya).
Heurística 4 de Nielsen. En una tabla contable la cabecera es lo único que dice qué es cada
cifra; separarla 122 px de su columna obliga a contar columnas para leer un importe.

**La causa raíz es la trampa de especificidad de `AGENTS.md:103-122`,** y el repositorio la tiene
documentada como si fuera el resultado buscado:

| Regla que gana | Peso | Fichero |
|---|---|---|
| `.grid-table :deep(th) { text-align: left }` | (0,2,1) | `compras/components/ComprasTable.vue:36-37` |
| `.grid-table th { text-align: left }` | (0,2,1) | `compras/views/LibroComprasView.vue:181-182` |
| `.movs :deep(th) { text-align: left }` | (0,2,1) | `caja/components/CashTable.vue:41-47` |
| `.arqueo th { text-align: left }` | (0,2,1) | `caja/components/CloseCashModal.vue:245-246` |
| `.ds-num { text-align: right }` | **(0,1,0)** | `primitives.css:1333` |

`CashTable.vue:56-59` lo deja escrito: *«`.movs :deep(th)` (0,2,1) le sigue ganando en los
encabezados, **que por eso siguen alineados a la izquierda**»*. Y `ComprasTable.vue:15-19` dice lo
mismo con otras palabras. **Las dos refactorizaciones a primitivas fueron fieles: conservaron
intacto un defecto anterior.** No es un error de quien las hizo; es que nadie miró la columna de
dinero al hacerlo.

**Censo completo — 35 cabeceras, 14 SFC:**

| Situación | Cabeceras | Dónde |
|---|---|---|
| `ds-num` escrito y **anulado** por `ComprasTable.vue:36-37` | 10 | `ProveedoresView.vue:115` · `OrdenesRecepcionesView.vue:237,306` · `FacturasProveedorView.vue:194,195,268-273` |
| `ds-num` escrito y anulado por `LibroComprasView.vue:181-182` | 6 | `LibroComprasView.vue:99-104` |
| `ds-num` escrito y anulado por `CashTable.vue:41-47` | 5 | `CajaHistoryPanel.vue:121-123` · `CajaOpenSessionsPanel.vue:45` · `CashMovementsTable.vue:32` |
| `ds-num` escrito y anulado por `CloseCashModal.vue:245-246` | 3 | `CloseCashModal.vue:141-143` (**Esperado · Contado · Diferencia** — el arqueo) |
| **Nunca se aplicó al `<th>`** | 6 | `CuentasCobroView.vue:125,126` · `CotizacionesView.vue:134` · `PurchasesModal.vue:90-92` |
| **Cero `ds-num` en todo el fichero** | 5 | `tienda/views/ImpuestosView.vue:157-161,181,233` (`Porcentaje`, `IVA contenido en $100.000`) |

`PurchasesModal.vue:138` incluso lo comenta: «Ningún `<th>` lleva `.num` aquí».

**Y dos tablas donde no se alinean ni las celdas:**

- `tienda/components/InventoryProductsTable.vue` tiene **cero** ocurrencias de `ds-num`, así que
  `Precio venta`, `Stock` y `Mínimo` van a la izquierda y sin `tabular-nums`. Se ve en
  `escritorio/dashboard-tienda-inventario__lleno.png`: los `$ 0` de `PRECIO VENTA` comparten
  borde **izquierdo** en x=760.
- `tienda/views/ImpuestosView.vue`: igual, ver
  `escritorio/dashboard-tienda-impuestos__lleno.png` — `IVA CONTENIDO EN $100.000` y su columna,
  las dos a la izquierda.

**Arreglo** (`front-feature`; `primitives.css` **no se toca**):

1. Cuatro excepciones por nombre, con el mismo patrón que ya usa `primitives.css:1291-1323`:
   `.grid-table :deep(th.ds-num) { text-align: right }` en `ComprasTable.vue`,
   `.grid-table th.ds-num` en `LibroComprasView.vue`,
   `.movs :deep(th.ds-num)` en `CashTable.vue`,
   `.arqueo th.ds-num` en `CloseCashModal.vue`. **Cuatro líneas**, peso (0,2,2) > (0,2,1).
2. `class="ds-num"` en los 6 `<th>` que no lo tienen (`CuentasCobroView.vue:125,126`;
   `CotizacionesView.vue:134`; `PurchasesModal.vue:90-92`).
3. `class="ds-num"` en `<th>` y `<td>` de `Precio venta`, `Stock` y `Mínimo`
   (`InventoryProductsTable.vue:117,119,120`) y de `Porcentaje` e `IVA contenido…`
   (`ImpuestosView.vue:159,160,181,233`).
4. Retirar el `style="text-align: right; font-variant-numeric: tabular-nums"` **en línea** de
   `DocumentosView.vue:130,161` y sustituirlo por `class="ds-num"`: es un estilo en línea (1,0,0)
   puesto para esquivar este mismo problema, y una vez arreglado sobra.

**Verificación posterior** (`front-e2e-visual`): un `toMatchAriaSnapshot` no lo ve; un caso que
para cada tabla de dinero compare
`getComputedStyle(th).textAlign === getComputedStyle(td).textAlign`, sí, y es barato.

---

### H05 · [grave] Cinco componentes se saltan `format.ts`: la pantalla de caja imprime `Invalid Date` y `NaN d`, y el detalle de una cuenta enseña dos formatos de fecha uno al lado del otro

`src/features/caja/composables/useCaja.ts:44-46,49-63` ·
`src/features/cuentas/components/AccountChargesColumn.vue:79` ·
`src/features/cuentas/components/AccountPaymentsColumn.vue:29` ·
`src/features/cuentas/components/BillingChargeColumns.vue:115` ·
`src/features/cuentas/components/ConsultaBillingModal.vue:102` ·
`src/features/facturacion/views/DocumentosView.vue:152`

**Prueba A — caja.** `_capturas/public/escritorio/dashboard-caja__lleno.png`: la columna
`APERTURA` dice **`Invalid Date`** en las 25 filas y `DURACIÓN` dice **`NaN d`** en las 25.

**Prueba B — cuentas.** `_capturas/public/escritorio/dashboard-cuentas-accountId__lleno.png`, una
sola pantalla, dos paneles contiguos:

| Panel | Qué imprime | Código |
|---|---|---|
| «Cargos por mascota» (izq.) | `09-02`, `09-03`, `09-04` | `AccountChargesColumn.vue:79` → `c.date.slice(5, 10)` |
| «Abonos» (der.) | `2026-09-02`, `2026-09-03` | `AccountPaymentsColumn.vue:29` → `p.createdDate.slice(0, 10)` |

**Ninguno de los dos es el formato del producto**, que en todas las demás pantallas es
`4 sep 2026` (`formatDateShort`). Y `09-02` es ambiguo por sí solo: sin año y sin mes en letra, no
se sabe si es el 2 de septiembre o el 9 de febrero. En una cuenta a crédito, la fecha del cargo es
lo que decide qué se cobra.

**Criterio.** WCAG 2.2 §3.1.1 Idioma de la página (A) por `Invalid Date` en una interfaz declarada
en español, y §1.3.1 (A) por presentar un fallo de cálculo como si fuera un dato. Heurística 2 y 4
de Nielsen. Y una regla propia, escrita en el módulo que se está saltando.

**Lo que lo convierte en incumplimiento de regla propia.** `src/composables/format.ts:19-20`
declara `const EMPTY = '—'` como «Marcador de "sin dato" del sistema de diseño», y su cabecera
(`:4-11`) dice ser **«el único módulo de formato genérico del front»**, explicando que sustituyó a
tres `format.ts` rivales. `useCaja.ts` es el cuarto; los cuatro `slice()` de `cuentas` son la
quinta vía. Y la propia feature `cuentas` **sí** usa `formatDateShort` en `AccountCard.vue:61` y
`AccountDetail.vue:65`: el módulo correcto está importado dos ficheros más allá.

**Mecanismo del `Invalid Date` / `NaN d`**, sin ambigüedad:

```ts
// useCaja.ts:44-46
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}
```

Con `iso` ausente o mal formado, `toLocaleString` devuelve la cadena `"Invalid Date"`. En
`formatDuration` (`:49-63`) el `NaN` atraviesa `Math.max`, `Math.floor` y las tres comparaciones
sin que ninguna lo detecte (`NaN < 60` es `false`), y sale `"NaN d"`.

**Impacto.** La tabla de cajas abiertas es lo que un encargado mira para saber **quién tiene una
caja abierta y desde cuándo** antes de cerrar el turno. Con `Invalid Date` y `NaN d` en las 25
filas, esa pregunta no tiene respuesta y la pantalla parece rota.

**Arreglo** (`front-feature`):

1. Borrar `formatDateTime` y `formatDuration` de `useCaja.ts` e importar de
   `@/composables/format`. Si el formato largo con hora no existe allí, **añadirlo a `format.ts`**
   con la misma guarda que el resto: `if (!iso) return EMPTY;` + `Number.isNaN(d.getTime())`.
   Para la duración, `if (!Number.isFinite(minutes)) return EMPTY`.
2. Sustituir los cuatro `slice()` de `cuentas` y el `{{ d.issueDate }}` crudo de
   `DocumentosView.vue:152` por `formatDateShort(...)`.
3. **No añadir un sexto módulo.**

---

### H06 · [grave] Dos formatos de dinero conviven en el producto, y el que difiere está en los documentos de la DIAN

`src/composables/money.ts:28-40` (`formatMoney`) frente a
`src/features/facturacion/composables/feFormat.ts:7-9` (`feMoney`) — **26 usos en 7 SFC**

**Prueba.** `escritorio/dashboard-facturacion-documentos__lleno.png` imprime **`$0`** en la
columna `TOTAL`, mientras que `escritorio/dashboard-cuentas-accountId__lleno.png` imprime
**`$ 25.000`** y `escritorio/dashboard-suscripcion-cobros__lleno.png` **`$ 128.450.900`**.
Distinto separador entre el símbolo y la cifra, en el mismo producto y en la misma sesión.

**Criterio.** Heurística 4 de Nielsen. Rúbrica, orden de autoridad escalón 2: la regla interna ya
existe y se está incumpliendo.

**Lo que lo convierte en regla propia incumplida.** `money.ts:4-9`, verbatim: *«**Es la única
fuente del formato.** `features/tienda/composables/pricing.ts` tenía una segunda implementación
completa… Hoy `pricing.ts` **reexporta estas dos**, así que medio repositorio puede seguir
importándolas de allí sin que existan dos verdades sobre cuántos decimales lleva un importe.»*
El proyecto ya cazó y mató una copia; `feFormat.ts` es la que quedó viva, y es la de
**facturación electrónica**, es decir, la de los documentos que tienen que cuadrar con la DIAN.

Las dos divergen además en más que el espacio: `formatMoney` usa `Intl.NumberFormat` con
`style:'currency'` y `currency:'COP'`; `feMoney` concatena `'$'` a mano
(`'$' + Math.round(n||0).toLocaleString('es-CO')`). Con la memoria del proyecto sobre los DTO sin
`currency`, eso importa: los dos asumen pesos, y solo uno lo tiene declarado.

**Consumidores de `feMoney`** (7): `DocumentosView.vue`, `ReportesView.vue`,
`FeDocumentDetail.vue`, `FeDocumentTotals.vue`, `FeEmitModal.vue`, `FeThresholdBanner.vue`,
`enablement/RetencionesModal.vue`.

**Arreglo** (`front-feature`): `feFormat.ts:7-9` pasa a
`export { formatMoney as feMoney } from '@/composables/money'` — un alias, para no tocar los 26
puntos de llamada. Donde el desglose fiscal necesite centavos (base gravable e IVA por tarifa),
usar `formatMoneyExact` (`money.ts:54-56`), que ya existe **exactamente para eso** y lo dice en su
docstring. Retirar el alias en un segundo PR.

---

### H07 · [grave] A 390 px «Cambiar cantidad» y «Quitar» de una línea del plan quedan recortados sin ninguna señal

`src/features/suscripcion/views/MiPlanView.vue:236-257` ·
`src/assets/styles/primitives.css:708-712` (`.ds-flex-row`, sin `flex-wrap`) ·
`src/components/ui/SectionCard.vue:46` (`overflow: hidden`)

**Prueba.** `_capturas/public/movil/dashboard-suscripcion-plan__lleno.png` (390×844): el nombre
del artículo se comprime a cuatro líneas de una palabra, el `1 ×` queda pisado, «Cambiar
cantidad» aparece cortado por el borde de la tarjeta en x=390 y **«Quitar» no se ve en
absoluto**. La misma fila a 760 px (`movil-ancho/…`) y a 1024 (`tablet-h/…`) está perfecta.

**Criterio.** WCAG 2.2 §1.4.10 Reflow (AA) y §2.1.1 (A). Rúbrica §2.3, literal: «En `public-web`:
nada [es limitación aceptada a 390]. Es el viewport de un auxiliar con el móvil en una mano».
Se queda en **grave** y no sube a bloqueante porque la operación se puede completar desde un
dispositivo ancho; si se considera que el auxiliar solo tiene el móvil, sube.

**Mecanismo.** `.ds-flex-row` no declara `flex-wrap`, así que la fila no envuelve; `SectionCard`
declara `overflow: hidden`, así que **la recorta en silencio en vez de desbordar**. Por eso el
censo global da desbordamiento horizontal 0 en todas las rutas: no hay desborde porque hay
recorte, que es peor. Es la avería que R15 describe para las tablas —«sin barra, sin sombra, sin
ninguna señal de que falta algo»— aplicada a una fila de flex, donde `.ds-table-scroll` nunca
llegó.

**Alcance.** Las filas de dinero con `.ds-flex-row` dentro de un `SectionCard` y botones al final:
`MiPlanView.vue:236` (líneas del plan), `CuentasCobroView.vue:155` (pagos) y `:173` (avisos),
`CotizacionDetalleView.vue:128` (líneas de la propuesta), y las líneas de
`CuentaCobroDetalleView`. **5 filas, 4 pantallas, todas de suscripción.**

**Arreglo** (`front-feature`): en `MiPlanView.vue:236` sustituir `class="ds-flex-row ds-flex-row--12"`
por `class="ds-wrap-row"` (`primitives.css:741-745`, que ya declara `flex-wrap: wrap`), o añadir
`class="ds-stack-mobile"` (`primitives.css:694`), que apila por debajo de 760 px y es el patrón
que el propio inventario usa. **No** añadir `flex-wrap` a `.ds-flex-row`: es gemelo TR-02, lo
consumen decenas de vistas y el cambio sería de `front-parity` con réplica en el admin.

---

### H08 · [grave] En los totales de una cotización y de una cuenta de cobro, cada importe queda a ~490 px de su rótulo y pegado al rótulo de al lado — y el TOTAL no se distingue de las líneas

`src/features/suscripcion/views/CotizacionDetalleView.vue:140-161,204-206` ·
`src/features/suscripcion/views/CuentaCobroDetalleView.vue:199-214` ·
`src/assets/styles/primitives.css:642-646` (`.ds-detail-grid`) y `:1318` (`.ds-num`)

**Prueba.** `escritorio/dashboard-suscripcion-cotizaciones-id__lleno.png`, tarjeta «Total».
Coordenadas medidas sobre la captura:

| Elemento | x | Distancia a su rótulo | Distancia al rótulo vecino |
|---|---|---|---|
| `SUBTOTAL` | 313 | — | — |
| `$ 0` (subtotal) | 807 | **494 px** | **48 px** (a `DESCUENTO`, en 855) |
| `DESCUENTO` | 855 | — | — |
| `$ 0` (descuento) | 1349 | **494 px** | — |

**El importe está diez veces más cerca del rótulo equivocado que del suyo.** Se reproduce a
390 px (`movil/dashboard-suscripcion-cotizaciones-id__lleno.png`), donde la rejilla colapsa a una
columna y la separación pasa a ser el ancho entero de la tarjeta.

**Criterio.** Rúbrica §3.2b, ley de proximidad de Gestalt (lawsofux.com/law-of-proximity):
«espacio entre grupos ≥ 1,5 × espacio dentro del grupo». Aquí está **invertida**: 494 px dentro
del par rótulo→importe frente a 48 px hasta el grupo vecino. Severidad **grave** por la fila
«invierte la lectura de un grupo» de §4.

**Mecanismo.** `.ds-num` aporta `text-align: right`, que dentro de una celda de `.ds-detail-grid`
(dos columnas `minmax(0,1fr)`, `primitives.css:644`) empuja el `<dd>` al borde derecho de media
pantalla. En una tabla eso es lo correcto —hay columna que lo recoge—; en una rejilla de detalle
no hay columna, hay hueco.

**Y el segundo defecto, el que importa en un documento de cobro:** el total **no se distingue**.
`CotizacionDetalleView.vue:155` lo marca con `class="ds-num fuerte"`, y `.fuerte` (`:204-206`) es
solo `font-weight: var(--weight-semibold)` — a 14 px, sobre cuatro importes idénticos y sin
separación, no se lee como total. `CuentaCobroDetalleView.vue:209,213` hace lo mismo con
`totalAmount` **y** `balanceAmount`, así que **dos importes distintos comparten el tratamiento de
«el importante»**.

**El contraejemplo está en el mismo producto y es la plantilla del arreglo.**
`escritorio/dashboard-cuentas-accountId__lleno.png`: tres tarjetas —`ACUMULADO`, `ABONADO`,
`SALDO PENDIENTE`— con el saldo destacado en ámbar; y debajo, en «Cargos por mascota», el
subtotal de cada grupo comparte borde derecho (x≈930) con los importes de sus líneas. Es
exactamente lo que la cotización y la cuenta de cobro necesitan.

**Arreglo** (`front-feature`, `src/`):

1. Retirar `ds-num` de los `<dd>` de las dos vistas y sustituir la rejilla del bloque de totales
   por una lista de dos columnas ajustadas al contenido:
   `<dl class="ds-stack ds-stack--8">` con cada par en un
   `<div class="ds-flex-row ds-flex-row--12">`, `<dt class="ds-flex-fill">` y
   `<dd class="ds-num">`. Es el patrón que ya usa `ContratarResumenAside.vue:94-97`
   (`.cra-linea`, `justify-content: space-between`). Cero primitivas nuevas.
2. Separar el total con la regla que `ContratarResumenAside.vue:147-151` ya usa:
   `border-block-start: 1px solid var(--border); padding-block-start: var(--space-12)`.
3. En `CuentaCobroDetalleView`, dejar `fuerte` **solo** en `balanceAmount` y rotularlo
   «Pendiente», que es la pregunta que se hace quien abre el documento.

**Defecto adjunto, mismo fichero, mismo PR.** `CuentaCobroDetalleView.vue:138-141` pinta el
periodo como `{{ formatDateShort(periodStart) }} – {{ formatDateShort(periodEnd) }}`, así que sin
fechas imprime **`— – —`** — se ve en `escritorio/dashboard-suscripcion-cobros-id__lleno.png` y en
`movil/…`. Su propia fila de listado lo hace bien: `DocumentoCobroFila.vue:22-26` colapsa a un
solo `—` cuando faltan las dos. Copiar ese `computed` al detalle.

---

### H09 · [grave] En `/dashboard/contratar`, sin planes cargados el paso vinculante ofrece un botón que dice «Continuar con», un estimado `—` sin explicación y una lista de planes vacía sin mensaje

`src/features/landing/components/PlanesConfigurador.vue:250` (el botón), `:53-55,69,76-78`
(el `—`), `:124-140` (la lista) · consumidores: `contratacion/views/ContratarView.vue:247-255`
y la ruta pública `/planes`

**Prueba.** `escritorio/dashboard-contratar__lleno.png`: bajo la leyenda «¿Qué plan te encaja?»
**no hay nada**; la tarjeta «ESTIMADO» muestra un guion largo suelto seguido de «+ IVA al mes»; y
el botón primario, morado y a tamaño completo, dice literalmente **«Continuar con»**.

**Criterio.** WCAG 2.2 §2.4.6 Encabezados y etiquetas (AA) y §4.1.2 Nombre, función, valor (A):
«Continuar con» no describe ningún propósito. NN/g, estados vacíos: *«Do not default to totally
empty states»*. Y una regla propia: el docstring del propio componente.

**Lo que lo convierte en incumplimiento de regla propia.** `PlanesConfigurador.vue:70-73`, escrito
por quien lo implementó:

> *«Por qué no hay cifra, cuando no la hay. El `—` sin explicación se lee como un fallo de carga;
> esto dice qué falta, en qué ciclo y qué se puede hacer.»*

Y funciona… **solo dentro de la rama en la que hay plan**: `avisoSinPrecio` (`:76-78`) es
`estimado.value ? textoSinPrecio(...) : null`, así que cuando **no hay ningún plan** el aviso es
`null` y queda exactamente el `—` mudo que el comentario dice evitar. El componente se protege del
artículo sin precio y no del catálogo vacío.

**El botón es lo grave.** `:250` es `Continuar con {{ plan?.name }}`, sin respaldo y **sin
`:disabled`**: se puede pulsar, y emite `continuar` con `planCode` sin resolver, que en
`ContratarView.vue:253` llama a `elegirAqui`. Es el paso vinculante de una contratación.

**Alcance.** Dos rutas: `/dashboard/contratar` (rama de recuperación,
`ContratarView.vue:246-255`) y la pública `/planes`. `ContratarView` ya dispone de
`cargandoPlanes` (`usePasoContratar.ts:107`) y **no lo usa** para guardar el bloque.

**Arreglo** (`front-feature`):

1. `:250` → `:disabled="!plan"` y rótulo
   `{{ plan ? \`Continuar con ${plan.name}\` : 'Elige un plan para continuar' }}`.
   Nunca una preposición huérfana en un botón vinculante.
2. `:126` → envolver el `v-for` en `v-if="plans.length"` y añadir la rama vacía con el tono que
   fija `patron-de-mensajes.md` §1 (información o error según haya fallado la petición o no), y
   un botón «Reintentar» enganchado a `recargarPlanes` (`usePasoContratar.ts:107`) — la regla 2 de
   §6 exige el botón si se ofrece reintentar. **El literal exacto lo fija quien mantiene ese
   catálogo; este informe no lo inventa.**
3. `:76` → `avisoSinPrecio` cubre también `!plan.value`, para que el `—` nunca aparezca solo. Es
   lo que el comentario de `:70-73` ya promete.
4. `ContratarView.vue:246` → `v-if="!cargandoPlanes"` sobre `.ct-picker`, con `PawLoader` mientras
   tanto (R06; ya está importado en `:5`).

---

### H10 · [grave] En la pantalla que confirma la compra, el importe total se pinta con el estilo de texto más pequeño y más claro del sistema

`src/features/contratacion/views/ContratarExitoView.vue:96-103` ·
`src/assets/styles/primitives.css:877-880` (`.ds-meta`)

**Prueba.** `escritorio/dashboard-contratar-exito__lleno.png`. La línea de y=433:

> `Mes a mes · $ 128.450.900 + IVA $ 24.405.671 = $ 152.856.571 · Primer cobro previsto: 20 de septiembre, 2026`

Las **tres cifras que definen el contrato** —base, IVA y total— van en una sola línea corrida,
separadas por `·`, debajo de la tabla, en `<p class="ds-meta">`. Y `.ds-meta`
(`primitives.css:877-880`) es `font-size: var(--text-xs)` sobre `color: var(--warm-500)`: el
estilo que el sistema reserva para **metadatos auxiliares**. El `<strong>` de `:99` sube el peso
del total, no su tamaño ni su color.

Mientras tanto, el `<h1>` «Listo. Reservaste 5 módulos.» va a `--text-display` (36 px).

**Criterio.** Rúbrica §3.4b, comprobación ejecutable: localiza los tres tamaños mayores y
pregunta si el mayor identifica **el sujeto de la tarea**. El sujeto de esta pantalla es *cuánto
me van a cobrar y cuándo*, y es lo más pequeño que hay. **Jerarquía invertida**, y no como caso
sistémico de `PageHeader` sino en el punto exacto en que el usuario acaba de comprometer dinero.
Heurística 1 de Nielsen.

**Impacto.** Es la única pantalla del embudo donde aparece el total **con IVA incluido**: en el
paso anterior el aside dice «Hoy pagas $ 0» (`ContratarResumenAside.vue:103`), correctamente,
porque hay prueba gratuita. Aquí es donde se dice lo que se cobrará después, y se dice en 12 px
grises. Quien no lo lea se entera con el primer cargo.

**Adjunto de contraste, no medido aquí:** `--warm-500` es el token que **public-web #114** marca a
4,17:1, por debajo del 4,5:1 de §1.4.3 (AA). No se re-mide en esta pasada; se cita. Al arreglar la
jerarquía, el problema de contraste de esa línea desaparece de paso.

**Arreglo** (`front-feature`): sacar las tres cifras del párrafo de metadatos y darles la forma
que ya existe y funciona dos pantallas antes —`ContratarResumenAside.vue:93-107`—: un bloque con
filete superior, `Subtotal` / `IVA` / **`Total`** en filas `ds-flex-row` con el importe en
`ds-num`, el total en `--text-base` como mínimo y `color: var(--warm-900)`. La fecha del primer
cobro se queda como línea aparte, que es lo que es. **No hacen falta primitivas nuevas.**

---

### H11 · [menor] Valores crudos que se escapan a la pantalla: enums en inglés, marcadores de «sin dato» de cuatro clases distintas y unidades sin cifra

Un solo defecto de fondo —**no hay guarda entre el dato del servidor y el texto de la
pantalla**— con seis formas, todas verificadas en captura.

| Qué se ve | Dónde | Código |
|---|---|---|
| `ACTIVE` / `PENDING` en la columna `ESTADO` | `escritorio/dashboard-suscripcion-cotizaciones__lleno.png` (20 filas) y `…-compras-libro__lleno.png` | `cotizacionesText.ts:38-41` → `?? status.toUpperCase()`; ídem `:141-143` y `CupoCard.vue:44` |
| Píldora **ámbar** cuyo contenido es solo `—` | `escritorio/dashboard-compras-facturas__lleno.png` (11 de 14 filas) | `FacturasProveedorView`, pill sin condicionar |
| Celdas **en blanco** en «Identidad fiscal» (Tipo de documento · Número · Régimen) | `escritorio/dashboard-empresa__lleno.png` | `EmpresaView.vue:148,152,156` sin respaldo, mientras la tarjeta hermana `:181-201` sí escribe `|| '—'` |
| `-` (guion ASCII) en `NÚMERO`, y `TIPO`/`FECHA` vacías | `escritorio/dashboard-facturacion-documentos__lleno.png` | `DocumentosView.vue:148` (`{{prefix}}-{{consecutive}}` sin partes), `:151`, `:152` |
| `%` suelto, sin cifra, en `PORCENTAJE` | `escritorio/dashboard-tienda-impuestos__lleno.png` | `ImpuestosView.vue:181,233` → `{{ t.percentage }}%` |
| `— – —` en el campo `Periodo` | `escritorio/dashboard-suscripcion-cobros-id__lleno.png` | `CuentaCobroDetalleView.vue:138-141` (ver H08) |

**Criterio.** Heurística 2 (correspondencia con el mundo real) y 4 (consistencia) de Nielsen.
WCAG 2.2 §3.1.1 (A) para los enums en inglés. §1.4.1 Uso del color (A) para la píldora ámbar cuyo
contenido es «sin dato»: comunica severidad donde no hay información. Y la regla propia:
`format.ts:19-20` fija `—` como **el** marcador del sistema de diseño, y aquí conviven cuatro
(`—`, `-`, cadena vacía y `— – —`).

**Lo que lo convierte en regla propia incumplida.** `cotizacionesText.ts:37` dice **«El nombre del
enum no se enseña»** y la línea siguiente hace justo eso. `QuoteStatus` declara cinco valores
(`cotizaciones.types.ts:17`) y ninguno es `ACTIVE` ni `PENDING`: el respaldo no es un caso
imposible, **es el que se dispara en cuanto el backend añade un estado**, y entonces el nombre
técnico aterriza en la pantalla del cliente. `suscripcion-tenant-especificacion.md` §7.3.1 ya lo
razonó para la pantalla hermana: *«Un `AWAITING_EXTERNAL` visible en crudo hace que la clínica
llame preguntando por un estado que no le concierne»*.

**Por qué es `menor` y no más.** Ninguna de las seis impide completar una tarea ni falsea un
importe. Pero **la celda en blanco sí es ambigua de una forma que cuesta**: se lee como «todavía
cargando», mientras que `—` se lee como «no hay dato», y está en la tarjeta que dice si la empresa
puede facturar electrónicamente.

**Arreglo** (`front-feature`): respaldo `?? '—'` en las tres funciones de enum (nunca
`toUpperCase()`; si se quiere conservar el valor crudo para soporte, va al `title=`);
`|| '—'` en `EmpresaView.vue:148,152,156` y en `ImpuestosView.vue:181,233`; un `computed` en
`DocumentosView.vue:148` que devuelva `—` si falta cualquiera de las dos partes, y `?? '—'` en
`:151`; y condicionar la píldora de `FacturasProveedorView` a que haya estado conocido.

---

### H12 · [menor] Cuatro fricciones menores del bloque, agrupadas

Ninguna llega a ficha propia; las cuatro son concretas, acotadas y baratas.

**(a) `placeholder="0"` en 17 campos de dinero de 13 formularios.**
`escritorio/dashboard-compras-facturas__dialogo.png`: `Base gravable *` e `Impuesto (IVA/INC) *`
—los dos obligatorios— muestran un `0` gris, y el pie ya dice `Total: $ 0`. Un marcador de
posición que parece un valor plausible en un campo numérico impide distinguir «vacío» de «cero»
(NN/g, *Errors in forms*). El propio repositorio documenta que este error ya ocurrió:
`PurchaseOrderModal.vue:97-99`, verbatim — *«El costo tiene que estar ESCRITO: dejarlo vacío
pasaba por `Number('') === 0` y la orden se guardaba a cero.»* Se corrigió la validación y **el
marcador que lo inducía sigue ahí**. Ficheros: `caja/CashMovementModal.vue`,
`caja/OpenCashModal.vue`, `compras/GoodsReceiptModal.vue` (×2), `compras/SupplierInvoiceModal.vue`
(×3), `compras/SupplierPaymentModal.vue`, `cuentas/GeneralChargeForm.vue`,
`tienda/AdjustModal.vue` (×2), `tienda/ConsumeModal.vue`, `tienda/ProductFormModal.vue`,
`tienda/PromoFormModal.vue`, `tienda/RestockModal.vue`, `tienda/ServiceFormModal.vue`,
`tienda/TransferModal.vue`.
**Arreglo:** retirarlo de los 17. El campo ya lleva `suffix="COP"`
(`SupplierInvoiceModal.vue:184`), que es lo que hacía falta decir. Donde el cero **sea** el valor
por defecto real (`Retención practicada`), escribirlo como **valor** (`v-model` a `'0'`), no como
marcador.

**(b) El interruptor de rol mide 32 × 18 px.**
`roles/components/SwitchToggle.vue:34-36`. La sonda lo detecta 25 veces por pantalla en los seis
viewports (`peoresPorObjetivoPequeno`: `/dashboard/roles`, 150 = 25 × 6). Alto 18 < 24 de
§2.5.8 (AA), y no es *inline*, ni lo determina el agente de usuario, ni hay control equivalente.
**En el listado de roles la excepción de espaciado sí lo salva**: en
`escritorio/dashboard-roles__lleno.png` los interruptores van uno por tarjeta, a ~250 px en
vertical y ~380 en horizontal, así que los círculos de 24 px no se cortan. **Cumple.** Lo que
queda es el reparo de Fitts, y una duda que esta pasada no resuelve: el mismo componente se usa
en el árbol de permisos (`EditPermissionsModal`), donde los interruptores van apilados, y allí la
excepción probablemente **no** aplica. **No comprobado:** no hay captura del diálogo de permisos
en esta tanda.
**Arreglo:** ampliar el área pulsable sin cambiar el dibujo —`padding: 6px` con
`box-sizing: content-box`, o un `::before` que extienda el objetivo a 32 × 30— y **medir el árbol
de permisos** antes de dar el caso por cerrado.

**(c) La acción de cada tarjeta no está anclada al pie, así que en una fila los botones quedan a
alturas distintas.**
`escritorio/dashboard-roles__lleno.png`: en la primera fila, «Editar permisos» está en y=417 en
una tarjeta y en y=378 en la de al lado, porque un título ocupa tres líneas y el otro una. Mismo
patrón en `escritorio/dashboard-contratar-exito__lleno.png`, bloque «Qué hacer ahora»: los tres
botones a y=788, 770 y 788. Las tarjetas **sí** igualan altura; lo que no se alinea es su
contenido. Rúbrica §3.1: un solo elemento fuera del grupo es el defecto.
**Arreglo:** la tarjeta pasa a `display:flex; flex-direction:column` y la fila de acción recibe
`margin-block-start: auto`. Dos declaraciones, en `roles/components/RoleCard.vue` y en el bloque
de `ContratarExitoView`.

**(d) `formatDateLong` escribe la fecha con una coma antes del año.**
`composables/format.ts:116-121` produce `19 de septiembre, 2026`
(`${d.getDate()} de ${monthLong(d)}, ${d.getFullYear()}`). En español la forma es
`19 de septiembre de 2026`; la coma es un calco del inglés. Se ve en
`escritorio/dashboard-contratar-exito__lleno.png` (tabla de fin de prueba y línea del primer
cobro) y en `escritorio/dashboard-suscripcion-cotizaciones-id__lleno.png`.
**Arreglo:** cambiar `, ` por ` de ` en `format.ts:120`. **Un carácter, un fichero, todo el
producto.** Comprobar antes si alguna prueba unitaria fija la cadena con coma.

---

## 3 · Instancias de defectos ya cubiertos — se citan, no consumen ficha

Lo que estas capturas aportan es **dónde se ve y cuánto cuesta**. Ninguno es hallazgo nuevo.

| Defecto | Dueño | Dónde se ve en el bloque de dinero |
|---|---|---|
| Selector de sede ausente en la banda `≤1024` | `uxa-armazon…` **H01** | **Todas** las capturas de `tablet-h`: el raíl de 72 px no lo tiene. Y `Libro de compras` filtra **por sede** (su subtítulo lo dice: «sede seleccionada»), igual que `Cuentas`, `Caja` e `Inventario` («Valor del inventario en Sede E2E de prueba»). En tablet se leen cifras de una sede que no se puede ver ni cambiar. **Esto agrava H01 del otro informe con cuatro casos de dinero.** |
| 17 regiones desplazables sin teclado | `uxa-armazon…` **H06** · issue 4(b) de `reglas-de-interfaz.md:1324` | `LibroComprasView.vue:91`, `ContratarResumenTabla.vue:126,145`, `CuentasCobroView.vue:118`, `CotizacionesView.vue:127`, `ImpuestosView.vue:153,213`, `DocumentosView.vue:123`, `ReportesView.vue:136,162,186,248` — **12 de las 17 son tablas de dinero**. El arreglo de H01 añade una más. |
| Página actual de la paginación solo por color | `uxa-armazon…` **H09** | `escritorio/dashboard-suscripcion-cobros__lleno.png`, `…-cotizaciones__lleno.png` |
| `.ds-icon-btn` a 28×28 | rúbrica §3.5, caso conocido | `escritorio/dashboard-tienda-inventario__lleno.png`: **cuatro** iconos de 28 px por fila más un botón «Entrada», comprimidos en 200 px. Es la fila más densa del producto y la más pulsada con prisa. `24–44 px en banda táctil = menor`; el número de objetivos por fila sí es propio de esta pantalla (Hick + Fitts). |
| Anillo de foco en `<style scoped>` | **public-web #134** | `escritorio/dashboard-contratar__lleno.png` y `…-contratar-exito__lleno.png`: el `<h1>` con `tabindex="-1"` (`ContratarView.vue:186`) aparece rodeado del `outline` **negro por defecto del navegador**, porque `:402-404` declara solo `outline-offset: 2px` y ningún `outline`. Se ve **en la primera pintura** de las dos pantallas del embudo, no solo al tabular. Añádase `SwitchToggle.vue:74-77`, que escribe su propio `outline: 2px solid var(--amatista-450)` en lugar de `var(--ring)`. |
| `--warm-500` / `--text-subtle` por debajo de 4,5:1 | **public-web #114** | La línea de totales de H10 y todos los `.ds-meta` de las tablas de dinero. No re-medido. |
| Borde de campo a 1,23:1 | **public-web #115** | Todos los diálogos de dinero. No re-medido. |
| Ninguna puerta de accesibilidad en CI | **public-web #57** | Prerrequisito de que nada de este informe se deshaga después. |

**Y lo que está bien y no se toca:**

- `escritorio/dashboard-cuentas-accountId__lleno.png` es **la mejor maquetación de dinero del
  producto** y la plantilla de H08: tres KPI con el saldo pendiente destacado, subtotales de grupo
  compartiendo borde derecho con sus líneas, y el banner de solo lectura «Cuenta cerrada · solo
  lectura. No admite nuevos cargos ni abonos.», que cumple `estado-solo-lectura.md`.
- `CuentasCobroView.vue:98-134` es la **implementación de referencia** del par error/vacío. H03 no
  pide inventar nada: pide copiar esto.
- `tablet-h/dashboard-tienda__lleno.png`: el punto de venta bloqueado por caja cerrada resuelve
  bien un estado difícil — icono, causa («Punto de venta bloqueado»), consecuencia («Debes abrir
  tu caja antes de vender»), explicación y **una** acción primaria («Ir a abrir caja»). Dos líneas
  centradas, dentro del límite de la rúbrica §3.3a.
- `DocumentosView.vue:137-146` y `CuentasListaView.vue:189-194`: esqueleto de primera carga con
  `aria-hidden="true"` y el anuncio delegado a un `role="status"` aparte (EST-05). Correcto y bien
  comentado. No sustituir por un velo.
- `CuentasCobroView.vue:86-88`: banner de información **sin** `role` ni `aria-live`, con el porqué
  escrito. Cumple `patron-de-mensajes.md` §4.1 y `suscripcion-tenant-especificacion.md` §7.3.2 al
  pie de la letra.
- `SupplierInvoiceModal` y `PurchaseOrderModal`: `suffix="COP"` en todos los campos de importe.
  Con la memoria del proyecto sobre los DTO sin `currency`, decir la divisa en el formulario es
  exactamente lo correcto.
- `PurchaseOrderModal.vue:105-107`: el error del grupo de líneas solo aparece tras `submitted`.
  Sin validación prematura.
- `escritorio/dashboard-tienda-inventario__lleno.png`: «Valor del inventario … **$ 128.450.900**»
  es la cifra más grande después del `<h1>`. Es la jerarquía correcta y el contraejemplo de H10.

---

## 4 · Triaje de las métricas, y qué NO se ejecutó

**Objetivos por debajo de 24×24.** Las dos peores rutas del producto son de este bloque
(`peoresPorObjetivoPequeno`): `/dashboard/caja` **150** y `/dashboard/roles` **150**, por encima
de `/planes` (138) y `/registro` (132). Triadas:

| Ruta | Qué es realmente | Veredicto |
|---|---|---|
| `/dashboard/caja` 150 | **un solo control**, `button.cash-link` «Ver caja» a **62,9 × 23,5 px**, 25 filas × 6 viewports | **cumple** por la excepción de espaciado: las filas van a ~38,6 px. Pero el alto es **23,5**, medio píxel por debajo del suelo. Subirlo a 24 es una línea de CSS y elimina el falso positivo para siempre |
| `/dashboard/roles` 150 | `button.switch` a **32 × 18 px**, 25 × 6 | ver H12(b): cumple en el listado por espaciado, **sin comprobar** en el árbol de permisos |
| `input` de 1026 × 21 y 1061 × 20,3 (proveedores, empleados) | la caja interna dentro de un envoltorio con relleno | **falso positivo** |
| `a.referencia` en cobros (25×) y cotizaciones (20×) | 13,7–94 × 16 px | **cumple** por espaciado (filas a ~47 px). Se anota como fricción de Fitts, no como incumplimiento |
| `summary.ds-hint` (cupos, cobros) | 1136 × 18 | **cumple**: sin vecino a menos de 24 px |
| `input` 16 × 16 «sin nombre accesible» en `/dashboard/contratar` (×2) | los `<input type="radio">` de `PlanesConfigurador.vue:132`, envueltos en `<label>` (`:127`) | **falso positivo**: el nombre sale del `<label>`; el tamaño está exento por «control del agente de usuario» |

**Centrado, ya con el criterio corregido.** En mi bloque quedan tres patrones:

- `compras/*` y `caja` a 390 px: desviación **−1,4 a −1,7 px** en botones con icono + rótulo.
  Dentro del margen óptico de la rúbrica §3.3b. **No se reporta.**
- `facturacion/habilitacion` a 390 px: **7,5 px** en `button.ds-btn--primary` dentro de
  `div.readycard`. Por encima del margen, pero la pantalla no se auditó en detalle (§5);
  **se deja anotado, sin ficha.**
- `roles` `button.create-btn`: **11 px**, en los 6 viewports y los dos estados (12 casos). La
  sonda atribuye el motivo a `justify-content: center` de `div.action`, pero `PageHeader.vue` no
  declara ninguna regla sobre `.action` y el `justify-content: center` que existe es el de
  `.ds-btn` (`primitives.css:33`), que actúa sobre el contenido del botón, no sobre el botón.
  **Medición no concluyente: no se abre ficha.** Se deja para reproducir con `boundingBox()`.

**Texto cortado.** Con el criterio nuevo, los casos de mi bloque bajan a 8 por ruta en caja y
roles, y lo que queda son elementos con texto propio dentro del selector de sede
(`span.value.ds-truncate`, que **trunca a propósito** con elipsis). **No abrí ninguna ficha por
ellos.** Sí hay un truncado real y sin elipsis anotado en H05/H11: «Empleado E2E …» en
`escritorio/dashboard-cuentas-accountId__lleno.png`, donde la columna del empleado se queda en
~90 px habiendo hueco a su izquierda.

**Ninguna medición ejecutada.** Declarado sin excepciones:

- **No se calculó ni una sola relación de contraste**, ni de texto (§1.4.3) ni de bordes,
  píldoras o iconos (§1.4.11). Las píldoras ámbar, `--amount-neg`, el texto de los marcadores de
  posición, el `ds-hint` del CUFE y la tarjeta de rol «Inactivo» atenuada quedan **sin medir**.
- **No se corrió `axe`, ni Lighthouse, ni `toMatchAriaSnapshot`, ni el dev server, ni Playwright.**
- **No se ejecutó `npm run quality`, `vue-tsc`, `stylelint` ni `css-budget`.** Los arreglos
  propuestos **no se han pasado por las puertas**; ninguno sube los umbrales del trinquete (todos
  quitan CSS o añaden clases y atributos), pero eso está razonado, no verificado.
- **No se midió ningún `boundingBox` real.** Todas las coordenadas de este informe salen de la
  lectura de las capturas PNG y del JSON de métricas.
- **No se reprodujo el `TypeError` de H02** ni se localizó la línea exacta del `.length`.

---

## 5 · Pantallas auditadas y pantallas sin auditar

**Auditadas** (2.ª tanda, 6 viewports; se citan los que sostienen cada ficha):

`/dashboard/suscripcion` → `/plan` · `/cupos` · `/cobros` · `/cobros/:id` · `/medios-pago` ·
`/cotizaciones` · `/cotizaciones/:id` · `/dashboard/contratar` · `/dashboard/contratar/exito` ·
`/dashboard/empresa` · `/dashboard/empleados` · `/dashboard/roles` · `/dashboard/caja` ·
`/dashboard/tienda` (estado bloqueado) · `/dashboard/tienda/inventario` ·
`/dashboard/tienda/impuestos` · `/dashboard/compras/libro` · `/dashboard/compras/facturas` ·
`/dashboard/compras/ordenes` · `/dashboard/compras/proveedores` ·
`/dashboard/cuentas/:accountId` · `/dashboard/facturacion/documentos` · y los diálogos de
**factura de proveedor** y **orden de compra**.

**NO auditadas, y por qué:**

| Ruta / estado | Motivo |
|---|---|
| `/dashboard/cuentas` (`lleno` **y** `vacio`) | **Sin captura válida en ninguna de las dos tandas**, por el `TypeError` de H02. Su **maquetación** queda sin auditar; el fallo que lo impide está reportado como H02, que es lo que hay que arreglar antes de poder mirarla. |
| **El punto de venta propiamente dicho** (`/dashboard/tienda` con caja abierta) | La captura existe y es válida, pero muestra el **estado bloqueado** («Debes abrir tu caja antes de vender»), no la rejilla de venta. Auditar el POS exige sembrar una sesión de caja abierta. **Es el hueco más caro de esta lista** y debería abrir la siguiente pasada, porque es la pantalla de `tablet-h` por excelencia. |
| `/dashboard/tienda/servicios`, `/tienda/promociones` | Capturas válidas disponibles, **sin revisar**: se agotó el cupo de 12 fichas. Son variaciones del mismo listado que `impuestos`, así que H04 y H11 probablemente les apliquen; hay que confirmarlo, no suponerlo. |
| `/dashboard/facturacion/reportes`, `/facturacion/habilitacion` | Capturas válidas, **sin revisar**. `ReportesView` aporta 4 de las 12 tablas de dinero sin teclado del §3, y `habilitacion` tiene el único caso de centrado a 7,5 px que quedó sin resolver (§4). |
| `/dashboard/catalogos/medicamentos` | Captura válida, **sin revisar**. |
| Diálogos de **proveedor** y de **empresa** | Capturas válidas, **sin revisar**. |
| El diálogo de **permisos de rol** (`EditPermissionsModal`) | **No hay captura**: de 276 diálogos intentados solo se abrieron 66. Es donde H12(b) puede convertirse en un incumplimiento firme de §2.5.8, y hoy no se puede decidir. |
| `tablet-v` (768) | **No se dictaminó nada sobre este viewport**, por la salvedad T2 de la rúbrica §2.2: es un estado mixto irreproducible. |
| Color, contraste y foco | Ver §4. Nada medido. |

---

## 6 · Reparto e issues propuestos (redactados, **sin abrir**)

Todo el trabajo de este informe es de **`front-feature`** sobre `src/` de `public-web`. **Nada
toca `tokens.css` ni `primitives.css`**: las primitivas que hacen falta (`.ds-num`,
`.ds-table-scroll`, `.ds-wrap-row`, `.ds-stack-mobile`, `.ds-banner--error`, `.ds-empty`) ya
existen y están medidas. Si un PR toca un gemelo TR-02, se ha equivocado de sitio.

| # | Ficha | Ficheros | Por qué va antes |
|---|---|---|---|
| 1 | **H01** | `InventarioView.vue:399`, `InventoryProductsTable.vue:111,356,375-378` | Bloquea la tarea en el dispositivo del mostrador |
| 2 | **H02** | `ErrorBoundary.vue` nuevo + `BaseTabPanel.vue` + `main.ts` + el `?? []` | Es la única ruta que hoy **no se puede ni fotografiar**, y la barrera protege a las otras 70 |
| 3 | **H03** | 9 vistas, patrón único de `CuentasCobroView.vue:98-134` | Afirmaciones contables falsas; es mecánico |
| 4 | **H04** | 4 bloques `scoped` + 11 `<th>` + `DocumentosView.vue:130,161` | 35 columnas de dinero, ~15 líneas de CSS |
| 5 | **H05** + **H06** | `useCaja.ts:44-63`, 4 `slice()` de `cuentas`, `feFormat.ts:7-9` | Los tres son «volver al módulo único»; mismo revisor |
| 6 | **H09** + **H10** | `PlanesConfigurador.vue`, `ContratarView.vue:246`, `ContratarExitoView.vue:96-103` | Las dos pantallas vinculantes del embudo |
| 7 | **H07** + **H08** + **H11** | suscripción, empresa, tienda, facturación | Maquetación de detalle y guardas de valor |
| 8 | **H12** | 17 `placeholder`, `SwitchToggle.vue:34-36`, `RoleCard`, `format.ts:120` | Barrido, sin riesgo |

### Issue propuesto A — `kefaroTech/vetsoftware-public-web`

> **La barra de acciones del inventario y su tabla se recortan entre 761 y 1300 px: en la tablet
> del mostrador no se puede crear un producto**
>
> `.ds-head` (`src/assets/styles/primitives.css:534`) es un flex sin `flex-wrap`, y
> `.head-actions` (`src/features/tienda/views/InventarioView.vue:399-400`) añade
> `flex-shrink: 0` sobre seis controles con `.ds-btn--nowrap`. El único punto de corte que lo
> reordena es `@media (width <= 760px)` (`:430`). Entre 761 y ~1300 px el grupo desborda el
> contenedor y **se recorta sin desbordar el documento**, así que ningún censo de scroll lo
> detecta. A 1024 px —el único punto de corte que el sistema declara,
> `viewport.store.ts:11`, y el ancho del mostrador— **`+ Nuevo producto` no se ve** y
> `Categorías` está cortado; a 1280 px del botón primario queda una franja de 14 px.
> La tabla tiene el mismo problema por otra vía:
> `src/features/tienda/components/InventoryProductsTable.vue:375-378` declara `overflow-x: auto`
> **dentro** de `@media (width <= 760px)` (`:356`), y la vista no la envuelve en
> `.ds-table-scroll`, así que por encima de 760 px las nueve columnas no tienen contenedor de
> desplazamiento.
> Evidencia: `_capturas/public/tablet-h/dashboard-tienda-inventario__lleno.png` y
> `.../portatil/...`; a 760 px (`movil-ancho`) funciona bien.
> WCAG 2.2 §1.4.10 Reflow (AA), §2.1.1 (A); R15 de `docs/ux/reglas-de-interfaz.md`.
> Para cerrarlo: `flex-wrap: wrap` en `.head-actions`; envolver la tabla en `.ds-table-scroll`
> fuera de todo `@media` y borrar `:375-378`; y que ese `.ds-table-scroll` nazca con
> `tabindex="0"`, `role="region"` y nombre accesible, según el punto 4(b) de
> `reglas-de-interfaz.md:1324`.
> **No comprobado:** si otras vistas de `tienda` y `compras` repiten el patrón de la barra; no se
> hizo el censo de `.ds-head` con `flex-shrink: 0`.

### Issue propuesto B — `kefaroTech/vetsoftware-public-web`

> **`/dashboard/cuentas` no se puede pintar, y el tenant no tiene ninguna barrera de error**
>
> La ruta es **una de las tres del producto que no se han podido capturar en dos pasadas
> consecutivas del arnés de auditoría**, con dos árboles distintos. Motivo:
> `TypeError: Cannot read properties of undefined (reading 'length')` en el render de
> `<BaseTabPanel name="cuentas"> → <CuentasListaView>`, sobre un campo anidado. En pantalla
> quedan la cabecera, las pestañas `Activas 25` / `Cerradas 0`, el banner «25 cuentas abiertas ·
> saldo acumulado pendiente $ 128.450.900» y el buscador, con el cuerpo **completamente vacío**:
> ni tarjetas, ni esqueleto, ni estado vacío, ni banner de error. La pantalla se contradice a sí
> misma y no ofrece ninguna salida.
> Las cuatro ramas de `CuentasListaView.vue:189,196,203,216` son exhaustivas solo si nada
> revienta, y `grep -rn 'onErrorCaptured\|errorHandler' src/` devuelve **cero**: sin barrera,
> cualquier campo inesperado del backend en cualquier fila de cualquier listado del tenant
> blanquea esa región en silencio.
> NN/g, estados vacíos; heurísticas 1 y 9 de Nielsen; WCAG 2.2 §4.1.3 (AA); R05.
> Para cerrarlo: (1) un `ErrorBoundary.vue` con `onErrorCaptured` alrededor del `<slot />` de
> `BaseTabPanel` y del cuerpo de `ds-page`, que pinte `.ds-banner--error` con `role="alert"` y
> botón de reintento, más `app.config.errorHandler` en `main.ts`; (2) el `?? []` en la lectura de
> `.length` que falla.
> **No comprobado:** la línea exacta del `.length`. Hay que reproducirlo con `enrutarApi` de
> `e2e/helpers/sesion.ts`; es el primer paso.

### Issue propuesto C — `kefaroTech/vetsoftware-public-web`

> **Nueve vistas pintan el error y el estado vacío a la vez, y el mismo banner de error está
> escrito de seis formas**
>
> (a) `EmpleadosView.vue:330`, `LibroComprasView.vue:89`, `FacturasProveedorView.vue:176`,
> `DocumentosView.vue:121`, `InventarioView.vue:255`, `CuentasListaView.vue:148`,
> `CuentasDetalleView.vue:91` y `MedicamentosView.vue:133` declaran el banner con `v-if` y a
> continuación renderizan el contenido **incondicionalmente**, de modo que el estado vacío se
> pinta junto al error. En pantalla: «Error al cargar empleados» **y** «Aún no hay empleados
> registrados en esta empresa»; en compras, «Sin compras en el periodo» y «No hay facturas
> registradas» sobre un periodo cuya petición falló — afirmaciones contables falsas. Ninguno
> lleva `role="alert"`, ninguno ofrece reintento y ninguno arrastra la traza, mientras
> `CuentasCobroView.vue:100-114` hace las tres cosas bien.
> Evidencia: `_capturas/public/escritorio/dashboard-empleados__lleno.png`.
> R05; WCAG 2.2 §3.3.1 (A) y §4.1.3 (AA). **No es public-web #110**: aquél cubre `ListBody`, por
> el que estas nueve vistas no pasan.
> (b) El mismo aviso existe como `.ds-banner--error` (primitiva), `.ds-server-error` (segunda
> primitiva, `primitives.css:1149`, 12 usos), `.error-banner` (`DocumentosView.vue:248-256`,
> `scoped`), `.banner-error` (`RolesView.vue:199`, `scoped`) y `.banner.error` (8 SFC de
> `employees` e `historia-clinica`).
> Para cerrarlo: el patrón `v-if error / v-else-if isEmpty / v-else` de
> `CuentasCobroView.vue:98-134` en las nueve, unificar en `.ds-banner--error`, borrar los dos
> bloques `scoped`, y cambiar el respaldo de `employees.store.ts:47`, que empieza por «Error» en
> contra de la regla 1 de `patron-de-mensajes.md` §6.

### Issue propuesto D — `kefaroTech/vetsoftware-public-web`

> **35 cabeceras de columna de dinero van a la izquierda sobre cifras a la derecha, y en 24 el
> `class="ds-num"` ya está escrito y no hace nada**
>
> `.ds-num` (`src/assets/styles/primitives.css:1333`) pesa (0,1,0). Cuatro bloques
> `<style scoped>` declaran `text-align: left` sobre el `th` con peso (0,2,1) y lo anulan:
> `compras/components/ComprasTable.vue:36-37` (10 cabeceras en 3 vistas, incluida la cartera por
> antigüedad), `compras/views/LibroComprasView.vue:181-182` (6),
> `caja/components/CashTable.vue:41-47` (5) y `caja/components/CloseCashModal.vue:245-246`
> (3 — **Esperado · Contado · Diferencia**, el arqueo). Es la trampa de especificidad de
> `AGENTS.md:103-122`, y los comentarios de `CashTable.vue:56-59` y `ComprasTable.vue:15-19` la
> describen como el resultado esperado: las dos refactorizaciones a primitivas conservaron
> fielmente un defecto anterior.
> Otras 6 cabeceras nunca lo aplicaron (`CuentasCobroView.vue:125,126`,
> `CotizacionesView.vue:134`, `PurchasesModal.vue:90-92`), y dos tablas enteras no usan `.ds-num`
> en ninguna parte —`tienda/components/InventoryProductsTable.vue` (`Precio venta`, `Stock`,
> `Mínimo`) y `tienda/views/ImpuestosView.vue` (`Porcentaje`, `IVA contenido en $100.000`)—, así
> que esas columnas van a la izquierda y sin `tabular-nums`.
> Evidencia: `_capturas/public/escritorio/dashboard-compras-libro__lleno.png` — el rótulo `BASE`
> está a 122 px de su propia columna y a menos de la vecina.
> Ley de proximidad (lawsofux.com); heurística 4 de Nielsen; rúbrica §3.1 y §3.2b.
> Para cerrarlo: cuatro excepciones por nombre en los bloques `scoped`
> (`.grid-table :deep(th.ds-num) { text-align: right }` y equivalentes, peso (0,2,2)), los `<th>`
> y `<td>` que faltan, y retirar el `style="text-align:right"` en línea de
> `DocumentosView.vue:130,161`. **`primitives.css` no se toca.**
> **No comprobado:** si `admin-web` repite el patrón vía `AppTable`. Merece un censo gemelo.

### Issue propuesto E — `kefaroTech/vetsoftware-public-web`

> **`caja`, `cuentas` y `facturacion` se saltan los dos módulos únicos de formato: la pantalla de
> efectivo imprime `Invalid Date` y `NaN d`, y un mismo detalle de cuenta enseña dos formatos de
> fecha**
>
> `src/composables/format.ts:4-11` se declara «el único módulo de formato genérico del front» y
> fija `EMPTY = '—'` (`:19-20`); `src/composables/money.ts:4-9` se declara «la única fuente del
> formato» de dinero y cuenta cómo ya se eliminó una implementación rival. Quedan tres desvíos:
> (a) `features/caja/composables/useCaja.ts:44-46` y `:49-63` reimplementan fecha y duración
> **sin guarda**: con un ISO ausente `toLocaleString` devuelve la cadena `"Invalid Date"`, y el
> `NaN` atraviesa `Math.max`/`Math.floor` hasta salir como `"NaN d"`. Se ve en las 25 filas de
> `_capturas/public/escritorio/dashboard-caja__lleno.png`, columnas `APERTURA` y `DURACIÓN` — la
> tabla con la que se decide quién cierra caja.
> (b) `features/cuentas` corta las fechas con `slice()` en cuatro sitios y produce **dos formatos
> a la vez en la misma pantalla**: `AccountChargesColumn.vue:79` (`slice(5,10)` → `09-02`, sin año
> y ambiguo) en el panel izquierdo y `AccountPaymentsColumn.vue:29` (`slice(0,10)` →
> `2026-09-02`) en el derecho. Ver
> `_capturas/public/escritorio/dashboard-cuentas-accountId__lleno.png`. También
> `BillingChargeColumns.vue:115`, `ConsultaBillingModal.vue:102` y el `{{ d.issueDate }}` crudo de
> `facturacion/views/DocumentosView.vue:152`. La propia feature usa `formatDateShort` en
> `AccountCard.vue:61` y `AccountDetail.vue:65`.
> (c) `features/facturacion/composables/feFormat.ts:7-9` concatena `'$' + toLocaleString`, que
> imprime `$0`, mientras `formatMoney` imprime `$ 0`. 26 usos en 7 SFC, todos de facturación
> electrónica.
> WCAG 2.2 §3.1.1 (A) para el texto en inglés; heurística 4 de Nielsen para los formatos dobles.
> Para cerrarlo: `useCaja` y los cuatro `slice()` importan de `format.ts` (añadiendo allí el
> formato largo con hora si falta, con guarda de `NaN`); `feMoney` pasa a alias de `formatMoney`,
> y el desglose fiscal usa `formatMoneyExact`, que ya existe para eso (`money.ts:54-56`).
> **No comprobado:** si alguna prueba depende hoy del `$` sin espacio o del `09-02`.

---

*Auditoría de maquetación sobre capturas · `public-web` · rama `audit/ux-screens-public` ·
worktree `MainVetSoftware-uxaudit/public-web`. No se commiteó nada, no se abrió ningún issue y no
se tocó `src/`.*
