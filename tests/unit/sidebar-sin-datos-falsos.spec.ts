import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import type { MeResponse } from '@/features/auth/types'

/**
 * GUARDA DE EST-12 — el sidebar no inventa a nadie.
 *
 * La tarjeta de usuario salía de `src/features/dashboard/data/mock.ts` en
 * PRODUCCIÓN: todo empleado veía «Mariana Rojas · Veterinaria» y «Clínica Norte»
 * sobre su propio botón de cerrar sesión. No es un detalle cosmético — es un
 * nombre ajeno presentado como la identidad de la sesión activa, en la única
 * parte de la interfaz que responde a «¿quién soy y en qué clínica estoy?».
 *
 * La prueba tiene dos mitades y las dos hacen falta:
 *  · que se vea el dato REAL (nombre e iniciales derivados de `/auth/me`), y
 *  · que NINGUNA de las cadenas del mock retirado aparezca en el DOM.
 *
 * La segunda sin la primera pasaría con un sidebar en blanco; la primera sin la
 * segunda pasaría si el mock siguiera pintado en otra línea de la misma tarjeta,
 * que es exactamente como estaba el defecto.
 *
 * Se monta con TODOS los permisos para que el sidebar se despliegue entero: si se
 * montara sin permisos, la mayoría del marcado no se pintaría y la búsqueda de las
 * cadenas prohibidas recorrería un DOM casi vacío.
 */

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'home', fullPath: '/' }),
  useRouter: () => ({ push: vi.fn() }),
}))

/** Las tres cadenas de `mock.ts` que EST-12 sacó de la interfaz. */
const CADENAS_DEL_MOCK = ['Mariana', 'Veterinaria', 'Clínica Norte'] as const

const TODOS_LOS_PERMISOS = Object.values(PERMISSIONS)

function sesionCon(me: MeResponse | null) {
  useAuthStore().me = me
}

function empleado(name: string): MeResponse {
  return {
    id: 42,
    type: 'EMPLOYEE',
    companyId: 1,
    name,
    employeeCode: 'AP',
    mustChangePassword: false,
    permissions: TODOS_LOS_PERMISOS,
    branchIds: [1],
  } as MeResponse
}

function montar(): VueWrapper {
  return mount(AppSidebar, {
    global: {
      // `BranchSelector` pide las sedes al backend al montarse; no es lo que aquí se
      // prueba y su petición dejaría la prueba a merced de la red.
      stubs: { BranchSelector: true, SidebarSubItem: true, RouterLink: true },
    },
  }) as VueWrapper
}

beforeEach(() => {
  sesionCon(null)
})

describe('AppSidebar — la tarjeta de usuario muestra la sesión real (EST-12)', () => {
  it('pinta el nombre de la sesión y sus iniciales correctas', () => {
    sesionCon(empleado('Ana Pérez Gómez'))
    const wrapper = montar()

    // `AppSidebar` parte `MeResponse.name` por el PRIMER y el ÚLTIMO token
    // (AppSidebar.vue:98-102), así que el segundo apellido no se pinta: la tarjeta
    // muestra «Ana Gómez». Es una abreviatura del nombre real, no un nombre
    // inventado —que es lo que EST-12 corrige—, y se fija aquí tal cual para que
    // cambiarla sea una decisión y no un descuido.
    expect(wrapper.find('button.user-card .name').text()).toBe('Ana Gómez')
    // Primer y último token: «Ana … Gómez» → AG. Ni «AP» (primeros dos tokens) ni «AN».
    expect(wrapper.find('button.user-card .avatar').text()).toBe('AG')
  })

  it('no deja rastro de las cadenas del mock retirado en ningún punto del DOM', () => {
    sesionCon(empleado('Ana Pérez Gómez'))
    const wrapper = montar()

    // Se quitan los comentarios del marcado antes de buscar: el SFC documenta el
    // propio arreglo citando la cadena que retiró («Antes decía "Veterinaria" a todo
    // el mundo»), y ese comentario solo sobrevive en el build de desarrollo — Vue lo
    // elimina al compilar para producción. Buscar dentro de él mediría el comentario,
    // no la interfaz.
    const html = wrapper.html().replace(/<!--[\s\S]*?-->/g, '')
    for (const cadena of CADENAS_DEL_MOCK) {
      expect(
        html,
        `«${cadena}» viene de src/features/dashboard/data/mock.ts y no puede volver a la ` +
          'interfaz: es el nombre de otra persona presentado como la sesión activa (EST-12)',
      ).not.toContain(cadena)
    }
  })

  it('no muestra una línea de rol: /auth/me entrega permisos, no el nombre del rol', () => {
    sesionCon(empleado('Ana Pérez Gómez'))
    const wrapper = montar()

    // El hueco honesto: sin dato real la línea no se pinta, en vez de inventar uno.
    expect(wrapper.find('.role').exists()).toBe(false)
  })

  it('un nombre de una sola palabra deja UNA inicial, que es la verdad', () => {
    sesionCon(empleado('Ana'))
    const wrapper = montar()

    expect(wrapper.text()).toContain('Ana')
    expect(wrapper.find('button.user-card .avatar').text()).toBe('A')
  })

  it('sin sesión cargada, el botón de cuenta CONSERVA nombre accesible', () => {
    sesionCon(null)
    const wrapper = montar()

    // Mientras `/auth/me` no ha respondido no hay nombre; un botón sin texto es un
    // botón sin nombre para el lector de pantalla, así que queda el rótulo genérico
    // del control — que no finge ser el nombre de nadie.
    const cuenta = wrapper.find('button.user-card')
    expect(cuenta.exists(), 'el botón de cuenta debe seguir existiendo sin sesión').toBe(true)

    const nombreAccesible = (cuenta.attributes('aria-label') ?? cuenta.text())
      .replace(/\s+/g, ' ')
      .trim()
    expect(
      nombreAccesible,
      'sin nombre accesible el control es inalcanzable por teclado+lector',
    ).not.toBe('')
    for (const cadena of CADENAS_DEL_MOCK) {
      expect(nombreAccesible).not.toContain(cadena)
    }
  })
})
