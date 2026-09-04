import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import HomeView from '@/features/dashboard/views/HomeView.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import type { MeResponse } from '@/features/auth/types'
import { appointmentApi } from '@/features/agenda/api/appointment.api'

/**
 * EL TABLERO NO INVENTA A NADIE NI NADA.
 *
 * <p>`src/features/dashboard/data/mock.ts` llegaba a producción: el tablero
 * saludaba a «Mariana», contaba «8 citas hoy» y listaba a «Luna», «Rocco» y sus
 * propietarios, todo inventado, en la pantalla que un auxiliar mira para saber
 * qué le queda por hacer hoy. Un dato clínico falso presentado como propio es
 * peor que una pantalla vacía: no hay forma de distinguirlo del real.
 *
 * <p>La prueba tiene dos mitades y las dos hacen falta. La segunda —«ninguna
 * cadena del mock aparece»— pasaría en verde sobre un DOM vacío, que es
 * precisamente lo que un fallo de montaje produce; por eso la primera afirma que
 * la vista se pintó de verdad, con su saludo, sus cuatro cifras y su lista.
 */

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'home', fullPath: '/dashboard' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/features/agenda/api/appointment.api', () => ({
  appointmentApi: { list: vi.fn() },
}))

const list = vi.mocked(appointmentApi.list)

/**
 * Todo lo que `mock.ts` ponía en esta pantalla: la identidad falsa, los cuatro
 * pacientes falsos y sus propietarios falsos.
 */
const CADENAS_DEL_MOCK = [
  'Mariana',
  'Rojas',
  'Veterinaria',
  'Clínica Norte',
  'Luna',
  'Rocco',
  'Mishi',
  'Toby',
  'Carla Mendoza',
  'Luis Paredes',
  'Andrea Solís',
  'Jorge Vargas',
  'Control vacunación',
  'Cojera pata trasera',
  'Esterilización post-op',
  'Chequeo geriátrico',
] as const

function empleado(): MeResponse {
  return {
    id: 42,
    type: 'EMPLOYEE',
    companyId: 1,
    name: 'Ana Pérez',
    employeeCode: 'AP',
    mustChangePassword: false,
    permissions: [PERMISSIONS.APPOINTMENT_READ],
    branchIds: [1],
  } as MeResponse
}

async function montar(): Promise<VueWrapper> {
  // `CtaSecondary` resuelve `RouterLink` como componente global, no lo importa:
  // sin el stub Vue no lo resuelve y ese bloque del tablero no se pinta.
  const wrapper = mount(HomeView, { global: { stubs: { RouterLink: true } } }) as VueWrapper
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  useAuthStore().me = empleado()
  // `mockClear` y no solo `mockResolvedValue`: el espía es del módulo y arrastra
  // las llamadas de los casos anteriores, así que sin esto el caso de «sin
  // permiso no se pide nada» pasaría en verde midiendo las llamadas de otro.
  list.mockClear()
  list.mockResolvedValue([])
})

describe('HomeView — con la agenda vacía no queda ni un dato que no venga del servidor', () => {
  it('se monta de verdad: saluda con el nombre de la sesión y pinta sus cuatro cifras', async () => {
    const wrapper = await montar()

    // La contrapartida del aserto negativo: sin esto, un DOM vacío pasaría.
    expect(wrapper.find('h1').text()).toContain('Ana')
    expect(wrapper.findAll('.stat-card')).toHaveLength(4)
    expect(wrapper.text()).toContain('Citas de hoy')
  })

  it('las cuatro cifras valen cero, que es lo que respondió la API', async () => {
    const valores = (await montar()).findAll('.stat-card .value').map((n) => n.text())

    // Las cuatro de `mockDayStats` eran 8 / 1 / 5 / 2. Afirmar el valor exacto
    // —y no «no contiene un 8»— es lo que impide que una cifra inventada se
    // cuele por el hueco de otro dígito.
    expect(valores).toEqual(['0', '0', '0', '0'])
  })

  it('dice que no hay citas en vez de rellenar la lista', async () => {
    expect((await montar()).text()).toContain('No hay citas para hoy.')
  })

  it('no deja rastro de ninguna cadena del mock retirado', async () => {
    // Se quitan los comentarios del marcado: los SFC citan por escrito las
    // cadenas que retiraron, y ese comentario solo existe en el build de
    // desarrollo. Buscarlo mediría el comentario, no la interfaz.
    const html = (await montar()).html().replace(/<!--[\s\S]*?-->/g, '')

    for (const cadena of CADENAS_DEL_MOCK) {
      expect(
        html,
        `«${cadena}» venía de src/features/dashboard/data/mock.ts: es un dato clínico ` +
          'inventado presentado como el de la clínica que mira la pantalla',
      ).not.toContain(cadena)
    }
  })

  it('sin permiso de agenda no hay cifras ni lista, en vez de ceros que parecen un día tranquilo', async () => {
    useAuthStore().me = { ...empleado(), permissions: [] } as MeResponse

    const wrapper = await montar()

    // Un cero es una afirmación sobre el día; sin permiso no se pidió nada y no
    // hay nada que afirmar. La diferencia importa con el animal delante.
    expect(list).not.toHaveBeenCalled()
    expect(wrapper.findAll('.stat-card')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Citas de hoy')
  })
})
