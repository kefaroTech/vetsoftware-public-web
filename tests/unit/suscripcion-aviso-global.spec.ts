import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SuscripcionAvisoGlobal from '@/features/suscripcion/components/SuscripcionAvisoGlobal.vue'
import type {
  SubscriptionResponse,
  SubscriptionStatus,
} from '@/features/suscripcion/types/suscripcion.types'
import type { ModuleShowcaseResponse } from '@/features/entitlements/types/modulos.types'

const routeName = { value: 'home' as string }
vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return routeName.value
    },
  }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

const subscription = ref<SubscriptionResponse | null>(null)
const load = vi.fn()
vi.mock('@/features/suscripcion/composables/useSuscripcion', () => ({
  useSuscripcion: () => ({ subscription, load }),
}))

const { modulosStoreMock } = vi.hoisted(() => ({
  modulosStoreMock: { modulos: [] as ModuleShowcaseResponse[], cargar: vi.fn() },
}))
vi.mock('@/features/entitlements/stores/modulos.store', () => ({
  useModulosStore: () => modulosStoreMock,
}))

/**
 * El componente lee la fecha de hoy con `todayISO()` (reloj real): las fechas de estos escenarios
 * se calculan relativas a `new Date()` para no depender de qué día sea al correr la suite.
 */
function isoHaceNDias(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sub(
  over: Partial<SubscriptionResponse> & { status: SubscriptionStatus },
): SubscriptionResponse {
  return {
    id: 1,
    subscriptionNumber: 'SUS-001',
    companyId: 7,
    billingCycle: 'MONTHLY',
    current: true,
    startDate: '2026-01-01',
    currentPeriodStart: '2026-08-01',
    currentPeriodEnd: '2026-08-31',
    nextBillingDate: '2026-09-01',
    autoRenew: true,
    createdDate: '2026-01-01',
    enabled: true,
    ...over,
  }
}

beforeEach(() => {
  routeName.value = 'home'
  subscription.value = null
  modulosStoreMock.modulos = []
  load.mockReset()
  modulosStoreMock.cargar.mockReset()
})

describe('SuscripcionAvisoGlobal', () => {
  it('sin plan que contar, el nodo `role="status"` existe pero sin contenido', () => {
    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.find('.aviso').exists()).toBe(false)
  })

  it('tono "none" (plan al día, lejos de la prueba) mantiene el nodo sin pintar el aviso', () => {
    subscription.value = sub({ status: 'ACTIVE', trialEndDate: isoHaceNDias(400) })

    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.find('.aviso').exists()).toBe(false)
    expect(modulosStoreMock.cargar).not.toHaveBeenCalled()
  })

  it('mora: se pinta con el `fuerte`/`frase` de estadoPlan() y el enlace «Ver tus módulos»', () => {
    subscription.value = sub({
      status: 'PAST_DUE',
      pastDueSince: isoHaceNDias(8),
      graceDays: 10,
    })

    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.text()).toContain('Sigues trabajando con normalidad.')
    expect(wrapper.text()).toContain('saldo pendiente')
    expect(wrapper.text()).toContain('Ver tus módulos')
  })

  it('en la propia pantalla de «Tus módulos» no repite el enlace a sí misma', () => {
    subscription.value = sub({ status: 'READ_ONLY' })
    routeName.value = 'suscripcion-modulos'

    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.text()).not.toContain('Ver tus módulos')
  })

  it('carga el plan al montarse, sin forzar recarga', () => {
    mount(SuscripcionAvisoGlobal)

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith()
  })

  it('prueba a ≤ 7 días: nombra las dos consecuencias, sin prometer que todo se cobra', () => {
    subscription.value = sub({ status: 'TRIALING', trialEndDate: isoHaceNDias(-3) })

    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.text()).toContain('No se corta nada por sí solo.')
    expect(wrapper.text()).toContain('algunos módulos siguen gratis con límites')
    expect(wrapper.text()).toContain('otros pasan a solo consulta')
  })

  it('recién repartida: cuenta los módulos del escaparate y lo pide', () => {
    modulosStoreMock.modulos = [
      { code: 'HOSPITALIZATION', state: 'EXPIRED_READ_ONLY' },
      { code: 'LAB_IMAGING', state: 'EXPIRED_READ_ONLY' },
      { code: 'SCHEDULING', state: 'FREE_LIMITED' },
      { code: 'CORE', state: 'PAID' },
    ]
    subscription.value = sub({ status: 'ACTIVE', trialEndDate: isoHaceNDias(1) })

    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.text()).toContain('Tu prueba terminó:')
    expect(wrapper.text()).toContain('2 módulos quedaron en solo lectura')
    expect(wrapper.text()).toContain('1 módulo')
    expect(wrapper.text()).toContain('siguen gratis con techo')
    expect(modulosStoreMock.cargar).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('fuera de la ventana de reparto (más de 3 días) no pide el escaparate', () => {
    subscription.value = sub({ status: 'ACTIVE', trialEndDate: isoHaceNDias(10) })

    mount(SuscripcionAvisoGlobal)

    expect(modulosStoreMock.cargar).not.toHaveBeenCalled()
  })
})
