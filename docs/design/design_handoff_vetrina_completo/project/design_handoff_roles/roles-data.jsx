// Datos mock para roles + permisos agrupados por sub-módulo
// Modelo target (Vue/TS):
//   Role { id, name, code, active, employeeCount, permissionIds[] }
//   Permission { id, name, code, subModuleId }
//   SubModule { id, name, code, moduleId, moduleName? }

const MODULES = [
  { id: 1, name: 'Clínica', code: 'CLINIC' },
  { id: 2, name: 'Administración', code: 'ADMIN' },
  { id: 3, name: 'Comercial', code: 'COMM' },
];

const SUB_MODULES = [
  { id: 11, moduleId: 1, name: 'Consultas',         code: 'CONSULT' },
  { id: 12, moduleId: 1, name: 'Cirugía',           code: 'SURGERY' },
  { id: 13, moduleId: 1, name: 'Hospitalización',   code: 'HOSPITAL' },
  { id: 14, moduleId: 1, name: 'Vacunación',        code: 'VACCINE' },
  { id: 21, moduleId: 2, name: 'Empleados',         code: 'EMPLOYEES' },
  { id: 22, moduleId: 2, name: 'Roles y permisos',  code: 'ROLES' },
  { id: 23, moduleId: 2, name: 'Configuración',     code: 'CONFIG' },
  { id: 31, moduleId: 3, name: 'Inventario',        code: 'INVENTORY' },
  { id: 32, moduleId: 3, name: 'Facturación',       code: 'BILLING' },
  { id: 33, moduleId: 3, name: 'Reportes',          code: 'REPORTS' },
];

const PERMISSIONS = [
  // Consultas
  { id: 101, subModuleId: 11, name: 'Ver consultas',          code: 'CONSULT_VIEW' },
  { id: 102, subModuleId: 11, name: 'Crear consultas',        code: 'CONSULT_CREATE' },
  { id: 103, subModuleId: 11, name: 'Editar consultas',       code: 'CONSULT_EDIT' },
  { id: 104, subModuleId: 11, name: 'Eliminar consultas',     code: 'CONSULT_DELETE' },
  { id: 105, subModuleId: 11, name: 'Emitir recetas',         code: 'CONSULT_PRESCRIBE' },
  // Cirugía
  { id: 121, subModuleId: 12, name: 'Ver cirugías',           code: 'SURGERY_VIEW' },
  { id: 122, subModuleId: 12, name: 'Programar cirugías',     code: 'SURGERY_SCHEDULE' },
  { id: 123, subModuleId: 12, name: 'Registrar cirugías',     code: 'SURGERY_REGISTER' },
  // Hospitalización
  { id: 131, subModuleId: 13, name: 'Ver hospitalización',    code: 'HOSPITAL_VIEW' },
  { id: 132, subModuleId: 13, name: 'Internar pacientes',     code: 'HOSPITAL_ADMIT' },
  { id: 133, subModuleId: 13, name: 'Dar de alta',            code: 'HOSPITAL_DISCHARGE' },
  // Vacunación
  { id: 141, subModuleId: 14, name: 'Ver vacunación',         code: 'VACCINE_VIEW' },
  { id: 142, subModuleId: 14, name: 'Aplicar vacunas',        code: 'VACCINE_APPLY' },
  // Empleados
  { id: 211, subModuleId: 21, name: 'Ver empleados',          code: 'EMP_VIEW' },
  { id: 212, subModuleId: 21, name: 'Crear empleados',        code: 'EMP_CREATE' },
  { id: 213, subModuleId: 21, name: 'Editar empleados',       code: 'EMP_EDIT' },
  { id: 214, subModuleId: 21, name: 'Desactivar empleados',   code: 'EMP_DEACTIVATE' },
  // Roles
  { id: 221, subModuleId: 22, name: 'Ver roles',              code: 'ROLES_VIEW' },
  { id: 222, subModuleId: 22, name: 'Crear roles',            code: 'ROLES_CREATE' },
  { id: 223, subModuleId: 22, name: 'Editar roles',           code: 'ROLES_EDIT' },
  { id: 224, subModuleId: 22, name: 'Asignar permisos',       code: 'ROLES_ASSIGN' },
  // Configuración
  { id: 231, subModuleId: 23, name: 'Ver configuración',      code: 'CONFIG_VIEW' },
  { id: 232, subModuleId: 23, name: 'Editar configuración',   code: 'CONFIG_EDIT' },
  // Inventario
  { id: 311, subModuleId: 31, name: 'Ver inventario',         code: 'INV_VIEW' },
  { id: 312, subModuleId: 31, name: 'Registrar movimientos',  code: 'INV_MOVE' },
  { id: 313, subModuleId: 31, name: 'Ajustar precios',        code: 'INV_PRICE' },
  // Facturación
  { id: 321, subModuleId: 32, name: 'Ver facturas',           code: 'BILL_VIEW' },
  { id: 322, subModuleId: 32, name: 'Emitir facturas',        code: 'BILL_CREATE' },
  { id: 323, subModuleId: 32, name: 'Anular facturas',        code: 'BILL_CANCEL' },
  // Reportes
  { id: 331, subModuleId: 33, name: 'Ver reportes',           code: 'REPORTS_VIEW' },
  { id: 332, subModuleId: 33, name: 'Exportar reportes',      code: 'REPORTS_EXPORT' },
];

const ROLES_DATA = [
  { id: 1, name: 'Administrador', code: 'ADMIN', active: true,  color: 'amatista',
    permissionIds: PERMISSIONS.map(p => p.id) },
  { id: 2, name: 'Veterinario/a', code: 'VET', active: true, color: 'green',
    permissionIds: [101, 102, 103, 105, 121, 122, 123, 131, 132, 133, 141, 142, 211, 311] },
  { id: 3, name: 'Asistente veterinario', code: 'ASSISTANT', active: true, color: 'blue',
    permissionIds: [101, 102, 141, 142, 131, 211, 311] },
  { id: 4, name: 'Recepcionista', code: 'RECEPTION', active: true, color: 'amber',
    permissionIds: [101, 211, 311, 321, 322, 331] },
  { id: 5, name: 'Auxiliar', code: 'AUX', active: false, color: 'gray',
    permissionIds: [311, 312] },
];

const ROLE_COLORS = {
  amatista: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)', dot: 'var(--amatista-600)' },
  green:    { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.16 150)' },
  blue:     { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)', dot: 'oklch(55% 0.16 240)' },
  amber:    { bg: 'oklch(94% 0.07 80)',  fg: 'oklch(45% 0.13 70)',  dot: 'oklch(65% 0.13 75)' },
  gray:     { bg: 'var(--warm-200)',     fg: 'var(--warm-700)',     dot: 'var(--warm-500)' },
};

function permsBySubModule(permissionIds) {
  // Returns Map<subModuleId, Permission[]>
  const out = new Map();
  for (const pid of permissionIds) {
    const p = PERMISSIONS.find(x => x.id === pid);
    if (!p) continue;
    if (!out.has(p.subModuleId)) out.set(p.subModuleId, []);
    out.get(p.subModuleId).push(p);
  }
  return out;
}

function subModulesUsed(permissionIds) {
  return [...new Set(permissionIds.map(id => PERMISSIONS.find(p => p.id === id)?.subModuleId).filter(Boolean))];
}

Object.assign(window, {
  MODULES, SUB_MODULES, PERMISSIONS, ROLES_DATA, ROLE_COLORS,
  permsBySubModule, subModulesUsed,
});
