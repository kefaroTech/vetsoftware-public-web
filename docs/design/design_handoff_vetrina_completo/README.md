# Handoff: Vetrina — Refresh visual del frontend Vue 3

## Resumen

Esta carpeta contiene un **prototipo HTML interactivo** (`Vetrina App.html` + carpeta `vetrina/`) que recrea **toda la app actual** y le aplica un pase de polish visual. El objetivo de este handoff es que Claude Code lleve esas mejoras al **codebase Vue 3 + Vuetify + TypeScript existente** (la carpeta `src/`) — sin reemplazar la arquitectura, solo refinando estilos, espaciado, consistencia de patrones, añadiendo un sistema de toasts e implementando un nuevo flujo de **Spa**.

> El HTML es **referencia visual y de comportamiento**, no código a copiar tal cual.
> El trabajo final vive en `src/features/...` siguiendo los patrones Vue 3 + Vuetify ya establecidos.

> **Nuevo en esta versión**: flujo completo de **Spa** (acción clínica adicional) — ver §14 al final del documento.

---

## Fidelidad

**Alta fidelidad**. El prototipo usa exactamente los mismos tokens, colores, fuentes y radios que están en `src/assets/styles/tokens.css`. Las mejoras introducidas son refinamientos sobre lo que ya existe — espaciado, contraste, consistencia entre features — no un rediseño.

---

## Cómo está organizado el prototipo (referencia)

```
Vetrina App.html                ← entry point
vetrina/
  tokens.css                    ← espejo de src/assets/styles/tokens.css
  states.css                    ← hover/active globales
  historia.css / consulta.css /
  empleados.css / acciones.css /
  roles.css                     ← un CSS por feature
  polish.css                    ← CAPA DE MEJORAS (ver §"Cambios a aplicar")
  *.jsx                         ← componentes React (referencia visual)
```

Cada archivo `.jsx` mapea conceptualmente a un componente/vista Vue. La tabla de mapeo está en §"Mapeo prototipo → código Vue".

---

## Cambios a aplicar (ordenados por impacto)

### 🟣 1. Cambiar la ruta por defecto a Login

**Archivo**: `src/router/index.ts`

Actualmente:
```ts
{ path: '/', name: 'signup', component: () => import('@/features/registration/views/SignupView.vue'), meta: { guestOnly: true } },
{ path: '/login', name: 'login', component: () => import('@/features/auth/views/LoginView.vue'), meta: { guestOnly: true } },
```

Cambiar a:
```ts
{ path: '/', name: 'login', component: () => import('@/features/auth/views/LoginView.vue'), meta: { guestOnly: true } },
{ path: '/signup', name: 'signup', component: () => import('@/features/registration/views/SignupView.vue'), meta: { guestOnly: true } },
```

Y en el catch-all al final, redirigir a `login` en vez de `signup`:
```ts
{ path: '/:pathMatch(.*)*', redirect: { name: 'login' } },
```

### 🎨 2. Alinear Auth (Login/Signup) con el sistema Amatista

Las pantallas de Login y Signup actualmente usan **Vuetify con tema índigo (`#4F46E5`)** mientras el resto de la app usa **Amatista** (`oklch(...)` con `--hue: 300`). Esto rompe la identidad de marca al entrar.

**Archivos a tocar**:
- `src/features/auth/views/LoginView.vue`
- `src/features/auth/components/LoginForm.vue`
- `src/features/registration/views/SignupView.vue`
- `src/features/registration/components/SignupForm.vue`
- `src/features/registration/components/SignupSuccessCard.vue`

**Plan**:
- Reemplazar `<v-main class="bg-background">` por un wrapper propio con el fondo cálido degradado (ver `vetrina/polish.css` rules §1, selector `.vet-auth-shell`).
- Tipografía del título: `var(--font-serif)` (`Instrument Serif`), 28px, peso 400, letter-spacing -0.01em.
- Botón principal del form: gradiente `linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)))` con sombra suave amatista (mismo patrón de `home/CtaPrimary.vue` y `dashboard/views/consulta/nueva/components/QuickActionsCard`).
- Links: `color: var(--amatista-700)` en lugar de `--v-theme-primary`.
- Inputs `v-text-field`: aún se mantienen pero override del `--v-theme-primary` localmente a amatista (o estilizar bordes y focus ring con CSS scoped a la vista).

**Alternativa más limpia (recomendada)**: actualizar el tema Vuetify global en `src/plugins/vuetify.ts` para que `primary` sea el amatista del sistema:
```ts
primary: '#7C3AED',   // ≈ oklch(50% 0.18 300)
// o mejor, leer el computed de --amatista-600
```
Esto haría que TODOS los `v-btn color="primary"`, `v-text-field`, `v-checkbox`, etc. tomen el color correcto sin tocar cada vista individualmente.

### 🧭 3. Reforzar el estado activo del sidebar

**Archivo**: `src/features/dashboard/components/sidebar/SidebarNavItem.vue`

El `.nav-item.active` actual usa alpha 0.4 que se confunde con hover. Reemplazar el bloque:
```css
.nav-item.active {
  background: oklch(48% 0.16 var(--hue) / 0.55);
  color: oklch(98% 0.01 var(--hue));
  box-shadow:
    inset 0 0 0 1px oklch(75% 0.14 var(--hue) / 0.35),
    inset 3px 0 0 oklch(80% 0.18 var(--hue));
  font-weight: 500;
}
```

### 🐾 4. PetCard de Consulta Nueva — usar iniciales en lugar de icono pata

**Archivo**: `src/features/dashboard/views/consulta/nueva/components/PetCard.vue`

Actualmente:
```vue
<div class="avatar">
  <PawPrint :size="22" :stroke-width="1.6" />
</div>
```

Cambiar a:
```vue
<div class="avatar">{{ initials(pet.name) }}</div>
```
(Reutiliza el helper `initials` de `composables/format.ts`.)

Y en el CSS del avatar:
```css
.avatar {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 500;
  background: var(--amatista-100);
  color: var(--amatista-700);
}
```

Esto unifica el avatar con el de `historia-clinica/components/PetCard.vue` (que ya usa iniciales).

### 📏 5. Inputs no pegados a los bordes en Consulta Nueva

Bumpear padding interno de inputs base y body de section cards.

**Archivos**:
- `src/features/dashboard/components/ui/BaseInput.vue` → padding del `.input`: `10px 14px` (antes ~9/12)
- `src/features/dashboard/components/ui/BaseTextarea.vue` → `12px 14px`
- `src/features/dashboard/components/ui/BaseSelect.vue` → `10px 14px`
- `src/features/dashboard/components/ui/SectionCard.vue` → en `.body.padded`: `padding: clamp(22px, 2vw + 12px, 36px) clamp(22px, 2vw + 12px, 36px)`
- `src/features/dashboard/views/consulta/nueva/components/ContentWrap.vue` → `padding: 28px clamp(20px, 3vw + 8px, 56px)`

### 🔔 6. Toast system global al guardar acciones

Hoy no hay feedback visual tras guardar (excepto el redirect a `consulta-nueva-exito`). Añadir un sistema de toasts para empleados, roles y acciones clínicas.

**Plan**:
1. Crear `src/components/ui/ToastStack.vue` (componente global que se monta en `App.vue` junto al `PageLoader` y `ConsultaActiveBanner`).
2. Crear `src/composables/useToast.ts` con `useToast()` que expone `success/info/warn/error(title, message?)`.
3. Estilos: ver `vetrina/polish.css` reglas §26 (selector `.vet-toast-stack`).
4. Wirearlo en:
   - `src/features/employees/views/EmpleadosView.vue` — en `handleSubmit`, `confirmDeactivate`, `handleActivate`.
   - `src/features/roles/views/RolesView.vue` — tras `roles.createWithPermissions` / `roles.updateNameAndPermissions` / `roles.setActive`.
   - `src/features/acciones/views/*ListView.vue` (las 6) — tras `onSaved`, `onConfirmDelete`.

Ejemplos de copy a usar (tomados del prototipo):
- `toast.success('Empleado creado', 'Mariana Soto se añadió al equipo.')`
- `toast.info('Empleado desactivado', 'No podrá iniciar sesión hasta reactivarlo.')`
- `toast.success('Rol actualizado', 'Los cambios se guardaron.')`
- `toast.success('Vacuna guardada', 'Se añadió correctamente al paciente.')`
- `toast.info('Examen eliminado', 'El registro fue removido.')`

### 🟪 7. Page headers unificados en features (Empleados / Roles / Acciones)

Hoy las 3 vistas tienen el mismo patrón visual (kicker uppercase, título serif grande, lead, CTA gradient en la derecha) pero con tamaños levemente distintos: 38px vs 36px, diferentes paddings.

**Plan**: extraer a un componente compartido `src/components/ui/PageHeader.vue`:

```vue
<script setup lang="ts">
defineProps<{ kicker: string; title: string; lead?: string }>()
</script>

<template>
  <header class="page-head">
    <div class="kicker">{{ kicker }}</div>
    <div class="title-row">
      <div>
        <h1 class="title">{{ title }}</h1>
        <p v-if="lead" class="lead">{{ lead }}</p>
      </div>
      <div class="action">
        <slot name="action" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-head { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.kicker { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-500); font-weight: 500; }
.title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.title { margin: 0; font-family: var(--font-serif); font-size: 36px; font-weight: 400; letter-spacing: -0.015em; color: var(--warm-900); line-height: 1.05; }
.lead { margin: 6px 0 0; font-size: 13.5px; color: var(--warm-600); max-width: 540px; line-height: 1.5; }
</style>
```

Y reemplazar en:
- `EmpleadosView.vue`
- `RolesView.vue`
- Las 6 `*ListView.vue` de acciones

### 🟢 8. Focus rings unificados en inputs

Todos los inputs de la app deben tener:
```css
border-color: var(--amatista-500);
box-shadow: 0 0 0 3px var(--amatista-50);
```
al `focus`. Hoy hay 3-4 variantes (algunas con `--v-theme-primary` indigo, otras con `--amatista-500` directo).

**Plan**: añadir reglas globales en `src/assets/styles/main.css`:
```css
input:focus,
textarea:focus,
select:focus,
.v-field--focused .v-field__outline {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
```

### 🟡 9. Espaciado más generoso en tabla de Empleados

**Archivo**: `src/features/employees/components/EmpleadoRow.vue`

Cambiar `.row` padding de `12px 15px 12px 18px` a `14px 16px 14px 18px`.

### 🟡 10. RoleCard — stats más grandes y card con más respiración

**Archivo**: `src/features/roles/components/RoleCard.vue`

- `.card` padding: 18px → 20px
- `.stat-num` font-size: 26px → 28px
- `.name` font-size: 17px → 18px

### 🟡 11. HistoryStep — patient head más equilibrado

**Archivo**: `src/features/historia-clinica/views/HistoryStep.vue`

- `.patient-head` padding: `24px 36px` → `28px 36px 24px`
- `.avatar` size: 72×72 → 64×64 con border-radius 16px y sombra suave amatista
- `.patient-name` font-size: 32px → 28px line-height 1.05

### 🟢 12. Modal overlays más profundos

En `src/features/dashboard/components/ui/ModalShell.vue` y `EmpleadoDrawer.vue`:
- `.overlay` background: `rgba(20, 15, 30, 0.55)` → mantener
- En `EditPermissionsModal.vue`: `.overlay`: `oklch(15% 0.05 var(--hue) / 0.45)` — ya está bien.

### 🟢 13. Misc polish

- `.vet-event-bullet` (Historia timeline) → añadir `box-shadow: 0 2px 6px -2px rgba(20, 15, 30, 0.12);` en `EventCard.vue`.
- `.cta-primary` (Home) → ya tiene buena sombra, no tocar.
- `.success-badge` en `ConsultaGuardada.vue`: usar gradiente `linear-gradient(135deg, oklch(58% 0.16 145), oklch(48% 0.18 150))` en lugar del color plano.
- Animación de entrada del drawer de empleado: ya está bien (slide desde derecha 0.22s cubic-bezier).

---

## Mapeo prototipo → código Vue

| Prototipo (`vetrina/*.jsx`) | Vue equivalente | Notas |
|---|---|---|
| `shell.jsx` → AppSidebar/AppTopbar | `src/features/dashboard/components/sidebar/*` + `topbar/*` + `layouts/AppLayout.vue` | Tal cual |
| `screens-home.jsx` | `src/features/dashboard/views/HomeView.vue` + `components/home/*` | Tal cual |
| `screens-auth.jsx` (LoginView) | `src/features/auth/views/LoginView.vue` + `components/LoginForm.vue` | Ver §2 (cambiar styling) |
| `screens-auth.jsx` (SignupView) | `src/features/registration/views/SignupView.vue` + `components/*` | Ver §2 |
| `historia-core.jsx` + `historia-details.jsx` + `screens-historia.jsx` | `src/features/historia-clinica/**` | Ver §11 |
| `consulta-store.jsx` + `consulta-ui.jsx` + `consulta-pieces.jsx` + `consulta-pasos.jsx` + `consulta-modals.jsx` + `screens-consulta.jsx` | `src/features/dashboard/views/consulta/nueva/**` | Ver §4, §5 |
| `screens-empleados.jsx` | `src/features/employees/**` | Ver §6, §7, §9 |
| `screens-roles.jsx` | `src/features/roles/**` | Ver §6, §7, §10 |
| `screens-acciones.jsx` | `src/features/acciones/**` (6 list views + 6 modales) | Ver §6, §7 |
| `toast.jsx` | **A crear**: `src/components/ui/ToastStack.vue` + `src/composables/useToast.ts` | Ver §6 |

---

## Design tokens (NO CAMBIAR — ya están en `src/assets/styles/tokens.css`)

```css
--hue: 300;
--amatista-50  … --amatista-900    (oklch con hue 300)
--warm-50      … --warm-900        (oklch con hue 60, chroma muy bajo)
--success-bg   = oklch(94% 0.04 145)
--success-fg   = oklch(40% 0.10 145)
--success-dot  = oklch(55% 0.15 145)

--font-sans    = 'Geist', system-ui...
--font-serif   = 'Instrument Serif', Georgia, serif
--font-mono    = 'JetBrains Mono', ui-monospace, monospace

--radius-sm    = 6px
--radius-md    = 8px
--radius-lg    = 12px
--radius-xl    = 16px
```

**Gradiente CTA reutilizable**:
```css
background: linear-gradient(135deg,
  oklch(45% 0.18 var(--hue)),
  oklch(38% 0.18 calc(var(--hue) - 5)));
box-shadow:
  0 1px 2px rgba(50, 20, 80, 0.08),
  0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.45);
```

---

## Cómo verificar el resultado

1. Abrir `Vetrina App.html` en el navegador como referencia visual.
2. Tras cada cambio, `pnpm dev` y comparar lado a lado pantalla por pantalla.
3. Pantallas críticas a revisar:
   - `/` (Login) — debe tener fondo cálido amatista, botón gradient
   - `/dashboard` — sidebar item activo claramente visible
   - `/dashboard/empleados` — header coincide con Acciones/Roles
   - `/dashboard/roles` — RoleCards con stats grandes
   - `/dashboard/consulta/nueva` — inputs con respiración, padding 28px en section card
   - Cualquier guardado → toast en esquina superior derecha (3s autodescartar)

---

## Limitaciones del prototipo

- **Mocks en memoria**: el prototipo no llama APIs; los datos se reinician al refrescar. Esto NO se debe replicar en Vue — usar los stores y APIs reales.
- **Sin auth real**: el prototipo acepta cualquier credencial. Vue ya tiene el auth flow correcto en `useAuth.ts`.
- **Vuetify recreado en CSS puro**: el prototipo no importa Vuetify. En Vue se debe seguir usando Vuetify nativo con los overrides de tema descritos.

---

## Archivos en este bundle

- `Vetrina App.html` — entry point del prototipo
- `vetrina/` — carpeta con todos los JSX y CSS (referencia visual y de comportamiento)
- `vetrina/polish.css` — **archivo más importante**: contiene todas las reglas CSS de polish a portar a los `.vue` files correspondientes

Cuando Claude Code lea el polish.css, debe extraer las reglas y aplicarlas a los archivos Vue indicados en cada sección comentada (`/* ---------- N. NOMBRE ---------- */`).

---

## 🆕 §14. Nuevo flujo: Spa

El modelo de datos del backend incluye las entidades `Spa` y `SpaType` que aún no están implementadas en el frontend Vue. Este prototipo añade el flujo completo como referencia. Debe implementarse en Vue siguiendo el mismo patrón que las otras 6 vistas de `src/features/acciones/`.

### Entidad

```ts
// src/types/domain.ts — añadir:
export interface SpaType {
  id: string
  name: string
  description?: string
}

export interface Spa {
  date: string
  spaTypeId: string
  reason: string
  details: string
  observations: string
  // animal, company, consultation? — según el modelo
}
```

> **Nota del modelo**: a diferencia de las otras acciones, `Spa` **no está vinculado a una Consultation** (no aparece `Spa --> Consultation` en el diagrama). Es una acción standalone como `DayCare`. Mantén esto al diseñar la API.

### Archivos a crear en `src/features/acciones/`

```
src/features/acciones/
├── views/
│   └── SpaListView.vue              ← Lista con cascada de paciente
├── modals/
│   └── SpaFormModal.vue             ← Form crear/editar
├── api/
│   ├── spa.api.ts                   ← CRUD endpoints
│   └── spaType.api.ts               ← Catálogo de tipos
└── composables/
    └── useSpaTypes.ts               ← Catálogo cacheable
```

### Ruta nueva en `src/router/index.ts`

```ts
{
  path: 'acciones/spa',
  name: 'acciones-spa',
  component: () => import('@/features/acciones/views/SpaListView.vue'),
  meta: { permission: PERMISSIONS.SPA_CREATE }, // crear el permiso correspondiente
},
```

### Sidebar — agregar item

**Archivo**: `src/features/dashboard/components/sidebar/AppSidebar.vue`

Añadir al array `accionesItems` (después de Cirugía):

```ts
{
  label: 'Spa',
  icon: Sparkles, // import { Sparkles } from 'lucide-vue-next'
  to: { name: 'acciones-spa' as const },
  show: canSpa.value,
},
```

Y añadir el permiso `canSpa = can(PERMISSIONS.SPA_CREATE)` arriba con los otros.

### Form fields del modal

Según el modelo `Spa`:

| Campo | Tipo | Required | Notas |
|---|---|---|---|
| `date` | Date | ✓ | Default = hoy |
| `spaType` | Select | ✓ | Catálogo `SpaType` (Baño completo, Baño medicado, Corte de pelo, Limpieza de oídos, Corte de uñas, Peinado, Estética completa) |
| `reason` | Input | – | "Mantenimiento mensual", "Dermatitis", etc. |
| `details` | Textarea | – | Productos, técnica, tiempos |
| `observations` | Textarea | – | Comportamiento del paciente, recomendaciones |

### Tabla — columnas

| Columna | Source |
|---|---|
| Fecha | `formatDateShort(date)` |
| Servicio | `spaType.name` |
| Motivo | `reason` (truncar con ellipsis) |
| Detalles | `details` (truncar con ellipsis) |
| Acciones | Editar + Eliminar |

### Búsqueda

Filtrar por: `spaType.name`, `reason`, `details`.

### Mocks de referencia

Ver `vetrina/data-acciones.jsx` (constantes `VET_SPA_TYPES` y `VET_ACCIONES_SPA`) para ejemplos de datos realistas.

### Permisos a añadir

En `src/constants/permissions.ts`:
```ts
SPA_CREATE: 'spa.create',
SPA_UPDATE: 'spa.update',
SPA_DELETE: 'spa.delete',
```

Y registrarlos en el catálogo de `BasePermission` del backend con el sub-módulo correspondiente (probablemente uno nuevo "Spa" bajo el módulo "Clínica").

### Integración con Historia Clínica

El `ClinicalEventType` ya tiene la entrada `SPA` en `src/features/historia-clinica/constants/eventTypes.ts`:
```ts
SPA: { label: 'Spa', color: 'gray', icon: '🛁' },
```

Solo falta:
1. Añadir el handler en `EventDetailModal.vue` para fetcher `spaApi.findById()` cuando `eventType === 'SPA'`.
2. Crear `SpaDetail.vue` en `src/features/historia-clinica/components/detail/` siguiendo el patrón de los otros.
3. Añadir `SPA` al `EVENT_TYPE_DETAILABLE` set.

Campos del detail (mismo formato que los otros):
```vue
<DetailField label="Tipo de servicio" :value="data.spaType.name" />
<DetailField label="Fecha" :value="formatEventDate(data.date)" />
<DetailField label="Motivo" :value="data.reason" span="full" />
<DetailField label="Detalles" :value="data.details" span="full" />
<DetailField label="Observaciones" :value="data.observations" span="full" />
```

---

## 🆕 §15. Detail modal en filas de Acciones clínicas (read-only)

Click sobre una fila de cualquier tabla de Acciones (`LabListView`, `ImagingListView`, `VaccineListView`, `HospListView`, `DewormListView`, `SurgeryListView`, `SpaListView`) debe abrir un **modal de detalle en solo lectura** con todos los campos del registro.

### UX

- Hover de fila: cursor pointer + background `var(--amatista-50)`
- Click sobre la fila → abre modal de detalle
- Click sobre los botones Editar/Eliminar → **NO** dispara el detalle (`event.stopPropagation()`)
- Modal incluye botón "Editar" en el footer que cierra el detalle y abre el modal de edición existente

### Plan en Vue

1. Crear `src/features/acciones/modals/AccionDetailModal.vue` genérico que reciba `fields: { label, value, span? }[]` y use `ModalShell` + `DetailField` ya existentes en `historia-clinica`.
2. En cada `*ListView.vue` (7 archivos):
   - Añadir `viewing = ref<T | null>(null)` junto a `editing`
   - Añadir `@click="viewing = item"` en cada `<tr>`
   - `@click.stop` en los botones Editar/Eliminar
   - Renderizar `<AccionDetailModal :open="viewing !== null" :fields="fields(viewing)" @edit="editing = viewing; viewing = null" @close="viewing = null" />`
3. CSS scoped:
```css
tbody tr { cursor: pointer; transition: background 0.12s ease; }
tbody tr:hover { background: var(--amatista-50); }
```

### Mapeo de fields por tipo

Ver `vetrina/screens-acciones.jsx` (cada list view tiene `detailFields={(it) => [...]}` con la lista exacta para ese tipo).

---

## 🆕 §16. Empleados — multi-rol con validación mínima de 1

El modelo de datos ya soporta múltiples roles por empleado (tabla `EmployeeRole`), pero la UI actual del frontend Vue solo permite asignar 1 rol al crear. Hay que extenderla para que:

- Un empleado pueda tener **uno o más roles** simultáneamente
- **Nunca pueda quedarse sin rol** (mínimo 1 obligatorio)
- Exista un modal dedicado **"Cambiar rol"** accesible desde el drawer del empleado

### Backend (ya disponible)

```ts
// EmployeeRole join table — ya existe en el modelo
class EmployeeRole {
  -employee: Employee
  -role: Role
}
```

Endpoints a usar:
- `POST /employee-roles { employeeId, roleId }` — añadir
- `DELETE /employee-roles?employeeId=...&roleId=...` — quitar
- Al cambiar, calcular el diff cliente-side (roles a añadir / a quitar) y enviar las llamadas correspondientes en paralelo.

### UX del modal "Cambiar rol"

Estructura (ver `vetrina/screens-empleados.jsx` función `VetChangeRoleModal`):

1. **Header**: icono ShieldCheck + título "Cambiar roles" + subtítulo `Modificar los roles asignados a {{ employee.name }}`

2. **Identidad card**: avatar 48px + nombre + código + email, fondo `var(--warm-100)` radius 11px

3. **Roles actuales** (label uppercase + pill counter "X roles"):
   - Stack horizontal de `RolePill size="lg"` con todos los roles actuales

4. **Asignar roles** (label uppercase + pill counter "X seleccionados"):
   - Hint debajo: "Un empleado puede tener varios roles. Debe tener al menos uno."
   - Lista vertical de **cards seleccionables tipo checkbox**:
     - Cuadrado checkbox (18×18px, radius 5px, border `var(--warm-300)`) a la izquierda
     - Dot coloreado del rol (8px)
     - Nombre del rol + badge "actual" (si ya estaba asignado)
     - Descripción del rol (12px gris)
   - Hover: borde amatista-300
   - Selected: borde amatista-600 + gradiente sutil amatista-50 + checkbox relleno

5. **Banner rojo** (solo si `selectedRoleIds.length === 0`):
   > ✕ "Un empleado no puede quedarse sin rol. Selecciona al menos uno."

6. **Banner ámbar** "Resumen de cambios" (solo si hay diferencias):
   ```
   🔔 Resumen de cambios
   + Añade: Veterinario/a, Recepcionista
   − Quita: Asistente veterinario
   ```

7. **Footer**: Cancelar · **Guardar cambios** (deshabilitado si sin selección o sin cambios)

### Validación

```ts
const canSave = computed(() =>
  selectedRoleIds.value.size > 0 &&            // al menos 1
  hasChanges.value                              // diff respecto al estado actual
)
```

### Tabla y drawer

Ya renderizan correctamente múltiples roles via `employee.roles.map((r) => <RolePill ...>)`. No requieren cambios.

### Avatar coloring

Como hay múltiples roles posibles, usar el color del **primer rol** (`employee.roles[0]?.code`) para teñir el avatar. Si quieres más adelante puedes mostrar un avatar segmentado o el color del "rol principal" si el modelo lo expusiera.

### Componente sugerido en Vue

`src/features/employees/components/ChangeRolesModal.vue` — recibe `:employee` y emite `@confirm="(roleIds: number[]) => ..."`. El listener en `EmpleadosView.vue` calcula el diff vs `employee.roles` actual y dispara los `create/delete` correspondientes a `/employee-roles`.

### Toast adaptativo al guardar

```ts
const label = newRoles.length === 1
  ? `${emp.name} ahora es ${newRoles[0].name}.`
  : `${emp.name} ahora tiene ${newRoles.length} roles: ${newRoles.map((r) => r.name).join(', ')}.`
toast.success('Roles actualizados', label)
```

---

## 🆕 §17. Laboratory test — status con checkbox "Muestra recolectada"

Hoy `LaboratoryTestStatus` solo tiene `PENDIENTE / COMPLETADO / CANCELADO`. Hay que añadir un estado intermedio para el caso real en que la muestra ya está tomada pero aún no fue procesada por el laboratorio.

### Backend — añadir valor al enum

```java
public enum LaboratoryTestStatus {
  PENDIENTE,
  PENDIENTE_POR_PROCESAR,  // ← NUEVO: muestra recolectada, esperando procesamiento
  COMPLETADO,
  CANCELADO
}
```

Y migración Liquibase / Flyway para añadir el valor al enum existente en BD si aplica.

### Frontend Vue — cambios

**Archivo principal**: `src/features/acciones/modals/LabFormModal.vue`

Añadir un checkbox tipo card seleccionable debajo del campo "Diagnóstico":

```vue
<label class="sample-collected" :class="{ checked: form.sampleCollected }">
  <span class="cb-box" :class="{ checked: form.sampleCollected }">
    <Check v-if="form.sampleCollected" :size="12" :stroke-width="3" />
  </span>
  <input type="checkbox" v-model="form.sampleCollected" class="sr-only" />
  <div>
    <div class="title">La muestra ya fue recolectada</div>
    <div class="desc">
      Marca esta opción si la muestra está tomada y solo falta procesarla en laboratorio.
      El estado pasará a <strong>Pendiente por procesar</strong>.
    </div>
  </div>
</label>
```

Al crear:
```ts
const status = form.sampleCollected
  ? 'PENDIENTE_POR_PROCESAR'
  : 'PENDIENTE'
await laboratoryTestApi.create({ ..., status })
```

Al editar: si el examen ya está `COMPLETADO` o `CANCELADO`, NO degradar el status — el toggle solo afecta cuando el estado actual es uno de los dos `PENDIENTE*`.

### Tabla de laboratorio (`LabListView.vue`)

Añadir columna "Estado" después de "Diagnóstico":

```vue
<th>Estado</th>
...
<td><LabStatusPill :status="item.status" /></td>
```

### Componente `LabStatusPill.vue` (nuevo)

```vue
<script setup lang="ts">
import type { LaboratoryTestStatus } from '@/types/domain'
defineProps<{ status: LaboratoryTestStatus }>()

const STATUS_LABEL: Record<LaboratoryTestStatus, string> = {
  PENDIENTE:              'Pendiente',
  PENDIENTE_POR_PROCESAR: 'Pendiente por procesar',
  COMPLETADO:             'Completado',
  CANCELADO:              'Cancelado',
}
const STATUS_TONE: Record<LaboratoryTestStatus, { bg: string; fg: string; dot: string }> = {
  PENDIENTE:              { bg: 'var(--warm-200)',     fg: 'var(--warm-700)',     dot: 'var(--warm-500)' },
  PENDIENTE_POR_PROCESAR: { bg: 'oklch(94% 0.07 80)',  fg: 'oklch(45% 0.13 70)',  dot: 'oklch(65% 0.15 75)' },
  COMPLETADO:             { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.15 150)' },
  CANCELADO:              { bg: 'oklch(94% 0.05 25)',  fg: 'oklch(48% 0.18 25)',  dot: 'oklch(60% 0.18 25)' },
}
</script>

<template>
  <span class="pill" :style="{ background: STATUS_TONE[status].bg, color: STATUS_TONE[status].fg }">
    <span class="dot" :style="{ background: STATUS_TONE[status].dot }" />
    {{ STATUS_LABEL[status] }}
  </span>
</template>
```

### Detail modal (read-only)

Incluir el campo "Estado" en `detailFields` con el pill renderizado en el value slot:

```ts
{ label: 'Estado', value: () => <LabStatusPill :status="item.status" /> }
```

### CSS de la card

Ver `vetrina/polish.css` §32 (selector `.vet-sample-collected`). Notable:
- Hover: borde `var(--amatista-300)`
- Checked: gradiente `linear-gradient(135deg, oklch(95% 0.06 80), oklch(96% 0.02 var(--hue)))` + borde ámbar `oklch(70% 0.13 75)`
- Checkbox 18×18 ámbar relleno cuando checked

### TypeScript types

En `src/types/domain.ts`:

```ts
export type LaboratoryTestStatus =
  | 'PENDIENTE'
  | 'PENDIENTE_POR_PROCESAR'
  | 'COMPLETADO'
  | 'CANCELADO'

export interface LaboratoryTest {
  date: string
  testTypeId: string
  quantity: number
  diagnosis: string
  status: LaboratoryTestStatus   // ← añadir
}
```

---

## 🆕 §18. Agenda — vista calendario (mes / semana / día)

Vista global tipo calendario que **agrega todos los eventos clínicos del sistema** (consultas, cirugías, vacunaciones, exámenes de laboratorio, imagen Dx, desparasitaciones, spa, hospitalizaciones multi-día) en una sola interfaz cronológica. Reemplaza al item "Agenda" del sidebar que hoy es placeholder "Pronto".

### Stack y dependencias

Implementar 100% con la stack ya disponible — **no añadir dependencias nuevas**:

| Cosa | Decisión |
|---|---|
| Framework | Vue 3.5 Composition API + `<script setup lang="ts">` |
| Routing | `vue-router` (ya en uso) |
| Iconos | `lucide-vue-next` (`Calendar`, `ChevronLeft`, `ChevronRight`, `ArrowLeft`, `Plus`, `X`) |
| Date input | `@vuepic/vue-datepicker` solo si añades un date picker explícito (el grid es propio) |
| Date math | Helpers locales (sin `date-fns`/`dayjs`). Ver `vetrina/screens-agenda.jsx` funciones `vetParseISO`, `vetStartOfMonth`, `vetStartOfWeek`, `vetAddDays`, `vetSameDay` — copy-paste a `composables/dateUtils.ts`. |
| HTTP | `axios` para los endpoints de agregación (ver §"API") |
| Estilos | CSS scoped en cada componente Vue, usando los tokens existentes (`var(--amatista-*)`, `var(--warm-*)`, `var(--font-serif)`) |
| Vuetify | Solo si lo necesitas para `v-btn` u otros primitives. El grid del calendario es CSS Grid nativo, no usa Vuetify. |

### Ruta nueva en `src/router/index.ts`

```ts
{
  path: 'agenda',
  name: 'agenda',
  component: () => import('@/features/agenda/views/AgendaView.vue'),
  meta: { permission: PERMISSIONS.AGENDA_READ }, // o sin permiso si todos los empleados deben verla
},
```

### Sidebar — mover "Agenda" de "Próximamente" a "TRABAJO"

**Archivo**: `src/features/dashboard/components/sidebar/AppSidebar.vue`

1. Quitar `{ label: 'Agenda', icon: Calendar }` del array `upcomingItems`.
2. Añadir un `<SidebarNavItem>` activo en la sección "TRABAJO" después de "Consulta":

```vue
<SidebarNavItem
  label="Agenda"
  :icon="Calendar"
  :active="route.name === 'agenda'"
  @click="router.push({ name: 'agenda' })"
/>
```

### Estructura de archivos en `src/features/agenda/`

```
src/features/agenda/
├── views/
│   └── AgendaView.vue                ← shell + state (cursor, view, filter)
├── components/
│   ├── AgendaToolbar.vue             ← Hoy / flechas / cursor label / toggle Mes·Semana·Día
│   ├── AgendaFilters.vue             ← filter chips por tipo de evento
│   ├── AgendaMonthView.vue           ← grid 7×6
│   ├── AgendaWeekView.vue            ← 7 columnas full-height
│   ├── AgendaDayView.vue             ← lista detallada
│   ├── AgendaEventChip.vue           ← chip individual (densa o normal)
│   └── AgendaEventDetailModal.vue    ← popover con detalle del evento
├── composables/
│   ├── useAgendaEvents.ts            ← agrega y memoiza eventos de todas las fuentes
│   └── dateUtils.ts                  ← startOfMonth, startOfWeek, addDays, sameDay, iso helpers
├── api/
│   └── agenda.api.ts                 ← endpoint(s) de agregación (ver §"API")
└── types/
    └── agenda.ts                     ← AgendaEvent interface
```

### Tipo de evento unificado

```ts
// src/features/agenda/types/agenda.ts
import type { ClinicalEventType } from '@/features/historia-clinica/types/historia'

export interface AgendaEvent {
  id: string                          // p.ej. "consultation-9001" o "hosp-401"
  type: ClinicalEventType             // reutiliza el enum de historia
  date: string                        // ISO yyyy-MM-dd
  endDate: string | null              // solo para hospitalización (multi-día)
  title: string
  subtitle: string
  pet: { id: string; name: string; specie: { name: string }; breed: { name: string } } | null
  owner: { id: string; name: string; phone: string } | null
}
```

### API — opciones

**Opción A — endpoint dedicado de agregación** (preferida si el backend lo permite):
```
GET /agenda?from=2026-05-01&to=2026-05-31
→ AgendaEvent[]
```

**Opción B — agregación client-side** (más sencilla con APIs existentes):
- En `useAgendaEvents.ts` llamar en paralelo a:
  - `consultationApi.listInRange({ from, to })`
  - `vaccinationApi.listInRange(...)`
  - `surgeryApi.listInRange(...)`
  - `laboratoryTestApi.listInRange(...)`
  - `diagnosticImagingApi.listInRange(...)`
  - `dewormingApi.listInRange(...)`
  - `hospitalizationApi.listInRange(...)`
  - `spaApi.listInRange(...)` (cuando se cree)
- Mapearlos a `AgendaEvent[]` con la función `vetBuildAgendaEvents` adaptada (ver prototipo).

> Recomendación: implementar Opción A si tienes acceso al backend. Es más eficiente y permite paginación/filtros server-side. Opción B es buena solución intermedia mientras se desarrolla el endpoint dedicado.

### AgendaView.vue (esqueleto)

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus } from 'lucide-vue-next'
import AgendaToolbar from '../components/AgendaToolbar.vue'
import AgendaFilters from '../components/AgendaFilters.vue'
import AgendaMonthView from '../components/AgendaMonthView.vue'
import AgendaWeekView from '../components/AgendaWeekView.vue'
import AgendaDayView from '../components/AgendaDayView.vue'
import AgendaEventDetailModal from '../components/AgendaEventDetailModal.vue'
import { useAgendaEvents } from '../composables/useAgendaEvents'
import type { AgendaEvent } from '../types/agenda'
import type { ClinicalEventType } from '@/features/historia-clinica/types/historia'

type ViewMode = 'month' | 'week' | 'day'

const view = ref<ViewMode>('month')
const previousView = ref<ViewMode | null>(null)
const cursor = ref(new Date())
const filter = ref<ClinicalEventType | 'ALL'>('ALL')
const selectedEvent = ref<AgendaEvent | null>(null)

const { events: allEvents, loading, error } = useAgendaEvents(cursor)

const filteredEvents = computed(() =>
  filter.value === 'ALL'
    ? allEvents.value
    : allEvents.value.filter((ev) => ev.type === filter.value),
)

function goToDay(day: Date) {
  cursor.value = day
  previousView.value = view.value
  view.value = 'day'
}
function setViewDirect(v: ViewMode) {
  if (v !== 'day') previousView.value = null
  view.value = v
}
function goBack() {
  if (previousView.value) {
    view.value = previousView.value
    previousView.value = null
  }
}
</script>

<template>
  <div class="agenda-page">
    <header class="agenda-header">
      <div>
        <div class="kicker">Calendario · Equipo</div>
        <h1 class="title">Agenda</h1>
        <p class="lead">
          Vista cronológica de consultas, cirugías, hospitalizaciones, vacunaciones,
          exámenes y spa.
        </p>
      </div>
      <button type="button" class="cta">
        <Plus :size="16" :stroke-width="1.8" />
        Nuevo evento
      </button>
    </header>

    <AgendaToolbar
      v-model:view="view"
      v-model:cursor="cursor"
      @set-view="setViewDirect"
    />
    <AgendaFilters v-model="filter" :events="allEvents" />

    <!-- ⚠ Botón "atrás" abajo de los filtros (no arriba) -->
    <button
      v-if="view === 'day' && previousView"
      type="button"
      class="back-btn"
      @click="goBack"
    >
      <ArrowLeft :size="14" :stroke-width="1.8" />
      {{ previousView === 'month' ? 'Volver al mes' : 'Volver a la semana' }}
    </button>

    <div class="agenda-body">
      <AgendaMonthView
        v-if="view === 'month'"
        :cursor="cursor" :events="filteredEvents"
        @day-click="goToDay"
        @event-click="(ev) => selectedEvent = ev"
      />
      <AgendaWeekView
        v-else-if="view === 'week'"
        :cursor="cursor" :events="filteredEvents"
        @day-click="goToDay"
        @event-click="(ev) => selectedEvent = ev"
      />
      <AgendaDayView
        v-else
        :cursor="cursor" :events="filteredEvents"
        @event-click="(ev) => selectedEvent = ev"
      />
    </div>

    <AgendaEventDetailModal
      :event="selectedEvent"
      @close="selectedEvent = null"
    />
  </div>
</template>
```

### Helpers en `composables/dateUtils.ts`

```ts
export const MONTHS_LONG = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const WEEKDAYS_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

export function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? new Date(+m[1], +m[2]-1, +m[3]) : null
}
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7 // lunes = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
}
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}
export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate()
}
```

### Comportamiento del "back button"

- **Posición**: después de `<AgendaFilters>`, antes del cuerpo del calendario (no encima del toolbar).
- **Cuándo aparece**: solo si `view === 'day'` y `previousView !== null` (es decir, el usuario llegó haciendo click en un día desde Mes o Semana).
- Si el usuario eligió "Día" directamente desde el toggle del toolbar, NO aparece (no hay donde volver).
- Texto adaptativo según origen: "Volver al mes" / "Volver a la semana".
- Al apretarlo: restaura `view = previousView` y limpia `previousView`.

### Color coding

Reutilizar la paleta `VET_EVENT_TYPES + TYPE_COLORS` de `src/features/historia-clinica/constants/eventTypes.ts`. Los chips, filtros y modal usan el mismo `bg/fg/dot` ya definidos.

### Hospitalización multi-día

En el aggregator, las hospitalizaciones tienen `endDate`. En el render de mes/semana, comprobar:

```ts
function eventsOn(day: Date) {
  const iso = isoFromDate(day)
  return events.value.filter((ev) =>
    (ev.endDate && ev.endDate !== ev.date)
      ? iso >= ev.date && iso <= ev.endDate
      : ev.date === iso
  )
}
```

Esto hace que la hospitalización aparezca en cada día del rango.

### CSS

Todo el CSS scoped en cada componente. Como referencia visual y selectores, ver `vetrina/agenda.css` en el prototipo. Puntos clave:

- **Mes**: `display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: minmax(110px, auto);`
- **Semana**: `display: grid; grid-template-columns: repeat(7, 1fr); min-height: 600px;`
- **Día actual**: background `var(--amatista-50)` en mes, número en círculo morado en semana
- **Toggle Mes/Semana/Día**: segmented control con background `var(--warm-150)` y opción activa con `var(--warm-50)` + sombra ligera
- **Cursor label** en `var(--font-serif)` 20px, text-transform capitalize
- **Back button**: ghost transparent con border-radius 9px, hover en `var(--amatista-50)` + border-color `var(--amatista-300)` + color `var(--amatista-700)`

### Permiso a añadir (opcional)

En `src/constants/permissions.ts`:
```ts
AGENDA_READ: 'agenda.read',
```

### TypeScript types

Reusar `ClinicalEventType` de `historia-clinica/types/historia.ts`. No crear duplicados.

### Pruebas básicas

- Click en un día de Mes → vista Día con back button "Volver al mes"
- Click en un día de Semana → vista Día con back button "Volver a la semana"
- Toggle directo Mes → Día desde toolbar → **sin** back button
- Hospitalización del 11-12 may aparece en ambos días del mes
- Filtrar por "Vacunación" → solo se ven las vacunaciones en todas las vistas
- Click en evento → modal con paciente, propietario, notas

---

## §15. Laboratorio interno — procesamiento de muestras

Nueva sección de primer nivel en el sidebar (grupo **LABORATORIO** → "Bandeja de muestras").
Es el lado del laboratorio que **procesa** las muestras que el veterinario solicita
(complementa la acción clínica "Laboratorio" que solo crea la solicitud).

**Archivos prototipo de referencia**:
- `vetrina/data-lab.jsx` — modelo de datos + cola + histórico simulado (>500 registros)
- `vetrina/screens-lab.jsx` — tablero kanban, histórico, modales
- `vetrina/lab.css` — estilos

**Ruta**: `/dashboard/laboratorio` (name: `laboratorio-interno`, `meta: { requiresAuth: true }`).

### Estructura sugerida en Vue

```
src/features/laboratorio/
  views/LaboratorioView.vue          ← tabs: Bandeja activa | Histórico
  components/
    LabBoard.vue                     ← kanban 3 columnas
    LabSampleCard.vue                ← tarjeta de muestra
    LabHistory.vue                   ← tabla + filtros + paginación
    LabResultsModal.vue              ← cargar archivos adjuntos
    LabDetailModal.vue               ← detalle read-only + acciones
    LabPriorityPill.vue
  composables/useLaboratorio.ts      ← estado + transiciones
  types/lab.ts
```

### Modelo de datos (campos)

```ts
type LabSampleStatus = 'EN_COLA' | 'EN_PROCESO' | 'POR_VALIDAR' | 'VALIDADO'
type LabPriority = 'RUTINA' | 'URGENTE' | 'STAT'

interface LabSample {
  id: number
  code: string                 // M-2026-0512
  animalId: string
  testType: string
  priority: LabPriority
  collectedAt: string          // fecha/hora recolección
  collectedBy: string
  status: LabSampleStatus
  startedAt: string | null
  attachments: LabAttachment[] // resultados = archivos (PDF/imagen), NO tabla de parámetros
  validatedBy: string | null
  validatedAt: string | null
}

interface LabAttachment { name: string; size: string; kind: 'pdf' | 'image' }
```

> **Importante**: por decisión de diseño NO hay campos de tipo de muestra, calidad,
> técnico, equipo/analizador, tabla de parámetros ni conclusión. El resultado es
> simplemente uno o más **archivos adjuntos** (PDF/imagen) + la firma de validación.

### Ciclo de vida (transiciones)

| Estado | Acción disponible | Transición |
|---|---|---|
| `EN_COLA` | "Tomar muestra" | → `EN_PROCESO` (set `startedAt`) — directo, sin pedir datos |
| `EN_PROCESO` | "Cargar resultados" | → `POR_VALIDAR` (adjunta archivos) |
| `POR_VALIDAR` | "Devolver" / "Validar y firmar" | → `EN_PROCESO` / `VALIDADO` (set `validatedBy`, `validatedAt`) |
| `VALIDADO` | — | sale del tablero, va al histórico |

### UI: dos pestañas (clave de escalabilidad)

**Pestaña "Bandeja activa"** — Kanban de **solo 3 columnas**: En cola, En proceso, Por validar.
Volumen siempre acotado. Al validar, la muestra **sale del tablero** y entra al histórico.
Esto evita que la columna "Validado" crezca sin límite.

**Pestaña "Histórico"** — tabla densa con TODOS los validados:
- Por defecto muestra **todos** los registros **paginados** (12/página). NO hay buscador de texto libre.
- Filtro **opcional** por paciente: botón "Filtrar por paciente" → modal con el cascade
  `PatientCascadePicker` (propietario → mascota). Al seleccionar, chip con mascota + dueño + X.
- Filtros secundarios: tipo de examen, prioridad, rango de fechas, botón "Limpiar".
- Columna Paciente visible (porque por defecto se ven todos).
- Click en fila → mismo `LabDetailModal`.

### ⚠️ Paginación server-side (CRÍTICO en producción)

El prototipo carga los 500+ registros en memoria por simplicidad. **En Vue real, el
histórico DEBE paginar del lado del servidor**. El endpoint recibe:

```
GET /api/laboratory-tests?status=VALIDADO
    &page=1&pageSize=12
    &animalId=<id>            (filtro opcional por paciente)
    &testType=<str>&priority=<str>
    &dateFrom=<iso>&dateTo=<iso>
```

La bandeja activa sí puede cargar todo (poco volumen). Para tablas con scroll muy largo,
considerar `@tanstack/vue-virtual` (no está en tus deps actuales; solo si hace falta).

### Conexión con la acción clínica "Laboratorio"

Las solicitudes marcadas `PENDIENTE_POR_PROCESAR` (el check "muestra recolectada"
del form de laboratorio) entran automáticamente a la columna **En cola** de esta bandeja.
Cuando se valida, el resultado queda disponible en la historia clínica del paciente.

### CSS

Scoped por componente. Referencia: `vetrina/lab.css`. Puntos clave:
- **Kanban**: `grid-template-columns: repeat(3, 1fr)` con borde superior coloreado por estado.
- **Tabs**: border-bottom con tab activo en `var(--amatista-700)` + border 2px.
- **Tabla histórico**: zebra hover, código en `var(--font-mono)`, paginación « ‹ N › ».
- **Prioridad pill**: Rutina (warm), Urgente (ámbar), STAT (rojo, con icono campana).

### Pruebas básicas

- Bandeja activa muestra solo 3 columnas (sin "Validado")
- Tomar muestra (En cola) → pasa a En proceso directo
- Cargar resultados → adjuntar archivo → pasa a Por validar
- Validar → desaparece del tablero, aparece en Histórico
- Histórico por defecto muestra todos paginados, sin buscador de texto
- "Filtrar por paciente" → modal cascade → tabla filtrada con chip
- Filtros tipo/prioridad/fecha + Limpiar funcionan

---

## §16. Hospitalización — internación y administración de tratamiento

Nueva sección de primer nivel en el sidebar (grupo **HOSPITALIZACIÓN** → "Pacientes
internados"). Es la gestión de animales hospitalizados: plan de tratamiento, registro
de administración de dosis/procedimientos (MAR), observaciones y evolución.

**Archivos prototipo de referencia**:
- `vetrina/data-hospital.jsx` — modelo de datos + helpers (intervalo, shift de hora, semana)
- `vetrina/screens-hospital.jsx` — board, pills, modales (medicamento, procedimiento, evolución, observación), store `useVetHospState`
- `vetrina/screens-hospital-detail.jsx` — detalle del paciente + pantalla de tratamiento (calendario semanal)
- `vetrina/hospital.css` — estilos

**Ruta**: `/dashboard/hospital` (name: `hospital-ward`, `meta: { requiresAuth: true }`).

### Estructura sugerida en Vue

```
src/features/hospitalizacion/
  views/HospitalizacionView.vue       ← board | detalle de paciente
  components/
    HospBoard.vue / HospCard.vue      ← tablero de internados
    HospDetail.vue                    ← overview: acceso a tratamiento + observaciones + evolución
    TreatmentScreen.vue               ← pantalla aparte: calendario semanal + planes
    WeeklyMAR.vue                     ← calendario (eje Y horas × días) drag&drop
    MedFormModal.vue / ProcFormModal.vue
    EvolutionModal.vue / ObservationModal.vue
    DischargeDialog.vue
  composables/useHospitalizacion.ts   ← estado + transiciones + recálculo de pauta
  types/hospital.ts
```

### Modelo de datos (campos)

```ts
type HospStatus = 'ESTABLE' | 'OBSERVACION' | 'CRITICO'
type Pauta = 'FIJO' | 'INTERVALO'
type DurMode = 'DIAS' | 'TOMAS' | 'INDEF'
type DoseStatus = 'APLICADA' | 'PENDIENTE' | 'ATRASADA' | 'OMITIDA'

interface HospPatient {
  id: number; animalId: string; kennel: string
  admittedAt: string; reason: string; diagnosis: string
  attendingVet: string; status: HospStatus
  medications: MedOrder[]
  procedures: ProcOrder[]
  observations: Observation[]   // historial de indicaciones (no dar comida sólida, etc.)
  evolution: EvolutionNote[]     // notas de turno (SIN signos vitales — se quitaron)
}

interface MedOrder {
  id: number; name: string; dose: string
  frequency: string              // 'c/8h', 'c/12h', 'Continua'…  (NO hay campo "vía")
  pauta: Pauta                   // FIJO | INTERVALO
  durMode: DurMode; durValue: string   // 'DIAS'+'3' | 'TOMAS'+'15' | 'INDEF'
  startDate: string; startTime: string  // solo inicio (NO hay fecha/hora fin)
  notes: string
  schedule: DoseSlot[]
}
interface ProcOrder { /* igual que MedOrder pero sin `dose` */ }
interface DoseSlot { id: string; time: string; status: DoseStatus; givenBy: string|null; givenAt: string|null }
interface Observation { id: number; date: string; time: string; author: string; text: string }
interface EvolutionNote { id: number; date: string; time: string; author: string; notes: string }
```

### Conceptos clave de diseño

**1. Tipo de pauta (FIJO vs INTERVALO)** — resuelve el problema de las dosis tardías:
- `FIJO`: las tomas se mantienen en horas de reloj. Aplicar tarde NO mueve las siguientes.
- `INTERVALO`: cada toma se cuenta desde la administración real de la anterior. Al aplicar
  (o mover) una toma, las pendientes posteriores se **recalculan** sumando el intervalo
  (`c/Nh` → N horas) desde la hora real. Ver `recalcInterval()` en el store.
- Ambos formularios muestran un **disclaimer** que explica la pauta seleccionada.

**2. Duración** — `DIAS` ("cada 6h por 3 días"), `TOMAS` ("hasta completar 15 tomas"),
o `INDEF` ("hasta nueva orden"). NO se usa fecha/hora de fin.

**3. Calendario semanal (MAR)** — pantalla aparte (botón "Administrar" desde el overview):
- Eje Y = **horas**; columnas = **días** (semana, con hoy resaltado).
- En cada celda hora×día, **chips con el nombre** de la orden (medicamento o procedimiento).
- Medicamentos en color normal; procedimientos en **tinte teal** (toma de tensión, diuresis…).
- Estados: aplicada (verde+check), programada futura (gris), pendiente/atrasada (clicable, hoy).
- Click en chip de hoy → marca aplicado. **Drag de un chip pendiente a otra hora** → SIEMPRE
  abre un modal de confirmación que explica el efecto según la pauta:
  - FIJO → "se mueve solo esta toma" (1 botón de confirmar).
  - INTERVALO → "Solo esta toma" / "Esta y las siguientes" (recalcula la cadena).
- `overflow-x: auto` + `min-width: max-content` para que la columna de hoy sea alcanzable.

**4. Overview del paciente** (sin KPIs dispersos): header + diagnóstico + tarjeta de acceso
"Tratamiento y administración de dosis" (con botón **Administrar** explícito que lleva al
calendario) + **Observaciones** (historial de indicaciones, con modal de chips frecuentes)
+ **Notas evolutivas** (timeline; el modal de nota ya NO pide signos vitales).

**5. Plan de medicamentos / Plan de procedimientos** — ambas tablas editables (CRUD) están
en la pantalla de tratamiento, debajo del calendario. "Añadir medicamento"/"Añadir
procedimiento" en el header de cada tabla.

**6. Alta** — `DischargeDialog` saca al paciente del tablero (queda en historia clínica).

### ⚠️ Notas para producción

- La "hora actual" es fija (`VET_HOSP_NOW = '15:30'`, día `2026-05-23`) para demostrar
  dosis atrasadas y el resaltado de "hoy". En Vue usar la fecha/hora real.
- El recálculo de pauta INTERVALO y la generación de `schedule` a partir de
  `frequency` + `startTime` + `durMode/durValue` deben vivir en el backend o en un
  composable bien testeado (el prototipo trae los slots precomputados en los mocks).
- Drag-and-drop: el prototipo usa HTML5 nativo (`draggable` + `onDragOver/onDrop`).
  En Vue puede mantenerse nativo o usar `vuedraggable`; no requiere libs nuevas.

### CSS

Referencia `vetrina/hospital.css`. Puntos clave:
- **Board**: `grid auto-fill minmax(280px,1fr)`, status pill (estable/observación/crítico).
- **Calendario**: grid `64px repeat(7, minmax(96px,1fr))`, chips `.vet-wk-chip` con
  variantes `applied/pending/overdue/future` + `.proc` (teal). Droppable: outline dashed.
- **Disclaimer pauta**: `.vet-pauta-help` (borde izq amatista). **Modal mover**: `.vet-move-opt`.
- **Observaciones**: `.vet-obs-text` con fondo ámbar + borde izq.

### Pruebas básicas

- Board lista internados con jaula/estado/alerta de dosis
- "Administrar" → calendario semanal (horas × días) con meds + procedimientos
- Click en chip pendiente de hoy → aplicado; INTERVALO recalcula siguientes
- Drag chip a otra hora → modal según pauta (FIJO 1 opción / INTERVALO 2 opciones)
- Añadir medicamento: sin vía, sin fecha fin, con pauta + disclaimer + duración (días/tomas/indef)
- Añadir procedimiento: mismos campos sin "dosis"
- Observaciones: historial + modal con chips frecuentes
- Nota evolutiva: solo texto (sin signos vitales)
- Dar de alta → sale del tablero

### Adendas al flujo de hospitalización (cambios posteriores)

- **Procedimientos con horario**: `ProcOrder` también tiene `schedule[]`, `pauta`, `durMode/durValue`.
  Aparecen en el calendario semanal con **tinte teal** junto a los medicamentos.
- **Tipo de pauta** (`FIJO` | `INTERVALO`) y **duración** (`DIAS` | `TOMAS` | `INDEF`) aplican a
  medicamentos Y procedimientos. El form NO tiene "vía" ni fecha/hora de fin; solo inicio + duración.
- **Confirmación al aplicar**: click en un chip pendiente/atrasado del día → modal
  "¿Registrar dosis aplicada?" / "¿Registrar procedimiento?" antes de marcar (con nombre, dosis, hora).
- **Drag&drop**: SIEMPRE abre modal explicando el efecto según pauta (FIJO mueve solo esa toma;
  INTERVALO ofrece "Solo esta" / "Esta y las siguientes" con recálculo).
- **Observaciones**: el modal ya NO tiene chips de "Frecuentes", solo el textarea.

---

## §17. Tienda (Petshop) — POS + Inventario + Servicios + Promociones

Grupo **TIENDA** en el sidebar con 4 secciones. Combina retail (productos con stock) y
facturación de servicios clínicos, con un motor de promociones.

**Archivos prototipo**:
- `vetrina/data-shop.jsx` — productos, servicios, categorías, ventas, IVA, helpers (`vetMoney`)
- `vetrina/data-promos.jsx` — promociones + `vetApplyPromo()` + `vetPromoStatus()`
- `vetrina/screens-shop.jsx` — store `useVetShopState` + tarjetas (producto/servicio) + modales (pago, recibo)
- `vetrina/screens-shop-pos.jsx` — Punto de venta (catálogo + ticket)
- `vetrina/screens-shop-inventory.jsx` — Inventario (tabla + CRUD + reabastecer)
- `vetrina/screens-shop-services.jsx` — admin de Servicios
- `vetrina/screens-shop-promos.jsx` — admin de Promociones + editor de paquetes
- `vetrina/screens-shop-root.jsx` — wrapper que monta el store y enruta por tab
- `vetrina/shop.css` — estilos

**Rutas**: `tienda-pos` `/dashboard/tienda`, `tienda-inventario` `/dashboard/tienda/inventario`,
`tienda-servicios` `/dashboard/tienda/servicios`, `tienda-promociones` `/dashboard/tienda/promociones`.

### Estructura sugerida en Vue

```
src/features/tienda/
  views/{POSView, InventarioView, ServiciosView, PromocionesView}.vue
  components/{ProductCard, ServiceCard, BundleCard, Ticket, PayModal, ReceiptModal,
              ProductFormModal, ServiceFormModal, PromoFormModal, BundleEditor}.vue
  composables/useTienda.ts          ← store GLOBAL (Pinia): products, services, promos, sales
  types/tienda.ts
```

### Modelo de datos

```ts
interface Product { id; name; sku; category; costPrice; salePrice; stock; minStock; supplier; expiryDate?; notes }
interface Service { id; name; category; salePrice; notes? }
interface Sale { id; code; date; customerId?; items: SaleItem[]; discount; paymentMethod }
interface SaleItem { kind: 'product'|'service'|'bundle'; id; qty; unitPrice; name }
interface Promo {
  id; name; type: 'DESCUENTO'|'PRECIO'|'PAQUETE'; active;
  target?: 'categoria'|'producto'|'servicio'; categoryId?; targetId?;
  value?; valueKind?: 'PCT'|'FIJO'; specialPrice?;        // descuento / precio especial
  bundlePrice?; bundleItems?: {kind;id;qty}[];            // paquete
  startDate?; endDate?;                                   // vigencia → estado calculado
}
```

### Puntos clave

- **POS** dos columnas: catálogo (toggle Productos / Servicios / Paquetes + búsqueda + categorías)
  y ticket (líneas con ± cant., cliente opcional vía cascade, descuento manual, subtotal,
  ahorro por promos, IVA 19%, total). Cobro → modal de pago (efectivo calcula cambio) → recibo.
- **IVA** = `VET_SHOP_TAX_RATE` (0.19). Configurable.
- **Promociones** (`vetApplyPromo`): al renderizar cada producto/servicio se calcula la mejor
  promo activa (DESCUENTO %/$ o PRECIO especial) → precio tachado + badge "Promo". Los PAQUETE
  se agregan como una línea. El descuento manual del ticket va sobre el total (se suma al ahorro).
  ⚠️ Importante: la comparación de `kind` para servicios usa el string **'servicio'** (español)
  en todo el flujo (bug ya corregido en el proto).
- **Estado de promo** se calcula por fecha (`vetPromoStatus`): ACTIVA / PROGRAMADA / EXPIRADA / INACTIVA.
- **Inventario**: estado de stock OK/BAJO/AGOTADO, banner de alertas (stock bajo + por vencer ≤120d),
  filtros, paginación, CRUD, "Reabastecer". Los AGOTADO no se pueden vender.

### ⚠️ Producción

- En el proto el store se monta **por pantalla** (`useVetShopState` en el wrapper), así que los
  cambios de productos/servicios/promos NO persisten al navegar entre tabs. En Vue usar **un store
  global (Pinia)** para que sí persistan y el POS vea siempre el catálogo actualizado.
- Descontar stock, generar `code` de venta y registrar la venta deben ir contra el backend.
- Decisiones tomadas (ajustables): inventario de tienda separado del de clínica; solo venta de
  contado (sin caja/turnos); promos generales (sin precio por cliente ni límite de usos).

### Pruebas básicas

- POS cobra productos (baja stock) + servicios + paquetes en un mismo ticket
- Promo activa → precio tachado + badge; ticket/recibo muestran "Ahorro por promociones"
- Servicios y Promociones: CRUD; switch activa/desactiva promo; estados por fecha
- Inventario: alertas, filtros, paginación, reabastecer

