export const PERMISSIONS = {
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

  // Multi-sucursal: gestión de sedes (sección Empresa). Sembrados en el catálogo por la migración 184.
  BRANCH_CREATE: 'branch.create',
  BRANCH_UPDATE: 'branch.update',
  BRANCH_READ: 'branch.read',

  CONSULTATION_CREATE: 'consultation.create',
  PRESCRIPTION_CREATE: 'prescription.create',
  PRESCRIPTION_READ: 'prescription.read',
  PRESCRIPTION_UPDATE: 'prescription.update',
  PRESCRIPTION_DELETE: 'prescription.delete',
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

  // Agendamiento de citas
  APPOINTMENT_CREATE: 'appointment.create',
  APPOINTMENT_READ: 'appointment.read',
  APPOINTMENT_UPDATE: 'appointment.update',
  APPOINTMENT_DELETE: 'appointment.delete',
  APPOINTMENT_CANCEL: 'appointment.cancel',
  // Agendar sobre un hueco ya ocupado (BE-17). Va ADEMÁS de create/update; solo lo trae ADMIN.
  APPOINTMENT_OVERLAP_FORCE: 'appointment.overlap.force',

  // Tienda
  PRODUCT_CREATE: 'product.create',
  PRODUCT_READ: 'product.read',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  SERVICE_CREATE: 'service.create',
  SERVICE_READ: 'service.read',
  SERVICE_UPDATE: 'service.update',
  SERVICE_DELETE: 'service.delete',
  PRODUCT_CATEGORY_CREATE: 'productCategory.create',
  PRODUCT_CATEGORY_READ: 'productCategory.read',
  PRODUCT_CATEGORY_UPDATE: 'productCategory.update',
  PRODUCT_CATEGORY_DELETE: 'productCategory.delete',
  SERVICE_CATEGORY_CREATE: 'serviceCategory.create',
  SERVICE_CATEGORY_READ: 'serviceCategory.read',
  SERVICE_CATEGORY_UPDATE: 'serviceCategory.update',
  SERVICE_CATEGORY_DELETE: 'serviceCategory.delete',
  PROMOTION_CREATE: 'promotion.create',
  PROMOTION_READ: 'promotion.read',
  PROMOTION_UPDATE: 'promotion.update',
  PROMOTION_DELETE: 'promotion.delete',

  // Inventario por sede (kardex/lotes/saldo). Sembrados en el catálogo por la migración 191.
  INVENTORY_READ: 'inventory.read',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',

  // Caja / arqueo (punto 5). Operar = abrir + movimientos manuales; close = cerrar (permiso aparte); read = ver.
  CASHREGISTER_OPERATE: 'cashregister.operate',
  CASHREGISTER_CLOSE: 'cashregister.close',
  CASHREGISTER_READ: 'cashregister.read',
  CASHREGISTER_HISTORY_READ: 'cashregister.history.read',

  // Compras (punto 7). Proveedores (migr. 199), órdenes de compra + recepción (migr. 202),
  // facturas de proveedor / cuentas por pagar (migr. 204) y libro de compras (migr. 205). Sub-módulo PURCHASES.
  SUPPLIER_CREATE: 'supplier.create',
  SUPPLIER_READ: 'supplier.read',
  SUPPLIER_UPDATE: 'supplier.update',
  SUPPLIER_DELETE: 'supplier.delete',
  PURCHASE_ORDER_CREATE: 'purchaseOrder.create',
  PURCHASE_ORDER_READ: 'purchaseOrder.read',
  PURCHASE_ORDER_UPDATE: 'purchaseOrder.update',
  PURCHASE_ORDER_DELETE: 'purchaseOrder.delete',
  GOODS_RECEIPT_CREATE: 'goodsReceipt.create',
  GOODS_RECEIPT_READ: 'goodsReceipt.read',
  GOODS_RECEIPT_CANCEL: 'goodsReceipt.cancel',
  SUPPLIER_INVOICE_CREATE: 'supplierinvoice.create',
  SUPPLIER_INVOICE_READ: 'supplierinvoice.read',
  SUPPLIER_INVOICE_UPDATE: 'supplierinvoice.update',
  SUPPLIER_INVOICE_DELETE: 'supplierinvoice.delete',
  PURCHASE_REPORT_READ: 'purchasereport.read',
  TAX_CREATE: 'tax.create',
  TAX_READ: 'tax.read',
  TAX_UPDATE: 'tax.update',
  TAX_DELETE: 'tax.delete',

  // Cuentas / Facturación
  OPEN_ACCOUNT_CREATE: 'openAccount.create',
  OPEN_ACCOUNT_READ: 'openAccount.read',
  OPEN_ACCOUNT_UPDATE: 'openAccount.update',
  OPEN_ACCOUNT_DELETE: 'openAccount.delete',
  /** Permiso elevado: anular un abono ya registrado (con motivo). */
  DEBT_OPEN_ACCOUNT_VOID: 'debtOpenAccount.delete',
  /** Permiso elevado: anular un cargo ya registrado (con motivo). */
  CHARGE_OPEN_ACCOUNT_VOID: 'chargeOpenAccount.delete',

  // Facturación electrónica (DIAN) — módulo premium. El front muestra/usa el módulo
  // SOLO si el usuario tiene `electronicbilling.create` (submódulo BILLING de la membresía).
  // Los permisos granulares de abajo se conservan para usos puntuales.
  ELECTRONIC_BILLING_CREATE: 'electronicbilling.create',
  ELECTRONIC_DOCUMENT_READ: 'electronicDocument.read',
  ELECTRONIC_DOCUMENT_EMIT: 'electronicDocument.emit',
  ELECTRONIC_DOCUMENT_TRANSMIT: 'electronicDocument.transmit',
  ELECTRONIC_DOCUMENT_CREATE: 'electronicDocument.create',
  SALES_REPORT_READ: 'salesReport.read',
  DIAN_PROVIDER_CONFIG_MANAGE: 'dianProviderConfig.manage',
  DIAN_PROVIDER_CONFIG_READ: 'dianProviderConfig.read',
  NUMBERING_RESOLUTION_CREATE: 'numberingResolution.create',
  NUMBERING_RESOLUTION_UPDATE: 'numberingResolution.update',
  NUMBERING_RESOLUTION_READ: 'numberingResolution.read',
  NUMBERING_RESOLUTION_DELETE: 'numberingResolution.delete',
  WITHHOLDING_CONFIG_MANAGE: 'withholdingConfig.manage',
  WITHHOLDING_CONFIG_READ: 'withholdingConfig.read',
  COMPANY_TAX_PROFILE_MANAGE: 'companyTaxProfile.manage',
  COMPANY_TAX_PROFILE_READ: 'companyTaxProfile.read',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
