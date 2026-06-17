/* global VET_MOCK_OWNERS */

// ============================================================================
// Facturación electrónica (DIAN) — enums, permisos, mocks
// ============================================================================

// Permisos del usuario (en prod vienen de GET /auth/me → permissions[]).
// El módulo es visible si tiene AL MENOS uno. Aquí simulamos premium completo.
const VET_FE_PERMISSIONS = [
  'electronicDocument.read', 'electronicDocument.emit', 'electronicDocument.transmit',
  'electronicDocument.create', 'salesReport.read',
  'dianProviderConfig.manage', 'dianProviderConfig.read',
  'numberingResolution.create', 'numberingResolution.update', 'numberingResolution.read', 'numberingResolution.delete',
  'withholdingConfig.manage', 'withholdingConfig.read',
  'companyTaxProfile.manage', 'companyTaxProfile.read',
];
function vetFeCan(perm) { return VET_FE_PERMISSIONS.includes(perm) || VET_FE_PERMISSIONS.includes('admin.all'); }
function vetFeHasModule() { return VET_FE_PERMISSIONS.length > 0; }

// Enums con etiqueta legible + código DIAN
const VET_FE_DOC_TYPE = {
  FE_VENTA:      { label: 'Factura electrónica' },
  DOC_EQUIV_POS: { label: 'Documento POS' },
  NOTA_CREDITO:  { label: 'Nota crédito' },
  NOTA_DEBITO:   { label: 'Nota débito' },
};
const VET_FE_STATUS = {
  PENDIENTE:     { label: 'Validando…',     tone: { bg: 'oklch(94% 0.04 240)', fg: 'oklch(42% 0.14 240)', dot: 'oklch(55% 0.16 240)' } },
  VALIDADO:      { label: 'Validado',        tone: { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.15 150)' } },
  RECHAZADO:     { label: 'Rechazado',       tone: { bg: 'oklch(94% 0.06 25)',  fg: 'oklch(48% 0.19 25)',  dot: 'oklch(58% 0.20 25)' } },
  CONTINGENCIA:  { label: 'En contingencia', tone: { bg: 'oklch(94% 0.07 80)',  fg: 'oklch(45% 0.13 70)',  dot: 'oklch(65% 0.14 75)' } },
  NO_ELECTRONICO:{ label: 'No electrónico',  tone: { bg: 'var(--warm-200)',     fg: 'var(--warm-600)',     dot: 'var(--warm-500)' } },
};
const VET_FE_COMPANY_DOCTYPE = { NIT: 'NIT (31)', CEDULA_CIUDADANIA: 'Cédula (13)', CEDULA_EXTRANJERIA: 'C. extranjería (22)', PASAPORTE: 'Pasaporte (41)' };
const VET_FE_TAX_REGIME = { RESPONSABLE_IVA: 'Responsable de IVA', NO_RESPONSABLE_IVA: 'No responsable de IVA' };
const VET_FE_ENVIRONMENT = { SANDBOX: 'Pruebas (Sandbox)', PRODUCTION: 'Producción' };
const VET_FE_PAYMENT_MEANS = { EFECTIVO: 'Efectivo (10)', TARJETA_DEBITO: 'T. débito (48)', TARJETA_CREDITO: 'T. crédito (49)', TRANSFERENCIA: 'Transferencia (42)' };
const VET_FE_CREDIT_REASON = { DEVOLUCION: 'Devolución (1)', ANULACION: 'Anulación (2)', REBAJA: 'Rebaja (3)', AJUSTE_PRECIO: 'Ajuste de precio (4)', OTROS: 'Otros (5)' };
const VET_FE_DEBIT_REASON = { INTERESES: 'Intereses (1)', GASTOS: 'Gastos (2)', CAMBIO_VALOR: 'Cambio de valor (3)', OTROS: 'Otros (4)' };
const VET_FE_RESPONSABILITIES = ['O-13', 'O-15', 'O-23', 'R-99-PN', 'O-47'];
const VET_FE_ECONOMIC_ACTIVITIES = [
  { id: 7500, code: '7500', name: 'Actividades veterinarias' },
  { id: 4773, code: '4773', name: 'Comercio al por menor de productos farmacéuticos' },
  { id: 4774, code: '4774', name: 'Comercio al por menor de otros productos' },
];

// Estado de configuración (singletons). null = sin configurar.
const VET_FE_TAX_PROFILE = {
  documentType: 'NIT', companyDocumentId: '901456789', companyDocumentVerificationDigit: '3',
  legalName: 'Clínica Veterinaria Norte S.A.S.', taxRegime: 'RESPONSABLE_IVA',
  fiscalEmail: 'facturacion@clinicanorte.com', commercialName: 'Vetrina Norte',
  economicActivityId: 7500, responsibilities: ['O-13', 'R-99-PN'],
};
const VET_FE_PROVIDER = {
  provider: 'MATIAS', environment: 'SANDBOX', baseUrl: 'https://api.matias.co/v1',
  clientId: 'vetrina-norte-01', numberingProviderRef: 'NPR-2024-01',
  clientSecretConfigured: true, usernameConfigured: true, passwordConfigured: true,
  apiTokenConfigured: false, webhookSecretConfigured: true,
};
const VET_FE_RESOLUTIONS = [
  { id: 1, documentType: 'FE_VENTA', resolutionNumber: '18764003912345', resolutionDate: '2025-01-15',
    prefix: 'FE', rangeFrom: 1000, rangeTo: 5000, currentNumber: 1247, validFrom: '2025-01-15', validTo: '2026-01-15', technicalKey: 'a1b2c3', enabled: true },
  { id: 2, documentType: 'DOC_EQUIV_POS', resolutionNumber: '18764003998877', resolutionDate: '2025-01-15',
    prefix: 'POS', rangeFrom: 1, rangeTo: 10000, currentNumber: 9620, validFrom: '2025-01-15', validTo: '2026-01-15', technicalKey: 'x9y8z7', enabled: true },
  { id: 3, documentType: 'NOTA_CREDITO', resolutionNumber: '18764003955512', resolutionDate: '2025-01-15',
    prefix: 'NC', rangeFrom: 1, rangeTo: 2000, currentNumber: 34, validFrom: '2025-01-15', validTo: '2026-06-30', technicalKey: '', enabled: true },
];
const VET_FE_WITHHOLDING = { reteFuenteRate: 2.5, reteIvaRate: 15, reteIcaRate: 0.414 };

// Documentos electrónicos emitidos
const VET_FE_DOCUMENTS = [
  {
    id: 5001, documentType: 'FE_VENTA', prefix: 'FE', consecutive: 1247, resolutionNumber: '18764003912345',
    issueDate: '2026-06-14', issueTime: '10:32:00-05:00', dianStatus: 'VALIDADO',
    cufe: 'a1f4c8e7d2b9605143fae8c7d1b2a3940fe5c6d7e8b9a0c1d2e3f4a5b6c7d8e9', cude: null, uuid: 'MAT-9981-2026', reversed: false,
    qrUrl: 'qr', pdfRepresentation: 'fe-1247.pdf', dianValidationDate: '2026-06-14T10:33:12',
    customer: { documentType: 'NIT', documentId: '901112233', verificationDigit: '4', personType: 'JURIDICA', legalName: 'Hacienda La Pradera S.A.S.', name: 'Hacienda La Pradera', email: 'pagos@lapradera.com' },
    base: 285000, iva: 54150, inc: 0, payable: 339150, reteFuente: 7125, reteIva: 8122, reteIca: 0, netPayable: 323903,
    paymentForm: 'CONTADO', paymentMeans: 'TRANSFERENCIA',
    lines: [
      { lineNumber: 1, description: 'Consulta especializada', quantity: 1, unitMeasureCode: 'UN', unitPrice: 120000, lineExtensionAmount: 120000, taxCategory: 'GRAVADO', taxScheme: 'IVA', taxRate: 19, taxAmount: 22800, totalAmount: 142800 },
      { lineNumber: 2, description: 'Hospitalización (2 días)', quantity: 2, unitMeasureCode: 'UN', unitPrice: 82500, lineExtensionAmount: 165000, taxCategory: 'GRAVADO', taxScheme: 'IVA', taxRate: 19, taxAmount: 31350, totalAmount: 196350 },
    ],
  },
  {
    id: 5002, documentType: 'DOC_EQUIV_POS', prefix: 'POS', consecutive: 9620, resolutionNumber: '18764003998877',
    issueDate: '2026-06-15', issueTime: '16:05:00-05:00', dianStatus: 'VALIDADO',
    cufe: null, cude: 'b8c7d6e5f4a3920183cde7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6', uuid: 'MAT-9990-2026', reversed: false,
    qrUrl: 'qr', pdfRepresentation: 'pos-9620.pdf', dianValidationDate: '2026-06-15T16:05:44',
    customer: { documentType: 'CEDULA_CIUDADANIA', documentId: '222222222222', verificationDigit: null, personType: 'NATURAL', legalName: null, name: 'Consumidor final', email: null },
    base: 72000, iva: 13680, inc: 0, payable: 85680, reteFuente: 0, reteIva: 0, reteIca: 0, netPayable: 85680,
    paymentForm: 'CONTADO', paymentMeans: 'EFECTIVO',
    lines: [
      { lineNumber: 1, description: 'Royal Canin Adult 3kg', quantity: 1, unitMeasureCode: 'UN', unitPrice: 72000, lineExtensionAmount: 72000, taxCategory: 'GRAVADO', taxScheme: 'IVA', taxRate: 19, taxAmount: 13680, totalAmount: 85680 },
    ],
  },
  {
    id: 5003, documentType: 'FE_VENTA', prefix: 'FE', consecutive: 1248, resolutionNumber: '18764003912345',
    issueDate: '2026-06-15', issueTime: '09:12:00-05:00', dianStatus: 'PENDIENTE',
    cufe: null, cude: null, uuid: 'MAT-9995-2026', reversed: false,
    qrUrl: null, pdfRepresentation: null, dianValidationDate: null,
    customer: { documentType: 'CEDULA_CIUDADANIA', documentId: '1024876301', verificationDigit: null, personType: 'NATURAL', legalName: null, name: 'Carla Mendoza Salinas', email: 'carla.mendoza@gmail.com' },
    base: 95000, iva: 18050, inc: 0, payable: 113050, reteFuente: 0, reteIva: 0, reteIca: 0, netPayable: 113050,
    paymentForm: 'CONTADO', paymentMeans: 'TARJETA_CREDITO',
    lines: [
      { lineNumber: 1, description: 'Esterilización (OVH)', quantity: 1, unitMeasureCode: 'UN', unitPrice: 95000, lineExtensionAmount: 95000, taxCategory: 'GRAVADO', taxScheme: 'IVA', taxRate: 19, taxAmount: 18050, totalAmount: 113050 },
    ],
  },
  {
    id: 5004, documentType: 'FE_VENTA', prefix: 'FE', consecutive: 1246, resolutionNumber: '18764003912345',
    issueDate: '2026-06-13', issueTime: '14:20:00-05:00', dianStatus: 'RECHAZADO',
    cufe: null, cude: null, uuid: 'MAT-9970-2026', reversed: false, rejectReason: 'El adquiriente no tiene un correo electrónico válido registrado ante la DIAN.',
    qrUrl: null, pdfRepresentation: null, dianValidationDate: '2026-06-13T14:21:08',
    customer: { documentType: 'NIT', documentId: '800555444', verificationDigit: '1', personType: 'JURIDICA', legalName: 'Agropecuaria El Sol Ltda.', name: 'Agropecuaria El Sol', email: '' },
    base: 150000, iva: 28500, inc: 0, payable: 178500, reteFuente: 0, reteIva: 0, reteIca: 0, netPayable: 178500,
    paymentForm: 'CREDITO', paymentMeans: 'TRANSFERENCIA', paymentDueDate: '2026-07-13',
    lines: [
      { lineNumber: 1, description: 'Cirugía mayor', quantity: 1, unitMeasureCode: 'UN', unitPrice: 150000, lineExtensionAmount: 150000, taxCategory: 'GRAVADO', taxScheme: 'IVA', taxRate: 19, taxAmount: 28500, totalAmount: 178500 },
    ],
  },
  {
    id: 5005, documentType: 'DOC_EQUIV_POS', prefix: 'POS', consecutive: 9618, resolutionNumber: '18764003998877',
    issueDate: '2026-06-12', issueTime: '11:48:00-05:00', dianStatus: 'CONTINGENCIA',
    cufe: null, cude: null, uuid: 'MAT-9955-2026', reversed: false,
    qrUrl: null, pdfRepresentation: null, dianValidationDate: null,
    customer: { documentType: 'CEDULA_CIUDADANIA', documentId: '222222222222', verificationDigit: null, personType: 'NATURAL', legalName: null, name: 'Consumidor final', email: null },
    base: 45000, iva: 8550, inc: 0, payable: 53550, reteFuente: 0, reteIva: 0, reteIca: 0, netPayable: 53550,
    paymentForm: 'CONTADO', paymentMeans: 'EFECTIVO',
    lines: [
      { lineNumber: 1, description: 'Vacuna antirrábica', quantity: 1, unitMeasureCode: 'UN', unitPrice: 45000, lineExtensionAmount: 45000, taxCategory: 'GRAVADO', taxScheme: 'IVA', taxRate: 19, taxAmount: 8550, totalAmount: 53550 },
    ],
  },
];

// Cuentas cerradas facturables (saldo 0, no facturadas aún) — para el modal Emitir
const VET_FE_BILLABLE_ACCOUNTS = [
  { id: 9101, ownerName: 'Jorge Vargas Rendón', ownerId: '104', closedAt: '2026-06-15', total: 285000, items: 4, pets: 'Toby, Coco' },
  { id: 9102, ownerName: 'Andrea Solís Martín', ownerId: '103', closedAt: '2026-06-15', total: 130000, items: 2, pets: 'Mishi' },
  { id: 9103, ownerName: 'Daniel Ospina', ownerId: '106', closedAt: '2026-06-14', total: 410000, items: 5, pets: 'Cleo, Nala' },
];

function vetFeMoney(n) {
  return '$' + Math.round(n || 0).toLocaleString('es-CO');
}

Object.assign(window, {
  VET_FE_PERMISSIONS, vetFeCan, vetFeHasModule,
  VET_FE_DOC_TYPE, VET_FE_STATUS, VET_FE_COMPANY_DOCTYPE, VET_FE_TAX_REGIME, VET_FE_ENVIRONMENT,
  VET_FE_PAYMENT_MEANS, VET_FE_CREDIT_REASON, VET_FE_DEBIT_REASON, VET_FE_RESPONSABILITIES, VET_FE_ECONOMIC_ACTIVITIES,
  VET_FE_TAX_PROFILE, VET_FE_PROVIDER, VET_FE_RESOLUTIONS, VET_FE_WITHHOLDING,
  VET_FE_DOCUMENTS, VET_FE_BILLABLE_ACCOUNTS, vetFeMoney,
});
