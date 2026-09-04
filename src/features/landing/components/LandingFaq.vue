<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCatalogoComercial } from '@/features/asistente/composables/useCatalogoComercial'
import { formatMoney } from '@/composables/money'
import { usePlanes } from '../composables/usePlanes'
import type { Ciclo } from '../types/plans.types'

/**
 * §E — preguntas frecuentes.
 *
 * Ocho `<details>`/`<summary>` NATIVOS. No es un acordeón a mano: el nativo trae
 * el teclado, el estado expandido y el anuncio del lector sin una línea de
 * JavaScript, y es lo que el APG recomienda para «Disclosure». Un acordeón
 * propio significaría escribir y mantener `aria-expanded`, `aria-controls`, el
 * manejo de Enter/Espacio y el orden de foco, para acabar en lo mismo.
 *
 * <p>Ninguna respuesta promete «30 días»: la prueba vence POR LÍNEA y las fechas
 * reales se ven al contratar. Y ninguna promete cuándo deja de cobrarse un
 * módulo que se da de baja, ni prorrateo al añadir uno: facturación no cumple
 * hoy ninguna de las dos, y una FAQ es un compromiso comercial por escrito.
 *
 * <p>Las dos cifras que aparecen se LEEN del catálogo. Escribirlas a mano
 * significaría que una subida de precio deja mintiendo a la portada, que es el
 * sitio donde más caro sale.
 */
const cicloDeLasCifras = ref<Ciclo>('MENSUAL')

const { articulo } = useCatalogoComercial(cicloDeLasCifras)
const { plans } = usePlanes(false)

/**
 * El eje de sedes, con lo que trae incluido y lo que cuesta la unidad de más.
 *
 * <p>Sale de los planes y no del catálogo comercial porque `CapacidadCatalogo`
 * publica `incluido` pero no el precio de la unidad adicional (public-web#275).
 * Se toma el primer plan que lo tenga tarifado al mes: un `null` significa «no
 * se vende suelta en ese ciclo», y anunciar entonces una cifra sería prometer
 * algo que la contratación rechaza.
 */
const sedeAdicional = computed(() => {
  for (const plan of plans.value) {
    const branch = plan.capacities.find((c) => c.unit === 'BRANCH')
    if (branch && branch.monthlyExtraUnitAmount !== null) {
      return { incluidas: branch.included, precio: formatMoney(branch.monthlyExtraUnitAmount) }
    }
  }
  return null
})

const precioFacturacionDian = computed(() => {
  const importe = articulo('ELECTRONIC_INVOICING')?.importe
  return importe === null || importe === undefined ? null : formatMoney(importe)
})

const respuestaSedes = computed(() => {
  const sede = sedeAdicional.value
  if (!sede) {
    return 'Sí. Las sedes se cuentan y se cobran por sede: tu propuesta dice cuántas van incluidas y cuánto cuesta cada una de más.'
  }
  const incluidas =
    sede.incluidas === 1 ? 'la primera va incluida' : `van incluidas ${sede.incluidas}`
  return `Sí. Las sedes se cuentan y se cobran por sede: ${incluidas} y cada una de más cuesta ${sede.precio} al mes.`
})

const respuestaDian = computed(() => {
  const precio = precioFacturacionDian.value
  if (!precio) {
    return 'Sí, con tu resolución de facturación. Es un módulo aparte y se cobra desde el primer día.'
  }
  return `Sí, con tu resolución de facturación. Es un módulo aparte: ${precio} al mes y se cobra desde el primer día.`
})

const preguntas = computed(() => [
  {
    q: '¿Tengo que contratar módulos que no uso?',
    a: 'No. Se cobra la parte de clientes y mascotas, que va siempre, y solo los módulos que marcaste. Los demás quedan apagados y no aparecen en tu recibo.',
  },
  {
    q: '¿Puedo quitar un módulo si dejo de usarlo?',
    a: 'Sí. Hoy el ajuste lo hacemos nosotros: escríbenos a soporte@kefaro.tech, nos dices cuál y lo damos de baja.',
  },
  {
    q: '¿Y si más adelante necesito uno más?',
    a: 'Igual: nos escribes a soporte@kefaro.tech y lo activamos. Antes de encenderlo te confirmamos qué cuesta.',
  },
  {
    q: '¿Tengo que poner una tarjeta para probarlo?',
    a: 'No. La prueba no pide datos de pago.',
  },
  {
    q: '¿Qué pasa cuando se acaba la prueba?',
    a: 'Te avisamos por correo antes. Cada módulo tiene su propia fecha y las verás todas antes de confirmar.',
  },
  { q: '¿Sirve para varias sedes?', a: respuestaSedes.value },
  { q: '¿Emite factura electrónica DIAN?', a: respuestaDian.value },
  {
    q: '¿Dónde están mis datos?',
    a: 'En Colombia, cifrados, y son tuyos. Puedes pedir que te los exportemos.',
  },
])
</script>

<template>
  <section id="preguntas" class="pub-section" aria-labelledby="faq-titulo" tabindex="-1">
    <div class="pub-section-head">
      <h2 id="faq-titulo">Preguntas que nos hacen siempre</h2>
    </div>

    <div class="land-faq">
      <details v-for="p in preguntas" :key="p.q" class="land-faq-item">
        <summary class="land-faq-q">{{ p.q }}</summary>
        <p class="land-faq-a">{{ p.a }}</p>
      </details>
    </div>
  </section>
</template>

<style scoped>
/* El destino de un ancla nunca recibe el foco por teclado: es el único caso
   donde `outline: none` no le quita el anillo a nadie. Ver `anclaConFoco.ts`. */
.pub-section:focus {
  outline: none;
}

.land-faq {
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.land-faq-item {
  border: 1px solid var(--pub-line);
  border-radius: 13px;
  background: var(--pub-surface);
  padding: 2px 18px;
}

/* §2.5.8 Target Size: el objetivo táctil de un desplegable en móvil no puede
   ser la altura de una línea de texto. */
.land-faq-q {
  display: flex;
  align-items: center;
  min-height: 52px;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--pub-ink-900);
  cursor: pointer;
}

.land-faq-a {
  margin: 0 0 16px;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--pub-ink-600);
}
</style>
