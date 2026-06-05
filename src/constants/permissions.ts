export const PERMISSIONS = {
  ADMIN_ALL: 'admin.all',

  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_READ: 'employee.read',
  EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_DELETE: 'employee.delete',

  ROLE_READ: 'role.read',
  ROLE_PERMISSIONS_CREATE: 'rolePermissions.create',
  ROLE_PERMISSIONS_READ: 'rolePermissions.read',
  ROLE_PERMISSIONS_UPDATE: 'rolePermissions.update',

  ANIMAL_CREATE: 'animal.create',
  ANIMAL_READ: 'animal.read',

  OWNER_CREATE: 'owner.create',
  OWNER_READ: 'owner.read',
  OWNER_UPDATE: 'owner.update',
  OWNER_DELETE: 'owner.delete',

  COMPANY_CREATE: 'company.create',
  COMPANY_READ: 'company.read',
  COMPANY_UPDATE: 'company.update',
  COMPANY_DELETE: 'company.delete',

  CONSULTATION_CREATE: 'consultation.create',
  PRESCRIPTION_CREATE: 'prescription.create',
  MEDICAMENT_PRESCRIPTION_CREATE: 'medicamentPrescription.create',

  VACCINATION_CREATE: 'vaccination.create',
  VACCINATION_UPDATE: 'vaccination.update',
  VACCINATION_DELETE: 'vaccination.delete',
  HOSPITALIZATION_CREATE: 'hospitalization.create',
  HOSPITALIZATION_READ: 'hospitalization.read',
  HOSPITALIZATION_UPDATE: 'hospitalization.update',
  HOSPITALIZATION_DELETE: 'hospitalization.delete',
  DEWORMING_CREATE: 'deworming.create',
  DEWORMING_UPDATE: 'deworming.update',
  DEWORMING_DELETE: 'deworming.delete',
  DIAGNOSTIC_IMAGING_CREATE: 'diagnosticimaging.create',
  DIAGNOSTIC_IMAGING_UPDATE: 'diagnosticimaging.update',
  DIAGNOSTIC_IMAGING_DELETE: 'diagnosticimaging.delete',
  LABORATORY_TEST_CREATE: 'laboratoryTest.create',
  LABORATORY_TEST_UPDATE: 'laboratoryTest.update',
  LABORATORY_TEST_DELETE: 'laboratoryTest.delete',
  LABORATORY_TEST_READ: 'laboratoryTest.read',
  SURGERY_CREATE: 'surgery.create',
  SURGERY_UPDATE: 'surgery.update',
  SURGERY_DELETE: 'surgery.delete',
  SPA_CREATE: 'spa.create',
  SPA_UPDATE: 'spa.update',
  SPA_DELETE: 'spa.delete',

  AGENDA_READ: 'agenda.read',

  // Tienda
  PRODUCT_CREATE: 'product.create',
  PRODUCT_READ: 'product.read',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  SERVICE_CREATE: 'service.create',
  SERVICE_READ: 'service.read',
  SERVICE_UPDATE: 'service.update',
  SERVICE_DELETE: 'service.delete',
  PROMOTION_CREATE: 'promotion.create',
  PROMOTION_READ: 'promotion.read',
  PROMOTION_UPDATE: 'promotion.update',
  PROMOTION_DELETE: 'promotion.delete',

  // Cuentas / Facturación
  OPEN_ACCOUNT_CREATE: 'openAccount.create',
  OPEN_ACCOUNT_READ: 'openAccount.read',
  OPEN_ACCOUNT_UPDATE: 'openAccount.update',
  OPEN_ACCOUNT_DELETE: 'openAccount.delete',
} as const

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS]
