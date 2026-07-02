# PRD — VetSoftwarePublicFront (App del empleado de clínica veterinaria)

> Documento de producto para generación de plan de pruebas (TestSprite).
> Objetivo del test: **frontend** `VetSoftwarePublicFront`.
> Fecha: 2026-07-02.

---

## 1. Propósito del producto

VetSoftwarePublicFront es la **aplicación web operativa que usan los empleados de una
clínica veterinaria** (veterinarios, auxiliares, recepcionistas). Pese a llamarse
"PublicFront", **no es un sitio de marketing**: es la herramienta de trabajo diaria de
la clínica.

Con ella el personal:

- Registra propietarios y sus mascotas.
- Atiende consultas clínicas y adjunta procedimientos (recetas, laboratorio, imágenes,
  vacunas, desparasitaciones, cirugías, hospitalización).
- Consulta la historia clínica unificada de cada mascota (línea de tiempo).
- Administra la sala de internados (hospitalización) con calendario de medicación.
- Opera una tienda / punto de venta (POS) de productos y servicios.
- Lleva **cuentas abiertas** por propietario (cargos + abonos) y las cierra cobrando.
- Emite **facturación electrónica DIAN** (Colombia) a través del proveedor MATIAS.
- Gestiona empleados y los permisos de sus roles dentro de la empresa.

Cada empleado pertenece a **una empresa (clínica)**. Todos los datos están aislados por
empresa (multi-tenant): el backend inyecta el `companyId` desde el token JWT.

### Producto hermano (fuera de alcance de este test)

Existe un segundo frontend, `VetSoftwareFront`, que es el **panel del operador de la
plataforma** (crea empresas, membresías, módulos, catálogos globales). No se prueba aquí.
El backend Spring Boot (`VetSoftware`, `http://localhost:8080/api/v1`) es compartido por
ambos fronts. Este PRD describe **solo** la app del empleado de clínica.

---

## 2. Usuarios y roles

| Rol | Descripción | Acceso |
|---|---|---|
| **Administrador de la clínica** | Empleado con permiso `admin.all`. | Ve y usa todo el sistema sin restricción de permisos. |
| **Veterinario** | Atiende consultas y procedimientos clínicos. | Depende de los permisos asignados a su rol. |
| **Auxiliar / Recepcionista** | Registro de propietarios/mascotas, agenda, cobros, tienda. | Depende de los permisos asignados a su rol. |

**Regla clave de autorización:** cada ruta y cada acción está protegida por un **código de
permiso**. Un usuario ve/usa una pantalla solo si tiene el permiso requerido **o** si es
admin (`admin.all`). Si intenta entrar a una ruta sin permiso, el router lo **redirige a
`home`** (no muestra error 403; simplemente no lo deja entrar).

---

## 3. Stack técnico y entorno

- **Frontend:** Vue 3.5 (`<script setup lang="ts">`), TypeScript estricto, Vite 8,
  Vuetify 3.7, Pinia 3 (estado global), Vue Router 4, Axios 1.15.
- **Backend (dependencia):** Spring Boot 3 + MySQL + Redis, en `http://localhost:8080`.
  - `baseURL = ${VITE_API_URL ?? ''}/api/v1`.
- **Comandos:** `npm run dev` (dev server), `npm run build` (`vue-tsc -b && vite build`).

### Formato de error del backend (RFC 7807 — ProblemDetail)

Todas las respuestas de error tienen esta forma y el front las interpreta:

```json
{
  "type": "...", "title": "...", "status": 409,
  "detail": "mensaje legible",
  "instance": "/api/v1/open-accounts",
  "code": "OWNER_ALREADY_HAS_OPEN_ACCOUNT",
  "traceId": "...",
  "errors": [{ "field": "email", "message": "inválido" }]
}
```

El campo `code` es el discriminador de negocio que el front usa para mostrar mensajes
específicos (ej. `409 OWNER_ALREADY_HAS_OPEN_ACCOUNT`, `409 INVALID_STATE`,
`409 CONCURRENT_MODIFICATION`).

---

## 4. Autenticación y sesión

- **Login:** `POST /auth/login/employee` con body `{ employeeCode, password }`.
  - Éxito → devuelve `{ token, type }`. Se guarda en `localStorage['vetsoft.auth']`
    como JSON `{ token, type }`.
  - El cliente decodifica el JWT localmente (`decodeJwt`) para obtener `companyId` y `sub`
    antes de que cargue el perfil.
- **Contexto de usuario:** `GET /auth/me` devuelve
  `{ id, type, companyId, name, employeeCode, permissions: string[] }`.
  - Se llama en `router.beforeEach` en cada navegación si hay sesión (deduplicado con un
    flag `bootInFlight`). Hidrata los permisos que gatean la UI.
- **Inyección de token:** el interceptor de request añade `Authorization: Bearer <token>`.
- **Expiración / 401:** el interceptor de response ante un `401` **limpia el token y
  redirige a `/login`** (excepto si el request era a `/auth/login*`).
- **Logout:** `localStorage.clear() + sessionStorage.clear()` y hard-redirect a `/login`.

### Registro de empresa (self-service)

Ruta `/signup`. Permite dar de alta una **nueva clínica** (empresa + primer empleado
admin). Usa cascada geográfica: `GET /countries` → `/countries/{id}/states` →
`/states/{id}/cities`. Endpoint de alta: `POST /register`.

---

## 5. Modelo de permisos (gating de la UI)

El front trae un catálogo canónico de códigos de permiso en
`src/constants/permissions.ts`. El composable `useAuthorization()` expone:
`can(perm)`, `canAny([...])`, `canAll([...])`, `isAdmin` (compara contra `admin.all`).

Permisos relevantes por área (los que gatean rutas están marcados con la ruta):

| Área | Permisos |
|---|---|
| Admin global | `admin.all` (bypass total) |
| Consulta | `consultation.create`, `prescription.create`, `medicamentPrescription.create` |
| Vacunación | `vaccination.create/update/delete` |
| Hospitalización | `hospitalization.create/read/update/delete` |
| Desparasitación | `deworming.create/update/delete` |
| Imagen diagnóstica | `diagnosticimaging.create/update/delete` |
| Laboratorio | `laboratoryTest.create/read/update/delete` |
| Cirugía | `surgery.create/update/delete` |
| Spa | `spa.create/update/delete` |
| Agenda | `agenda.read` |
| Propietarios | `owner.create/read/update/delete` |
| Animales | `animal.create/read` |
| Empleados | `employee.create/read/update/delete` |
| Roles | `role.read`, `rolePermissions.create/read/update` |
| Tienda | `product.*`, `service.*`, `productCategory.*`, `serviceCategory.*`, `promotion.*`, `tax.*` |
| Cuentas | `openAccount.create/read/update/delete` |
| Anulaciones (elevado) | `debtOpenAccount.delete` (anular abono), `chargeOpenAccount.delete` (anular cargo) |
| Facturación electrónica | `electronicbilling.create` (gate único del módulo premium) |

**Nota de comportamiento a probar:** el módulo de **Facturación electrónica** se muestra y
funciona **solo** si el usuario tiene `electronicbilling.create` (o `admin.all`). Sin ese
permiso, los 3 items del sidebar y las 3 rutas quedan ocultos/redirigidos.

---

## 6. Mapa de rutas (todas bajo `/dashboard`)

| Ruta | Nombre | Permiso requerido | Pantalla |
|---|---|---|---|
| `/` | login | — (pública) | Login empleado |
| `/signup` | signup | — (pública) | Registro de empresa |
| `/dashboard` | home | (sesión) | Home / inicio |
| `/dashboard/agenda` | agenda | (sesión) | Agenda de citas |
| `/dashboard/consulta/nueva` | consulta-nueva | `consultation.create` | Wizard nueva consulta |
| `/dashboard/consulta/nueva/exito` | consulta-nueva-exito | `consultation.create` | Confirmación de consulta |
| `/dashboard/consulta/historial` | consulta-historial | (sesión) | Historia clínica (owner→pet→timeline) |
| `/dashboard/consulta/historial/:ownerId/mascotas` | consulta-historial-pet | (sesión) | Mascotas del propietario |
| `/dashboard/consulta/historial/:ownerId/mascotas/:petId` | consulta-historial-detail | (sesión) | Timeline de la mascota |
| `/dashboard/consulta/vacunacion` | consulta-vacunacion | `vaccination.create` | Vacunación (desde consulta) |
| `/dashboard/consulta/hospital` | consulta-hospital | `hospitalization.create` | Hospitalización (desde consulta) |
| `/dashboard/acciones/laboratorio` | acciones-laboratorio | `laboratoryTest.create` | Acción standalone: laboratorio |
| `/dashboard/acciones/imagen` | acciones-imagen | `diagnosticimaging.create` | Acción standalone: imagen |
| `/dashboard/acciones/vacunacion` | acciones-vacunacion | `vaccination.create` | Acción standalone: vacuna |
| `/dashboard/acciones/hospitalizacion` | acciones-hospitalizacion | `hospitalization.create` | Acción standalone: hospitalización |
| `/dashboard/acciones/desparasitacion` | acciones-desparasitacion | `deworming.create` | Acción standalone: desparasitación |
| `/dashboard/acciones/cirugia` | acciones-cirugia | `surgery.create` | Acción standalone: cirugía |
| `/dashboard/acciones/spa` | acciones-spa | `spa.create` | Acción standalone: spa |
| `/dashboard/laboratorio` | laboratorio-interno | `laboratoryTest.read` | Laboratorio interno |
| `/dashboard/hospital` | hospital-ward | `hospitalization.read` | Sala de internados (tablero) |
| `/dashboard/tienda` | tienda-pos | `product.read` | POS (punto de venta) |
| `/dashboard/tienda/inventario` | tienda-inventario | `product.read` | Inventario de productos |
| `/dashboard/tienda/servicios` | tienda-servicios | `service.read` | Servicios |
| `/dashboard/tienda/promociones` | tienda-promociones | `promotion.read` | Promociones |
| `/dashboard/tienda/impuestos` | tienda-impuestos | `tax.read` | Impuestos |
| `/dashboard/cuentas` | cuentas | `openAccount.read` | Cuentas abiertas |
| `/dashboard/facturacion/documentos` | facturacion-documentos | `electronicbilling.create` | Documentos electrónicos |
| `/dashboard/facturacion/reportes` | facturacion-reportes | `electronicbilling.create` | Reportes / libro de ventas |
| `/dashboard/facturacion/habilitacion` | facturacion-habilitacion | `electronicbilling.create` | Habilitación fiscal |
| `/dashboard/empleados` | empleados | `employee.read` | Empleados |
| `/dashboard/roles` | roles | `rolePermissions.read` | Roles y permisos |
| `/:pathMatch(.*)*` | — | — | Redirige a login |

---

## 7. Convenciones globales de UI (aplican a todo el producto)

Estas reglas son **requisitos de comportamiento** que TestSprite debe validar en cualquier
pantalla:

1. **Loader global único (“Huella latiendo”).** No hay spinners sueltos. Cualquier request
   HTTP > 200 ms dispara un overlay full-screen (`PageLoader`, huella amatista que palpita).
   Una vez visible dura ≥ 300 ms para evitar parpadeo. Excepción: la búsqueda de
   propietarios (`/owners/search`) usa `skipGlobalLoader` y muestra un loader inline.
2. **Modales no cierran al hacer click afuera (backdrop).** Regla UX firme: **solo la ✕ o
   la tecla Escape cierran un modal.** Un click en el fondo NO debe cerrarlo. Todos los
   modales se construyen sobre `ModalShell`.
3. **Validación de formularios (patrón touched/errors).** Los campos muestran error solo
   tras `blur` o al intentar avanzar. Al enviar con errores, se muestra un banner
   *"Revisa los campos marcados antes de continuar."* y se aborta el envío. Reglas comunes:
   - Nombre: requerido, ≥ 2 caracteres.
   - Documento de identidad: requerido, alfanumérico, 5–20 caracteres.
   - Teléfono: requerido, `[+\d\s\-()]`, 7–15 dígitos.
   - Email: opcional; si presente, formato válido.
   - Fecha de nacimiento: requerida, válida y **no futura**.
   - Número de chip (microchip): opcional; si presente, **15 dígitos exactos**.
   - Peso: requerido, número > 0 (acepta `,` o `.`).
4. **Conflicto de concurrencia (409 CONCURRENT_MODIFICATION).** Entidades versionadas
   (`@Version`). Si dos usuarios editan el mismo recurso, el segundo recibe `409` con code
   `CONCURRENT_MODIFICATION`; el front lo detecta (`isConcurrencyConflict`), avisa y hace
   auto-refresco del recurso.
5. **Banner “Consulta en curso”.** Si hay un borrador de consulta activo y el usuario navega
   fuera del wizard, aparece un banner con CTA *"Volver a la consulta"*. La ✕ lo oculta por
   sesión sin borrar el borrador.
6. **Idioma:** toda la UI está en **español**. Nunca se muestra el valor crudo de un enum
   (ej. `FEMALE` → "Hembra", `KILOGRAMS` → "kg").

---

## 8. Especificación por feature

### 8.1 Nueva consulta (wizard) — `src/features/dashboard`

Flujo de 2 pasos:

- **Paso 1 — Paciente:** seleccionar o crear propietario (sub-modo owner) y mascota
  (sub-modo pet). Búsqueda de propietario server-side (`GET /owners/search?q=`, con debounce
  e loader inline). Crear propietario: `POST /owners`. Crear mascota: `POST /animals`
  (requiere `name, code, specieId, breedId, ownerId, gender, weightType, animalType,
  reproductiveState, colorId, companyId`; cascada especie→raza).
- **Paso 2 — Consulta:** tipo de consulta (catálogo `GET /consultation-types`), anamnesis
  (obligatorios: tipo + anamnesis), diagnóstico/plan (opcionales), **peso en la consulta**
  (opcional; se guarda como registro de peso), y las **acciones rápidas** vía 7 modales:
  Receta, Laboratorio, Imagen, Vacunación, Hospitalización, Desparasitación, Cirugía.

**Persistencia (cascada de POST, idempotente):**
1. `POST /consultations` → `consultationId`.
2. Por cada item del draft, `POST` a su endpoint con `animalId, consultationId, companyId`.
3. Receta es sub-cascada: `POST /prescriptions` → luego `POST /medicament-prescriptions`
   por cada medicamento.

- **Borrador persistente:** el draft vive en `localStorage` (`vetrina:nueva-consulta-draft`).
- **Reintento sin duplicar:** si un POST falla, se muestra el error y el usuario reintenta;
  el draft guarda `consultationCreatedId` + un `savedId` por item, y el reintento **salta lo
  ya guardado**. (Limitación conocida: si el POST de la consulta commitea pero se pierde la
  respuesta, el reintento duplica — requeriría idempotency-key en backend.)
- **Facturación al guardar:** tras guardar la consulta se abre el `ConsultaBillingModal`
  (ver §8.7) para cargar los servicios/productos a una cuenta.
- Tras éxito, navega a `/consulta/nueva/exito`.

**Casos de prueba destacados:** validación de campos obligatorios; no permitir avanzar sin
propietario+mascota; reintento tras fallo parcial no duplica; borrador se restaura al
recargar; banner "consulta en curso" al salir del wizard.

### 8.2 Historia clínica — `src/features/historia-clinica`

Wizard **owner → pet → timeline mensual**. Muestra la historia clínica unificada de una
mascota agregando 7 módulos clínicos:
`GET /animals/{animalId}/clinical-history?types=...&from=...&to=...`.

Incluye **panel de historial de peso** (`WeightHistoryPanel`): serie temporal
(`GET /animals/{animalId}/weight-records`) con gráfico de tendencia normalizado a kg,
variación vs. registro anterior, y alta/baja inline (gateado por `animal.create`). El peso
actual de la mascota se **deriva** del último registro (ya no es un escalar).

### 8.3 Acciones standalone — `src/features/acciones`

Pantallas para registrar un procedimiento **sin** una consulta previa (laboratorio, imagen,
vacuna, hospitalización, desparasitación, cirugía, spa). Cada una: elige mascota, llena el
formulario del procedimiento, y persiste con `POST /<procedimiento>`. Los procedimientos con
seguimiento de estado exponen `GET /by-animal/{id}` y `PATCH /{id}/status` (labs, cirugías,
imágenes). Tras crear cualquier acción se dispara el prompt de facturación (§8.7).

**Catálogos de tipo creables:** los dropdowns de tipo (examen, imagen, vacuna, cirugía) usan
`SearchableSelect` con **creación inline** contra `GET /<tipo>-types/available`.

### 8.4 Hospitalización / Sala de internados — `src/features/hospitalizacion`

- **Tablero (`/hospital`):** lista de mascotas internadas (`GET /hospitalizations` filtrando
  client-side `type=HOSPITALIZATION && !endDate && enabled`).
- **Calendario de medicación (MAR):** por cada orden de medicación/procedimiento se genera un
  plan de dosis: `POST /medication-schedules/generate/{orderId}` y
  `GET /medication-schedules/by-hospitalization/{hospId}` (idem `procedure-schedules`).
  - **Aplicar dosis:** `PATCH /medication-schedules/{id}/apply` (marca APPLIED + hora real;
    no recalcula las siguientes). Se confirma con `ApplyDoseModal` ("¿Registrar dosis
    aplicada?").
  - **Reprogramar:** `PATCH /.../{id}/reschedule` body `{newDateTime, mode}` (`one` | `cascade`;
    `cascade` en frecuencia por intervalo recalcula la cadena de pendientes).
  - Enum `AppliedStatus` = `PENDING | APPLIED | SKIPPED`.
- **Alta:** reutiliza `PUT /hospitalizations/{id}` seteando `endDate` + `reasonLeaving`.
- Frecuencias: `CONTINUOUS, EVERY_4H, EVERY_6H, EVERY_8H, EVERY_12H, EVERY_24H, SINGLE`.

### 8.5 Laboratorio interno — `src/features/laboratorio`

Pantalla de laboratorio interno (`/laboratorio`, permiso `laboratoryTest.read`) para
gestionar exámenes de laboratorio y sus estados.

### 8.6 Tienda / POS — `src/features/tienda`

- **Inventario, Servicios, Promociones, Categorías, Impuestos:** CRUD contra
  `/products`(+search), `/services`(+search), `/promotions`, `/product-categories`,
  `/service-categories`, `/taxes`. Categorías vía `CategoryManagerModal` reutilizable.
- **POS (`/tienda`):** carrito client-side. Al cobrar:
  - `POST /electronic-documents/from-sale` (registra la venta como documento electrónico;
    `open_account_id = null`, soporta **consumidor final anónimo**). Reparte el descuento
    manual proporcionalmente por línea. Muestra `ReceiptModal` con la píldora de estado FE.
  - Gateado con `product.read` (empresas sin módulo de facturación también deben poder
    registrar la venta; el documento queda **PENDIENTE** si no hay submódulo BILLING).
- **Promociones:** el backend solo soporta `DISCOUNT` / `SPECIAL_PRICE`; estado `ACTIVE` /
  `INACTIVE`. Los estados PROGRAMADA / VENCIDA se **derivan por fecha** en el front.
- Helpers de precio en `composables/pricing.ts` (formatMoney, computeTotals, applyPromo,
  promoStatus, stockState). Producto con stock ≤ 0 se marca "Agotado".

### 8.7 Cuentas abiertas y cobro — `src/features/cuentas`

Master-detail de cuentas por propietario. Endpoints: `/open-accounts`(+search),
`/{product,service,general}-charge-open-accounts`, `/debt-open-accounts` (abonos).

**Reglas de negocio críticas (alto valor para pruebas):**

1. **Una sola cuenta ABIERTA por propietario.** Intentar abrir una segunda cuenta OPEN para
   el mismo propietario → `409 OWNER_ALREADY_HAS_OPEN_ACCOUNT`. Enforzado en backend (check
   de servicio + constraint única en BD) y en front (el modal no ofrece "abrir nueva" si ya
   hay una OPEN).
2. **No se crea cuenta sin cargos.** El front deshabilita "Confirmar" si el carrito está
   vacío; la cuenta se crea **solo** al confirmar con ≥ 1 cargo.
3. **Estados de cuenta:** `OPEN | CLOSE | CANCEL` (`PATCH /open-accounts/{id}/status`).
   - **Cerrar (CLOSE) exige saldo cero.** Cerrar con saldo pendiente ≠ 0 → `409 INVALID_STATE`.
   - **Cancelar (CANCEL) permite saldo > 0** (incobrable); ese monto se muestra como
     "Anulado: $X". Los reportes de "por cobrar" filtran solo `status == OPEN`.
   - Cuenta cerrada/cancelada permanece en la lista en **solo lectura** (pills por estado).
4. **Precio congelado (snapshot).** Cada cargo persiste su `unitPrice` / `taxPercentage` al
   crearse; editar el precio del catálogo **no** cambia retroactivamente el total de cuentas
   ya cargadas.
5. **Anulación con auditoría (no borrado).** Los cargos y abonos no se borran: se **anulan**
   con motivo y autor (`PATCH .../{id}/void`), gateado por el permiso elevado
   (`chargeOpenAccount.delete` / `debtOpenAccount.delete`). Un cargo anulado deja de contar
   en el total y se muestra tachado con su auditoría. No se puede anular un cargo si dejaría
   el saldo negativo → `409 INVALID_STATE`.
6. **Operaciones idempotentes.** Abrir cuenta y cerrar cuenta usan marcadores internos
   (`createdAccount`, `pendingOps`, `paymentDone`/`charged`) para que un reintento tras fallo
   parcial **no duplique** cargos ni abonos.

**Modal de facturación de consulta (`ConsultaBillingModal`):** una pantalla con banner de
estado de cuenta (verde/ámbar), selector de destino (`existing | new | nada`), catálogo de
Servicios/Productos y un carrito local tipo stepper. Confirma todo al guardar (no agrega
inmediato). Se dispara tras guardar una consulta y tras crear cualquier acción clínica.

**Cierre de cuenta (`CloseAccountModal`):** 2 pasos (cobro → recibo). CLOSE registra el abono
del saldo; CANCEL anula. Métodos de pago: `CASH | CARD | BANK_TRANSFER`.

### 8.8 Facturación electrónica DIAN — `src/features/facturacion`

Módulo premium visible solo con `electronicbilling.create`. Proveedor: **MATIAS** (Colombia,
UBL 2.1). Tres vistas:

- **Habilitación (`/facturacion/habilitacion`):** panel de estado + wizard
  **Identidad → Resoluciones → Revisión**. Estado "Lista para facturar" derivado de:
  perfil fiscal ✓ + resolución FE activa ✓. (El proveedor MATIAS lo configura un panel admin
  aparte, no la clínica.)
- **Documentos (`/facturacion/documentos`):** lista + emisión manual + detalle inline con
  timeline, notas y "convertir". Muestra QR real (`doc.qrUrl`) y CUFE/CUDE.
- **Reportes (`/facturacion/reportes`):** libro de ventas + conciliación.

**Regla "FE obligatoria > 5 UVT":** la DIAN no permite Documento POS si el total supera 5
UVT; en ese caso el front **fuerza Factura electrónica con cliente identificado** (banner
ámbar, POS deshabilitado con candado, checklist fiscal del cliente de 3 estados y modal para
completar datos fiscales). El umbral UVT se lee de `GET /system-configurations` (fila `uvt`).
Implementado tanto en el POS (PayModal) como en el cierre de cuenta.

**Estados de documento (máquina DIAN forward-only):** un documento puede quedar `PENDIENTE`,
`VALIDADO` (con CUFE/CUDE = sello SHA-384, 96 hex), `RECHAZADO` o `CONTINGENCIA`. El
comportamiento visible es la píldora de estado (`FeStatusPill`) y la posibilidad de
re-transmitir (`POST /{id}/transmit`).

### 8.9 Empleados — `src/features/employees`

Lista + drawer de empleado (`GET /employees/by-company`, `POST /employees`,
`PUT /employees/{id}`). Al crear empleado se asigna rol vía `POST /employee-roles`.

**Limitaciones conocidas (comportamiento esperado a validar como "deshabilitado"):**
- No hay endpoint de reset/cambio de contraseña → el botón "Restablecer contraseña" está
  **deshabilitado** con tooltip "Próximamente".
- No hay activate/deactivate dedicado → cambiar estado hace `PUT /employees/{id}` completo.
- No hay búsqueda server-side de empleados → filtro **client-side** por nombre/código/email.
- Cambiar el rol **post-creación** no está integrado (selector de rol read-only).

### 8.10 Roles y permisos — `src/features/roles`

`RolesView` permite editar los permisos de un rol de la empresa con `EditPermissionsModal`
(agrupado por módulo / sub-módulo). Endpoints: `GET /roles/by-company`,
`GET /permissions/by-company`, `PUT /role-permissions/by-role/{id}` (sync atómico). El rol
**ADMIN es de solo lectura**. Al guardar, el backend invalida la cache de permisos.

### 8.11 Agenda — `src/features/agenda`

Agenda de citas (`/dashboard/agenda`). Vista de calendario/listado de citas de la clínica
(permiso `agenda.read`).

---

## 9. Requisitos transversales / no funcionales

- **Multi-tenant:** el `companyId` nunca lo elige el usuario; sale del JWT. Algunos POST
  clínicos lo llevan en el body (el front lo saca de `useAuth().companyId`).
- **Resiliencia de red:** todo flujo con cascada de POST debe ser reintentable sin duplicar
  (marcadores de idempotencia en el cliente).
- **Accesibilidad:** modales con foco inicial, cierre por Escape, respeto a
  `prefers-reduced-motion` en el loader.
- **Estado global solo en Pinia:** prohibido el `ref()` module-scoped singleton (regla del
  proyecto). No afecta al usuario final pero sí a la coherencia de estado entre pantallas.
- **TypeScript estricto:** `vue-tsc -b` debe pasar limpio (build de CI).

---

## 10. Escenarios de prueba end-to-end sugeridos (para TestSprite)

1. **Login y sesión:** login con `employeeCode`+`password` válidos → llega a `home`; token en
   `localStorage['vetsoft.auth']`; navegar a una ruta sin permiso redirige a `home`; un `401`
   limpia sesión y vuelve a `/login`.
2. **Gating de permisos:** con un usuario sin `product.read`, el POS y su item de sidebar no
   son accesibles (redirige a `home`); con `admin.all` todo es accesible.
3. **Alta de propietario + mascota** desde el paso 1 del wizard, con validación de campos
   (documento 5–20 alfanumérico, chip 15 dígitos, fecha de nacimiento no futura).
4. **Consulta completa:** crear consulta con tipo + anamnesis + 2 acciones (receta con 2
   medicamentos + laboratorio); verificar la cascada de POST y la pantalla de éxito.
5. **Reintento idempotente:** forzar fallo del POST de una acción, reintentar y verificar que
   no se duplican consulta ni items.
6. **Una cuenta por propietario:** abrir cuenta con ≥1 cargo; intentar abrir una segunda para
   el mismo propietario → error `OWNER_ALREADY_HAS_OPEN_ACCOUNT`.
7. **Cerrar cuenta con saldo ≠ 0** → bloqueado (`INVALID_STATE`); cerrar con saldo 0 → recibo.
8. **Anular cargo/abono** con permiso elevado (tachado + auditoría); sin permiso, la acción no
   está disponible.
9. **POS > 5 UVT:** intentar cobrar por encima del umbral con consumidor final → se fuerza
   Factura electrónica con cliente identificado (checklist fiscal).
10. **Modal UX:** un modal no se cierra al hacer click en el backdrop; se cierra con ✕ y con
    Escape.
11. **Loader global:** un request lento (>200 ms) muestra el overlay de la huella; un request
    rápido no.
12. **Hospitalización MAR:** generar plan de dosis, aplicar una dosis (marca APPLIED) y
    reprogramar en modo `cascade`.

---

## 11. Glosario

- **UVT:** Unidad de Valor Tributario (Colombia); umbral fiscal para exigir factura
  electrónica. Configurable (`system_configurations.uvt`).
- **CUFE / CUDE / CUDS:** sellos fiscales DIAN (hash SHA-384, 96 hex) del documento
  electrónico.
- **MAR:** Medication Administration Record — calendario de administración de medicamentos en
  hospitalización.
- **Cuenta abierta (open account):** saldo acumulado de cargos y abonos de un propietario que
  se liquida al cerrarla.
- **Consumidor final:** adquiriente genérico anónimo (NIT `222222222222`) usado cuando la
  venta no identifica al cliente.
- **ProblemDetail:** formato de error RFC 7807 del backend; el campo `code` discrimina el
  error de negocio.
```
