import { describe, it, expect, beforeEach } from 'vitest'
import {
  NUEVA_CONSULTA_DRAFT_KEY,
  RECEIPT_WIDTH_KEY,
  migrateRenamedStorageKeys,
} from '@/constants/storageKeys'

/**
 * El rebrand renombró el prefijo `vetrina:` a `lumbre:`, y lo que hay bajo esas
 * claves son datos que ya viven en navegadores reales: un borrador clínico a
 * medio escribir y el ancho del rollo de la impresora del mostrador. Renombrar
 * sin traspasar no borra nada, pero lo vuelve inalcanzable — que para quien lo
 * escribió es lo mismo que haberlo perdido.
 */

const LEGACY_DRAFT_KEY = 'vetrina:nueva-consulta-draft'
const LEGACY_RECEIPT_KEY = 'vetrina:receipt-width'

beforeEach(() => {
  localStorage.clear()
})

describe('traspaso de las claves renombradas por el rebrand', () => {
  it('mueve el valor de la clave vieja a la nueva y borra la vieja', () => {
    localStorage.setItem(LEGACY_DRAFT_KEY, '{"draft":{"anamnesis":"decaído"}}')
    localStorage.setItem(LEGACY_RECEIPT_KEY, '58')

    migrateRenamedStorageKeys()

    expect(localStorage.getItem(NUEVA_CONSULTA_DRAFT_KEY)).toBe('{"draft":{"anamnesis":"decaído"}}')
    expect(localStorage.getItem(RECEIPT_WIDTH_KEY)).toBe('58')
    expect(localStorage.getItem(LEGACY_DRAFT_KEY)).toBeNull()
    expect(localStorage.getItem(LEGACY_RECEIPT_KEY)).toBeNull()
  })

  it('no escribe nada cuando no hay clave vieja', () => {
    migrateRenamedStorageKeys()

    expect(localStorage.getItem(NUEVA_CONSULTA_DRAFT_KEY)).toBeNull()
    expect(localStorage.getItem(RECEIPT_WIDTH_KEY)).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('conserva la clave nueva cuando las dos existen y descarta la vieja', () => {
    localStorage.setItem(LEGACY_DRAFT_KEY, '{"draft":{"anamnesis":"de una pestaña vieja"}}')
    localStorage.setItem(NUEVA_CONSULTA_DRAFT_KEY, '{"draft":{"anamnesis":"lo recién escrito"}}')

    migrateRenamedStorageKeys()

    expect(localStorage.getItem(NUEVA_CONSULTA_DRAFT_KEY)).toBe(
      '{"draft":{"anamnesis":"lo recién escrito"}}',
    )
    expect(localStorage.getItem(LEGACY_DRAFT_KEY)).toBeNull()
  })

  it('es idempotente: una segunda pasada no reintroduce nada', () => {
    localStorage.setItem(LEGACY_RECEIPT_KEY, '58')

    migrateRenamedStorageKeys()
    migrateRenamedStorageKeys()

    expect(localStorage.getItem(RECEIPT_WIDTH_KEY)).toBe('58')
    expect(localStorage.getItem(LEGACY_RECEIPT_KEY)).toBeNull()
  })
})
