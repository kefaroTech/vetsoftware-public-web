import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ConsultaActiveBanner from '@/components/feedback/ConsultaActiveBanner.vue'
import { useNuevaConsultaDraftStore } from '@/features/dashboard/views/consulta/nueva/stores/nuevaConsultaDraft.store'

/**
 * El banner «Consulta en curso» se monta FUERA del `<RouterView>`, así que se
 * pinta encima de cualquier ruta — la pantalla de login incluida. Su condición de
 * visibilidad solo excluía las rutas del asistente, de modo que en `/login`
 * anunciaba «Consulta en curso — {mascota} · {propietario}» con los datos del
 * turno anterior a quien todavía no había iniciado sesión: el nombre del paciente
 * y el del propietario, visibles sin credenciales, a cualquiera que se sentara
 * delante del PC de recepción (issue #68).
 */

const routeName = { value: 'home' as string }
vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return routeName.value
    },
  }),
  useRouter: () => ({ push: vi.fn() }),
}))

const AUTH_STORAGE_KEY = 'vetsoft.auth'

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(new TextEncoder().encode(JSON.stringify(value)))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma-no-verificada`
}

function seedSession() {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token: jwt({ sub: '1', type: 'EMPLOYEE', companyId: 1, iat: 0, exp: 0 }),
      type: 'EMPLOYEE',
    }),
  )
}

/** Una consulta en curso: hay propietario cargado en el borrador. */
function seedConsultaEnCurso() {
  useNuevaConsultaDraftStore().setOwner({ id: 5, name: 'Ana Ruiz' } as never)
}

beforeEach(() => {
  localStorage.clear()
  routeName.value = 'home'
})

describe('ConsultaActiveBanner', () => {
  it('no se pinta sin sesión, aunque haya un borrador con propietario', () => {
    seedConsultaEnCurso()

    const wrapper = mount(ConsultaActiveBanner)

    expect(wrapper.find('.banner').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Ana Ruiz')
  })

  it('con sesión y consulta en curso sí se pinta', () => {
    // El contrapeso: la condición nueva no puede apagar el banner para todos.
    seedSession()
    seedConsultaEnCurso()

    const wrapper = mount(ConsultaActiveBanner)

    expect(wrapper.find('.banner').exists()).toBe(true)
    expect(wrapper.text()).toContain('Ana Ruiz')
  })

  it('con sesión pero sin consulta en curso no se pinta', () => {
    seedSession()

    expect(mount(ConsultaActiveBanner).find('.banner').exists()).toBe(false)
  })

  it('dentro del asistente no se pinta', () => {
    seedSession()
    seedConsultaEnCurso()
    routeName.value = 'consulta-nueva'

    expect(mount(ConsultaActiveBanner).find('.banner').exists()).toBe(false)
  })
})
