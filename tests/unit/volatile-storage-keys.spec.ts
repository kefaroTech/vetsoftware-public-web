import { describe, it, expect, beforeEach } from 'vitest'
import {
  NUEVA_CONSULTA_DRAFT_KEY,
  RECEIPT_WIDTH_KEY,
  SELECTED_BRANCH_KEY,
  VOLATILE_STORAGE_KEYS,
  registerVolatileStorageKeys,
} from '@/constants/storageKeys'
import { storageService } from '@/services/storage/storage.service'

/**
 * Qué se lleva por delante un cierre de sesión y qué no (issue #68).
 *
 * La distinción no es técnica, es de a quién pertenece el dato. El borrador de
 * «Nueva consulta» y la sede activa son del USUARIO que inició sesión: llevan
 * datos clínicos de un paciente y el contexto de sucursal en el que se factura y
 * se descuenta stock, y ninguno de los dos puede seguir en pantalla cuando entra
 * el siguiente turno. El ancho del rollo de la impresora es del EQUIPO: borrarlo
 * obligaría a reconfigurar la impresora en cada cambio de turno, y el primer
 * ticket saldría con el ancho equivocado.
 */

const AUTH_STORAGE_KEY = 'vetsoft.auth'

beforeEach(() => {
  localStorage.clear()
  registerVolatileStorageKeys()
})

describe('registro de claves volátiles', () => {
  it('registra el borrador clínico y la sede activa', () => {
    expect(VOLATILE_STORAGE_KEYS).toContain(NUEVA_CONSULTA_DRAFT_KEY)
    expect(VOLATILE_STORAGE_KEYS).toContain(SELECTED_BRANCH_KEY)
  })

  it('NO registra el ancho del rollo: es del mostrador, no del turno', () => {
    expect(VOLATILE_STORAGE_KEYS).not.toContain(RECEIPT_WIDTH_KEY)
  })

  it('es idempotente: llamarlo dos veces no duplica nada', () => {
    registerVolatileStorageKeys()
    localStorage.setItem(NUEVA_CONSULTA_DRAFT_KEY, '{}')

    storageService.clearVolatile()

    expect(localStorage.getItem(NUEVA_CONSULTA_DRAFT_KEY)).toBeNull()
  })
})

describe('cierre de sesión', () => {
  beforeEach(() => {
    localStorage.setItem(AUTH_STORAGE_KEY, '{"token":"t","type":"EMPLOYEE"}')
    localStorage.setItem(NUEVA_CONSULTA_DRAFT_KEY, '{"draft":{}}')
    localStorage.setItem(SELECTED_BRANCH_KEY, '7')
    localStorage.setItem(RECEIPT_WIDTH_KEY, '58')
  })

  it('se lleva las credenciales, el borrador clínico y la sede', () => {
    storageService.clearVolatile()

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(NUEVA_CONSULTA_DRAFT_KEY)).toBeNull()
    expect(localStorage.getItem(SELECTED_BRANCH_KEY)).toBeNull()
  })

  it('el ancho del rollo sobrevive', () => {
    // Si esto se rompe, la primera factura del turno siguiente sale con el ancho
    // equivocado y nadie relaciona la causa con el cambio de usuario.
    storageService.clearVolatile()

    expect(localStorage.getItem(RECEIPT_WIDTH_KEY)).toBe('58')
  })
})
