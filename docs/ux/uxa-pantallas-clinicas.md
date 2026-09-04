# Núcleo clínico del tenant — auditoría de pantalla

Ámbito: `/dashboard` (home), `/dashboard/agenda` y sus diálogos, `/dashboard/consulta/nueva`,
`/dashboard/consulta/nueva/exito`, `/dashboard/consulta/historial` (+ `:ownerId/mascotas/:petId`),
`/dashboard/consulta/vacunacion`, `/dashboard/consulta/hospital`, las siete
`/dashboard/acciones/*`, `/dashboard/laboratorio` y `/dashboard/hospital`.

Árbol: worktree `MainVetSoftware-uxaudit/public-web`, rama `audit/ux-screens-public`, HEAD `32e88ef`.
Capturas: `_capturas/public/<viewport>/<slug>__<estado>.png`, seis viewports.

**Autoridad**, por este orden: `docs/ux/reglas-de-interfaz.md` (R01–R15) →
`docs/ux/uxa-rubrica-maquetacion.md` → WCAG 2.2 → APG → literatura. Prioridad de producto cuando
dos principios chocan, del encargo: **1) que no se pierda trabajo, 2) que se entienda sin leer,
3) que sea bonito.** Todo lo de aquí está ordenado por esa jerarquía, no por estética.

**No duplica** `docs/ux/uxa-armazon-y-primitivas-tenant.md` (armazón, `BaseField`,
`SearchableSelect`, `ModalShell`, `BranchSelector`, `.ds-table-scroll`, loaders del armazón). Donde
un defecto de aquí es una instancia de uno suyo, se cita su ficha (H01–H12) y lo que se aporta es
**dónde se ve y cuánto cuesta**.

---

## 0. Lo que NO hay que buscar en estas pantallas — resultados limpios, verificados

Antes de los hallazgos, para que nadie gaste una pasada en lo que ya está medido:

| Dimensión | Resultado en las 21 rutas de este bloque |
|---|---|
| Desbordamiento horizontal del documento | **0** en los 6 viewports (`uxa-metricas-public.json`, `resumen.porViewport`) |
| Imágenes rotas / deformadas / sin `alt` | **0** |
| Solapamientos | **0** |
| Desalineaciones de 1–6 px | **0** |
| Texto realmente cortado | **0 reales.** Los 17 positivos de este bloque son `span.ds-sr-only` (invisible), `span.value.ds-flex-fill.ds-truncate` (el selector de sede, elipsis **declarada** con `.ds-truncate`) y `section.cta-primary` (el degradado decorativo del home). Ninguno es defecto |
| Objetivos < 24×24 | 3 clases distintas, **2 falsos positivos**: `input` a 924×21,8 y `input.search-input` a 784×22,5 son la caja interna dentro de un envoltorio con relleno; `a.link` 67,7×18 del home es un `<div>` dentro del `RouterLink`, no un objetivo. El único real es `button.back-btn` (**H11**) |
| Centrados «rotos» | Los de este bloque son los pares ±9,5 px de botón con icono + rótulo. Confirmado en captura: es centro óptico correcto (§3.3b de la rúbrica). **No se reporta ninguno** |

**Y una buena noticia que el encargo pedía comprobar expresamente: las siete
`/dashboard/acciones/*` SON consistentes entre sí.** Comparadas línea a línea, las siete repiten
exactamente el mismo esqueleto —`PageHeader(kicker="Acciones clínicas")` → banner de error →
`PatientCascadePicker` → `OwnerAnimalBreadcrumb` + `ListBody` con `empty-text` propio → modal de
detalle— y las siete usan `ds-btn--primary ds-btn--lg ds-btn--elevated` para la acción del
encabezado y `ds-icon-btn` / `ds-icon-btn--danger` para las acciones por fila. **No hay ninguna
divergencia de maquetación entre las gemelas.** Lo que sí comparten es un defecto común, que por
eso se reporta una sola vez (H03, H06, H07).

**Método y salvedades.** `tablet-v` (768) es estado mixto irreproducible: **no se ha abierto ningún
hallazgo que solo se vea ahí**. `portatil` (1280) se ha tratado como estado estrecho. El viewport de
referencia ha sido **`tablet-h` (1024×768)**, el único corte que el proyecto decidió
(`viewport.store.ts:11`), junto con `escritorio`.

**No ejecutado, y se declara:** no se levantó dev server, no se corrió Playwright, no se corrió
`axe`, no se corrió `npm run quality`, no se calculó ningún contraste nuevo. Todo lo de abajo sale
de mirar las capturas y leer el árbol. Las medidas de píxeles vienen de
`uxa-metricas-public.json`, generado por la pasada previa.

**Nota sobre las capturas `__lleno`.** En 14 de las 21 rutas `__vacio` y `__lleno` son **byte a byte
idénticas** (comparación por `md5sum`). Para el home la causa es de producto y es el hallazgo H01;
para el resto es que el arnés no sembró datos en esos endpoints. Consecuencia honesta: **la
maquetación de estas pantallas CON datos no se ha auditado** y queda fuera de este informe. Lo que
sí se ha auditado —y es lo que más valía— es el estado vacío y el estado de error, que en la agenda
y en el tablero de hospitalización quedaron fotografiados de verdad.

---

## 1. Hallazgos

Doce fichas, ordenadas por severidad. Los sistémicos van agrupados con su alcance.

---

### H01 · [bloqueante] El home del tenant lleva datos clínicos INVENTADOS a producción

`src/features/dashboard/views/HomeView.vue:7,11-17` · `src/features/dashboard/data/mock.ts:33-77`

**Captura que lo prueba:** `_capturas/public/tablet-h/dashboard__lleno.png` y
`dashboard__vacio.png` — **byte a byte idénticas**, porque la pantalla no llama a ninguna API.

**Qué se ve.** «Buenos días, **Mariana**.» · «Viernes, 4 de septiembre · **8 consultas previstas
hoy**» · Consultas hoy **8** (+2 vs ayer) · En curso **1** (**Luna · 09:30**) · Pendientes **5**
(Próxima 11:00) · Completadas **2**. Y debajo, «Consultas recientes» con Luna (Felino, 4 años,
Carla Mendoza, *Control vacunación*), Rocco (*Cojera pata trasera*), Mishi (*Esterilización
post-op*) y Toby (*Chequeo geriátrico*). **Nada de eso existe.** Son literales de
`data/mock.ts:33-77`: `mockUser`, `mockDayStats`, `mockRecentConsultations`. `HomeView.vue:7` los
importa y `:11-17` los pinta. No hay `onMounted`, no hay store, no hay `api`.

**Criterio.** NN/g H1 *Visibility of system status* — el estado que se muestra tiene que ser el
estado real del sistema. Y la prioridad 1 del producto: no es solo que no informe, es que **induce
a decidir sobre datos falsos**. Un auxiliar que abre la aplicación y lee «1 en curso, Luna, 09:30»
tiene una consulta abierta que no existe; el que lee «5 pendientes, próxima 11:00» planifica la
mañana sobre una ficción. Es peor que una pantalla vacía.

**Lo que lo convierte en incumplimiento y no en hueco pendiente: el proyecto ya arregló la otra
mitad de este mismo bug y dejó escrito por qué.** `src/components/layout/AppSidebar.vue:97-101`,
verbatim: *«EST-12: la tarjeta de usuario del sidebar salía de `mockUser` —«Mariana Rojas,
Veterinaria, Clínica Norte»— en producción, así que cada empleado veía el nombre de otra persona
sobre su propio botón de cerrar sesión. Ahora sale de la sesión real.»* Se cambió la tarjeta del
raíl y **se dejó intacto el cuerpo de la vista que estaba al lado**: por eso en la captura el raíl
dice correctamente «Empleado prueba» y el titular sigue diciendo «Buenos días, Mariana».

**Impacto.** `/dashboard` es la ruta `''` del layout autenticado (`router/index.ts:203-207`): es la
**primera pantalla de todas las sesiones** y no exige ningún permiso. Todo empleado de todo tenant
la ve al entrar.

**Arreglo (trabajo de `front-feature`, `src/`).** Tres piezas, y la tercera es la que no se puede
saltar:

1. `GreetingHeader`: `firstName` sale de `useAuth().me`, exactamente como `AppSidebar.vue:105-110`
   ya lo hace (`me.value?.name.trim().split(/\s+/)[0]`). No hay componente nuevo.
2. `StatsRow` y `RecentConsultations`: se alimentan del store de citas del día. La consulta ya
   existe — `useAppointments().setRange(hoy, hoy)` + `load()`, y el recuento por estado ya está
   escrito en `features/agenda/components/AppointmentSummary.vue:7-28` (`REQUESTED|CONFIRMED|
   ARRIVED` → pendientes, `IN_PROGRESS` → en curso, `APPT_TERMINAL` → cerradas). Se reutiliza, no
   se reimplementa.
3. **Retirar los tres literales `sub` fabricados de `StatsRow.vue:13,19,25`** —`'+2 vs ayer'`,
   `'Luna · 09:30'`, `'Próxima 11:00'`—, que son texto fijo dentro del componente y sobrevivirían
   a conectar los números. O se calculan, o se borran. Y **borrar
   `src/features/dashboard/data/mock.ts` entero** una vez migrados los tres `interface` que otros
   componentes importan como tipos (`ConsultationStatusPill.vue:3`, `RecentConsultations.vue:4`,
   `StatsRow.vue:3`) a `types/`.

**Verificación posterior.** Una prueba de rejilla, barata y definitiva:
`tests/unit/sin-mocks-en-vistas.spec.ts` que falle si algún `.vue` bajo `src/features/*/views/`
importa de un fichero llamado `mock*`. Y un caso `e2e/` que intercepte las citas de hoy con lista
vacía y afirme que el home muestra `0`, no `8`.

**Issue propuesto — no abierto.** Título: `El home del tenant muestra datos clínicos inventados
(mock.ts) en producción`. Cuerpo: el de esta ficha. Etiquetas sugeridas: `bug`, `a11y-ux`,
`prioridad-alta`. Duplicado buscado: ninguno en el histórico de `public-web` (`EST-12` cubre solo
la tarjeta del raíl).

---

### H02 · [bloqueante] El número de comprobante de la consulta guardada es aleatorio, y «Ver detalle» no lleva al detalle

`src/features/dashboard/views/consulta/nueva/exito/ConsultaGuardada.vue:26-30, 43-45, 32-41, 59, 64`

**Capturas que lo prueban, y prueban lo mismo dos veces:**
`_capturas/public/tablet-h/dashboard-consulta-nueva-exito__lleno.png` → **`· #C-2026-6396`**
`_capturas/public/escritorio/dashboard-consulta-nueva-exito__vacio.png` → **`· #C-2026-3516`**
Misma pantalla, misma navegación, **número distinto**. No es una casualidad de datos: es
`ConsultaGuardada.vue:26-30`, verbatim:

```ts
const code = computed(() => {
  const n = String(Math.floor(Math.random() * 9000) + 1000)
  const y = new Date().getFullYear()
  return `#C-${y}-${n}`
})
```

**Tres defectos en la misma pantalla, y es la pantalla que cierra la escritura clínica más
importante del producto.**

1. **El comprobante es `Math.random()`.** No corresponde a ninguna consulta del backend, no se
   repite entre recargas y no sirve para buscar nada. `docs/ux/patron-de-mensajes.md` §2 dice
   cuándo un éxito merece pantalla propia y no un toast: *«un éxito es banner solo si el usuario
   tiene que llevarse un dato del resultado: número de factura, comprobante, identificador de un
   lote»*. Esta pantalla existe **precisamente** para entregar ese dato, y el dato es falso. Un
   auxiliar que lo anote en el papel del propietario le está dando un número que no existe.

2. **«Ver detalle» no abre el detalle.** `:43-45`: `goDetail()` hace
   `router.push({ name: 'consulta-historial' })` — el **listado** de historia clínica, desde el
   paso 1, sin propietario y sin mascota. No puede hacer otra cosa: `useConsultationSave.ts:232-243`
   construye `successState` con `ownerName`, `petName`, `consultationType`, `date` y
   `prescriptions`, y **nunca mete el id de la consulta creada**. NN/g H2 *Match between system and
   the real world* y H4 *Consistency and standards*: el rótulo promete una cosa y la acción hace
   otra. El veterinario que quiere revisar lo que acaba de escribir tiene que volver a buscar al
   propietario y a la mascota a mano.

3. **Sin estado, la pantalla afirma haber guardado y no dice de quién.** `:35-36` rellena
   `ownerName` y `petName` con `'—'` cuando `history.state` viene vacío (navegación directa,
   marcador, ida y vuelta del navegador). Y `:59` protege el separador con
   `v-if="state.ownerName"`, que **siempre es verdad** porque acaba de defaultearse a `'—'`: de ahí
   el «`— · —`» de la captura, y el `·` huérfano de `:64` cuando `date` y `consultationType`
   también faltan. El texto resultante es «Consulta guardada / — · — / · #C-2026-3516»: una
   afirmación de éxito sobre un paciente desconocido con un identificador inventado.

**Impacto.** Prioridad 1 literal. La única confirmación de que la consulta se escribió sobre el
animal correcto es esta pantalla, y no la da. En una clínica con dos pacientes homónimos, esto es
la diferencia entre revisar y no poder revisar.

**Arreglo (trabajo de `front-feature`, `src/`).**

1. `useConsultationSave.ts:232` — añadir `consultationId: created.id` a `successState`. El id ya
   está en la respuesta del POST; solo hay que no tirarlo.
2. `ConsultaGuardada.vue:26-30` — **borrar el `computed` entero.** El código que se muestra es
   `state.consultationId`, formateado con el mismo patrón que ya usa el resto del producto
   (`Cita #${id}` en `AgendaView.vue:239,248,252`). Si no hay id, no se muestra código: un hueco
   honesto (R14) es correcto; un número inventado no.
3. `ConsultaGuardada.vue:43-45` — `goDetail()` navega a la historia clínica de esa mascota, con
   `params` de `ownerId`/`petId`, que `successState` puede llevar igual de barato. Si por lo que
   sea no se puede resolver, el botón **se oculta** (`v-if="state.consultationId"`) en vez de
   mentir.
4. `ConsultaGuardada.vue:35-36` — no defaultear a `'—'`. Sin `petName`, la línea `.who` no se
   renderiza (`v-if`), y `:64` deja de emitir el `·` huérfano. Si `history.state` viene vacío la
   pantalla no debería mostrarse: redirigir a `consulta-historial` es más honesto que confirmar un
   guardado del que no se sabe nada.

**Verificación posterior.** Un caso `e2e/` que guarde una consulta, capture el id del POST y afirme
que el texto de la pantalla de éxito contiene ese id; y que **recargar la pantalla no cambia el
número**. Ese segundo aserto es el que habría cazado esto.

**Issue propuesto — no abierto.** Título: `La pantalla de consulta guardada inventa el número de
comprobante y «Ver detalle» va al listado`. Etiquetas: `bug`, `prioridad-alta`.

---

### H03 · [bloqueante] Cuando la carga falla, cuatro pantallas clínicas afirman que NO HAY nada — y una invita a duplicar el propietario

**Sistémico.** El patrón correcto ya está escrito en este repo, comentado y en producción; lo que
falta es propagarlo.

**Capturas que lo prueban:**
- `_capturas/public/tablet-h/dashboard-agenda__lleno.png` — banner rojo «No se pudieron cargar las
  citas» **y a la vez** «Citas del día **0** agendadas · Pendientes **0** · En curso **0** ·
  Cerradas **0**» **y a la vez** el vacío «No hay citas para este día» con el botón «Agendar una
  cita». Reproducido igual en los seis viewports (`movil`, `movil-ancho`, `portatil`, `escritorio`).
- `_capturas/public/tablet-h/dashboard-hospital__lleno.png` — banner «No se pudo cargar el tablero»
  **y a la vez** «Sin pacientes internados / Las hospitalizaciones activas (sin fecha de alta)
  aparecen aquí.»

**Dónde está, exactamente:**

| Pantalla | El banner es hermano, no alternativa | El vacío no mira el error |
|---|---|---|
| Agenda | `features/agenda/views/AgendaView.vue:326` | `features/agenda/components/AgendaDayView.vue:48` (`v-if="isEmpty"`) |
| Pacientes internados | `features/hospitalizacion/views/HospitalizacionView.vue:242` | `features/hospitalizacion/components/HospBoard.vue:12` (`v-if="!loading && items.length === 0"`) |
| Bandeja de muestras | `features/laboratorio/views/LaboratorioView.vue:122` | `features/laboratorio/components/LabBoard.vue:56` — **×4 columnas**, «Sin muestras» |
| Las 7 `acciones/*`, paso propietario | **el error ni siquiera se pinta** — ver abajo | `features/acciones/components/PatientCascadePicker.vue:134` |

**El caso de `PatientCascadePicker` es el peor de los cuatro y merece leerse dos veces.**
`:22` destructura `useOwnerSearch(ownerQuery)` quedándose **solo con `results` y `loading`**. El
composable expone un tercer valor —`error`, `useOwnerSearch.ts:59`: `'No se pudo realizar la
búsqueda'`— y el componente **lo tira**. Resultado: si la búsqueda de propietario falla, `:134`
entra por la rama de vacío y la pantalla dice

> Sin resultados para "**González**"  ·  **[+ Crear propietario nuevo]**

El auxiliar concluye que el propietario no está dado de alta y **crea un duplicado**. A partir de
ahí el historial de la mascota queda partido en dos fichas. Eso no es «no se ve un error»: es la
prioridad 1 del encargo, se pierde trabajo, y el sistema colabora activamente ofreciendo el botón.

**Criterio.** R05 (`reglas-de-interfaz.md:354`), regla 1: *el error se pinta antes que el vacío*.
Y NN/g H1 y H9 *Help users recognize, diagnose, and recover from errors*: un estado vacío es una
afirmación («no hay nada»); tras un fallo de red esa afirmación es falsa y el usuario no tiene
forma de distinguirlas.

**Y aquí está lo que hace esto indefendible: el repo ya sabe hacerlo, en tres sitios.**

- `features/acciones/components/ListBody.vue:158-161`, con el comentario **verbatim**:
  *«EST-01: la rama de error va ANTES que la de vacío. Si se invierten, un 500 vuelve a disfrazarse
  de "no hay registros".»* Es el cuerpo de lista de las siete `acciones/*`: la **tabla** está bien;
  lo que está mal es el **portero** que hay antes de la tabla.
- `features/historia-clinica/components/OwnerSearchList.vue:60,63` — pinta `error` primero y guarda
  el vacío con `&& !error`. Es el **mismo buscador de propietario** que `PatientCascadePicker`,
  bien resuelto, en otra carpeta.
- `features/historia-clinica/views/HistoryStep.vue:291-296` — `loading` → `error` → `isEmpty`, en
  ese orden.

**Impacto y alcance.** 10 pantallas: agenda, tablero de hospitalización, bandeja de muestras y las
siete de acciones clínicas. Son las diez donde se consulta o se escribe trabajo clínico.

**Arreglo (trabajo de `front-feature`, `src/`).** El patrón es uno solo y ya está escrito; se
copia:

1. `PatientCascadePicker.vue:22` → `const { results: ownerResults, loading: searching, error: ownerError } = useOwnerSearch(ownerQuery)`.
   `:133-142` → insertar `<div v-else-if="ownerError" class="results ds-stack state error">{{ ownerError }}</div>`
   **antes** de la rama de vacío, y añadir `&& !ownerError` a la condición de `:134`. Copiar
   literalmente la forma de `OwnerSearchList.vue:60,63`.
2. `AgendaDayView.vue` — recibir `:error` como prop desde `AgendaView.vue:368-376` y anteponer la
   rama de error a `:48`; `AgendaView.vue:326` deja de ser hermano del cuerpo.
3. `HospBoard.vue:12` y `LabBoard.vue:56` — recibir `:error` y anteponer la rama, igual.
4. Además, en los cuatro: el banner de error **no lleva reintento**. R05 regla 3 y
   `patron-de-mensajes.md` §6 regla 2: si el mensaje invita a reintentar, hay un botón que
   reintenta. `AgendaView` ya tiene `load()` y `HospitalizacionView` ya tiene su recarga: es un
   `<button class="ds-btn ds-btn--ghost">Reintentar</button>` dentro del banner, no lógica nueva.
   El identificador de traza en el error en línea es **public-web #64**, ya abierto: se cita.

**Verificación posterior.** Un caso `e2e/` por pantalla que intercepte el listado con un 500 y
afirme `expect(page.getByText(/no hay citas|sin pacientes|sin muestras|sin resultados para/i))
.toHaveCount(0)`. Es el aserto **negativo** el que vale: comprobar que el vacío NO aparece.

**Issue propuesto — no abierto.** Título: `El estado vacío se pinta encima del error en agenda,
hospitalización, laboratorio y el selector de paciente de acciones (R05 regla 1)`. Cuerpo: el de
esta ficha, con la cita literal del comentario EST-01 de `ListBody.vue:159`.

---

### H04 · [grave] El vocabulario visual clínico son emojis del sistema operativo: un cuchillo de cocina para «Cirugía» y una radiografía de cráneo humano para «Imagen Dx»

`src/features/agenda/types/appointment.ts:145-153` ·
`src/features/historia-clinica/constants/eventTypes.ts:13-21` ·
`src/features/agenda/components/AgendaDayView.vue:49`

**Captura que lo prueba:** `_capturas/public/tablet-h/dashboard-agenda__dialogo.png`, ampliada 3×
(recorte en `$SCRATCH/uxa-clin-tipos.png`). En el selector «Tipo de cita» del diálogo *Agendar
cita* se lee, de izquierda a derecha:

| Opción | Glifo | Lo que se ve renderizado |
|---|---|---|
| Consulta | `🩺` | estetoscopio — el único que se parece al lenguaje Lucide del producto |
| Control | `📋` | portapapeles naranja |
| Vacunación | `💉` | jeringa azul |
| Desparasitación | `🪱` | **un gusano rojo**, que a 18 px se lee como un garabato |
| Cirugía | `🔪` | **un cuchillo de cocina** con mango morado |
| Imagen Dx | `🩻` | **un recuadro negro con una calavera humana** (la radiografía de Segoe UI Emoji) |
| Laboratorio | `🧪` | tubo de ensayo verde |
| Spa / Estética | `🛁` | bañera |
| Otro | `✳️` | un asterisco sobre **cuadro verde**, que se lee como un «correcto» |

Y en el estado vacío del día, `AgendaDayView.vue:49`: **`📭`, un buzón con la bandera levantada**,
para decir «no hay citas».

**Criterio.**

- **NN/g H2 *Match between system and the real world*** — «follow real-world conventions, making
  information appear in a natural and logical order». Un cuchillo de cocina no es el símbolo de
  cirugía en ningún hospital, y una **calavera humana** no es el símbolo de imagen diagnóstica en
  una clínica **veterinaria**: es una especie equivocada y una connotación de muerte en la pantalla
  donde se agenda la operación de un animal, delante de su dueño.
- **NN/g H4 *Consistency and standards*** — el producto entero dibuja con **Lucide**
  (`lucide-vue-next`), trazo 1,5–1,8, tamaño y color tokenizados. Estos nueve no: son glifos del
  sistema operativo, en color fijo, sin trazo, sin responder a `ds-tone--*` ni al tema. En el mismo
  diálogo conviven las dos cosas —`Plus`, `ChevronLeft`, `Search`, `Check` son Lucide— y en la
  misma fila: la opción marcada «Consulta» y las ocho de al lado no pertenecen al mismo sistema.
- **Y no es reproducible.** El glifo lo elige la fuente de emoji del dispositivo. `🩻` es Unicode
  14.0 (2021): en Windows 10 sin actualizar, en muchos Android corporativos y en cualquier kiosco
  de recepción **no tiene glifo y se pinta como caja vacía**. La identidad visual de la agenda no
  está bajo control del producto.

**Alcance.** Dos catálogos y **once SFC**: `AgendaDayView.vue:93`, `AgendaEventChip.vue:29`,
`AgendaEventDetailModal.vue:38`, `AgendaFilters.vue:67`, `AppointmentCard.vue:54`,
`AppointmentChip.vue:75`, `AppointmentTypeChip.vue:12`, `AppointmentWhenFields.vue:164`, más la
línea de tiempo de historia clínica vía `EVENT_TYPES` (`HistoryStep.vue:274`, `EventCard.vue`,
`EventTypeChip.vue`). Es decir: **toda la agenda y toda la historia clínica del paciente**.

**Nota de accesibilidad, para que el arreglo no la rompa.** Los once usos ya llevan
`aria-hidden="true"` y el rótulo textual al lado. Eso está **bien hecho** y hay que conservarlo: el
lector de pantalla no lee los emojis. El defecto es puramente visual y de identidad, por eso es
`grave` y no `bloqueante`.

**Arreglo (trabajo de `front-feature`, `src/`).** Sustituir el campo `icon: string` por un
componente Lucide en los dos catálogos, con este mapeo —todos existen en `lucide-vue-next` y
ninguno introduce dependencia nueva:

| Clave | Hoy | Propuesto (Lucide) |
|---|---|---|
| `CONSULTATION` | `🩺` | `Stethoscope` |
| `CONTROL` | `📋` | `ClipboardCheck` |
| `VACCINATION` | `💉` | `Syringe` |
| `DEWORMING` | `🪱` | `Bug` |
| `SURGERY` | `🔪` | `Scissors` |
| `IMAGING` | `🩻` | `ScanLine` |
| `LABORATORY` / `LABORATORY_TEST` | `🧪` | `FlaskConical` |
| `GROOMING` / `SPA` | `🛁` | `Bath` |
| `HOSPITALIZATION` | `🏥` | `BedDouble` |
| `PRESCRIPTION` | `💊` | `Pill` |
| `OTHER` | `✳️` | `Asterisk` |
| vacío del día (`AgendaDayView.vue:49`) | `📭` | `CalendarOff` |

El color ya viaja aparte (`color: 'amatista' | 'red' | …` en las mismas líneas) y sigue viajando
igual; el icono se pinta con `:size` y `:stroke-width` como el resto del producto. `Stethoscope`,
`BedDouble` y `FlaskConical` **ya se usan** en el raíl del armazón, así que el resultado es que la
agenda pasa a hablar el mismo idioma que el menú desde el que se llega a ella.

**Verificación posterior.** Una prueba de rejilla junto a `loader-guard.spec.ts`: barrer los `.vue`
y `.ts` de `src/` y fallar ante cualquier literal en el rango de emoji fuera de un comentario.
Censo actual medido sobre los `.ts`/`.vue` de `src/`: **19 literales de emoji que se renderizan**
(9 en `appointment.ts:145-153`, 9 en `eventTypes.ts:13-21`, y el `📭` de `AgendaDayView.vue:49`).
Los otros ~50 aciertos del censo son `⚠️`/`⛔` **dentro de comentarios**, que no se tocan, y
`✓`/`✦`, que son tipografía y no emoji de color.

**Issue propuesto — no abierto.** Título: `Los tipos de cita y de evento clínico se dibujan con
emojis del SO en vez de Lucide (cuchillo para Cirugía, calavera para Imagen Dx)`. Etiquetas:
`a11y-ux`, `design-system`.

---

### H05 · [grave] Cuatro conmutadores del núcleo clínico están hechos a mano sin semántica de radio — y la primitiva que lo hace bien ya existe en el catálogo

`src/features/agenda/components/AppointmentWhenFields.vue:154-166` ·
`src/features/agenda/components/AppointmentSubjectFields.vue:59-75` ·
`src/features/agenda/components/AgendaToolbar.vue:74-99` ·
`src/features/laboratorio/views/LaboratorioView.vue:112-119`

**Capturas:** `_capturas/public/tablet-h/dashboard-agenda__dialogo.png` (los dos primeros),
`dashboard-agenda__lleno.png` (Mes/Semana/Día), `dashboard-laboratorio__lleno.png` (Bandeja
activa / Histórico).

**Qué pasa.** Los cuatro son grupos de `<button type="button">` cuya selección se comunica **solo
por una clase CSS** (`sel`, `active`). Recuento de atributos `aria-*` en cada fichero, medido:
`AppointmentSubjectFields.vue` → **0**. `LaboratorioView.vue` → **0**.
`AppointmentWhenFields.vue` → **1**, y es el `aria-hidden` del emoji. `AgendaToolbar.vue` → **2**,
y son los `aria-label` de las dos flechas, no del conmutador. Ninguno declara `role="radiogroup"`,
`role="radio"`, `aria-checked`, `aria-pressed`, `role="tablist"` ni `aria-selected`.

Además, los cuatro rótulos que los encabezan son `<label>` huérfanos: `AppointmentWhenFields.vue:154`
(«Tipo de cita \*») y `AppointmentSubjectFields.vue:59` («¿A quién es la cita?») son `<label>` sin
`for` y sin envolver nada. Un `<label for>` **tampoco valdría** aquí, y el propio repo lo tiene
documentado en `src/components/ui/SegmentedRadio.vue:27-32`: *«`<label for>` NO nombra a un
`role="radiogroup"`: `for` solo alcanza a elementos etiquetables […] De ahí que el nombre viaje por
`aria-labelledby`»*.

**Criterio.** WCAG 2.2 **§4.1.2 Nombre, función, valor (A)**: para los componentes de interfaz, el
estado tiene que estar **expuesto por programación**. Un lector de pantalla recorre las nueve
opciones de tipo de cita y anuncia nueve veces «botón», sin decir cuál está elegida — y el tipo de
cita es obligatorio (`*`). APG, patrón **Radio Group**: una sola parada de tabulación para el
grupo, flechas para mover, la selección sigue al foco. Y §1.3.1 (A) para el rótulo huérfano.

**Lo que lo convierte en incumplimiento de regla propia y no en hueco: la primitiva ya está escrita,
completa y en uso.** `src/components/ui/SegmentedRadio.vue` implementa el patrón APG entero
—`tabindex` móvil (`:38-46`), la selección que sigue al foco (`:48-58`), `aria-labelledby` contra
el `labelId` que publica `BaseField`, y `describedBy`— y lo tiene comentado con la razón de cada
decisión. **La consumen cinco SFC** (`OwnerForm.vue`, `PetForm.vue`, `HospFormModal.vue`,
`OrderFormModal.vue`, `AdjustModal.vue`). El formulario de cita, que es la escritura más frecuente
del producto, la ignora y reimplementa el control cuatro veces peor.

**Impacto.** El diálogo *Agendar cita* es la puerta de toda la agenda: los dos conmutadores de
dentro deciden **qué tipo de acto clínico se registra** y **si el sujeto es un cliente registrado o
un contacto libre**. Con teclado hay que tabular nueve veces para recorrer los tipos, y quien no ve
la pantalla no puede saber cuál quedó marcado antes de pulsar «Agendar cita».

**Arreglo (trabajo de `front-feature`, `src/`).**

1. `AppointmentSubjectFields.vue:59-75` y `LaboratorioView.vue:112-119` son **sustitución directa**
   por `<SegmentedRadio>` con `:options` de dos entradas y `aria-label` propio. Cero lógica nueva.
2. `AgendaToolbar.vue:74-99` — Mes/Semana/Día es igualmente un `SegmentedRadio` de tres opciones.
   (Si el equipo prefiere leerlo como pestañas, entonces `role="tablist"` + `role="tab"` +
   `aria-selected`; pero el radiogroup es más barato porque la primitiva ya está.)
3. `AppointmentWhenFields.vue:154-166` — nueve opciones con icono no caben en el `options: {value,
   label}` de la primitiva. Dos salidas, por este orden de preferencia:
   **(a)** ampliar `SegmentedRadio` con un `<slot name="option" :option>` que permita pintar el
   icono, y usarla — así el arreglo cae en un solo sitio y llega también a futuros grupos; o
   **(b)** si se prefiere no tocar la primitiva, añadir al `<div class="typegrid">`
   `role="radiogroup"` + `aria-labelledby` contra un `id` puesto en el `<label>` de `:154`, y a
   cada botón `role="radio"` + `:aria-checked="type === key"` + el `tabindex` móvil. La (a) es la
   correcta: la (b) es la cuarta copia del mismo código.

**Verificación posterior.** ARIA snapshot de Playwright (`toMatchAriaSnapshot`) sobre el diálogo
abierto: la instantánea debe contener `radiogroup "Tipo de cita"` con nueve `radio` y exactamente
uno `[checked]`. Es regresión de semántica, no de píxeles, así que no compite con la suite visual.

**Issue propuesto — no abierto.** Título: `El diálogo de cita, la barra de agenda y las pestañas de
laboratorio reimplementan SegmentedRadio sin semántica de radio (§4.1.2 A)`.

---

### H06 · [grave] Seis esperas del núcleo clínico se anuncian con un `<div>` de texto en vez de `PawLoader` — R06

**Sistémico.** `src/features/agenda/views/AgendaView.vue:351` («Cargando citas…») ·
`src/features/acciones/components/ListBody.vue:158` («Cargando…») ·
`src/features/acciones/components/PatientCascadePicker.vue:133` («Buscando…») y `:191`
(«Cargando mascotas…») · `src/features/acciones/components/LabResultAttachments.vue:62`
(«Cargando adjuntos…») · `src/features/agenda/components/OwnerSearchAutocomplete.vue:113`
(«Buscando…»)

**Criterio.** **R06** (`reglas-de-interfaz.md:449`), primera línea, verbatim: *«Cualquier espera se
representa con `PawLoader`.»* No admite excepción por «es solo texto». Y la razón por la que no la
admite está escrita tres párrafos más abajo, también verbatim: *«`PawLoader` […] trae la guarda
dentro […] y además el nombre accesible: `role="status"`, `aria-label` y un `.ds-sr-only` con el
mismo texto. Un spinner propio no trae nada de eso.»*

Un `<div class="state">Cargando…</div>` no es región viva. Quien usa lector de pantalla pulsa
«Buscar», el contenido cambia, y **no se anuncia nada**: WCAG 2.2 **§4.1.3 Mensajes de estado
(AA)**. Y quien ve la pantalla recibe un texto estático que no distingue «está trabajando» de «se
quedó colgado» — sin los 200 ms de retardo y los 300 ms de visible mínimo de
`stores/loader.store.ts:26-27`, que son justamente lo que impide el parpadeo.

**El patrón correcto vuelve a estar en el mismo repo y en la misma familia de pantallas.**
`features/historia-clinica/components/OwnerSearchList.vue:56-58` resuelve **el mismo buscador de
propietario** con `<PawLoader :size="22" :glow="false" :speed="900" />` dentro del propio campo.
`PatientCascadePicker.vue:133` hace lo mismo con un `<div>`.

**Alcance.** Las siete `acciones/*` (por `ListBody` + `PatientCascadePicker`, que son sus dos
piezas comunes), la agenda y el diálogo de cita. Fuera de este bloque hay al menos otras diez
apariciones del mismo patrón (caja, cuentas, contratación), que no son de este informe pero que
convierten esto en deuda de repositorio, no de pantalla.

**Arreglo (trabajo de `front-feature`, `src/`).** Sustituir cada uno por `PawLoader` con la
etiqueta de lo que se espera —que es lo que R06 pide y lo que
`tests/unit/pos-cash-gate.spec.ts` ya exige en su pantalla—:

```vue
<PawLoader :size="22" :glow="false" :speed="900" label="Buscando propietarios" />
```

Tamaños: 22 para el inline dentro de un campo (como `OwnerSearchList.vue:57`), 42 para el bloque de
cuerpo vacío (como `HistoryStep.vue:292`). **No** se tocan los `:placeholder="loading ? 'Cargando…'
: …"` de `AppointmentSubjectFields.vue:101` y `OwnerForm.vue:259,274,293`: un placeholder de
`<select>` no es un indicador de espera y `AuthSelect.vue:89` ya deja escrita esa excepción.

**Verificación posterior.** Extender `tests/unit/loader-guard.spec.ts` —que hoy busca la firma CSS
de «algo gira para siempre»— con una segunda regla: fallar si un `.vue` bajo `src/features/`
contiene un nodo de texto que empiece por `Cargando`/`Buscando` y **no** sea un atributo
`placeholder`. Es el mismo mecanismo de trinquete, con lista de deuda enumerada, que ya funciona.

---

### H07 · [grave] Los dos buscadores de propietario del núcleo clínico no tienen nombre accesible

`src/features/dashboard/views/consulta/nueva/components/OwnerSearchInput.vue:35-45` ·
`src/features/acciones/components/PatientCascadePicker.vue:123-132` y `:180`

**Capturas:** `_capturas/public/tablet-h/dashboard-consulta-nueva__lleno.png` y
`dashboard-acciones-laboratorio__lleno.png` (idéntico en las siete).

**Qué pasa.** Son los dos primeros controles de los dos flujos que abren toda escritura clínica, y
ninguno de los dos tiene nombre:

- `OwnerSearchInput.vue:35-45` — el `<input>` **no tiene `<label>`, ni `id`, ni `aria-label`, ni
  `aria-labelledby`**. Su único nombre es el `placeholder` de `:39`, que desaparece en cuanto se
  teclea la primera letra.
- `PatientCascadePicker.vue:123` — hay un `<label class="hint">Propietario</label>`, pero **sin
  `for` y sin envolver al input**, que está en el `<div class="search">` hermano de `:124-132`. Un
  `<label>` huérfano no nombra nada. Lo mismo en `:180` con «Mascota».

**Criterio.** WCAG 2.2 §1.3.1 (A) y §4.1.2 (A); regla `label` de axe-core, que trata el
`placeholder` como sustituto no válido de la etiqueta. Y el tutorial de formularios del W3C, sobre
por qué: la etiqueta debe seguir estando cuando el campo tiene contenido.

**Lo que lo hace regla propia y no hueco.** El catálogo del tenant tiene `BaseField`, y el propio
`uxa-armazon-y-primitivas-tenant.md` §0 lo verifica: `BaseField.vue:44,99-104` publica `labelId` y
`describedBy` por `FieldContext`, y los primitivos del catálogo lo consumen. Estos dos buscadores
están escritos a mano, fuera del catálogo, y por eso se saltan lo que el catálogo ya resuelve. Es
exactamente el mismo diagnóstico que **H01 del informe de armazón** hace con `BranchSelector`.

**Alcance.** 8 pantallas: `/dashboard/consulta/nueva` y las siete `/dashboard/acciones/*`. En las
siete es el **único** control de la pantalla mientras no haya paciente elegido — véase la captura:
no hay nada más con lo que interactuar.

**Arreglo (trabajo de `front-feature`, `src/`).** El mínimo, sin refactor:

1. `OwnerSearchInput.vue:35` — añadir `aria-label="Buscar propietario por nombre, documento o
   email"` al `<input>`. (Lo correcto de verdad es envolverlo en `BaseField label="Propietario"`,
   pero eso mueve maquetación; el `aria-label` cierra el criterio hoy.)
2. `PatientCascadePicker.vue:123-132` y `:180` — dar `id` al `<input>` y `for` al `<label>`. Son
   dos atributos y no mueven un píxel.

**Verificación posterior.** Copiar el `describe` de `<label for>` de `e2e/a11y-publicas.spec.ts`
apuntando a `/dashboard/acciones/laboratorio` y `/dashboard/consulta/nueva`, con
`getByRole('textbox', { name: /propietario/i })`. Hoy `e2e/a11y-publicas.spec.ts` **no cubre ni una
sola pantalla autenticada** (lo constata el informe de armazón, §0): estas dos serían las primeras.

---

### H08 · [menor] El buscador de `consulta/nueva` afirma «0 resultados» antes de que nadie busque, y el contador le come el campo hasta 112 px

`src/features/dashboard/views/consulta/nueva/components/OwnerSearchInput.vue:46-49, 78-97`

**Capturas:** `_capturas/public/tablet-h/dashboard-consulta-nueva__lleno.png` (el «0 resultados» a
la derecha del campo vacío) y `_capturas/public/movil/dashboard-consulta-nueva__lleno.png` (el
campo reducido a «`Buscar propietar`»).

**Dos defectos en el mismo componente.**

1. `:49`, verbatim: `<span v-else class="count muted">0 resultados</span>`. La rama `v-else` es
   «no se ha escrito nada», y el texto que muestra es una **afirmación sobre una búsqueda que no
   ha ocurrido**. En la captura convive con el estado vacío de justo debajo, que dice lo contrario
   y lo dice bien: «Empieza buscando un propietario». `docs/ux/patron-de-busqueda-en-listado.md`
   §4 fija exactamente esta distinción —«sin resultados de búsqueda» ≠ «no hay registros»— y aquí
   hay un tercer estado, «todavía no se ha buscado», que se está pintando como el segundo.
2. `:96` `.count { flex-shrink: 0 }` frente a `:79,86` `input { flex: 1; min-width: 0 }`. El
   contador se reserva su ancho y el campo cede todo. Medido en `uxa-metricas-public.json`: el
   `input` mide **112,5 px de ancho a 390 px** de viewport, contra 709 px en `tablet-h`. El
   placeholder se corta a media palabra y el auxiliar no ve lo que teclea. A cambio, el espacio se
   lo lleva una etiqueta que en ese momento es falsa.

**Criterio.** NN/g H1 (el estado mostrado debe ser el real) y la ley de proximidad: el contador
está pegado al campo, así que se lee como propiedad del campo. `public-web` es viewport de primera
clase a 390 px (rúbrica §2.3: *«En `public-web` no hay tal exención»*), así que el estrechamiento
cuenta.

**Arreglo (trabajo de `front-feature`, `src/`).**

1. Borrar la rama `v-else` de `:49`. Sin consulta, no hay contador. El estado vacío de
   `OwnerSearchPanel` ya dice qué hacer.
2. `:93-97` — añadir `white-space: nowrap` y mover el contador **debajo** del campo por
   `@media (width <= 640px)`, o suprimirlo en esa banda. El dato que no cabe es el contador, no lo
   que el usuario está escribiendo.

**Nota, no hallazgo.** `:68-72` escribe `box-shadow: var(--ring)` dentro del `<style scoped>` y
enciende el anillo con una clase de JS (`focused || modelValue.length > 0`), no con
`:focus-visible` — de modo que el anillo queda encendido con texto y sin foco. Es una instancia de
**public-web #134** (anillos de foco escritos dentro de un `<style scoped>`): se cita, no se
reabre.

---

### H09 · [menor] Dos rutas del menú «Consulta» son marcadores de posición en producción, y duplican el nombre de pantallas que sí existen

`src/features/dashboard/views/consulta/HospitalView.vue:1-8` ·
`src/features/dashboard/views/consulta/VacunacionView.vue` · `src/router/index.ts:286-295`

**Capturas:** `_capturas/public/tablet-h/dashboard-consulta-hospital__lleno.png` y
`dashboard-consulta-vacunacion__lleno.png`. La pantalla entera es una tarjeta de 130 px de alto en
un viewport de 768: **83 % de superficie vacía**, sin `PageHeader`, sin migas, sin acción.

- `/dashboard/consulta/hospital` → «Hospitalización · Pacientes hospitalizados y notas de
  enfermería — **próximamente**.»
- `/dashboard/consulta/vacunacion` → «Plan de vacunación · Calendario y seguimiento de vacunación
  — **próximamente**.»

`HospitalView.vue:1` es literalmente `<script setup lang="ts"></script>`: no hay nada detrás.

**Por qué importa más de lo que parece.** Las dos duplican el nombre de pantallas reales y
terminadas del mismo producto: `/dashboard/hospital` («Pacientes internados», con tablero, plan de
tratamiento y evolución) y `/dashboard/acciones/vacunacion` («Vacunaciones»). El usuario que busca
hospitalización tiene dos rutas con ese nombre y una de las dos es un cartel. **Hoy no cuelgan del
raíl** —verificado: `AppSidebar.vue` no las enlaza— pero siguen siendo rutas nombradas, indexables,
marcables y alcanzables por URL, y `router/index.ts:286-295` las registra sin `meta.permission`.

**Criterio.** NN/g H4 *Consistency and standards* (dos nombres iguales para dos cosas distintas) y
R14 «hueco honesto»: un hueco declarado está bien; **un hueco con el mismo nombre que una
funcionalidad terminada, no**.

**Arreglo (trabajo de `front-feature`, `src/`).** Por orden de preferencia:
**(a)** borrar las dos rutas y los dos SFC, y redirigir `consulta/hospital` → `hospital` y
`consulta/vacunacion` → `acciones/vacunacion` con `redirect:` en el router. Es la opción correcta:
las dos funcionalidades existen, con otro nombre.
**(b)** Si se quiere conservar el marcador, envolverlo en `PageHeader` + `.ds-empty--boxed`
(`primitives.css:491`) y dejar escrita la fecha o el issue, para que sea un hueco declarado y no
una pantalla a medias.

---

### H10 · [menor] El banner de error cambia de sitio entre pantallas gemelas

`src/features/hospitalizacion/views/HospitalizacionView.vue:242` (antes del `PageHeader`) ·
`src/features/agenda/views/AgendaView.vue:326`, `src/features/acciones/views/*ListView.vue`
(después del `PageHeader`)

**Captura:** `_capturas/public/tablet-h/dashboard-hospital__lleno.png` — el banner rojo «No se pudo
cargar el tablero» ocupa la **primera línea de la página**, por encima del kicker
«HOSPITALIZACIÓN» y del título «Pacientes internados». Compárese con
`dashboard-agenda__lleno.png`, donde el mismo tipo de banner va debajo del título.

**Qué pasa.** En `HospitalizacionView.vue` el `v-if="boardError"` está fuera del
`<template v-if="mode === 'board'">` que contiene el `PageHeader`, así que se pinta antes. En las
otras nueve pantallas del bloque el orden es título → banner → contenido.

**Criterio.** NN/g H4 *Consistency and standards*. Y la lectura: un cartel rojo en la primera línea,
antes de que el usuario sepa en qué pantalla está, se lee como un error de la aplicación entera y
no del tablero. Es también la única de las diez donde el error queda **por encima** del `<h1>`, con
lo que el orden del DOM deja de coincidir con la jerarquía de encabezados.

**Arreglo.** `HospitalizacionView.vue:242` — mover la línea del banner **dentro** del
`<template v-if="mode === 'board'">`, justo después del `</PageHeader>`. Un corte y una pega.
(Este movimiento es además el prerrequisito natural de H03 punto 3: una vez dentro, el `HospBoard`
puede recibir el error y decidir entre error y vacío.)

---

### H11 · [menor] El botón de volver del asistente de historia clínica mide 19,5 px de alto, y está duplicado

`src/features/historia-clinica/components/PatientHeader.vue:46-49` y `:113-125` ·
`src/features/historia-clinica/views/PetStep.vue:63-66` y `:105-117`

**Medida:** `uxa-metricas-public.json` — `button.back-btn` a **141,8 × 19,5 px** («Cambiar
propietario») y **127,5 × 19,5 px** («Cambiar mascota»), idénticas en los cinco viewports
utilizables. Captura: `_capturas/public/tablet-h/dashboard-consulta-historial-ownerId-mascotas-petId__lleno.png`.

**Causa.** Los dos bloques CSS son **idénticos carácter a carácter** y los dos declaran
`padding: 0` sobre un texto de `font-size: 13px`. La caja de línea es toda la altura que hay.

**Criterio.** WCAG 2.2 **§2.5.8 Target Size (Minimum), AA** — 24 × 24 px CSS. Aplicada la excepción
de espaciado (círculo de 24 px sin intersección), el control **probablemente se salva**: está solo
en su banda, con 14 px de `margin-bottom` hacia un texto no interactivo. Por eso **no es `grave`**.
Lo que sí incumple sin discusión es la recomendación de producto:
`VetSoftwareFront/docs/ux/armazon-tablet-especificacion.md` §5.6 y sus criterios 21–22 piden
**44 × 44 px en la banda `<= 1024px`**, y `tablet-h` está en esa banda. 19,5 px es menos de la
mitad. Es el botón con el que se corrige haber entrado en la ficha del animal equivocado, pulsado
con una mano y el animal delante.

**Arreglo (trabajo de `front-feature`, `src/`).** En los dos ficheros, misma línea:
`padding: 0` → `padding: var(--space-9) var(--space-8); margin-left: calc(var(--space-8) * -1)`.
El margen negativo mantiene el rótulo alineado con la columna de contenido, así que el resultado
visual es el mismo y el objetivo pasa de 19,5 a ~31 px. **Y hacerlo en los dos a la vez**: son
gemelos de facto y `stylelint vetsoftware/no-duplicate-primitive` (FE-08) no los ve porque ninguno
reescribe una primitiva — reescriben al otro.

---

### H12 · [menor] La línea de tiempo del paciente afirma «Todos · 0» mientras todavía está cargando

`src/features/historia-clinica/views/HistoryStep.vue:250-256, 291-292` ·
`src/features/historia-clinica/components/PatientHeader.vue:51-53`

**Captura:** `_capturas/public/tablet-h/dashboard-consulta-historial-ownerId-mascotas-petId__lleno.png`.
Se ven **dos `PawLoader` a la vez** —el de la cabecera de paciente (`PatientHeader.vue:52`,
hidratando) y el del cuerpo (`HistoryStep.vue:292`)— y entre los dos, ya renderizado y con estilo
de chip activo, **«Todos · 0»**.

**Qué pasa.** El bloque de filtros de `:248-286` se pinta incondicionalmente, así que
`totalEvents` (`:256`) muestra su valor inicial `0` durante toda la espera. La única información
legible de la pantalla mientras carga es un cero que aún no significa nada — y el sitio donde
debería estar la identidad del animal (nombre, especie, edad, propietario) está ocupado por una
huella.

**Criterio.** NN/g H1: mientras el sistema no sabe, no debe afirmar. Es la misma familia que H03 —
un recuento definitivo sobre un estado indeterminado— pero sin fallo de red de por medio, y por
eso es `menor` y no `bloqueante`.

**Nota a favor, que no hay que romper.** El orden de estados de `HistoryStep.vue:291-296` es
`loading` → `error` → `isEmpty`, que es **el correcto** y el que H03 pide llevar a las otras cuatro
pantallas. Aquí solo sobra que los filtros se adelanten al dato.

**Arreglo (trabajo de `front-feature`, `src/`).** Envolver el bloque `<div class="filters">` de
`:248` en `v-if="!loading || events.length > 0"`, la misma condición que ya gobierna el loader de
`:291`. Y valorar unificar las dos esperas: si `PatientHeader` y la línea de tiempo cargan a la
vez, un solo `PawLoader` de cuerpo comunica mejor que dos huellas girando en la misma pantalla.

---

## 2. Lo que está bien en este bloque y no se toca

Para que un arreglo no rompa lo que ya costó:

- **Las siete `acciones/*` son gemelas de verdad** (§0). Cualquier cambio que las toque va a las
  siete o a ninguna.
- **`ListBody.vue:158-161`** ya ordena error antes que vacío, lo tiene comentado con el porqué
  (EST-01) y además ofrece **copiar el identificador de traza** (`:165-171`). Es el patrón de
  referencia de H03.
- **`OwnerSearchList.vue:56-63`** (historia clínica) hace bien las tres cosas a la vez: `PawLoader`
  inline, error antes que vacío, y vacío guardado con `&& !error`. Es el modelo literal de H03 y
  H06.
- **`HistoryStep.vue:291-296`** — orden de estados correcto.
- Los once usos de emoji llevan `aria-hidden="true"` y rótulo textual al lado (H04): al cambiarlos
  por Lucide **hay que conservar el `aria-hidden`**.
- `AgendaToolbar.vue:64-68` etiqueta sus flechas (`aria-label="Siguiente"`).
- `AppointmentNoticeBanner` con el aviso de choque de horario
  (`AppointmentWhenFields.vue:169-178`) dice el veterinario, el número de citas, los rangos
  concretos y la consecuencia («si el hueco sigue ocupado al guardar, la cita se rechazará»). Es el
  mejor mensaje de aviso del bloque y es exactamente lo que `patron-de-mensajes.md` §1 pregunta 2
  describe.
- El diálogo *Agendar cita* declara sus obligatorios con `*` **y** con la leyenda «Los campos con
  \* son obligatorios» en el pie, visible sin desplazar en los seis viewports.
- La cascada de `PatientCascadePicker` ofrece crear propietario y mascota **en línea**, sin salir
  del flujo: es la decisión correcta para una app usada con prisa, y es lo que hace que el fallo de
  H03 duela tanto (el atajo bueno se convierte en la trampa).

---

## 3. Qué implementar, en qué orden

Todo es trabajo de **`front-feature`** sobre `src/`. Ninguna ficha toca `tokens.css`,
`primitives.css` ni ningún gemelo TR-02, así que nada de esto entra en el ámbito de `front-parity`.
Ninguna sube un umbral de `css-budget.config.json`: H04 y H05 lo bajan (menos CSS a mano), el resto
es neutro.

| Orden | Ficha | Por qué va ahí | Coste |
|---|---|---|---|
| 1 | **H03** | Se pierde trabajo clínico hoy, y el arreglo es copiar tres ramas `v-else-if` que ya están escritas en el mismo repo | bajo |
| 2 | **H01** | Datos falsos en la primera pantalla de toda sesión; la mitad del arreglo ya está hecha (EST-12) | medio |
| 3 | **H02** | Un comprobante inventado en el cierre de la escritura clínica | bajo |
| 4 | **H07** | Dos atributos y un `aria-label`; cierra dos criterios de nivel A en 8 pantallas | muy bajo |
| 5 | **H06** | Sustitución mecánica por `PawLoader`, seis sitios | bajo |
| 6 | **H05** | La primitiva existe; dos sustituciones directas, una tercera con `slot` | medio |
| 7 | **H04** | Cambio de identidad visual en 11 SFC; conviene línea base visual antes | medio |
| 8 | H08, H10, H11, H12 | Fricción medible, arreglos de una a tres líneas cada uno | muy bajo |
| 9 | H09 | Decisión de producto (borrar o declarar), no de maquetación | bajo |

**Puertas que cerrarían esto y hoy no existen** (ninguna de accesibilidad está en el pipeline —
**public-web #57**, que se cita y no se reabre):

1. `tests/unit/sin-mocks-en-vistas.spec.ts` — ninguna vista importa de `mock*` (H01).
2. Extensión de `tests/unit/loader-guard.spec.ts` con la firma textual de espera (H06).
3. ARIA snapshot del diálogo *Agendar cita* con `radiogroup` + nueve `radio` (H05).
4. Extensión de `tests/unit/loader-guard.spec.ts` o una prueba hermana con el censo de literales de
   emoji en código ejecutable (H04).
5. Casos `e2e/` de «500 en el listado» con aserto **negativo** sobre el texto del estado vacío, uno
   por pantalla de H03.

---

## 4. Trazabilidad

- **Hallazgos nuevos de este informe:** H01, H02, H03, H04, H05, H06, H07, H08, H09, H10, H11, H12.
  Ninguno figura en «Lo que quedó abierto» (`reglas-de-interfaz.md:1282`) ni en «Issues por abrir»
  (`:1324`), y ninguno duplica H01–H12 de `uxa-armazon-y-primitivas-tenant.md`, que audita el
  armazón y el catálogo `Base*`, no las pantallas.
- **Instancias de defectos ya conocidos, citadas y no reabiertas:** el anillo de foco escrito dentro
  de un `<style scoped>` de `OwnerSearchInput.vue:68-72` → **public-web #134** (nota de H08); el
  identificador de traza ausente en los errores en línea de agenda y hospitalización →
  **public-web #64** (punto 4 de H03); la ausencia de toda puerta de accesibilidad en el pipeline →
  **public-web #57** (§3).
- **Issues propuestos, redactados y NO abiertos:** los de H01, H02, H03, H04 y H05. La decisión de
  abrirlos es del humano.
