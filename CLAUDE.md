# CLAUDE.md

Este archivo recoge las convenciones del proyecto que Claude Code debe respetar
en todas las contribuciones.

## Stack

- Vue 3 + `<script setup lang="ts">` + Composition API
- Vite + TypeScript estricto (`vue-tsc -b` debe pasar limpio)
- Axios para HTTP, montado en `src/services/http/http.client.ts` (`http`)
- Backend Spring Boot vive en `C:\Users\orlan\OneDrive\Documentos\Proyectos\VetSoftware`

## Estructura por feature

Cada feature vive en `src/features/<feature>/` y agrupa por subcarpetas:

- `api/` — clientes axios (`*.api.ts`) + mappers (`*.mapper.ts`)
- `composables/` — lógica reactiva reutilizable (`useXxx.ts`)
- `components/` — componentes Vue específicos del feature
- `views/` — pantallas que se montan en el router
- `data/` — datos mock locales (sólo para desarrollo, se reemplazan por API)

Las primitivas UI compartidas (`BaseInput`, `BaseField`, `BaseSelect`,
`BaseTextarea`, `DateInput`, `SegmentedRadio`, `SectionCard`, `BaseChip`) viven
en `src/features/dashboard/components/ui/` y son la base obligatoria para
formularios.

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

| Campo               | Regla                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Nombre              | requerido, ≥ 2 caracteres                                             |
| Documento identidad | requerido, alfanumérico (sin espacios ni símbolos), 5–20 caracteres   |
| Teléfono            | requerido, sólo `[+\d\s\-()]`, mínimo 7 dígitos, máximo 15            |
| Email               | opcional; si está presente debe matchear `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` |
| Selects requeridos  | requerido (`!v` => mensaje específico del campo)                      |
| Número de chip      | opcional; si está presente: 15 dígitos exactos (ISO 11784)            |
| Peso / Tamaño       | requerido (peso) u opcional (tamaño), número > 0, acepta `,` o `.`    |
| Fecha de nacimiento | requerida, fecha válida y no futura                                   |

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
function markTouched(field: FieldKey) { touched[field] = true }

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
2. **Composable cacheado** en `composables/use<Recurso>.ts` que:
   - Mantiene cache module-scoped + promesa in-flight para evitar dobles
     fetches.
   - Expone `options: ComputedRef<{value, label}[]>`, `loading`, `error`,
     `findById(id)`, `refresh()`.
   - Carga en `onMounted` si la cache está vacía.
3. **El componente** muestra el error si existe (banner rojo arriba) y
   `placeholder="Cargando…"` mientras `loading`.

Patrón de referencia: `useGeoCascade.ts` y `useSpecies.ts`.

## UI / Layout

- El layout del wizard usa `ContentWrap` (max-width 1080px, padding responsive
  con `clamp`).
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
- **Colores de animal**: cargados desde `GET /api/v1/animal-colors`
  (`useAnimalColors`). Catálogo global, cache module-scoped.
- **Países / Estados / Ciudades**: cargados desde el backend (`useGeoCascade`).

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
try { await doSomething() } finally { popLoader() }
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
  `PasoMascota.submit`. El payload exige `name`, `code`, `specieId`, `breedId`,
  `ownerId`, `gender`, `weightType`, `animalType`, `reproductiveState`,
  `colorId`, `companyId` (todos `@NotNull/@NotBlank`); `bod`, `weight`, `size`
  son opcionales en el backend pero la UI exige `bod` y `weight`. `weight` y
  `size` se redondean a `Integer` (Math.round) en el mapper porque el backend
  los almacena como enteros — pierde decimales para kg, considerado
  aceptable por ahora.

## Enums del dominio

Los enums no son catálogos: viven en código Java (`com.vetsoftware.app.*.domain.*`)
y deben replicarse exactamente en `src/types/domain.ts` con los mismos string
literales. Las opciones del select se construyen localmente (no hay endpoint).
Referencia: `uml/Veterinaria.puml` en el repo del backend.

| Enum                | Valores backend                         | Estado frontend |
| ------------------- | --------------------------------------- | --------------- |
| `AnimalType`        | `SERVICE`, `SUPPORT`, `NONE`            | ✅ alineado      |
| `Gender`            | `MALE`, `FEMALE`                        | ✅ alineado      |
| `WeightType`        | `GRAMS`, `POUNDS`, `KILOGRAMS`          | ✅ alineado      |
| `ReproductiveState` | `STERILIZED`, `NO_STERILIZED`, `UNKNOWN`| ✅ alineado      |

Para el display en español, las funciones `genderLabel` /
`reproductiveLabel` / `weightUnitLabel` en `composables/format.ts` traducen
los valores del enum (ej. `'KILOGRAMS'` → `'kg'`, `'FEMALE'` → `'Hembra'`).
**Nunca** uses el valor crudo del enum en la UI.

Al alinear un enum: actualizar el tipo en `src/types/domain.ts`, los
`*Options` del componente, los defaults de `*Draft`, los mocks en `data/`,
los formatters/labels en `format.ts`, y cualquier mapper de API.
