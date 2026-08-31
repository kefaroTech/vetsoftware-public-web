<script setup lang="ts">
import { computed, ref } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import { importeEstimado, sufijoCiclo } from '../../landing/composables/planPricing'
import type { Ciclo } from '../../landing/types/plans.types'
import { arrastraAlMarcar, caeAlQuitar, sugerenciasDe } from '../composables/dependencias'
import type { GrupoConArticulos } from '../composables/useCatalogoComercial'
import type { CatalogoComercial } from '../types/catalogo.types'
import CatalogoGrupo from './CatalogoGrupo.vue'

/**
 * «¿Te falta algo? Añádelo tú» — los trece módulos en cuatro grupos.
 *
 * ── Las dos direcciones de una dependencia se tratan al revés, a propósito ──
 *
 * **Marcar arrastra sin preguntar.** Un modal para una consecuencia obligatoria
 * e inevitable es fricción pura: no hay ninguna respuesta posible salvo «vale».
 * Lo que sí hace falta es que **se vea** que pasó, con su precio y con la
 * explicación que escribió el negocio — sin ese anuncio, quien navega con lector
 * se encuentra cuarenta y seis mil pesos más en el total sin saber de dónde
 * salieron (§4.1.3, AA).
 *
 * **Desmarcar SÍ pregunta.** Quitar Caja cuando Cuentas abiertas depende de ella
 * se lleva las dos, y eso destruye algo que el usuario eligió a propósito.
 * Auto-añadir una consecuencia es razonable; auto-destruir una elección, no.
 *
 * ── El aviso nombra el precio de CADA módulo, no una suma ───────────────────
 * Deliberado. Cada cifra que se pinta aquí es el precio que el catálogo publica
 * para ese artículo — un dato del servidor, no una cuenta. Sumarlos para enseñar
 * «se añadieron 94.000» sería fabricar un total en el cliente, que es
 * exactamente lo que esta feature no hace en ningún sitio. El total repreciado
 * llega solo, del servidor, en cuanto la petición vuelva.
 *
 * ── Y cuando no hay nada, lo dice ───────────────────────────────────────────
 * Ver `vacio`. Sin lista de precios publicada el catálogo llega vacío, `grupos`
 * filtra fuera los cuatro grupos y esta sección se quedaba en un encabezado
 * colgando sobre un hueco. Un hueco no es un estado vacío: es lo que parece una
 * avería, y aquí eso cuesta la venta.
 *
 * ── `RECOMMENDS` no se auto-añade nunca ─────────────────────────────────────
 * Se ofrece con un botón explícito y un «No, gracias» que lo oculta el resto de
 * la sesión. Que el catálogo distinga los dos tipos de arco y la interfaz los
 * pintara igual sería tirar la única información que lo hace legible.
 */
const props = defineProps<{
  grupos: GrupoConArticulos[]
  catalogo: CatalogoComercial | null
  seleccionados: string[]
  sugerenciasDescartadas: string[]
  ciclo: Ciclo
  /** Con un paquete en el carrito no se puede marcar nada: no se compran juntos. */
  bloqueado?: boolean
}>()

const emit = defineEmits<{
  anadir: [code: string]
  quitar: [code: string]
  descartarSugerencia: [code: string]
}>()

interface Arrastrado {
  code: string
  nombre: string
  importe: number | null
}

/** Lo que se acaba de arrastrar. Se anuncia, no solo se pinta. */
const arrastre = ref<{ items: Arrastrado[]; nota: string | null } | null>(null)

/** Lo que caería al desmarcar, esperando confirmación. */
const porQuitar = ref<{ code: string; nombre: string; caidos: string[] } | null>(null)

function nombreDe(code: string): string {
  return props.catalogo?.articulos.find((a) => a.code === code)?.nombre ?? code
}

function importeDe(code: string): number | null {
  return props.catalogo?.articulos.find((a) => a.code === code)?.importe ?? null
}

/**
 * No hay nada que ofrecer: el catálogo **llegó** y no trae ni un artículo
 * vendible.
 *
 * <p>Es el caso «no hay lista de precios publicada», que es un estado normal
 * del negocio: `GET /catalog` responde 200 con `modules`, `packs` y el resto
 * vacíos. `grupos` ya filtra fuera todo grupo sin artículos, así que sin esta
 * rama el `v-for` de abajo no pintaba nada y el encabezado se quedaba solo,
 * colgando sobre un hueco — que es exactamente como se ve una pantalla rota.
 *
 * <p>La condición exige `catalogo !== null` y **no se conforma con la lista
 * vacía**: mientras la petición está en vuelo el catálogo es `null` y los
 * grupos están vacíos también, y afirmar ahí «no hay módulos» sería desmentirse
 * medio segundo después. Se deriva de las props que este componente ya recibe,
 * sin pedirle al panel que le pase la conclusión: el hueco es suyo y la rama
 * que lo tapa también.
 */
const vacio = computed(() => props.catalogo !== null && props.grupos.length === 0)

const sugerencias = computed(() => {
  if (!props.catalogo || props.bloqueado) return []
  return sugerenciasDe(props.seleccionados, props.catalogo).filter(
    (a) => !props.sugerenciasDescartadas.includes(a.hacia),
  )
})

function alternar(code: string, marcado: boolean): void {
  const catalogo = props.catalogo
  if (!catalogo) return

  if (marcado) {
    const arrastrados = arrastraAlMarcar(code, props.seleccionados, catalogo)
    emit('anadir', code)
    for (const extra of arrastrados) emit('anadir', extra)
    arrastre.value =
      arrastrados.length > 0
        ? {
            items: arrastrados.map((c) => ({
              code: c,
              nombre: nombreDe(c),
              importe: importeDe(c),
            })),
            // La nota del PRIMER arco, que es el que el usuario puede entender:
            // en una cadena de tres, la del último eslabón habla de módulos que
            // él no ha tocado.
            nota:
              catalogo.arcos.find(
                (a) => a.tipo === 'REQUIRES' && a.desde === code && a.hacia === arrastrados[0],
              )?.note ?? null,
          }
        : null
    return
  }

  const caidos = caeAlQuitar(code, props.seleccionados, catalogo)
  if (caidos.length === 0) {
    emit('quitar', code)
    return
  }
  porQuitar.value = { code, nombre: nombreDe(code), caidos }
}

function confirmarQuitar(): void {
  const pendiente = porQuitar.value
  if (!pendiente) return
  emit('quitar', pendiente.code)
  for (const caido of pendiente.caidos) emit('quitar', caido)
  porQuitar.value = null
}

const textoConfirmacion = computed(() => {
  const p = porQuitar.value
  if (!p) return ''
  return `Si quitas ${p.nombre} también se va ${p.caidos.map(nombreDe).join(', ')}, porque no funciona sin ella.`
})

/**
 * El texto que oye un lector de pantalla. Lleva el precio de cada módulo y la
 * nota del catálogo: sin eso, el total sube y nadie sabe por qué.
 */
const anuncioArrastre = computed(() => {
  const a = arrastre.value
  if (!a) return ''
  const lista = a.items
    .map((i) => `${i.nombre}, ${importeEstimado(i.importe)} ${sufijoCiclo(props.ciclo)}`)
    .join('; ')
  return `Añadimos también ${lista}. ${a.nota ?? ''}`.trim()
})
</script>

<template>
  <section class="cman" aria-labelledby="catalogo-h2">
    <!-- El encabezado también cambia, y no es cosmética: «Añádelo tú» encima de
         un estado vacío es la misma instrucción imposible que el hueco, dicha en
         negrita y a mayor tamaño. -->
    <h2 id="catalogo-h2" class="cman-h2">
      {{ vacio ? 'Todavía no hay módulos que añadir' : '¿Te falta algo? Añádelo tú' }}
    </h2>

    <p v-if="bloqueado" class="ds-banner ds-banner--warning cman-aviso" role="status">
      Estás viendo un paquete. Los paquetes no se combinan con módulos sueltos, así que para volver
      a elegir pieza a pieza, quita el paquete de tu propuesta.
    </p>

    <!-- El vacío se ANUNCIA: es contenido, no la ausencia de contenido. Sin
         `role="status"` quien navega con lector se queda esperando una lista que
         nunca va a llegar, porque nada le dijo que no venía (§4.1.3). -->
    <p v-else-if="vacio" class="cman-vacio" role="status" data-testid="catalogo-vacio">
      Todavía no hay módulos publicados para armar un plan a medida. Escríbenos a
      <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y te decimos qué podemos
      montarte hoy.
    </p>

    <div v-else class="cman-grupos">
      <CatalogoGrupo
        v-for="g in grupos"
        :key="g.clave"
        :titulo="g.titulo"
        :articulos="g.articulos"
        :seleccionados="seleccionados"
        :ciclo="ciclo"
        @alternar="alternar"
      />
    </div>

    <!-- Una sola región viva para el arrastre: `role="status"` porque no ha
         fallado nada, y con el precio de cada módulo dentro. -->
    <p v-if="arrastre" class="ds-banner cman-aviso" role="status">{{ anuncioArrastre }}</p>

    <section v-if="sugerencias.length > 0" class="cman-sug" aria-labelledby="sugerencias-h3">
      <h3 id="sugerencias-h3" class="cman-sub-h3">Y con esto funcionaría mejor</h3>
      <div v-for="s in sugerencias" :key="s.hacia" class="cman-sug-fila">
        <p class="cman-sug-texto">
          {{ s.note }} — <strong>{{ nombreDe(s.hacia) }}</strong> ·
          {{ importeEstimado(importeDe(s.hacia)) }} {{ sufijoCiclo(ciclo) }}
        </p>
        <div class="cman-sug-acciones">
          <button
            type="button"
            class="ds-btn ds-btn--ghost cman-boton"
            :aria-label="`Añadir ${nombreDe(s.hacia)}`"
            @click="emit('anadir', s.hacia)"
          >
            Añadir
          </button>
          <button
            type="button"
            class="ds-btn ds-btn--plain cman-boton"
            :aria-label="`No añadir ${nombreDe(s.hacia)}`"
            @click="emit('descartarSugerencia', s.hacia)"
          >
            No, gracias
          </button>
        </div>
      </div>
    </section>

    <p class="cman-onetime">
      ¿Necesitas que migremos tus datos del sistema que usas hoy, o capacitación para tu equipo?
      Escríbenos a <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y lo cotizamos
      aparte.
    </p>

    <ModalShell
      :open="porQuitar !== null"
      title="¿Quitamos las dos?"
      role="alertdialog"
      accent="warn"
      compact
      :width="440"
      @close="porQuitar = null"
    >
      <p class="cman-modal-texto">{{ textoConfirmacion }}</p>
      <template #footer-actions>
        <button type="button" class="ds-btn ds-btn--ghost" @click="porQuitar = null">
          Dejarlo como está
        </button>
        <button type="button" class="ds-btn ds-btn--danger-solid" @click="confirmarQuitar">
          Quitar las dos
        </button>
      </template>
    </ModalShell>
  </section>
</template>

<style scoped>
.cman {
  margin-block-start: 24px;
}

.cman-h2 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.cman-grupos {
  display: grid;
  gap: 18px;
}

.cman-aviso {
  margin-block-start: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.cman-vacio {
  margin: 0;
  font-size: 13.5px;
  color: var(--pub-ink-600);
}

.cman-sug {
  margin-block-start: 16px;
}

.cman-sub-h3 {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pub-ink-600);
}

.cman-sug-fila {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-block: 6px;
}

.cman-sug-texto {
  margin: 0;
  flex: 1 1 260px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-700);
}

.cman-sug-acciones {
  display: flex;
  gap: 6px;
}

.cman-boton {
  min-block-size: 44px;
}

.cman-onetime {
  margin: 18px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.cman-modal-texto {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
}
</style>
