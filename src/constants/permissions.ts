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
  HOSPITALIZATION_CREATE: 'hospitalization.create',
  DEWORMING_CREATE: 'deworming.create',
  DIAGNOSTIC_IMAGING_CREATE: 'diagnosticimaging.create',
  LABORATORY_TEST_CREATE: 'laboratoryTest.create',
  SURGERY_CREATE: 'surgery.create',
} as const

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS]
