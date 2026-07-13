# Facturación electrónica (DIAN) — Guía de diseño para Claude Design

> **Para:** Claude Design (diseño de UI/UX del front).
> **Objetivo:** que el diseñador entienda, al detalle, **cómo se habilita** y **cómo se usa** la facturación
> electrónica colombiana en VetSoftware, qué **pantallas, campos, estados y flujos** se necesitan, y —lo más
> importante— que **toda esta funcionalidad es exclusiva del plan PREMIUM**.
> **Idioma de UI:** español (Colombia). Moneda: COP. Zona horaria fiscal: `America/Bogota` (-05:00).
> **Nota de contrato:** los nombres de campo y rutas vienen del backend real; valida los *keys* JSON exactos
> contra la API viva/Swagger antes de cablear. Toda ruta scoped a empresa deriva el `companyId` del JWT — **el
> front nunca envía `companyId`**.

---

## 0. Resumen ejecutivo (léelo primero)

La facturación electrónica permite a una veterinaria **emitir documentos fiscales válidos ante la DIAN**
(factura electrónica de venta, documento equivalente POS, notas crédito/débito) a partir de sus ventas, y
consultarlos/reportarlos. Se apoya en un proveedor tecnológico (MATIAS) que valida ante la DIAN y devuelve
**CUFE/CUDE**, **QR** y **PDF**.

**Regla de oro del diseño:** es una **capacidad PREMIUM**, pero el front **NO** lee una bandera de capacidad:
**se guía SIEMPRE por los permisos** del usuario (`GET /auth/me → permissions[]`). Como esos permisos solo se
otorgan a las empresas con el plan premium (submódulo `BILLING`), **los permisos SON la señal de gating**. El
front muestra/oculta cada parte del módulo según el permiso correspondiente y, si el usuario no tiene ninguno,
oculta el módulo y ofrece la ruta de upgrade. Ver §1.

El módulo tiene **dos grandes mitades**:
1. **Configurar (habilitar)** — onboarding fiscal: perfil fiscal de la empresa, proveedor DIAN, resoluciones
   de numeración, (opcional) retenciones, y datos fiscales en catálogos (clientes, productos/servicios). §3.
2. **Usar (facturar)** — emitir desde una venta, ver el ciclo de validación, entregar PDF/QR, convertir POS→FE,
   emitir notas, y reportar. §4–§6.

---

## 1. Gating por PERMISOS — el eje de todo el diseño

> **Decisión firme:** el front se basa **siempre en los permisos** del usuario para TODO lo de facturación
> electrónica. **`GET /auth/me` NO devuelve** ninguna bandera de capacidad (`electronicInvoicingEnabled` no
> existe). No hay que leer membresía ni submódulo desde el front: **los permisos son la única señal**.

### 1.1 Cómo sabe el front si la empresa puede facturar
Por los **permisos** del usuario autenticado:

```
GET /auth/me  →  { ..., "permissions": ["electronicDocument.read", "electronicDocument.emit", ...] }
```

- El usuario tiene **algún** permiso de facturación electrónica (ver tabla §1.4) → mostrar el módulo (y dentro,
  cada acción según su permiso puntual).
- El usuario **no tiene ninguno** → **ocultar** el módulo completo (accesos de menú, botones "Emitir",
  reportes fiscales, configuración DIAN) y, si llega por deep-link, mostrar *upsell* (§1.3).

> Como esos permisos solo se otorgan a las empresas premium (las que tienen el submódulo `BILLING`), basar la
> visibilidad en permisos es equivalente a "premium", sin que el front conozca la membresía.

### 1.2 Comportamiento del backend (para que el diseño sea coherente)
- **Configuración DIAN** (perfil fiscal, proveedor, numeración, retenciones): protegida por **permiso**.
- **Emisión:** el backend, además, guarda el documento **localmente** con estado `NO_ELECTRONICO` (sin
  numeración fiscal, sin CUFE/QR/PDF, sin transmitir a la DIAN) cuando la empresa no es premium. No es un
  error 403; responde 200 con un documento "no electrónico". Con el front bien gateado por permisos esto no
  debería verse, pero el estado existe y hay que saber pintarlo (§4.4).

### 1.3 Estados de UI sin permisos (diseñar)
- **Entrada de menú oculta.** Recomendado: ocultar. Si se muestra con candado, al hacer clic → modal de upsell.
- **Pantalla de upsell** (cuando el usuario llega por deep-link sin permisos): título "La facturación
  electrónica está disponible en el plan Premium", beneficios (cumplir DIAN, factura válida, POS electrónico,
  notas, reportes), CTA "Conocer Premium / Contactar". No exponer formularios de configuración.

### 1.4 Mapa de permiso → acción
Las acciones se muestran/ocultan según los permisos de `GET /auth/me → permissions: string[]`:

| Permiso | Habilita |
|---|---|
| `electronicDocument.emit` | Emitir factura/POS, convertir POS→FE, emitir notas crédito/débito |
| `electronicDocument.transmit` | Re-transmitir un documento existente |
| `electronicDocument.create` | Construir documento provisional (`/from-account`) |
| `electronicDocument.read` | Ver listado y detalle de documentos |
| `salesReport.read` | Ver libro de ventas y conciliación |
| `dianProviderConfig.manage` / `.read` | Configurar / ver proveedor DIAN |
| `numberingResolution.create/.update/.read/.delete` | Gestionar resoluciones de numeración |
| `withholdingConfig.manage` / `.read` | Configurar / ver tarifas de retención |
| `companyTaxProfile.manage` / `.read` | Configurar / ver perfil fiscal |

> Regla: **mostrar un control** solo si el usuario tiene el permiso correspondiente. El módulo es visible si
> tiene **al menos uno** de estos permisos. `admin.all` ve todo.

---

## 2. Mapa de pantallas (information architecture)

Sección raíz **"Facturación electrónica"** (solo visible PREMIUM):

1. **Tablero / estado de habilitación** — checklist "¿lista para facturar?" (§3.6).
2. **Configuración**
   - 2.1 Perfil fiscal de la empresa (§3.1)
   - 2.2 Proveedor DIAN (§3.2)
   - 2.3 Resoluciones de numeración (§3.3)
   - 2.4 Retenciones (§3.4) — opcional
3. **Documentos electrónicos** — listado + detalle (§4)
   - Acción "Emitir" (desde una cuenta/venta cerrada) (§4.1)
   - Detalle con timeline de estado, totales, PDF/QR, notas (§4.3–§4.5)
4. **Reportes**
   - 4.1 Libro de ventas (§6.1)
   - 4.2 Conciliación DIAN (§6.2)

Catálogos relacionados (viven en sus propios módulos, pero tienen campos fiscales que afectan la facturación):
**Clientes (Owner)**, **Productos**, **Servicios**, **Ciudades** (§5).

---

## 3. CONFIGURAR — habilitar la facturación (onboarding fiscal)

Orden recomendado de onboarding: **Perfil fiscal → Proveedor DIAN → ≥1 Resolución de numeración →
(opcional) Retenciones → datos fiscales en clientes y catálogo**. El tablero (§3.6) refleja qué falta.

### 3.1 Perfil fiscal de la empresa (`CompanyTaxProfile`)
Identidad fiscal del **emisor**. Es **singleton por empresa** (uno solo).

- **Endpoints:** `POST /company-tax-profile` (crear) · `PUT /company-tax-profile` (actualizar) ·
  `GET /company-tax-profile` (consultar) · `DELETE /company-tax-profile` · `POST /company-tax-profile/reactivate`.

| Campo | Tipo | Reglas / UI | Lo envía el cliente |
|---|---|---|---|
| `documentType` | enum `CompanyDocumentType` | Selector. Si = `NIT` → exige dígito de verificación | Sí |
| `companyDocumentId` | String (≤20) | Requerido. Número sin DV | Sí |
| `companyDocumentVerificationDigit` | String (1 díg.) | **Solo y obligatorio si NIT**; ocultar si no es NIT | Sí (condicional) |
| `legalName` | String (≤255) | Requerido. Razón social | Sí |
| `taxRegime` | enum `TaxRegime` | Selector `RESPONSABLE_IVA` / `NO_RESPONSABLE_IVA` | Sí |
| `fiscalEmail` | String email (≤255) | Requerido. Correo de notificaciones DIAN | Sí |
| `commercialName` | String (≤150) | Opcional. Nombre comercial | Sí |
| `economicActivityId` | Long | Opcional. Selector con búsqueda (CIIU) — viene de `GET /economic-activities` | Sí |
| `responsibilities` | List&lt;String&gt; (cada ≤10) | **≥1**. Multi-select de códigos RUT (p. ej. `O-13`, `R-99-PN`) | Sí |

- **Respuesta** añade: `id`, `company {id,name,identifier}`, `economicActivity {id,code,name}`, `createdDate`,
  `enabled`.
- **Enum `CompanyDocumentType`** (con código DIAN): `NIT`=31 · `CEDULA_CIUDADANIA`=13 ·
  `CEDULA_EXTRANJERIA`=22 · `PASAPORTE`=41.
- **Enum `TaxRegime`**: `RESPONSABLE_IVA`, `NO_RESPONSABLE_IVA`.
- **UI:** formulario de una columna; el campo DV aparece/desaparece según `documentType=NIT`. Mostrar ayuda
  inline sobre responsabilidades RUT (chips removibles). `economicActivity`: autocomplete por código o nombre.

### 3.2 Proveedor DIAN (`DianProviderConfig`)
Cómo se conecta la empresa al proveedor (MATIAS). **Singleton por empresa.** Contiene **secretos**.

- **Endpoints:** `POST /dian-provider-configs` · `PUT /dian-provider-configs` · `GET /dian-provider-configs`.

| Campo | Tipo | Reglas / UI | Secreto |
|---|---|---|---|
| `provider` | enum `ProviderType` | Hoy solo `MATIAS` (selector con un valor) | No |
| `environment` | enum `ProviderEnvironment` | `SANDBOX` / `PRODUCTION` (toggle con aviso) | No |
| `baseUrl` | String (≤255) | Requerido. URL base de la API del proveedor | No |
| `clientId` | String | Semi-público (se devuelve tal cual) | No |
| `clientSecret` | String | Se guarda cifrado; **no se devuelve** | **Sí** |
| `username` | String | Email de login MATIAS; **no se devuelve** | **Sí** |
| `password` | String | Login; **no se devuelve** | **Sí** |
| `apiToken` | String | PAT estático (si está, reemplaza login); **no se devuelve** | **Sí** |
| `webhookSecret` | String | Verificación HMAC del webhook; **no se devuelve** | **Sí** |
| `numberingProviderRef` | String | Opcional. Ref. del esquema de numeración del proveedor | No |

- **Respuesta** NO devuelve los secretos: en su lugar trae booleanos `*Configured`
  (`clientSecretConfigured`, `usernameConfigured`, `passwordConfigured`, `apiTokenConfigured`,
  `webhookSecretConfigured`) + `clientId`, `baseUrl`, `provider`, `environment`, `numberingProviderRef`,
  `id`, `companyId`, `createdDate`, `enabled`.
- **UI crítica de secretos:**
  - Campos secreto tipo *password* con "mostrar/ocultar". 
  - Como el GET nunca devuelve el secreto, mostrar el estado **"Configurado ✓ / Sin configurar"** usando los
    `*Configured`. Editar = dejar el campo vacío para conservar el actual, o escribir uno nuevo para reemplazar.
  - Aviso fuerte al cambiar `environment` a `PRODUCTION` (emisiones reales con efectos fiscales).
- **Enums:** `ProviderType`: `MATIAS` (único). `ProviderEnvironment`: `SANDBOX`, `PRODUCTION`.

### 3.3 Resoluciones de numeración (`NumberingResolution`)
La DIAN autoriza rangos de consecutivos **por tipo de documento**. Se necesita **al menos una activa** para
emitir cada tipo. Es **lista** (CRUD), no singleton.

- **Endpoints:** `POST /numbering-resolutions` · `GET /numbering-resolutions` (lista) ·
  `GET /numbering-resolutions/{id}` · `PUT /numbering-resolutions/{id}` · `DELETE /numbering-resolutions/{id}` ·
  `PATCH /numbering-resolutions/{id}/enable` (reactivar).

| Campo | Tipo | Reglas / UI | Lo envía el cliente |
|---|---|---|---|
| `documentType` | enum `ElectronicDocumentType` | Selector: FE_VENTA / DOC_EQUIV_POS / NOTA_CREDITO / NOTA_DEBITO | Sí |
| `resolutionNumber` | String (≤50) | Requerido | Sí |
| `resolutionDate` | LocalDate (YYYY-MM-DD) | Requerido | Sí |
| `prefix` | String (≤10) | Opcional (p. ej. `FE`, `POS`) | Sí |
| `rangeFrom` | Long (≥1) | Requerido | Sí |
| `rangeTo` | Long (≥1, ≥ rangeFrom) | Requerido | Sí |
| `validFrom` | LocalDate | Requerido | Sí |
| `validTo` | LocalDate (≥ validFrom) | Requerido | Sí |
| `technicalKey` | String (≤255) | Opcional (clave técnica DIAN) | Sí |

- **Respuesta** añade: `id`, `company {id,name,identifier}`, `currentNumber` (se inicializa a `rangeFrom`;
  avanza con cada emisión — **solo lectura**), `createdDate`, `enabled`.
- **UI:**
  - Tabla con: tipo, prefijo, rango (`rangeFrom`–`rangeTo`), **consumo** (`currentNumber` vs `rangeTo` →
    barra de progreso "consecutivos usados"), vigencia (`validFrom`–`validTo`), estado.
  - **Alertas:** "rango por agotarse" (p. ej. &lt;10% disponible) y "resolución vencida / por vencer".
  - Validación en formulario: `rangeFrom ≤ rangeTo`, `validFrom ≤ validTo`.

### 3.4 Retenciones (`WithholdingConfig`) — opcional
Tarifas que se aplican cuando el **cliente es agente retenedor**. **Singleton por empresa** (upsert).

- **Endpoints:** `PUT /withholding-configs` (crear/actualizar) · `GET /withholding-configs`.

| Campo | Tipo | Reglas / UI |
|---|---|---|
| `reteFuenteRate` | BigDecimal ≥0 | % ReteFuente (sobre la base) |
| `reteIvaRate` | BigDecimal ≥0 | % ReteIVA (sobre el IVA) |
| `reteIcaRate` | BigDecimal ≥0 | % ReteICA (sobre la base) |

- **Respuesta:** `id`, `companyId`, las tres tarifas, `createdDate`, `enabled`.
- **UI:** tres inputs de porcentaje. Ayuda: "Se aplican solo a clientes marcados como *agente retenedor*"
  (ver §5.1). Mostrar ejemplo de cálculo.

### 3.5 Datos fiscales en catálogos (prerrequisito de cada venta)
Para que un documento sea válido, los **clientes** y los **ítems** deben tener su clasificación fiscal (§5).
El diseño de esos módulos debe incluir esos campos; aquí solo se enuncia que **son prerrequisito**.

### 3.6 Tablero "¿lista para facturar?" (recomendado)
Checklist visual de habilitación. La empresa puede emitir cuando tiene: perfil fiscal ✓, proveedor DIAN ✓,
≥1 resolución activa por tipo que vaya a emitir ✓. Retenciones es opcional. Pintar cada ítem con
estado/CTA "Configurar". (El front compone este checklist con los GET de §3.1–§3.4.)

---

## 4. USAR — emitir y gestionar documentos electrónicos

### 4.0 De dónde sale una factura
No se factura "desde cero": un documento se **emite a partir de una venta** = una `OpenAccount` (cuenta de
cobro) **cerrada** (estado `CLOSE`, saldo 0). El flujo de cuentas/POS ya existe; la facturación toma esa
cuenta cerrada y la congela como documento fiscal. **No se auto-dispara al cerrar**: es una acción explícita.

### 4.1 Emitir documento (acción principal)
- **Endpoint:** `POST /electronic-documents/emit` → 201, devuelve `ElectronicDocumentDto`.
- **Request `BuildElectronicDocumentRequest`:**

| Campo | Tipo | UI | Lo envía el cliente |
|---|---|---|---|
| `openAccountId` | Long | La cuenta cerrada a facturar (contexto) | Sí |
| `documentType` | enum `ElectronicDocumentType` | `FE_VENTA` (factura) o `DOC_EQUIV_POS` (POS) | Sí |
| `finalConsumer` | boolean | Toggle "Consumidor final" (factura sin identificar al cliente; usa NIT genérico 222222222222) | Sí |

- **UI del diálogo de emisión:**
  - Resumen de la venta (cliente, ítems, totales) en modo solo-lectura.
  - Selector tipo de documento (FE vs POS), toggle "Consumidor final".
  - Si "Consumidor final" = off → mostrar/validar que el cliente tenga datos fiscales completos (§5.1); si
    faltan, bloquear con CTA "Completar datos del cliente".
  - Botón **Emitir**. Tras emitir, el documento nace `PENDIENTE` y la validación DIAN es **asíncrona** (§4.2):
    diseñar feedback de "enviado, validando…" y no asumir CUFE inmediato.
- **Provisional (opcional, normalmente no en UI final):** `POST /electronic-documents/from-account` construye
  el documento PENDIENTE **sin** transmitir (para previsualizar). Mismo request.

### 4.2 Ciclo de vida / estados (`DianStatus`) — diseñar el timeline
| Estado | Significado | UI sugerida |
|---|---|---|
| `PENDIENTE` | Emitido, esperando validación DIAN (async) | Badge gris/azul "Validando…"; sin CUFE/QR/PDF aún; permitir refrescar |
| `VALIDADO` | DIAN validó: trae CUFE/CUDE, QR, PDF | Badge verde "Validado"; mostrar CUFE, QR, botón PDF, reenviar correo |
| `RECHAZADO` | DIAN rechazó (terminal) | Badge rojo; mostrar motivo; CTA "Corregir con nota crédito" |
| `CONTINGENCIA` | Proveedor/DIAN no disponible; reintentable | Badge ámbar "En contingencia"; el sistema reintenta solo; permitir re-transmitir |
| `NO_ELECTRONICO` | Empresa **sin** plan PREMIUM: guardado **local**, nunca transmitido | Badge neutro "No electrónico (sin facturación)"; sin CUFE/QR/PDF; explicación |

- Transiciones async: `PENDIENTE → VALIDADO/RECHAZADO/CONTINGENCIA` llegan por **webhook/polling** del
  proveedor (no instantáneo). El front debe **poder refrescar** el detalle/listado y, si es viable,
  auto-refrescar mientras esté `PENDIENTE`.
- `VALIDADO` y `RECHAZADO` son **terminales**: un documento no se edita ni se borra; la única corrección es una
  **nota crédito/débito** (§4.5). Inmutabilidad fiscal → **no diseñar** botones de editar/eliminar.
- Re-transmitir: `POST /electronic-documents/{id}/transmit` (útil en `CONTINGENCIA`).

### 4.3 Detalle del documento — `ElectronicDocumentDto` (todos los campos)
Cabecera:

| Campo | Tipo | UI |
|---|---|---|
| `id` | Long | — |
| `documentType` | enum | "Factura electrónica" / "Documento POS" / "Nota crédito" / "Nota débito" |
| `prefix` + `consecutive` | String + Long | Número fiscal (p. ej. `FE-1024`); vacío hasta numerar |
| `resolutionNumber` | String | Resolución usada |
| `issueDate` / `issueTime` | LocalDate / String (`HH:mm:ss-05:00`) | Fecha y hora de emisión |
| `cufe` | String | Factura validada (CUFE). Copiable |
| `cude` | String | Notas / POS validados (CUDE). Copiable |
| `uuid` | String | UUID del proveedor |
| `qrUrl` | String | Imagen QR (mostrar si `VALIDADO`) |
| `pdfRepresentation` | String | Clave/URL del PDF (botón "Descargar PDF") |
| `dianStatus` | enum | Badge (§4.2) |
| `dianValidationDate` | LocalDateTime | Fecha de validación |
| `reversed` | boolean | "Anulada por nota crédito" si true |
| `createdDate` | LocalDateTime | — |

Emisor (`issuer`) y Adquiriente (`customer`) — *snapshots* congelados al emitir (no son refs vivas):

- `issuer`: `documentType`, `documentId`, `verificationDigit`, `legalName`, `taxRegime`, `email`.
- `customer`: `documentType`, `documentId`, `verificationDigit`, `personType`, `legalName`, `name`, `email`.
  (Para "consumidor final" llega la identidad genérica.)

Totales:

| Campo | Significado |
|---|---|
| `lineExtensionAmount` | Subtotal (base, antes de impuestos) |
| `taxExclusiveAmount` | Base gravable |
| `taxInclusiveAmount` | Total con IVA/INC |
| `payableAmount` | Total a pagar (antes de retenciones) |
| `reteFuenteAmount` / `reteIvaAmount` / `reteIcaAmount` | Retenciones del adquiriente (si aplica) |
| `netPayableAmount` | Neto = `payableAmount` − retenciones |

- **UI de totales:** mostrar base, IVA/INC, total; si hay retenciones (>0) mostrar bloque "Retenciones" y el
  **neto a pagar**. Si todas las retenciones son 0, ocultar ese bloque.

Líneas (`lines: LineDto[]`): `lineNumber`, `description`, `quantity`, `unitMeasureCode`, `unitPrice`,
`lineExtensionAmount`, `taxCategory` (enum), `taxScheme` (enum), `taxRate`, `taxAmount`, `totalAmount`.

Pagos (`payments: PaymentDto[]`): `paymentMeans` (enum), `dianCode`, `amount`.

Forma de pago: `paymentForm` (`CONTADO`/`CREDITO`), `paymentDueDate` (si crédito).

Referencia (solo notas): `reference {cufe, prefix, number, issueDate}`, `noteReasonCode`, `noteReasonText`.

> *(El backend también agrupa impuestos por tarifa para reportes; si el detalle expone `taxTotalsByRate`/
> equivalente, úsalo para una tabla "Impuestos por tarifa". Confirmar key exacto contra la API.)*

### 4.4 Documento `NO_ELECTRONICO` (no-PREMIUM)
Si una empresa sin `BILLING` "emite", el documento se guarda local: sin numeración, sin CUFE/QR/PDF, estado
`NO_ELECTRONICO`. En un front bien gateado esto **no debería ocurrir** (el módulo está oculto). Aun así,
diseñar el detalle para este caso: badge neutro, banner explicativo ("Este registro no se envió a la DIAN
porque tu plan no incluye facturación electrónica"), sin acciones de transmisión/PDF.

### 4.5 Notas crédito y débito (correcciones)
La única forma fiscal de corregir una **factura VALIDADA**.

- **Nota crédito** (anulación/devolución/rebaja): `POST /electronic-documents/{id}/credit-note` (201).
  Request `IssueCreditNoteRequest`: `reason` (enum `CreditNoteReason`, requerido). Solo sobre factura
  `VALIDADO`, no nota, no ya reversada. Al validarse la nota, la factura original queda `reversed=true` y se
  reversa la cartera.
- **Nota débito** (aumentos): `POST /electronic-documents/{id}/debit-note` (201). Request
  `IssueDebitNoteRequest`: `reason` (enum `DebitNoteReason`, requerido). No reversa cartera.
- **UI:** desde el detalle de una factura VALIDADA, acciones "Emitir nota crédito" / "Emitir nota débito" →
  modal con selector de motivo (catálogos abajo) + confirmación. La nota resultante sigue su propio ciclo
  `PENDIENTE → …`.

`CreditNoteReason` (código DIAN): `DEVOLUCION`=1 · `ANULACION`=2 · `REBAJA`=3 · `AJUSTE_PRECIO`=4 · `OTROS`=5.
`DebitNoteReason` (código DIAN): `INTERESES`=1 · `GASTOS`=2 · `CAMBIO_VALOR`=3 · `OTROS`=4.

### 4.6 Convertir POS → Factura
- **Endpoint:** `POST /electronic-documents/{id}/convert-to-invoice` (201). Sin body. `{id}` = documento POS.
- **UI:** en el detalle de un `DOC_EQUIV_POS`, acción "Convertir a factura" (a pedido del cliente). Genera una
  `FE_VENTA` sobre la misma venta.

### 4.7 Listado de documentos
- **Endpoints:** `GET /electronic-documents` (lista de la empresa) · `GET /electronic-documents/{id}`.
- **UI tabla:** número (prefijo+consecutivo), tipo, fecha, cliente, total, **estado DIAN** (badge), CUFE/CUDE
  corto. Filtros sugeridos (cliente-side si no hay query params): por tipo, por estado, por rango de fecha,
  por cliente. Fila → detalle (§4.3). Acción "Emitir" visible según permiso.

---

## 5. Datos fiscales en catálogos (prerrequisitos de cada venta)

### 5.1 Cliente (`Owner`) — campos fiscales
En el módulo de clientes, estos campos alimentan el adquiriente del documento:

| Campo | Tipo | UI |
|---|---|---|
| `documentType` | enum `OwnerDocumentType` | Selector (códigos DIAN abajo) |
| `document` | String (≤50) | Número de documento |
| `verificationDigit` | String | Solo si NIT |
| `personType` | enum `PersonType` | `NATURAL` / `JURIDICA` (si jurídica → `legalName` requerido) |
| `legalName` | String | Razón social (jurídica) |
| `withholdingAgent` | boolean | Toggle "Agente retenedor" → activa retenciones (§3.4) |
| `email` | String | Para envío de la representación gráfica |
| `city` | ref `City` (con `daneCode`) | Ciudad (su DANE se usa para el XML) |

`OwnerDocumentType` (código DIAN): `CEDULA_CIUDADANIA`=13 · `NIT`=31 · `CEDULA_EXTRANJERIA`=22 ·
`PASAPORTE`=41 · `PEP`=47. `PersonType`: `NATURAL`, `JURIDICA`.

> UI: cuando se vaya a facturar a un cliente identificado, validar que tenga documento+tipo+ciudad; si es
> jurídico, `legalName`. Mostrar checklist de "datos fiscales completos" en la ficha del cliente.

### 5.2 Productos y servicios — clasificación tributaria
| Campo | Tipo | UI |
|---|---|---|
| `taxTreatment` | enum `TaxTreatment` | `GRAVADO` / `EXENTO` / `EXCLUIDO` / `INC` |
| `tax` | ref `Tax` (`name`, `percentage`, `taxScheme`) | Tarifa; requerida si `GRAVADO`/`INC`; nula si `EXENTO`/`EXCLUIDO` |

`TaxScheme` (código DIAN): `IVA`=01 · `INC`=04. El selector de tarifa debe filtrar por esquema según el
`taxTreatment`.

### 5.3 Ciudades
`City` expone `daneCode` (5 díg.). Necesario para mapear la ciudad del cliente al `city_id` del proveedor.
No requiere UI nueva salvo asegurar que la ciudad del cliente tenga DANE.

---

## 6. Reportes (PREMIUM, permiso `salesReport.read`)

### 6.1 Libro de ventas — `GET /sales-reports/sales-book?from&to`
Respuesta `SalesBookDto`: `dateFrom`, `dateTo`, `entries[]`, `taxByRate[]`, `recaudoByMeans[]`, `totals`.
- `entries[]` (por documento): tipo, prefijo, consecutivo, fecha, cliente (doc+nombre), `base`, `iva`, `inc`,
  `total`, `payable`, `reteFuente`, `reteIva`, `reteIca`, `dianStatus`, `cufe`/`cude`.
- `taxByRate[]`: `taxScheme`, `taxRate`, `taxableAmount`, `taxAmount` (insumo formulario 300).
- `recaudoByMeans[]`: `paymentMeans`, `dianCode`, `amount`.
- `totals`: `documentCount`, `base`, `iva`, `inc`, `total`, `payable`, `reteFuente`, `reteIva`, `reteIca`.
- **UI:** selector de rango de fechas (requerido), tabla de documentos + paneles resumen (impuestos por tarifa,
  recaudo por medio, totales). Exportar (CSV/Excel) recomendado.

### 6.2 Conciliación DIAN — `GET /sales-reports/reconciliation?from&to`
Respuesta `ReconciliationDto`: `dateFrom`, `dateTo`, `total`, `validados`, `rechazados`, `contingencia`,
`pendientes`, `needsAttention[]` (lista de los que requieren atención: id, tipo, prefijo, consecutivo, fecha,
`dianStatus`, cufe/cude).
- **UI:** tarjetas/contadores por estado + lista accionable "requieren atención" (cada uno enlaza a su detalle
  para re-transmitir o corregir).

---

## 7. Manejo de errores (mapa HTTP → UI)

| HTTP / código | Cuándo | UI |
|---|---|---|
| `400` `INVALID_INPUT` | Validación de campos | Errores inline en el formulario |
| `404` `*_NOT_FOUND` | Recurso inexistente | Estado vacío / "no encontrado" |
| `409` `INVALID_STATE` | p. ej. "la cuenta debe estar cerrada", "sin proveedor DIAN", "sin resolución activa" | Toast/banner con el mensaje del backend; guiar a configurar |
| `409` `DOCUMENT_NOT_VALIDATED` | Emitir nota sobre factura no validada | Bloquear acción; explicar |
| `409` `CONCURRENT_MODIFICATION` | Edición concurrente (`@Version`) | "Otro usuario modificó esto"; refrescar y reintentar |
| `403` `FORBIDDEN` | Falta de permiso | Ocultar/deshabilitar la acción de origen |

> Importante: la falta de PREMIUM **no** llega como error en emisión (devuelve `NO_ELECTRONICO`); el gating es
> de **visibilidad** (§1), no de error.

---

## 8. Principios de diseño / UX (resumen accionable)

1. **Gate primero (por permisos):** todo el módulo cuelga de los **permisos** del usuario (`/me →
   permissions[]`). Sin permisos de facturación → ocultar + upsell. `/auth/me` **no** trae bandera de
   capacidad. Nunca mostrar formularios fiscales a quien no tenga el permiso.
2. **Onboarding guiado:** tablero "¿lista para facturar?" con pasos (perfil fiscal → proveedor → numeración).
   Bloquear "Emitir" hasta tener lo mínimo, con CTAs claras a lo que falta.
3. **Asincronía explícita:** emitir no da CUFE al instante. Diseñar estados `PENDIENTE` y refresco; nunca
   prometer "validado" antes de tiempo.
4. **Inmutabilidad fiscal:** sin editar/eliminar documentos; corrección = nota crédito/débito. Diseñar esas
   acciones, no un "editar".
5. **Secretos del proveedor:** nunca se devuelven; UI basada en "Configurado/Sin configurar" + reemplazo.
6. **Códigos DIAN visibles donde importan** (tipos de documento, esquemas, medios de pago, motivos de nota):
   usar etiquetas legibles, pero conservar el valor enum exacto en el envío.
7. **Estados vacíos** para: sin perfil fiscal, sin proveedor, sin resoluciones, sin documentos, reporte sin
   datos en el rango.
8. **Consistencia con catálogos:** clientes/productos/servicios deben tener datos fiscales; enlazar a
   completarlos desde el flujo de emisión.

---

## Apéndice A — Endpoints (resumen)

| Acción | Método | Ruta | Permiso |
|---|---|---|---|
| Perfil fiscal: crear/editar/ver | POST/PUT/GET | `/company-tax-profile` | `companyTaxProfile.manage` / `.read` |
| Actividades económicas (catálogo) | GET | `/economic-activities` | (lectura) |
| Proveedor DIAN: crear/editar/ver | POST/PUT/GET | `/dian-provider-configs` | `dianProviderConfig.manage` / `.read` |
| Numeración: CRUD + reactivar | POST/GET/PUT/DELETE/PATCH | `/numbering-resolutions[/{id}][/enable]` | `numberingResolution.*` |
| Retenciones: set/ver | PUT/GET | `/withholding-configs` | `withholdingConfig.manage` / `.read` |
| Emitir | POST | `/electronic-documents/emit` | `electronicDocument.emit` |
| Construir provisional | POST | `/electronic-documents/from-account` | `electronicDocument.create` |
| Convertir POS→FE | POST | `/electronic-documents/{id}/convert-to-invoice` | `electronicDocument.emit` |
| Re-transmitir | POST | `/electronic-documents/{id}/transmit` | `electronicDocument.transmit` |
| Nota crédito | POST | `/electronic-documents/{id}/credit-note` | `electronicDocument.emit` |
| Nota débito | POST | `/electronic-documents/{id}/debit-note` | `electronicDocument.emit` |
| Listar / ver documento | GET | `/electronic-documents[/{id}]` | `electronicDocument.read` |
| Libro de ventas | GET | `/sales-reports/sales-book?from&to` | `salesReport.read` |
| Conciliación | GET | `/sales-reports/reconciliation?from&to` | `salesReport.read` |
| Permisos del usuario (gating) | GET | `/auth/me` → `permissions[]` (sin bandera de capacidad) | autenticado |

## Apéndice B — Enums (con código DIAN)

- **DianStatus:** PENDIENTE · VALIDADO · RECHAZADO · CONTINGENCIA · NO_ELECTRONICO
- **ElectronicDocumentType:** FE_VENTA · DOC_EQUIV_POS · NOTA_CREDITO · NOTA_DEBITO
- **PaymentForm:** CONTADO=1 · CREDITO=2
- **PaymentMeans:** EFECTIVO=10 · TARJETA_DEBITO=48 · TARJETA_CREDITO=49 · TRANSFERENCIA=42
- **TaxCategory:** GRAVADO · EXENTO · EXCLUIDO · INC
- **TaxScheme:** IVA=01 · INC=04
- **CreditNoteReason:** DEVOLUCION=1 · ANULACION=2 · REBAJA=3 · AJUSTE_PRECIO=4 · OTROS=5
- **DebitNoteReason:** INTERESES=1 · GASTOS=2 · CAMBIO_VALOR=3 · OTROS=4
- **CompanyDocumentType:** NIT=31 · CEDULA_CIUDADANIA=13 · CEDULA_EXTRANJERIA=22 · PASAPORTE=41
- **OwnerDocumentType:** CEDULA_CIUDADANIA=13 · NIT=31 · CEDULA_EXTRANJERIA=22 · PASAPORTE=41 · PEP=47
- **PersonType:** NATURAL · JURIDICA
- **TaxRegime:** RESPONSABLE_IVA · NO_RESPONSABLE_IVA
- **TaxTreatment:** GRAVADO · EXENTO · EXCLUIDO · INC
- **ProviderType:** MATIAS
- **ProviderEnvironment:** SANDBOX · PRODUCTION

## Apéndice C — Glosario

- **CUFE / CUDE:** código único que identifica una factura (CUFE) o un documento equivalente/nota (CUDE)
  validado por la DIAN.
- **Resolución de numeración:** autorización DIAN de un rango de consecutivos por tipo de documento.
- **Consumidor final:** venta sin identificar al cliente (NIT genérico `222222222222`).
- **Agente retenedor:** cliente que practica retenciones (ReteFuente/IVA/ICA) sobre la compra.
- **Contingencia:** estado cuando la DIAN/proveedor no está disponible; el sistema reintenta.
- **NO_ELECTRONICO:** documento guardado solo localmente porque la empresa no tiene el plan PREMIUM
  (submódulo `BILLING`); nunca se envía a la DIAN.
