import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { avisoCupo, sustantivo } from '@/features/suscripcion/composables/cuposText'
import type { LimitEnforcement } from '@/features/suscripcion/types/cupos.types'
import { useModulosStore } from '../stores/modulos.store'
import type { ModuleCeilingResponse, ModuleShowcaseResponse } from '../types/modulos.types'

/**
 * El estado degradado de UN módulo, transversal a cualquier pantalla clínica. Los seis estados
 * del contrato (`ModuleShowcaseState`) se reducen a los tres que cambian el comportamiento de
 * una pantalla: `FULL` (nada que avisar), `FREE_LIMITED` (hay techo, con o sin aviso de umbral)
 * y `READ_ONLY` (solo consulta). `TRIAL` cuenta como `FREE_LIMITED` porque el techo de prueba ES
 * el techo gratuito: el mismo `ceilings[]` gobierna las dos.
 */
export type EstadoModulo = 'FULL' | 'FREE_LIMITED' | 'READ_ONLY'

export interface BannerModulo {
  tono: 'warning' | 'error'
  texto: string
}

function bloquea(enforcement: string | undefined): boolean {
  return enforcement === 'BLOCK' || enforcement === 'READ_ONLY'
}

function techoAgotado(ceiling: ModuleCeilingResponse): boolean {
  return ceiling.limit != null && (ceiling.used ?? 0) >= ceiling.limit
}

function avisoDeCeiling(ceiling: ModuleCeilingResponse) {
  return avisoCupo(
    {
      usedQuantity: ceiling.used,
      limitQuantity: ceiling.limit,
      dimensionCode: ceiling.dimensionCode,
    },
    ceiling.enforcement as LimitEnforcement | undefined,
    ceiling.warnThreshold,
  )
}

/**
 * Cruza el escaparate por `moduleCode` y devuelve un resultado ya resuelto para esa pantalla. No
 * añade una llamada de red por módulo: todas las instancias comparten la misma carga del store.
 */
export function useModuloEstado(moduleCode: string) {
  const store = useModulosStore()
  const { cargando, error } = storeToRefs(store)

  onMounted(() => {
    if (store.modulos.length === 0) void store.cargar()
  })

  /** `undefined` cuando el módulo no aparece en el escaparate: **nunca se asume degradado por
   *  ausencia de dato** (mismo principio de R14 que protege `useCupos`). */
  const modulo = computed<ModuleShowcaseResponse | undefined>(() => store.porCodigo(moduleCode))

  const ceilings = computed<ModuleCeilingResponse[]>(() => modulo.value?.ceilings ?? [])

  const estado = computed<EstadoModulo>(() => {
    switch (modulo.value?.state) {
      case 'EXPIRED_READ_ONLY':
        return 'READ_ONLY'
      case 'TRIAL':
      case 'FREE_LIMITED':
        return 'FREE_LIMITED'
      default:
        return 'FULL'
    }
  })

  const esSoloLectura = computed(() => estado.value === 'READ_ONLY')

  const banner = computed<BannerModulo | null>(() => {
    const m = modulo.value
    if (!m) return null
    if (estado.value === 'READ_ONLY') {
      return {
        tono: 'error',
        texto: `Puedes consultar e imprimir lo que ya tienes en ${m.name ?? moduleCode}, incluida la historia si aplica. Para volver a crear, cómpralo.`,
      }
    }
    if (estado.value !== 'FREE_LIMITED') return null
    const avisos = ceilings.value.map(avisoDeCeiling).filter((a) => a !== null)
    const primero = avisos[0]
    if (!primero) return null
    const peor = avisos.find((a) => a.tono === 'error') ?? primero
    return { tono: peor.tono, texto: `${peor.fuerte} ${peor.resto}` }
  })

  /** El texto del toast cuando un techo bloquea la creación. */
  const techoAlcanzadoTexto = computed<string | null>(() => {
    const agotado = ceilings.value.find((c) => bloquea(c.enforcement) && techoAgotado(c))
    if (!agotado) return null
    return `Llegaste al tope gratuito de ${sustantivo(agotado.dimensionCode)} este mes (${agotado.limit}). Amplíalo para seguir creando.`
  })

  return {
    modulo,
    cargando,
    error,
    estado,
    esSoloLectura,
    banner,
    techoAlcanzadoTexto,
  }
}
