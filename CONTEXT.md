# VetSoftwarePublicFront — Estado del proyecto

> Snapshot al 2026-05-24. Este archivo complementa al `CLAUDE.md` con el estado **actual**: qué features existen, qué falta, qué se ha hecho recientemente. Mantenerlo al día tras hitos.

## Stack y rol

Front del **empleado de clínica** (veterinario, recepcionista, admin de empresa). Pese al nombre "Public", **NO es marketing público**. Consume el backend Spring Boot en `http://localhost:8080/api/v1`.

- Vue 3.5 + TypeScript 6 + Vite 8 + Vuetify 3.7 + vue-router 4.6 + Axios 1.15
- **Sin Pinia** — estado vía `ref()` module-scoped en composables
- Iconos: `lucide-vue-next` + `@mdi/font`
- Datepicker: `@vuepic/vue-datepicker`

Repos hermanos:

- `../VetSoftware/` — Backend único.
- `../VetSoftwareFront/` — Front del admin de plataforma (no confundir).

## Git state

- **Branch**: `master`
- **HEAD**: `14b7328` (2026-05-18) — `feat(historia-clinica): wizard owner -> pet -> timeline por mes`
- **Working tree limpio**
- **Sin CI**. Sólo Husky + commitlint local.

## Features bajo `src/features/`

| Feature                | Propósito                                                                                                                                    | Endpoints clave                                                                                                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth/`                | Login del empleado + hidratación de permisos                                                                                                 | `POST /auth/login/employee`, `GET /auth/me`                                                                                                                                                                                                                                                                   |
| `registration/`        | Signup público de empresa nueva                                                                                                              | `POST /register`, `/countries`, `/countries/{id}/states`, `/states/{id}/cities`                                                                                                                                                                                                                               |
| `dashboard/`           | Wizard de Nueva Consulta + catálogos + 7 modales clínicos. Sub-features: `consulta/nueva/`, `consulta/historial/`, `vacunacion`, `hospital`. | `/owners`, `/animals`, `/consultations`, `/prescriptions`, `/medicament-prescriptions`, todos los procedimientos clínicos (vaccinations, hospitalizations, dewormings, laboratory-tests, surgeries, diagnostic-imagings), `*-types/available`, `/species`, `/breeds`, `/animal-colors`, `/consultation-types` |
| `employees/`           | Gestión de empleados de la empresa                                                                                                           | `/employees`, `/employees/by-company`, `POST /employee-roles` (asignación al crear)                                                                                                                                                                                                                           |
| `roles/`               | Gestión de roles y permisos company-scoped                                                                                                   | `/roles/by-company`, `/permissions/by-company`, `/modules`, `/sub-modules`, `/role-permissions`, `PUT /role-permissions/by-role/{id}`                                                                                                                                                                         |
| `acciones/` ⭐         | Pantallas standalone para procedimientos clínicos sin consulta abierta. Vistas: Lab, Imagen, Vacuna, Hosp, Desparasitación, Cirugía.         | Reutiliza APIs clínicos del wizard + `GET /by-animal/{id}` + `PATCH /{id}/status` (en labs/cirugías/imágenes)                                                                                                                                                                                                 |
| `historia-clinica/` ⭐ | Wizard owner→pet→timeline mensual                                                                                                            | `GET /animals/{animalId}/clinical-history?types&from&to`                                                                                                                                                                                                                                                      |

⭐ = añadido desde 2026-05-10.

## Cliente HTTP

`src/services/http/http.client.ts`:

- `baseURL = ${VITE_API_URL ?? ''}/api/v1`
- Request interceptor: inyecta `Authorization: Bearer <token>` desde `localStorage['vetsoft.auth']` (JSON `{token,type}`). Activa `pushLoader()` salvo `config.skipGlobalLoader`.
- Response interceptor: pop loader. En **401** (URL distinta a `/auth/login`) borra storage y redirige a `/login`.
- Helpers: `getProblemDetailMessage()`, `getProblemDetailFieldErrors()` (RFC 7807).
- Único opt-out de loader: `ownerApi.search()` con `skipGlobalLoader: true`.

## Autenticación

- **Storage**: `localStorage['vetsoft.auth']` con shape `{ token: string, type: 'EMPLOYEE'|'SYSTEM_USER' }` (interfaz `AuthSession`).
- **Login**: `POST /auth/login/employee` con `{ employeeCode, password }`.
- **`useAuth`** (`src/features/auth/composables/useAuth.ts`): composable singleton con `session`, `me`, `bootLoading`, `isAuthenticated`, `companyId`, `subjectId`, `login()`, `logout()`, `refreshMe()`. Decodifica JWT manualmente para fallback antes de cargar `/me`.
- **`refreshMe()`** se invoca en `router.beforeEach` cada navegación si hay sesión (deduplicado con `bootInFlight`).
- **Permisos**: `me.permissions: string[]` hidrata `useAuthorization()` con `can/canAny/canAll/isAdmin`. Catálogo canónico en `src/constants/permissions.ts`.
- **Logout**: `localStorage.clear() + sessionStorage.clear() + window.location.assign('/login')` (hard redirect).

## Routing

Single file `src/router/index.ts`. Guards globales:

1. Si autenticado → `refreshMe()` siempre.
2. `meta.requiresAuth` sin sesión → `login`.
3. `meta.guestOnly` con sesión → `home`.
4. `meta.permission` (string) — si no es admin y no incluye el permiso → `home`.
5. `meta.permissionsAny` (string[]) — análogo OR.

Rutas principales (todas bajo `/dashboard` con layout `AppLayout.vue`):

- `home`
- `consulta/nueva` y `consulta/nueva/exito` (`consultation.create`)
- `consulta/historial/...` (wizard owner→pet→timeline)
- `consulta/vacunacion`, `consulta/hospital`
- `acciones/{laboratorio,imagen,vacunacion,hospitalizacion,desparasitacion,cirugia}` (gating por `<feature>.create`)
- `empleados` (`employee.read`)
- `roles` (`rolePermissions.read`)

## Tipos clave

- `src/types/domain.ts` — enums: `Gender`, `WeightUnit`, `AnimalType`, `ReproductiveState`, `HospitalizationType`, `ReasonLeaving`, `DewormingType`, `EmployeeStatus`. Interfaces para todo el modelo de dominio.
- `src/features/historia-clinica/types/historia.ts` — enum `ClinicalEventType` con 9 valores (`CONSULTATION`, `SURGERY`, `VACCINATION`, `DEWORMING`, `HOSPITALIZATION`, `LABORATORY_TEST`, `DIAGNOSTIC_IMAGING`, `PRESCRIPTION`, `SPA`).
- `src/types/api.types.ts` — `ProblemDetail`, `ProblemDetailFieldError`.

## Mappers

Patrón `id:number → string` vivo en:

- `src/features/employees/api/employee.mapper.ts`
- `src/features/dashboard/views/consulta/nueva/api/owner.mapper.ts`
- `src/features/dashboard/views/consulta/nueva/api/animal.mapper.ts`

`registration/` y `roles/` no usan mapper.

## Workarounds vivos por gaps de backend

| Workaround                                                        | Por qué                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Botón "Restablecer contraseña" en `EmpleadoDrawer.vue` `disabled` | No existe `/employees/{id}/reset-password`                         |
| `useEmployees.setStatus` hace PUT completo                        | No existen `/employees/{id}/activate` ni `/deactivate`             |
| Búsqueda de empleados client-side en `EmpleadosTable.vue`         | No existe `/employees/search?q=`                                   |
| `RoleSelector.vue` orphan/disabled (cambio de rol post-creación)  | Backend tiene endpoints, falta wire en UI                          |
| Constante `ROLES` hardcoded en `constants/employee-roles.ts`      | Sólo fallback visual; se puede borrar tras conectar `RoleSelector` |
| `useEmployees.update()` reinyecta `roles` desde cache             | El PUT no los devuelve                                             |

## Cambios desde 2026-05-10

7 commits relevantes:

1. **Pantalla de empleados conectada al backend** (`c3ab02f`, 2026-05-10).
2. **Pantalla de roles conectada** (`a2010c3`, 2026-05-14).
3. **Modales clínicos del wizard expandidos + roles company-scoped** (`1aa2fc8`, 2026-05-15).
4. **Roles: scope por company, permisos embebidos, ADMIN readonly** (`bbf7e0d`, 2026-05-15).
5. **Sync masivo de permisos + rol al crear empleado** (`a2ddbc5`, 2026-05-16).
6. **Auth: hidratar permisos desde `/me`, gating UI, simplificar cache** (`5cd87fa`, `8948c37`, `0c55398`, 2026-05-16).
7. **Acciones standalone** (`b406e59`→`4db8d0f`, 2026-05-16/18) — feature `acciones/`.
8. **Historia clínica** (`14b7328`, 2026-05-18) — feature `historia-clinica/`.

## Tests y CI

- **Cero tests escritos**. Sin vitest/jest instalado.
- **Sin CI**. Sólo Husky + commitlint local.
- Scripts: `dev`, `build` (`vue-tsc -b && vite build`), `preview`, `lint`, `format`.

## Código zombie a considerar limpiar

- `RoleSelector.vue` + constante `ROLES` en `constants/employee-roles.ts`: sólo se importan entre sí, no se montan en ningún drawer. Borrar tras decidir flujo de cambio de rol.
