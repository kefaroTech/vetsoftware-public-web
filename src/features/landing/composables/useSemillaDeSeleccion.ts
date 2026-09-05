import { toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { CatalogoComercial } from '@/features/asistente/types/catalogo.types'
import { modulosDelPaquete } from './cotizadorLineas'
import { useSeleccionPortadaStore } from '../stores/seleccionPortada.store'
import type { PublicPlan } from '../types/plans.types'

export interface FuentesDeLaSemilla {
  catalogo: MaybeRefOrGetter<CatalogoComercial | null>
  plans: MaybeRefOrGetter<readonly PublicPlan[]>
  /** El `?plan=` de la URL, ya saneado a `null` cuando no viene. */
  planPedido: MaybeRefOrGetter<string | null>
  /** El paquete que la intención guardada trae, o nada si lo que trae es una propuesta. */
  planDeLaIntencion: string | null | undefined
  sembrar: (codigos: readonly string[]) => void
}

/**
 * Con qué módulos arranca `/planes`.
 *
 * <p>Se siembra **sólo una vez**: recargar el catálogo al cambiar de ciclo no
 * puede deshacer lo que el usuario acabe de marcar.
 *
 * <p>Manda la URL porque es un paquete recién pulsado —de una tarjeta o de la
 * banda de reanudar—. Después, lo que el visitante marcó en la portada: sembrar
 * el paquete recomendado encima le borraría las casillas que acaba de tocar, y
 * un valor por defecto que no sobrevive al primer salto no es un valor por
 * defecto. Solo si no llega ninguna de las dos entra la intención guardada y, al
 * final, el paquete que el negocio destaca.
 */
export function useSemillaDeSeleccion({
  catalogo,
  plans,
  planPedido,
  planDeLaIntencion,
  sembrar,
}: FuentesDeLaSemilla): void {
  /**
   * La entrega de la portada se recoge al arrancar y no dentro del `watch`, que
   * corre varias veces mientras llegan el catálogo y los paquetes: una entrega,
   * un consumo. Una lista vacía SÍ es una selección; `null` es no venir de ahí.
   */
  const seleccionDeLaPortada = useSeleccionPortadaStore().recoger()

  let sembrado = false
  watch(
    [() => toValue(catalogo), () => toValue(plans)],
    ([cat, lista]) => {
      if (sembrado || !cat) return
      const pedido = toValue(planPedido)
      if (!pedido && seleccionDeLaPortada) {
        sembrado = true
        sembrar(seleccionDeLaPortada)
        return
      }
      if (cat.paquetes.length === 0) return
      const preferido =
        pedido ?? planDeLaIntencion ?? lista.find((p) => p.recommended)?.code ?? lista[0]?.code
      const elegido =
        cat.paquetes.find((p) => p.code === preferido) ??
        cat.paquetes.find((p) => p.recommended) ??
        cat.paquetes[0]
      if (!elegido) return
      sembrado = true
      sembrar(modulosDelPaquete(elegido, cat))
    },
    { immediate: true },
  )
}
