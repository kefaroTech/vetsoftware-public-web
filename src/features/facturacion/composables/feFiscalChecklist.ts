// Datos fiscales del cliente (adquiriente) para emitir Factura electrónica > 5 UVT,
// y el checklist que decide si están completos. Espejo del Owner fiscal del backend
// (owner.domain: OwnerDocumentType, PersonType, TaxRegime).

import type { PersonType, TaxRegime } from '../types/facturacion'

/** Tipos de documento del adquiriente (con código DIAN). Incluye PEP (no está en el emisor). */
export type OwnerDocumentType =
  | 'CEDULA_CIUDADANIA'
  | 'NIT'
  | 'CEDULA_EXTRANJERIA'
  | 'PASAPORTE'
  | 'PEP'

export const OWNER_DOCTYPE_LABEL: Record<OwnerDocumentType, string> = {
  CEDULA_CIUDADANIA: 'Cédula de ciudadanía (13)',
  NIT: 'NIT (31)',
  CEDULA_EXTRANJERIA: 'Cédula de extranjería (22)',
  PASAPORTE: 'Pasaporte (41)',
  PEP: 'PEP (47)',
}

/** Datos fiscales del cliente que alimentan el adquiriente del documento. */
export interface FiscalCustomer {
  /** Nombre para mostrar (no fiscal). */
  name: string
  documentType: OwnerDocumentType | null
  documentId: string
  verificationDigit: string | null
  personType: PersonType | null
  legalName: string | null
  email: string | null
  cityId: number | null
  cityName?: string | null
  taxRegime: TaxRegime | null
  withholdingAgent: boolean
}

export interface ChecklistItem {
  key: string
  label: string
  ok: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Evalúa qué datos fiscales del cliente están completos para emitir FE.
 * Campos condicionales: DV solo si NIT; razón social solo si jurídica.
 *
 * Nota (hueco G2): la DIAN exige que la ciudad tenga código DANE. El front aún no
 * recibe el DANE (ni en Owner.city ni en catálogo), así que aquí el ítem "Ciudad"
 * valida que haya ciudad asignada; el DANE lo resuelve/valida el backend al emitir.
 */
export function feFiscalChecklist(c: FiscalCustomer | null): {
  items: ChecklistItem[]
  complete: boolean
} {
  if (!c) return { items: [], complete: false }
  const isNit = c.documentType === 'NIT'
  const isJuridica = c.personType === 'JURIDICA'
  const items: ChecklistItem[] = [
    { key: 'doc', label: 'Tipo y número de documento', ok: !!(c.documentType && c.documentId) },
    ...(isNit ? [{ key: 'dv', label: 'Dígito de verificación', ok: !!c.verificationDigit }] : []),
    { key: 'person', label: 'Tipo de persona', ok: !!c.personType },
    ...(isJuridica
      ? [{ key: 'legal', label: 'Razón social', ok: !!(c.legalName && c.legalName.trim()) }]
      : []),
    { key: 'email', label: 'Correo electrónico', ok: EMAIL_RE.test(c.email ?? '') },
    { key: 'city', label: 'Ciudad', ok: c.cityId != null },
    { key: 'regime', label: 'Régimen tributario', ok: !!c.taxRegime },
  ]
  return { items, complete: items.every((i) => i.ok) }
}
