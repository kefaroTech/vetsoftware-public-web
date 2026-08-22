import { describe, it, expect, beforeEach, vi } from 'vitest'
import { withBranchBody, withBranchParam } from '@/features/branches/api/branchContext'

/**
 * El contexto de sede viaja en cada petición operativa, y decide en qué sucursal
 * se descuenta el stock, se abre la caja y se emite el documento. Los tres
 * comportamientos que se fijan aquí tienen consecuencias distintas si se rompen:
 *
 *  - añadir la sede cuando NO toca filtra o escribe en la sucursal equivocada;
 *  - no añadirla cuando sí toca manda la operación a la sede Principal por
 *    defecto del backend, que puede no ser donde está el usuario;
 *  - pisar un `branchId` explícito mueve una cita agendada en otra sede.
 */

const getSelectedBranchId = vi.fn<() => number | null>()
vi.mock('@/features/branches/stores/branch.store', () => ({
  getSelectedBranchId: () => getSelectedBranchId(),
}))

beforeEach(() => {
  getSelectedBranchId.mockReset()
})

describe('withBranchParam', () => {
  it('añade la sede seleccionada a los params', () => {
    getSelectedBranchId.mockReturnValue(7)

    expect(withBranchParam({ page: 0 })).toEqual({ page: 0, branchId: 7 })
  })

  it('con "Todas las sedes" no añade nada', () => {
    // El backend devuelve todas las sucursales cuando el parámetro no viaja.
    // Mandar `branchId: null` filtraría por una sede inexistente.
    getSelectedBranchId.mockReturnValue(null)

    const params = withBranchParam({ page: 0 })

    expect(params).toEqual({ page: 0 })
    expect('branchId' in params).toBe(false)
  })

  it('no muta el objeto que recibe', () => {
    // Los params suelen construirse una vez y reutilizarse; mutar aquí dejaría
    // la sede pegada a llamadas posteriores hechas con "Todas las sedes".
    getSelectedBranchId.mockReturnValue(7)
    const original = { page: 0 }

    withBranchParam(original)

    expect(original).toEqual({ page: 0 })
  })

  it('conserva el resto de filtros', () => {
    getSelectedBranchId.mockReturnValue(3)

    expect(withBranchParam({ q: 'lobo', from: '2026-01-01', lowStock: true })).toEqual({
      q: 'lobo',
      from: '2026-01-01',
      lowStock: true,
      branchId: 3,
    })
  })

  it('la sede 0 se envía: es un id, no un booleano', () => {
    // Solo `null` significa "todas". Un id 0 —aunque hoy no exista— no debe
    // caer por una comprobación de veracidad.
    getSelectedBranchId.mockReturnValue(0)

    expect(withBranchParam({})).toEqual({ branchId: 0 })
  })
})

describe('withBranchBody', () => {
  it('añade la sede seleccionada al cuerpo de una escritura', () => {
    getSelectedBranchId.mockReturnValue(7)

    expect(withBranchBody({ total: 1_000 })).toEqual({ total: 1_000, branchId: 7 })
  })

  it('con "Todas las sedes" deja que el backend elija la Principal', async () => {
    getSelectedBranchId.mockReturnValue(null)

    const cuerpo = withBranchBody({ total: 1_000 })

    // Issue #215 · sin sede resuelta, `withBranchBody` llama a
    // `markPendingBranchBody`, que marca el cuerpo con un símbolo para que el
    // interceptor de `http.client.ts` sepa esperar — y ese símbolo se retira
    // solo, en el microtask siguiente (nunca llega al cable ni sobrevive en el
    // objeto que ve el llamador). Aquí no hay ninguna petición de por medio que
    // deje pasar ese microtask, así que se espera uno explícito antes de
    // comprobar que el cuerpo queda limpio.
    await Promise.resolve()

    expect(cuerpo).toEqual({ total: 1_000 })
    expect(Object.getOwnPropertySymbols(cuerpo)).toEqual([])
  })

  it('respeta el branchId explícito del formulario', () => {
    // Una cita agendada en la sede 9 desde el selector del formulario no puede
    // acabar creada en la sede global del usuario.
    getSelectedBranchId.mockReturnValue(7)

    expect(withBranchBody({ branchId: 9, date: '2026-08-08' })).toEqual({
      branchId: 9,
      date: '2026-08-08',
    })
  })

  it('un branchId explícito nulo cede al global', () => {
    // `null` en el formulario es "no elegí", no "todas".
    getSelectedBranchId.mockReturnValue(7)

    expect(withBranchBody({ branchId: null, date: '2026-08-08' })).toEqual({
      branchId: 7,
      date: '2026-08-08',
    })
  })

  it('respeta un branchId explícito 0', () => {
    getSelectedBranchId.mockReturnValue(7)

    expect(withBranchBody({ branchId: 0 })).toEqual({ branchId: 0 })
  })

  it('no muta el cuerpo original', () => {
    getSelectedBranchId.mockReturnValue(7)
    const payload = { total: 1_000 }

    withBranchBody(payload)

    expect(payload).toEqual({ total: 1_000 })
  })

  it('consulta la sede en cada llamada, no una vez al importar el módulo', () => {
    // El usuario cambia de sede sin recargar. Si el valor se capturara al
    // importar, todas las escrituras seguirían yendo a la sede inicial.
    getSelectedBranchId.mockReturnValueOnce(1).mockReturnValueOnce(2)

    expect(withBranchBody({})).toEqual({ branchId: 1 })
    expect(withBranchBody({})).toEqual({ branchId: 2 })
  })
})
