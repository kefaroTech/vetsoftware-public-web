import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LandingHero from '@/features/landing/components/LandingHero.vue'
import LandingTopbar from '@/features/landing/components/LandingTopbar.vue'

/**
 * EL CTA DE CUENTA GRATIS Y EL ENLACE A «PLANES Y PRECIOS».
 *
 * <p>Cubre los criterios de aceptación §5.1-§5.5 de
 * `docs/ux/2026-09-07-landing-cta-gratis-y-precios.md`: qué control lleva el
 * nombre accesible exacto, a qué ruta resuelve y dónde aparece la coletilla
 * «Sin tarjeta». Lo que no es verificable sin navegador —contraste, tamaño de
 * objetivo real y desbordamiento a 375 px— queda fuera (§5.7-§5.9), ya cubierto
 * por reutilizar clases existentes sin overrides de color.
 */

vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a :href="JSON.stringify(to)"><slot /></a>' },
}))

describe('El CTA «Crea tu cuenta gratis»', () => {
  it('vive en la barra superior y resuelve a la ruta de registro', () => {
    const wrapper = mount(LandingTopbar)
    const cta = wrapper.get('.land-topbar-cta')

    expect(cta.text()).toBe('Crea tu cuenta gratis')
    expect(cta.classes()).toContain('ds-btn--primary')
    expect(cta.attributes('href')).toBe(JSON.stringify({ name: 'signup' }))
  })

  it('vive en el hero, en tamaño grande, y resuelve a la misma ruta', () => {
    const wrapper = mount(LandingHero)
    const cta = wrapper.get('.land-hero-cta')

    expect(cta.text()).toBe('Crea tu cuenta gratis')
    expect(cta.classes()).toContain('ds-btn--primary')
    expect(cta.classes()).toContain('ds-btn--lg')
    expect(cta.attributes('href')).toBe(JSON.stringify({ name: 'signup' }))
  })

  it('la coletilla «Sin tarjeta» va solo en el hero, no en la barra', () => {
    expect(mount(LandingHero).text()).toContain('Sin tarjeta')
    expect(mount(LandingTopbar).text()).not.toContain('Sin tarjeta')
  })
})

describe('El enlace «Planes y precios»', () => {
  it('está en la barra, entre «Combinaciones» y «Preguntas», y resuelve a /planes', () => {
    const wrapper = mount(LandingTopbar)
    const enlaces = wrapper.findAll('.land-nav-link, .land-topbar-cta').map((e) => e.text())

    expect(enlaces).toEqual([
      'Combinaciones',
      'Planes y precios',
      'Preguntas',
      'Iniciar sesión',
      'Crea tu cuenta gratis',
    ])

    const planesYPrecios = wrapper
      .findAll('.land-nav-link')
      .find((e) => e.text() === 'Planes y precios')
    expect(planesYPrecios?.attributes('href')).toBe(JSON.stringify({ name: 'planes' }))
  })

  it('el enlace que antes decía «Paquetes» sigue apuntando a la ancla #planes', () => {
    const combinaciones = mount(LandingTopbar)
      .findAll('.land-nav-link')
      .find((e) => e.text() === 'Combinaciones')

    expect(combinaciones?.attributes('href')).toBe('#planes')
  })

  it('también está en el hero, junto al CTA', () => {
    const wrapper = mount(LandingHero)
    const enlace = wrapper.get('.land-hero-secundario')

    expect(enlace.text()).toBe('Planes y precios')
    expect(enlace.attributes('href')).toBe(JSON.stringify({ name: 'planes' }))
  })
})
