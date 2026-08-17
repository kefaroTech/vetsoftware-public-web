# Plan de implementación — Feature backend `appointment` (agendamiento / citas)

> Documento base entregado por el equipo. Describe la capa backend (hexagonal + vertical slicing).
> El prototipo de UI en `prototype/` implementa el frontend que consume esta feature.

## 0. Decisiones tomadas
- `owner_id` **NO** obligatorio. Una cita puede ser de alguien nuevo no registrado → `owner_id` nullable + campos de contacto libre (`client_name`, `client_phone`).
- `type` = enum (`AppointmentType`), no catálogo configurable en P0.
- ~~**Solape = solo advertencia.** No se bloquea la reserva; el service calcula los solapes del mismo vet y los devuelve como aviso (nunca 409).~~
  **Revisado en BE-17:** el solape **sí bloquea**. Las citas tienen duración y el service rechaza con **409 `APPOINTMENT_OVERLAP`** cuando el intervalo pisa el de otra cita del mismo vet; se puede agendar igualmente reenviando con el flag de forzado. Los solapes que quedan registrados siguen viajando en `overlappingAppointmentIds`.
- `animal_id` **NO** obligatorio → nullable (mascota por confirmar). Regla mínima: al menos uno de `{animal, owner, client_name}`.
- Sin vínculo `consultation_id` en P0.

## 1. Tabla `appointments` (Liquibase 174_create_appointments.xml)
| Columna | Tipo | Null | Notas |
|---|---|---|---|
| id | BIGINT AUTO_INCREMENT PK | no | |
| start_at | DATETIME | no | Inicio con hora (LocalDateTime). ~~Punto en el tiempo, sin duración.~~ BE-17: la cita ocupa un intervalo — el fin sale de la duración. |
| type | VARCHAR(30) | no | AppointmentType |
| status | VARCHAR(20) | no | AppointmentStatus. Default REQUESTED |
| notes | VARCHAR(1000) | sí | Motivo / notas de recepción |
| cancellation_reason | VARCHAR(300) | sí | Solo al cancelar |
| animal_id | BIGINT FK animals(id) | sí | Mascota (puede estar por confirmar) |
| owner_id | BIGINT FK owners(id) | sí | Dueño registrado (opcional) |
| client_name | VARCHAR(120) | sí | Contacto libre |
| client_phone | VARCHAR(30) | sí | Teléfono del contacto libre |
| employee_id | BIGINT FK employees(id) | no | Vet/profesional asignado |
| company_id | BIGINT FK companies(id) | no | Multi-tenant |
| version | BIGINT | no | @Version optimistic lock. Default 0 |
| enabled | BOOLEAN | no | Soft-delete. Default true |
| created_date | DATETIME | no | defaultValueComputed=CURRENT_TIMESTAMP |

Índices: `(company_id, start_at)`, `(employee_id, start_at)`, `(company_id, status)`.

## 2. Dominio
### AppointmentType (enum)
`CONSULTATION, VACCINATION, DEWORMING, SURGERY, IMAGING, LABORATORY, GROOMING (SPA), CONTROL, OTHER`

### AppointmentStatus + transiciones (invariantes en dominio)
Estados: `REQUESTED, CONFIRMED, ARRIVED, IN_PROGRESS, COMPLETED, NO_SHOW, CANCELLED`.

```
REQUESTED    → CONFIRMED | CANCELLED | NO_SHOW
CONFIRMED    → ARRIVED | CANCELLED | NO_SHOW
ARRIVED      → IN_PROGRESS | CANCELLED | NO_SHOW
IN_PROGRESS  → COMPLETED | CANCELLED
COMPLETED    → (terminal)
NO_SHOW      → (terminal)
CANCELLED    → (terminal)
```
`transitionTo(next)` valida y lanza `InvalidAppointmentTransitionException` si el salto no es válido.

### Entidad Appointment (sin setters públicos)
- `create(startAt, type, notes, animal, owner, clientName, clientPhone, employee, company)` → status=REQUESTED.
- `update(...)` — editar/mover.
- `reschedule(startAt, employee)` — atajo drag&drop.
- `transitionTo(newStatus)`.
- `cancel(reason)` — status=CANCELLED + cancellationReason.
- `disable()/enable()` — soft delete.

Invariantes: startAt/type/employee/company requeridos; al menos uno de `{animal, owner, clientName}`; notes ≤ 1000; clientName ≤ 120; clientPhone ≤ 30; cancellationReason ≤ 300.

## 3. Permisos `appointment.*`
Códigos: `appointment.create`, `appointment.read`, `appointment.update`, `appointment.delete`, `appointment.cancel`.

| Rol | create | read | update | delete | cancel |
|---|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| RECEPCION | ✅ | ✅ | ✅ | ✅ | ✅ |
| VET | ✅ | ✅ | ✅ | — | ✅ |
| AUXILIAR | — | ✅ | — | — | — |
| CAJA | — | ✅ | — | — | — |

## 4. Endpoints REST (`AppointmentController`, base `/appointments`)
Todos scoped a la company (el controller inyecta `authz.currentCompanyId()`; el request nunca lleva companyId).

| Método | Ruta | Permiso |
|---|---|---|
| POST | `/appointments` | appointment.create |
| GET | `/appointments?from&to&employeeId&status` | appointment.read |
| GET | `/appointments/{id}` | appointment.read |
| PUT | `/appointments/{id}` | appointment.update |
| PATCH | `/appointments/{id}/reschedule` | appointment.update |
| PATCH | `/appointments/{id}/status` | appointment.update |
| PATCH | `/appointments/{id}/cancel` | appointment.cancel |
| DELETE | `/appointments/{id}` | appointment.delete (soft delete) |

### Contratos
```jsonc
// POST /appointments  (CreateAppointmentRequest)
{
  "startAt": "2026-07-10T09:30:00",   // ISO LocalDateTime, requerido
  "type": "CONSULTATION",              // requerido
  "employeeId": 12,                    // requerido
  "animalId": 1201,                    // opcional
  "ownerId": 340,                      // opcional
  "clientName": "María Pérez",         // opcional — contacto libre si no hay ownerId
  "clientPhone": "3001234567",         // opcional
  "notes": "Control post-cirugía"      // opcional, ≤1000
}
// Regla: al menos uno de {animalId, ownerId, clientName}.

// PATCH /appointments/{id}/reschedule  -> { "startAt", "employeeId" }
// PATCH /appointments/{id}/status      -> { "status": "CONFIRMED" }  // valida la máquina
// PATCH /appointments/{id}/cancel      -> { "reason": "..." }        // ≤300, opcional

// AppointmentResponse incluye:
//   overlappingAppointmentIds: []   // solapes registrados (BE-17: el solape no forzado se rechaza con 409)
```

### Regla de solape (§4.3) — reescrita en BE-17
~~`findClashingIds(employeeId, startAt, excludeId)` — citas del mismo vet a la misma **hora de inicio** (`start_at`), `enabled=true` y estado no terminal (CANCELLED/NO_SHOW no cuentan). No bloquea: se guarda igual y los ids en choque van en `overlappingAppointmentIds`.~~

La cita ocupa un **intervalo** (inicio + duración), no un punto: chocan las citas del mismo vet cuyos intervalos se cruzan, `enabled=true` y en estado no terminal (CANCELLED/NO_SHOW siguen sin contar). El choque **bloquea**: el endpoint responde **409 con `code = APPOINTMENT_OVERLAP`**, y sólo se agenda encima si la petición llega con el flag de forzado. Los solapes que así se aceptan se devuelven en `overlappingAppointmentIds`.

Del lado del front: `isAppointmentOverlap(error)` (en `http.client.ts`) reconoce ese 409; `AgendaView.handleError` recarga la agenda para que la cita que bloquea el hueco aparezca, y el motivo se repinta en el banner rojo del modal.
