<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogoComercial } from '@/features/asistente/types/catalogo.types'
import { incluidasDelEje, unidadesExtra } from '../composables/cotizadorLineas'
import type { EstadoImporte, SaltoDePaquete } from '../composables/useCotizador'
import { sufijoCiclo } from '../composables/planPricing'
import type { Ciclo } from '../types/plans.types'

/**
 * La caja del importe en vivo, y la única región viva de la pantalla.
 *
 * ── Cómo se evita que una cifra vieja se lea como la nueva ──────────────────
 * Mientras se recalcula, la cifra anterior se conserva en pantalla —así no hay
 * parpadeo ni salto de alto— pero por tres canales a la vez, ninguno solo de
 * color (§1.4.1): se atenúa, el rótulo «DESDE» pasa a «CALCULANDO» y debajo
 * aparece «Actualizando…». Para el lector la cifra lleva `aria-hidden` mientras
 * el estado no sea firme, de modo que quien explore el bloque con el cursor
 * virtual no encuentre un número que ya no vale. Y con un fallo la cifra no se
 * atenúa: `useCotizador` la destruye, y aquí llega ya como guion.
 *
 * <p>La región viva es UNA en toda la pantalla y `aria-atomic`: el texto cambia
 * de forma entera entre estados y hace falta que se lea completo. Su contenido
 * —éxito, lentitud, fallo y la coletilla del salto de paquete— lo compone
 * `useCotizador`, que es quien sabe cuándo cada anuncio deja de ser cierto.
 *
 * ── El salto de paquete lleva `role="status"`, no `alert` ───────────────────
 * Nada ha fallado: es la explicación de una cifra que sigue en pantalla. Y no
 * se anuncia por su cuenta —se concatena al texto del precio— porque dos
 * regiones vivas para un clic son dos locuciones que se pisan.
 */
const props = defineProps<{
  catalogo: CatalogoComercial | null
  modulos: string[]
  sedes: number
  usuarios: number
  ciclo: Ciclo
  estado: EstadoImporte
  lento: boolean
  /** La cifra ya formateada. Nunca `$ 0`: el guion es el marcador de «sin dato». */
  importe: string
  mensajeDeFallo: string | null
  regionViva: string
  saltoDePaquete: SaltoDePaquete | null
}>()

defineEmits<{ 'volver-al-paquete': [] }>()

const recalculando = computed(() => props.estado === 'CALCULANDO')
const firme = computed(() => props.estado === 'LISTO')

const marca = computed(() => {
  if (props.estado === 'LISTO') return 'firme'
  if (props.estado === 'ERROR') return 'fallido'
  if (props.estado === 'SIN_CATALOGO') return 'sin-catalogo'
  return props.lento ? 'lento' : 'recalculando'
})

const paquete = computed(() => {
  const n = props.modulos.length
  if (n === 0) return 'Solo el núcleo'
  return `Núcleo + ${n} ${n === 1 ? 'módulo' : 'módulos'}`
})

const sinContratar = computed(() => {
  const vendibles = (props.catalogo?.articulos ?? []).filter((a) => !a.obligatorio && a.vendible)
  return Math.max(0, vendibles.length - props.modulos.length)
})

function adicionales(cuantos: number, singular: string, plural: string): string | null {
  if (cuantos <= 0) return null
  return `${cuantos} ${cuantos === 1 ? singular : plural}`
}

/**
 * Qué entra en el precio y qué se queda fuera.
 *
 * <p>Las unidades incluidas salen del catálogo, no de un literal: son las del
 * núcleo en la tarifa vigente y cambian con ella.
 */
const extras = computed(() => {
  const cat = props.catalogo
  if (!cat) return ''

  const sedes = incluidasDelEje(cat, 'BRANCH')
  const personas = incluidasDelEje(cat, 'USER')
  const base =
    `Núcleo, ${sedes} ${sedes === 1 ? 'sede' : 'sedes'} y ` +
    `${personas} ${personas === 1 ? 'persona' : 'personas'} incluidos`

  const cobrados = [
    adicionales(unidadesExtra(props.sedes, sedes), 'sede adicional', 'sedes adicionales'),
    adicionales(
      unidadesExtra(props.usuarios, personas),
      'persona adicional',
      'personas adicionales',
    ),
  ].filter((x): x is string => x !== null)

  const fuera =
    sinContratar.value === 0
      ? ''
      : sinContratar.value === 1
        ? ' No pagas el otro módulo.'
        : ` No pagas los otros ${sinContratar.value} módulos.`

  return `${base}${cobrados.length > 0 ? `, más ${cobrados.join(' y ')}` : ''}.${fuera}`
})
</script>

<template>
  <div class="lpr pub-tinted" :data-estado="marca">
    <p class="lpr-l1">
      Estás pagando <span class="lpr-pack">{{ paquete }}</span> y nada más
    </p>

    <p class="lpr-l2">
      <span class="lpr-desde">{{ recalculando ? 'calculando' : 'desde' }}</span>
      <span class="lpr-cifra pub-num" :aria-hidden="firme ? undefined : 'true'">{{ importe }}</span>
      <span class="lpr-suf">+ IVA {{ sufijoCiclo(ciclo) }}</span>
    </p>

    <p v-if="recalculando" class="lpr-nota">Actualizando con los precios de hoy…</p>

    <div v-if="saltoDePaquete" class="lpr-salto" role="status">
      <p class="lpr-salto-t">Subió el precio porque se perdió el descuento</p>
      <p class="lpr-salto-c">{{ saltoDePaquete.texto }}</p>
      <button type="button" class="lpr-volver pub-focus-ring" @click="$emit('volver-al-paquete')">
        Volver a {{ saltoDePaquete.paquete.nombre }}
      </button>
    </div>

    <p v-if="mensajeDeFallo" class="lpr-fallo" role="status">{{ mensajeDeFallo }}</p>

    <p v-else-if="estado === 'SIN_CATALOGO'" class="lpr-fallo" role="status">
      Todavía no hay precios publicados con los que calcular tu plan. Puedes seguir: el precio
      exacto lo ves antes de confirmar.
    </p>

    <p v-else class="lpr-l3">{{ extras }}</p>

    <p class="ds-sr-only" aria-live="polite" aria-atomic="true">{{ regionViva }}</p>
  </div>
</template>

<style scoped>
.lpr {
  padding: 18px 20px;
  border-radius: 14px;
}

.lpr-l1 {
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--pub-ink-500);
}

.lpr-pack {
  font-weight: 600;
  color: var(--pub-ame-700);
}

.lpr-l2 {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 9px;
  margin: 8px 0 0;
}

.lpr-desde {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--pub-ink-500);
}

.lpr-cifra {
  font-size: 38px;
  color: var(--pub-ink-900);
}

/* La cifra anterior se atenúa mientras se recalcula. Es uno de los tres
   canales, nunca el único: el rótulo y la nota de abajo son los otros dos. */
.lpr[data-estado='recalculando'] .lpr-cifra,
.lpr[data-estado='lento'] .lpr-cifra {
  opacity: 0.45;
}

.lpr-suf {
  font-size: 13px;
  color: var(--pub-ink-600);
}

.lpr-nota,
.lpr-l3 {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-500);
}

.lpr-fallo {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-err-tx-2);
}

.lpr-salto {
  margin-top: 12px;
  padding: 12px 14px;
  border-left: 3px solid var(--pub-ame-600);
  border-radius: 0 10px 10px 0;
  background: var(--pub-tint-50);
}

.lpr-salto-t {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lpr-salto-c {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-500);
}

.lpr-volver {
  margin-top: 10px;
  min-block-size: 40px;
  padding: 0 14px;
  border: 1px solid var(--pub-ame-600);
  border-radius: 10px;
  background: transparent;
  color: var(--pub-ame-800);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.lpr-volver:hover {
  background: var(--pub-tint-100);
}
</style>
