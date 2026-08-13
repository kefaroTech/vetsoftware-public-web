import { describe, it, expect } from 'vitest'
import { nextRowUid } from '@/composables/rowUid'

/**
 * La clave de una fila editable decide qué nodo del DOM reutiliza Vue. Con el
 * índice del array, borrar la segunda fila hacía que la tercera heredara el
 * nodo —y el estado— de la eliminada: el campo de cantidad conservaba el valor
 * de la fila borrada. En pantallas que capturan cantidades y precios eso es un
 * error de captura difícil de reproducir y fácil de facturar.
 *
 * Lo que estas pruebas fijan es por qué la clave NO puede derivarse del
 * contenido, que fue la primera opción propuesta y no se sostiene.
 */
describe('nextRowUid', () => {
  it('nunca repite', () => {
    const uids = Array.from({ length: 500 }, () => nextRowUid())

    expect(new Set(uids).size).toBe(500)
  })

  it('distingue dos filas de contenido idéntico', () => {
    // El caso que hunde cualquier clave derivada del dato: dos cargos generales
    // del mismo concepto e importe son DOS cargos, no uno. Con
    // `${kind}-${refId}` ambos compartirían clave y Vue fusionaría sus nodos.
    const filaA = { uid: nextRowUid(), concepto: 'Insumos', importe: 15000 }
    const filaB = { uid: nextRowUid(), concepto: 'Insumos', importe: 15000 }

    expect(filaA).not.toEqual(filaB)
    expect(filaA.uid).not.toBe(filaB.uid)
  })

  it('identifica una fila recién creada, que aún no tiene ningún dato', () => {
    // Una línea de compra nace vacía: sin producto, sin coste. No hay nada de
    // lo que derivar una clave hasta que el usuario escribe, y para entonces
    // ya habría hecho falta.
    const vacia = { uid: nextRowUid(), productId: '', quantity: '1', unitCost: '' }

    expect(vacia.uid).toBeGreaterThan(0)
  })
})
