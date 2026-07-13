/* Empleados mock data */

const VET_ROLES_CATALOG = [
  { id: 1, name: 'Administrador',          code: 'admin',     color: 'amatista',
    description: 'Acceso total al sistema, configuración y reportes.' },
  { id: 2, name: 'Veterinario/a',          code: 'vet',       color: 'green',
    description: 'Atención clínica · puede crear consultas, planes terapéuticos y diagnósticos.' },
  { id: 3, name: 'Asistente veterinario',  code: 'assistant', color: 'blue',
    description: 'Apoyo clínico · vacunas, curaciones y desparasitación.' },
  { id: 4, name: 'Recepcionista',          code: 'reception', color: 'amber',
    description: 'Atención al público · agendamiento y facturación básica.' },
  { id: 5, name: 'Auxiliar',               code: 'aux',       color: 'gray',
    description: 'Apoyo operativo · limpieza, inventario y soporte general.' },
];

const VET_ROLE_COLORS = {
  amatista: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)', dot: 'var(--amatista-600)' },
  green:    { bg: 'oklch(94% 0.06 150)',  fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.16 150)' },
  blue:     { bg: 'oklch(94% 0.04 240)',  fg: 'oklch(40% 0.15 240)', dot: 'oklch(55% 0.16 240)' },
  amber:    { bg: 'oklch(94% 0.07 80)',   fg: 'oklch(45% 0.13 70)',  dot: 'oklch(65% 0.13 75)' },
  gray:     { bg: 'var(--warm-200)',      fg: 'var(--warm-700)',     dot: 'var(--warm-500)' },
};

function vetColorsForCode(code) {
  const r = VET_ROLES_CATALOG.find((x) => x.code === code);
  return VET_ROLE_COLORS[r?.color ?? 'gray'];
}

const VET_MOCK_EMPLOYEES = [
  {
    id: 1, employeeCode: 'VET-001', name: 'Mariana Rojas Salinas', initials: 'MR',
    email: 'mariana.rojas@vetrina.com', status: 'ACTIVE', createdDate: '2023-02-14',
    roles: [{ id: 2, name: 'Veterinario/a', code: 'vet' }],
  },
  {
    id: 2, employeeCode: 'VET-002', name: 'Andrés Mejía Vélez', initials: 'AM',
    email: 'andres.mejia@vetrina.com', status: 'ACTIVE', createdDate: '2023-04-02',
    roles: [{ id: 2, name: 'Veterinario/a', code: 'vet' }],
  },
  {
    id: 3, employeeCode: 'ADM-001', name: 'Lucía Restrepo Quintero', initials: 'LR',
    email: 'lucia.restrepo@vetrina.com', status: 'ACTIVE', createdDate: '2022-11-08',
    roles: [{ id: 1, name: 'Administrador', code: 'admin' }],
  },
  {
    id: 4, employeeCode: 'AST-001', name: 'Diego Ramírez Castro', initials: 'DR',
    email: 'diego.ramirez@vetrina.com', status: 'ACTIVE', createdDate: '2024-01-22',
    roles: [{ id: 3, name: 'Asistente veterinario', code: 'assistant' }],
  },
  {
    id: 5, employeeCode: 'AST-002', name: 'Valentina Torres Ariza', initials: 'VT',
    email: 'valentina.torres@vetrina.com', status: 'ACTIVE', createdDate: '2024-03-15',
    roles: [{ id: 3, name: 'Asistente veterinario', code: 'assistant' }],
  },
  {
    id: 6, employeeCode: 'REC-001', name: 'Camila Henao Morales', initials: 'CH',
    email: 'camila.henao@vetrina.com', status: 'ACTIVE', createdDate: '2023-08-19',
    roles: [{ id: 4, name: 'Recepcionista', code: 'reception' }],
  },
  {
    id: 7, employeeCode: 'REC-002', name: 'Juan Felipe Acosta', initials: 'JA',
    email: 'jf.acosta@vetrina.com', status: 'INACTIVE', createdDate: '2023-01-30',
    roles: [{ id: 4, name: 'Recepcionista', code: 'reception' }],
  },
  {
    id: 8, employeeCode: 'AUX-001', name: 'Sebastián Pérez Calle', initials: 'SP',
    email: 'sebastian.perez@vetrina.com', status: 'ACTIVE', createdDate: '2024-06-04',
    roles: [{ id: 5, name: 'Auxiliar', code: 'aux' }],
  },
  {
    id: 9, employeeCode: 'VET-003', name: 'Sofía Cárdenas León', initials: 'SC',
    email: 'sofia.cardenas@vetrina.com', status: 'INACTIVE', createdDate: '2022-05-21',
    roles: [{ id: 2, name: 'Veterinario/a', code: 'vet' }],
  },
];

Object.assign(window, {
  VET_ROLES_CATALOG, VET_ROLE_COLORS, vetColorsForCode,
  VET_MOCK_EMPLOYEES,
});
