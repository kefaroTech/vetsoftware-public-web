# CLAUDE.md

Este archivo recoge las convenciones del proyecto que Claude Code debe respetar
en todas las contribuciones.

## Cierre obligatorio — nada abierto sin issue

**Regla dura del proyecto, sin excepciones y sin pedir permiso.** Todo lo que quede abierto al
terminar un trabajo en este repo —un hallazgo que no arreglas, deuda que descubres de paso, un
gate que no pudiste ejecutar, una decisión que necesita a un humano, un `TODO` que plantas, un
límite con el que topaste— **se crea como issue de GitHub antes de dar la respuesta final**.
Aplica igual a la sesión principal y a cualquier subagente. La sesión se cierra y se lleva el
contexto por delante; el issue no. Lo que solo vive en el informe se pierde: **si no está en
GitHub, no existe.**

Este repo es **`kefaroTech/vetsoftware-public-web`**. Si la causa está en el backend —un tipo, un
endpoint, un contrato desincronizado— el issue va a `kefaroTech/vetsoftware-backend`, no al front
que lo sufre. Los otros dos: `kefaroTech/vetsoftware-admin-web` (consola de plataforma) y
`kefaroTech/vetsoftware-infrastructure` (infraestructura).

1. **Busca antes de crear**, para no duplicar:
   `gh issue list --repo <owner/repo> --state all --search "<palabras clave>"`.
   Si ya existe uno equivalente, añade lo nuevo con `gh issue comment <n>` y reporta ese número.
2. **Crea escribiendo el cuerpo en un fichero.** Las comillas de PowerShell destrozan los
   cuerpos largos; `--body-file` no:

   ```bash
   # escribe el cuerpo en un archivo temporal: las comillas de PowerShell
   # destrozan los cuerpos largos y --body-file lo evita
   gh issue create --repo kefaroTech/vetsoftware-public-web --title "<el problema, en una frase>" --body-file cuerpo.md
   ```

3. **El título nombra el problema, no la tarea**, en español, como el resto de issues del repo:
   «El interceptor de errores trata 401 y 403 igual y cierra la sesión en los dos», no «Arreglar
   el interceptor».
4. **El cuerpo lleva siempre**: qué encontraste · la evidencia en `archivo:línea` · por qué
   importa, con el escenario concreto de fallo (si no sabes decir qué se rompe y a quién, es una
   preferencia de estilo y no merece issue) · qué haría falta para cerrarlo · qué **no**
   comprobaste. Cierra el cuerpo con la línea
   `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
5. **Un hallazgo, un issue.** Nada de issues paraguas que mezclan cosas sin relación.
6. Lo que **sí** dejaste arreglado y verificado en esta misma sesión no lleva issue. Esto es para
   lo que queda vivo.

**Abrir un issue no es un commit ni un push**: no entra en la aprobación humana escrita que exige
`AGENTS.md` antes de tocar una rama. Créalo sin preguntar. Después enumera en tu salida cada
issue con su número y su URL.

Caso concreto de este repo: una **deriva TR-02** que detectas y no puedes igualar tú, o un cambio
que obliga a tocar el gemelo del otro front, lleva issue en los **dos** repos, enlazados entre sí
— es la única deuda que se duplica a propósito, porque se paga en dos sitios.

## Stack

- Vue 3 + `<script setup lang="ts">` + Composition API
- Vite + TypeScript estricto (`vue-tsc -b` debe pasar limpio)
- **Pinia** para todo el estado global/compartido (montado en `main.ts` con `createPinia()`)
- Axios para HTTP, montado en `src/services/http/http.client.ts` (`http`)
- Backend Spring Boot vive en `C:\Users\orlan\OneDrive\Documentos\Proyectos\VetSoftware`

## Manejo de estado: SIEMPRE Pinia (regla obligatoria)

**Todo estado global/compartido entre componentes o pantallas DEBE vivir en un
store de Pinia. Está prohibido el patrón híbrido de "estado module-scoped"
(declarar `const x = ref()` / `reactive()` a nivel de módulo dentro de un
composable). No hay excepciones para estado nuevo.**

Convención (espejo en ambos fronts):

1. **Store** en `src/features/<feature>/stores/<x>.store.ts` (o `src/stores/<x>.store.ts`
   para estado transversal). Usar **setup store**:
   ```ts
   export const useXxxStore = defineStore('xxx', () => {
     const items = ref<T[]>([])
     async function fetchAll() {
       /* ... */
     }
     return { items, fetchAll }
   })
   ```
2. **Composable wrapper** `composables/use<Xxx>.ts` que expone el store con
   `storeToRefs(store)` para el estado + las acciones, manteniendo una API
   estable para los componentes. Los accesos siguen siendo `x.items.value` en
   script y auto-unwrap en template:
   ```ts
   export function useXxx() {
     const store = useXxxStore()
     const { items } = storeToRefs(store)
     return { items, fetchAll: store.fetchAll }
   }
   ```
3. Funciones standalone que se usan **fuera de componentes** (interceptores
   axios, guards) llaman al store dentro de la función: `useXxxStore().push()`
   (Pinia ya está activo en runtime tras `app.use(createPinia())`).

**Qué NO es estado global** (y por tanto sigue siendo un composable normal con
`ref()` local, no un store): estado por-instancia de un componente, p.ej.
`useOwnerSearch` (búsqueda con debounce local) o el factory `createCatalog`
(cada componente tiene su propia lista). Usar `ref` local dentro de una función
NO es un patrón híbrido — lo prohibido es el `ref()` module-scoped singleton.

## Recargar SIEMPRE al abrir pantalla/modal (regla obligatoria)

**Cada pantalla y cada modal debe recargar desde el backend TODOS los datos que
la componen cada vez que se abre / se navega a ella. No mostrar caché vieja al
abrir.** (Reportado: la lista de veterinarios en "Nueva cita" no se refrescaba.)

Patrón:

1. **Store**: `load(force = false)` / `fetchAll(force = false)` debe **dedup** las
   llamadas concurrentes (`if (inFlight) return inFlight`) pero **refetchar cuando
   `force === true`** — la caché solo aplica si NO se fuerza. Referencia:
   `agenda/stores/vets.store.ts`.
2. **Views (pantallas)**: en `onMounted` llamar al refresh **forzado** de cada
   servicio/composable que usan (no el fetch cacheado). Los composables `useXxx`
   con `autoload` fuerzan en su `onMounted` (`store.load(true)`).
3. **Modales**: normalmente están **siempre montados** (se controlan con `:open`),
   así que su `onMounted` corre una sola vez. Hay que refrescar en el
   **`watch(() => props.open)`** cuando pasa a `true` (llamar `load(true)` /
   `refresh()` de sus servicios). Referencia: `AppointmentFormModal` refresca
   `useVets().load(true)` al abrir.

## Estructura por feature

Cada feature vive en `src/features/<feature>/` y agrupa por subcarpetas:

- `api/` — clientes axios (`*.api.ts`) + mappers (`*.mapper.ts`)
- `composables/` — lógica reactiva reutilizable (`useXxx.ts`)
- `components/` — componentes Vue específicos del feature
- `views/` — pantallas que se montan en el router
- `data/` — datos mock locales (sólo para desarrollo, se reemplazan por API)

Las primitivas UI compartidas (`BaseInput`, `BaseField`, `BaseSelect`,
`BaseTextarea`, `DateInput`, `SegmentedRadio`, `SectionCard`, `BaseChip`,
`ModalShell`, `SearchableSelect`) viven en
`src/components/ui/` y son la base obligatoria para
formularios y modales.

- **`ModalShell`** — base para modales con header (icono+título+subtítulo+✕),
  body scrolleable, footer con `footer-left` (contador) y `footer-actions`
  (botones). Maneja Escape, click-out, focus inicial. Usalo para cualquier
  modal nuevo en lugar de reinventar el overlay.
- **`SearchableSelect`** — select con búsqueda inline + creación inline (prop
  `onCreate` async que retorna `{value, label, hint?}` y auto-selecciona).
  Es la base obligatoria para dropdowns con catálogos creables (tipos de
  examen/vacuna/imagen/cirugía).
- **`DateInput`** — wrapper de `vue-datepicker-next` con locale `es` y
  formato `dd MMM yyyy`. La API pública (`v-model`, `:invalid`, `placeholder`,
  `min`, `max`) se mantuvo idéntica al DateInput nativo anterior.

## Convención de validación de formularios

**Aplica esto en todo formulario nuevo o modificado.** El patrón de referencia
está en `OwnerForm.vue` y `PetForm.vue` (paso 1 y 2 del wizard de Nueva
Consulta).

### Reglas

1. **Validación reactiva por campo.** Define una función pura `validateXxx(v)`
   por cada campo que retorne `string | null` (mensaje de error o `null`).
   Computa todos los errores en un `computed` `errors`.

2. **Estado `touched` por campo.** Un mapa `reactive<Record<FieldKey, boolean>>`
   que arranca todo en `false`. El error sólo se muestra cuando
   `touched[field] === true`.

3. **Marca touched en `@blur`** del input. Marca todos al ejecutar `validate()`
   (cuando el usuario intenta avanzar).

4. **Feedback visual:** pasa `:invalid="!!err('field')"` al `BaseInput` /
   `BaseSelect` / `DateInput` (borde rojo + animación shake) y
   `:error="err('field')"` al `BaseField` que envuelve (mensaje debajo).

5. **Sanitiza la entrada en vivo** cuando aplique (documento alfanumérico,
   teléfono dígitos+símbolos, chip sólo dígitos, peso/tamaño numérico). Usa
   `computed({ get, set })` con un `sanitize*()` para evitar que el usuario
   escriba caracteres inválidos.

6. **Expón `validate()`** vía `defineExpose({ validate })`. La función debe:
   - marcar todos los campos como `touched`
   - retornar `boolean` (true si todo es válido)

7. **El padre invoca `validate()`** antes de avanzar / guardar. Si retorna
   `false`, muestra un banner de tipo `"Revisa los campos marcados antes de
continuar."` y aborta el envío.

### Validadores comunes

Usar siempre estas reglas para campos equivalentes:

| Campo               | Regla                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Nombre              | requerido, ≥ 2 caracteres                                                  |
| Documento identidad | requerido, alfanumérico (sin espacios ni símbolos), 5–20 caracteres        |
| Teléfono            | requerido, sólo `[+\d\s\-()]`, mínimo 7 dígitos, máximo 15                 |
| Email               | opcional; si está presente debe matchear `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` |
| Selects requeridos  | requerido (`!v` => mensaje específico del campo)                           |
| Número de chip      | opcional; si está presente: 15 dígitos exactos (ISO 11784)                 |
| Peso / Tamaño       | requerido (peso) u opcional (tamaño), número > 0, acepta `,` o `.`         |
| Fecha de nacimiento | requerida, fecha válida y no futura                                        |

### Plantilla mínima de formulario

```ts
type FieldKey = 'name' | 'document' /* ... */
const touched = reactive<Record<FieldKey, boolean>>({ name: false, document: false /* ... */ })

const errors = computed(() => ({
  name: validateName(draft.value.name),
  document: validateDocument(draft.value.document),
  // ...
}))

function err(field: FieldKey): string | undefined {
  return touched[field] && errors.value[field] ? errors.value[field]! : undefined
}
function markTouched(field: FieldKey) {
  touched[field] = true
}

function validate(): boolean {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  return (Object.keys(errors.value) as FieldKey[]).every((k) => !errors.value[k])
}
defineExpose({ validate })
```

## Convención de API + composables de catálogo

Para cualquier dropdown que cargue datos del backend (especies, países, tipos
de consulta, etc.):

1. **Cliente axios** en `api/<recurso>.api.ts` exportando `<recurso>Api` con
   métodos `listAll`, `findById`, etc.
2. **Store de Pinia** en `stores/<recurso>.store.ts` que mantiene la cache
   (lista + promesa in-flight para evitar dobles fetches), expuesto por un
   **composable wrapper** `composables/use<Recurso>.ts` (ver "Manejo de estado:
   SIEMPRE Pinia") que:
   - Expone `options: ComputedRef<{value, label}[]>`, `loading`, `error`,
     `findById(id)`, `refresh()`.
   - Carga en `onMounted` si la cache está vacía.
   - (El factory `createCatalog` es per-componente y no necesita store.)
3. **El componente** muestra el error si existe (banner rojo arriba) y
   `placeholder="Cargando…"` mientras `loading`.

Patrón de referencia: `useGeoCascade.ts` y `useSpecies.ts`.

## UI / Layout

- El layout del wizard usa `ContentWrap` (max-width 1280px, padding 24px
  vertical / 28px horizontal según handoff). En móvil (≤720px) el padding
  baja a 20/16.
- Las tarjetas usan `SectionCard` (padding interno 26/28px, head 18/28px).
- Los formularios usan grids `repeat(N, minmax(0, 1fr))` con `gap: 22px 28px`
  y breakpoints en 980px (3→2 cols) y 640px (→ 1 col).

## Estado del wizard

El borrador de "Nueva Consulta" vive en `useNuevaConsultaDraft.ts` y persiste
en `localStorage` bajo `vetrina:nueva-consulta-draft`. Si cambias la forma de
`OwnerDraft` / `PetDraft` / `ConsultationDraft`, asume que pueden existir
borradores con la forma anterior — añade defaults o migración.

## Comandos

- `npm run dev` — dev server
- `npm run build` — `vue-tsc -b && vite build` (debe pasar en CI)
- `npm run lint` — eslint
- `npm run format` — prettier

Ejecuta `npx vue-tsc -b` después de cualquier cambio significativo en tipos o
componentes.

## Estado actual del catálogo (mayo 2026)

- **Especies**: cargadas desde `GET /api/v1/species` (`useSpecies`).
- **Razas**: cargadas desde `GET /api/v1/species/{specieId}/breeds`
  (`useBreedsBySpecie`). Cascadeadas a la especie seleccionada — al cambiar
  especie se resetea `breedId` y se recarga el catálogo.
- **Colores de animal**: cargados desde `GET /api/v1/species/{specieId}/animal-colors`
  (`useAnimalColorsBySpecie`). Cascadeados a la especie seleccionada igual que las
  razas — al cambiar especie se resetea `colorId` y se recarga el catálogo.
- **Tipos de consulta**: cargados desde `GET /api/v1/consultation-types`
  (`useConsultationTypes`). Catálogo global. **No es una caché**: el
  `inFlight` module-scoped solo deduplica llamadas concurrentes (si dos
  componentes se montan a la vez sale una sola petición) y se anula en
  cuanto la petición resuelve, así que cada `refresh()` vuelve a preguntar
  al servidor — alineado con "Recargar SIEMPRE al abrir pantalla/modal".
  Usado en el paso 3 del wizard (`PasoConsulta`) — al cambiar el `typeId` el
  watch hidrata `state.consultationType` con `{id, name}` resolviendo contra
  la lista cargada (también re-resuelve cuando la lista llega tarde).
- **Catálogos creables del paso 3** (consumidos por modales de acciones
  rápidas): `useLaboratoryTestTypes` (`/laboratory-test-types`), `useDiagnosticImagingTypes`
  (`/diagnostic-imaging-types/available`), `useVaccinationTypes` (`/vaccination-types/available`),
  `useSurgeryTypes` (`/surgery-types/available`). Todos generados por el factory
  `createCatalog<T>` en `composables/useCatalog.ts` — mismo dedup module-scoped
  que `useConsultationTypes`, tampoco es caché (ver el comentario de
  `createCatalog`, que corrige explícitamente una versión anterior de sí
  mismo que sí lo llamaba caché), y soporta `create({name, description})` que
  pushea al `list` local y permite la auto-selección desde `SearchableSelect`.
- **Países / Estados / Ciudades**: cargados desde el backend (`useGeoCascade`).

## Modales de acciones rápidas (paso 3)

Los 7 modales viven en `src/features/dashboard/views/consulta/nueva/modals/`:
`RecetaModal`, `LabTestModal`, `ImagingModal`, `VaccinationModal`,
`HospitalizationModal`, `DewormingModal`, `SurgeryModal`. Cada uno:

- Usa `ModalShell` + `BaseField` + primitivos del wizard (`BaseInput`,
  `BaseSelect`, `BaseTextarea`, `DateInput`, `SearchableSelect`).
- Recibe `open: boolean` + `pet: Animal | null` y emite `save` (con el
  item construido alineado a tipos de `domain.ts`) y `close`.
- Validación reactiva con `submitted` flag — se valida al hacer click en
  Guardar; antes no se muestran errores. Patrón distinto al de
  `OwnerForm`/`PetForm` (touched-on-blur) pero más natural en modales.
- El `PasoConsulta.vue` los monta todos y los conecta al draft vía los
  métodos `addPrescription / addLaboratoryTest / ...` de
  `useNuevaConsultaDraft`.

`QuickActionsCard` recibe `:counts` (Record<ActionKind, number>) y emite
`@select(kind)`. Las tiles muestran badge con count cuando >0 y se resaltan
con borde amatista.

## Persistencia de la consulta completa

`NuevaView.saveConsultation()` ejecuta cascada de POST en orden:

1. `POST /consultations` con `{date, consultationTypeId, anamnesis,
diagnosis, therapeuticPlan, diagnosisPlan, nextControl, animalId}` →
   devuelve `consultationId`. `diagnosis`, `therapeuticPlan` y
   `diagnosisPlan` son opcionales en el backend: se mandan como `null`
   cuando están vacíos en el draft (solo tipo + anamnesis son
   obligatorios, alineado con la UX).
2. Por cada item del draft, POST a su endpoint con `{...item, animalId,
consultationId}`. **El payload nunca lleva `companyId`**: el backend lo
   deriva server-side de `authz.currentCompanyId()` a partir del `AuthContext`
   resuelto del JWT, nunca de un campo que el cliente pueda escribir — si el
   cuerpo aceptara `companyId`, un request manipulado podría crear el item en
   la empresa de otro tenant. Ver "Autorización" en el `CLAUDE.md` del
   backend.
3. Receta es cascada interna: `POST /prescriptions` → con el
   `prescriptionId` retornado, `POST /medicament-prescriptions` por cada
   medicamento.

No hay rollback cross-endpoint. Si un POST falla, `saveError` se muestra y
el usuario puede reintentar. El reintento es idempotente desde el cliente:
el draft persiste `consultationCreatedId` (top-level) y un `savedId` por
cada item / medicamento creado con éxito. Al volver a apretar **Guardar
consulta** se salta lo ya guardado y solo se POSTea lo que falta — la
consulta no se duplica ni los items previos tampoco.

En el paso 4 (`PasoResumen`) se muestra un banner amatista cuando
`draft.hasPartialSave` es true (hay marcadores de un intento anterior)
para avisar al usuario antes de reintentar.

Los marcadores se limpian solos en `draft.reset()` y `resetKeepingOwner()`
porque `defaultDraft()` no los incluye (son campos opcionales).

Limitaciones aceptadas: no se llaman DELETE para limpiar huérfanos al
cancelar; si el `POST /consultations` succede en el servidor pero la
respuesta se pierde en transporte, el retry duplicará la consulta
(necesitaría idempotency-key en el backend).

## Banner "Consulta en curso"

`src/components/ui/ConsultaActiveBanner.vue` montado en `App.vue`. Visible
cuando `draft.state.owner` existe y la ruta actual NO es del wizard
(`consulta-nueva` ni `consulta-nueva-exito`). CTA "Volver a la consulta"
navega a `?paso={state.step}`. ✕ lo oculta para esa sesión sin tocar el
draft. El dismiss se resetea automáticamente al volver al wizard o al
cambiar de propietario.

## Loader global (Huella latiendo)

**Es el único loader del proyecto.** No hay spinners genéricos, ni de
lucide, ni `<v-progress-*>`, ni rotaciones CSS sueltas. Cualquier estado
de carga — HTTP, transición, cómputo bloqueante — debe rutearse al
`PageLoader` global o usar `PawLoader` directamente para casos inline
acotados (búsqueda incremental, etc).

**Componentes** en `src/components/ui/`:

- `PawLoader.vue` — la huella amatista que palpita (SVG inline + filtro
  glow). Props: `size`, `color`, `glow`, `speed`, `label`. Respeta
  `prefers-reduced-motion`.
- `PageLoader.vue` — overlay full-screen `position: fixed; inset: 0` con
  fondo `rgba(15, 7, 30, 0.72)` + `backdrop-filter: blur(4px)`,
  z-index 2000, cursor `wait`. Renderiza `<PawLoader :size="192"
color="#ffffff" />` centrado. Sin Teleport — vive dentro del `<v-app>`
  y el z-index 2000 es suficiente para sobreponerse a contenido normal
  sin colisionar con dialogs de Vuetify.

**Trigger automático:** los interceptors de axios en
`src/services/http/http.client.ts` llaman `pushLoader()` en request y
`popLoader()` en response (éxito o error). Cuando `pending > 0` y supera
el delay, `visible` pasa a `true` y el `PageLoader` montado en `App.vue`
aparece.

**Timings** (`useGlobalLoader.ts`):

- `SHOW_DELAY_MS = 200` — requests < 200ms nunca lo disparan.
- `MIN_VISIBLE_MS = 300` — una vez visible, queda ≥300ms para evitar
  parpadeo.

**Opt-out por request** (sólo casos donde bloquear sería invasivo —
búsqueda con debounce, polling, validaciones live):

```ts
http.get('/owners/search', { params: { q }, skipGlobalLoader: true })
```

`skipGlobalLoader` está extendido en `AxiosRequestConfig` vía module
augmentation. Por defecto déjalo OFF (loader activo). Hoy sólo lo usa
`ownerApi.search()`.

**Uso programático** (transiciones no-HTTP):

```ts
import { pushLoader, popLoader } from '@/composables/useGlobalLoader'
pushLoader()
try {
  await doSomething()
} finally {
  popLoader()
}
```

**`PawLoader` inline** (cuando el global no aplica, ej. el opt-out de
search): `<PawLoader :size="22" :glow="false" :speed="900" />`. Tamaños
sugeridos por contexto en
`docs/design/design_handoff_loader/README.md`.

## Persistencia de entidades (creación)

- **Owner**: `POST /api/v1/owners` (`ownerApi.create` + `mapOwnerResponse`),
  desde `PasoPropietario.submit`.
- **Animal**: `POST /api/v1/animals` (`animalApi.create` +
  `buildCreateAnimalRequest` + `mapAnimalResponse`), desde
  `PasoMascota.submit`. El payload exige `name` (`@NotBlank`), `specieId`,
  `breedId`, `ownerId`, `gender`, `weightType`, `animalType`,
  `reproductiveState`, `colorId` (todos `@NotNull`); `code`, `bod`, `weight`,
  `size` son opcionales en el backend (`weight` `@Positive` si viene, `size`
  `@PositiveOrZero`) pero la UI exige `bod` y `weight`. **El payload nunca
  lleva `companyId`**: no es un campo del `record CreateAnimalRequest` del
  backend — el `AnimalController` lo obtiene de `authz.currentCompanyId()` y
  lo inyecta en el `CreateAnimalCommand` server-side, precisamente para que
  un cliente no pueda crear una mascota en la empresa de otro tenant. `size`
  se redondea a `Integer` (`Math.round`) en el mapper porque el backend lo
  almacena como entero — pierde decimales; `weight` **no** se redondea, el
  backend lo guarda como `BigDecimal` y conserva la precisión clínica.

## Enums del dominio

Los enums no son catálogos: viven en código Java (`com.vetsoftware.app.*.domain.*`)
y deben replicarse exactamente en `src/types/domain.ts` con los mismos string
literales. Las opciones del select se construyen localmente (no hay endpoint).
Referencia: `uml/Veterinaria.puml` en el repo del backend.

| Enum                | Valores backend                          | Estado frontend |
| ------------------- | ---------------------------------------- | --------------- |
| `AnimalType`        | `SERVICE`, `SUPPORT`, `NONE`             | ✅ alineado     |
| `Gender`            | `MALE`, `FEMALE`                         | ✅ alineado     |
| `WeightType`        | `GRAMS`, `POUNDS`, `KILOGRAMS`           | ✅ alineado     |
| `ReproductiveState` | `STERILIZED`, `NO_STERILIZED`, `UNKNOWN` | ✅ alineado     |

Para el display en español, las funciones `genderLabel` /
`reproductiveLabel` / `weightUnitLabel` en `src/composables/domainLabels.ts`
traducen los valores del enum (ej. `'KILOGRAMS'` → `'kg'`, `'FEMALE'` →
`'Hembra'`). **Nunca** uses el valor crudo del enum en la UI.

Al alinear un enum: actualizar el tipo en `src/types/domain.ts`, los
`*Options` del componente, los defaults de `*Draft`, los mocks en `data/`,
las etiquetas en `src/composables/domainLabels.ts`, y cualquier mapper de API.

## Formato transversal (fechas, iniciales, edad)

Hay **un solo** módulo de formato genérico: `src/composables/format.ts`
(`todayISO`, `parseISODate`, `formatDateShort`, `formatDateLong`,
`formatDateNumeric`, `formatMonthLabel`, `calcAge`, `initials`). Ninguna
feature declara el suyo: llegaron a convivir tres `format.ts` —compras, el
asistente de consulta y la historia clínica— con tres implementaciones de la
misma fecha corta y dos de las mismas iniciales, y el punto de venta importaba
su helper de fechas desde dentro del wizard de consulta, a ocho niveles de
profundidad.

Los dos formatos de fecha que **sí** conviven, porque son distintos:

| Función             | Salida               | Dónde                       |
| ------------------- | -------------------- | --------------------------- |
| `formatDateShort`   | `13 ago 2026`        | por defecto en toda la app  |
| `formatDateNumeric` | `13/08/2026`         | tablas contables de compras |
| `formatDateLong`    | `13 de agosto, 2026` | encabezados y frases        |

Todas parsean con `parseISODate`, que fija la medianoche **local** y por tanto
tolera tanto `yyyy-MM-dd` como `yyyy-MM-ddTHH:mm:ss` sin corrimiento de zona
horaria. El marcador de "sin dato" es `—`; pásales `''` como segundo argumento
si el hueco debe quedar vacío. Cubierto por `tests/unit/format.spec.ts`.

Lo específico de una feature no sube aquí: los importes van por
`formatMoney` de `features/tienda/composables/pricing.ts` (núcleo monetario) y
el vocabulario de cada feature se queda en su `*Labels.ts`
(`features/compras/composables/comprasLabels.ts`).

## Los dos fronts son independientes, pero se escriben igual (TR-02)

No hay `@vetsoftware/core` ni workspace npm, y **no se va a añadir**: es una
decisión de plataforma, no una tarea pendiente. Cada repositorio se despliega,
versiona y evoluciona por su cuenta.

A cambio, la práctica es la misma en los dos. **Estos archivos se mantienen byte
a byte idénticos**; si tocas uno, tocas el otro en el mismo PR:

| Archivo                                                                                                       | Qué es                                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/services/http/http.client.ts`                                                                            | cliente axios, refresh _single-flight_, lectores de `ProblemDetail`                  |
| `src/services/http/api-base-url.ts`                                                                           | resolución de la URL base                                                            |
| `src/services/storage/storage.service.ts`                                                                     | único acceso a `localStorage`/`sessionStorage`                                       |
| `src/services/telemetry/telemetry.ts`                                                                         | telemetría de navegador vía Grafana Faro, carga diferida tras el montaje (TR-05)     |
| `src/stores/loader.store.ts`                                                                                  | debounce anti-parpadeo del velo                                                      |
| `src/stores/toast.store.ts`                                                                                   | avisos                                                                               |
| `src/composables/useGlobalLoader.ts` · `useToast.ts`                                                          | sus fachadas                                                                         |
| `src/features/auth/utils/jwt.ts`                                                                              | decodificación del JWT                                                               |
| `src/types/api.types.ts`                                                                                      | `ProblemDetail`                                                                      |
| `src/plugins/vuetify.ts` · `vuetify-icon-aliases.ts`                                                          | tema e iconos de Vuetify                                                             |
| `src/assets/styles/tokens.css` · `primitives.css` · `base.css`                                                | capas 1, 2 y 0 del sistema de diseño                                                 |
| `src/components/feedback/{PawLoader,PageLoader,ToastStack,ErrorSummary}.vue`                                  | primitivas de feedback                                                               |
| `src/components/ui/ModalShell.vue`                                                                            | contenedor de diálogo — byte a byte idéntico, no declarado hasta ahora               |
| `src/composables/useModalLayer.ts` · `useModalHistory.ts` · `useModalFocus.ts`                                | pila de modales, entrada de historial (EST-09) y trampa/devolución de foco (A11Y-08) |
| `src/types/pagination.ts`                                                                                     | `PageResponse<T>`, `PageQuery`, `emptyPage()` — el único contrato de paginación      |
| `src/composables/useServerPaged.ts` · `useQuerySync.ts`                                                       | paginación servida por el backend y filtros sincronizados con la query string        |
| `scripts/check-bundle-budget.mjs` · `ds-audit.mjs` · `css-budget.mjs`                                         | verificadores                                                                        |
| `scripts/tr02-parity-check.mjs` · `tr02-parity.config.json`                                                   | gate de paridad TR-02 — compara este listado byte a byte, corre en `npm run quality` |
| `tests/unit/setup.ts` · `storage-service.spec.ts` · `ui-stores.spec.ts`                                       | sus pruebas                                                                          |
| `eslint.config.ts` · `stylelint.config.mjs` · `lint-staged.config.mjs` · `commitlint.config.js` · `AGENTS.md` | tooling                                                                              |
| `stylelint-plugins/no-duplicate-primitive.mjs`                                                                | regla stylelint FE-08: rechaza CSS que reescribe una primitiva                       |

**Divergencias permitidas, y solo estas.** Van siempre con un comentario que
diga por qué (y con una entrada en `scripts/tr02-parity.config.json`, que es
lo que `npm run quality` de verdad comprueba):

- `telemetry.ts`: el nombre de la aplicación.
- `http.client.ts`: un bloque delimitado con los presupuestos por llamada
  propios de cada app (el operativo declara `DIAN_TIMEOUT_MS` y
  `TRANSFER_TIMEOUT_MS`; la consola, ninguno).
- `check-bundle-budget.mjs`: las cifras del presupuesto.
- `AGENTS.md`: la sección "Integración con Codex" remite a los encabezados del
  `CLAUDE.md` de SU PROPIO repo, y las dos listas son correctas para su repo:
  el `CLAUDE.md` del front tenant tiene secciones (recarga de pantalla/modal,
  validación de formularios, API/composables de catálogo, UI) que el de la
  consola no tiene. Igualar el texto haría que al menos un `AGENTS.md`
  apuntara a secciones inexistentes en su propio `CLAUDE.md`. Verificado
  leyendo los encabezados de los dos `CLAUDE.md` el 2026-08-29.

Cualquier otra diferencia entre esos archivos es deriva, no diseño. Fue
exactamente así como el velo de carga acabó durando 300 ms en un front y 420 en
el otro durante semanas — y así fue como `http.client.ts` estuvo semanas con
`withBranchBody` corregido en un front y roto (marca por identidad en un
`WeakSet`, inerte porque axios clona el cuerpo antes del interceptor) en el
otro: nadie lo comparaba. `npm run tr02:parity` (dentro de `quality`) existe
para que la próxima no se encuentre por accidente.

**Registro de claves volátiles (issue #68).** `storageService.clearSession()`
—la que corre en cada expulsión por token expirado— solo borra
`AUTH_STORAGE_KEY` a propósito: no conoce las claves de cada app. Eso dejaba
sobrevivir a un logout el borrador de "Nueva consulta"
(`vetrina:nueva-consulta-draft`) y la sede activa (`vetsoft.branch`), visibles
para el siguiente usuario del mismo equipo. `storageService` expone ahora
`registerVolatileKey(key)` (idempotente) y `clearVolatile()` (borra
`AUTH_STORAGE_KEY` + todo lo registrado, conserva
`SESSION_REPLACED_NOTICE_KEY`); `redirectToLogin()` en `http.client.ts` llama a
`clearVolatile()` en vez de `clearSession()`. Cada app registra sus propias
claves volátiles en su arranque (`main.ts` / el store dueño de la clave) — eso
no es TR-02, cada front declara las suyas.

El patrón para escribir CSS nuevo sin volver a acumular ese tipo de deriva
—consumir `primitives.css` en vez de reescribirlo, qué mide cada una de las
dos puertas (`vetsoftware/no-duplicate-primitive` al escribir, `css:budget`
en el agregado) y la trampa de especificidad `(0,1,0)` vs. `(0,2,0)`— está
documentado en `AGENTS.md` (gemelo TR-02), sección "CSS: consumir el design
system, no reescribirlo".

## Convenciones que valen en los dos

**Clientes de API.** `src/features/<recurso>/api/<recurso>.api.ts` exporta un
objeto `<recurso>Api` con métodos `async` que devuelven **el cuerpo, no el
`AxiosResponse`**:

```ts
export const speciesApi = {
  async listAll(): Promise<SpecieResponse[]> {
    const { data } = await http.get<SpecieResponse[]>('/species')
    return data
  },
}
```

Vocabulario fijo: `listAll`, `findById`, `create`, `update`, `remove`,
`listBy<X>`, `search`. Ningún consumidor desestructura `{ data }`.

**Tipos.** Viven en `src/features/<recurso>/types/<recurso>.types.ts`, nunca
dentro del cliente, y **se llaman como el esquema del contrato**:
`SpecieResponse`, `CreateSpecieRequest`. Así `MatchesContract<X, 'X'>` se lee
igual en los dos repositorios y una deriva del contrato falla con el nombre a la
vista.

**Paginación.** `PageResponse<T>` se declara **una sola vez**, en
`src/types/pagination.ts`, junto a `PageQuery`, `DEFAULT_PAGE_SIZE` y
`emptyPage()`. Ninguna feature declara la suya: llegaron a existir siete copias
del mismo interface —caja, compras, cuentas, employees, laboratorio, tienda y la
canónica— y ninguna estaba atada al contrato, así que renombrar un campo en el
backend no rompía la compilación, devolvía `undefined` en la pantalla. Hoy la
envoltura tiene su centinela en `api.contract.ts`
(`MatchesContract<PageResponse<OwnerResponse>, 'PageResponseOwnerResponse'>`);
basta una instanciación porque los cinco campos los declara la envoltura, no el
contenido.

El vocabulario del servidor es `page` (base 0) + `pageSize`, y el tope de filas
por página es **200** — pedir más se recorta en el servidor. Un bucle que drene
todas las páginas debe releer `totalPages` de cada respuesta, nunca calcularlo a
partir del tamaño que pidió.

**Estructura de un feature.** `src/features/<recurso-en-kebab>/` con `api/`,
`types/`, `stores/`, `composables/`, `components/`, `views/`. Lo transversal va
en `src/components/{feedback,layout,ui}/`, `src/composables/`, `src/stores/`.

**Iconos.** Una sola librería: Lucide, en componentes — también para los que
Vuetify pide para sí (`vuetify-icon-aliases.ts`). Ni webfont ni colección que
registrar en tiempo de ejecución. Un nombre que no exista no compila.

**Avisos.** `useToast()` con `success/info/warn/error` y `errorFrom(titulo,
error)`, que extrae el mensaje del `ProblemDetail` y el identificador de traza
de `X-Trace-Id`. Nunca escribas el texto del error a mano en un `catch`: eso
tira la traza.

**Sesión.** Solo `storageService` toca el almacenamiento del navegador.
