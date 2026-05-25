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
  SURGERY_CREATE: 'surgery.create',
  SURGERY_UPDATE: 'surgery.update',
  SURGERY_DELETE: 'surgery.delete',
  SPA_CREATE: 'spa.create',
  SPA_UPDATE: 'spa.update',
  SPA_DELETE: 'spa.delete',

  AGENDA_READ: 'agenda.read',
} as const

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS]
