<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAsistente } from '@/features/asistente/composables/useAsistente'
import {
  ERROR_TEXTO_CORTO,
  MAX_DESCRIPCION,
  MIN_DESCRIPCION,
} from '@/features/asistente/content/copy.content'
import BloquePrecioVivo from './BloquePrecioVivo.vue'
import ContadorCantidad from './ContadorCantidad.vue'
import LandingSelectorModulos from './LandingSelectorModulos.vue'
import { incluidasDelEje } from '../composables/cotizadorLineas'
import type { useCotizador } from '../composables/useCotizador'

/**
 * La tarjeta del hero: se describe la clínica, se marcan módulos y sale un precio.
 *
 * ── Qué sale del navegador y qué no ─────────────────────────────────────────
 * El `<textarea>` **no sale**. Viaja a un encargado en EE. UU. y eso exige dos
 * autorizaciones separadas (Ley 1581, art. 9 y art. 26 lit. a) que ya están
 * implementadas y razonadas en `AsistenteEntrada`; duplicarlas aquí sería un muro
 * de consentimiento sobre el primer pliegue, y no duplicarlas y enviar sería
 * ilegal. Lo que sí viaja a `/quotes/preview` son códigos de módulo y dos
 * cantidades, que no son dato personal.
 *
 * ── Validación: al enviar, y NUNCA al `blur` ────────────────────────────────
 * Es una desviación consciente de la convención `@blur` del repositorio, y está
 * forzada por el sitio: en una caja del primer pliegue el `blur` ocurre
 * constantemente —el usuario mira la página— y marcaría el campo como tocado sin
 * que haya intentado nada.
 *
 * ── La caja vacía NO es un error ────────────────────────────────────────────
 * Vacío + enviar navega igual, sin queja. El hero no puede ser una puerta
 * cerrada: quien solo mira debe poder avanzar, y el mismo campo —más grande y
 * con su contexto— le espera en el destino. El error solo aparece cuando **lo
 * intentó** y se quedó corto.
 */
const props = defineProps<{ cotizador: ReturnType<typeof useCotizador> }>()

const {
  catalogo,
  modulos,
  sedes,
  usuarios,
  ciclo,
  estado,
  lento,
  importe,
  mensajeDeFallo,
  regionViva,
  saltoDePaquete,
  alternarModulo,
  volverAlPaquete,
} = props.cotizador

const { texto } = useAsistente()
const router = useRouter()

const EJEMPLO_SEMBRADO =
  'Somos una clínica de barrio: consulta general, vacunación y algo de estética los sábados. ' +
  'Dos personas en mostrador y una sola sede.'

// Solo sobre un campo vacío: quien vuelve de `/planes` trae su propio relato, y
// pisarlo con el ejemplo destruiría lo más caro que hay en esta pantalla.
if (!texto.value.trim()) texto.value = EJEMPLO_SEMBRADO

const uid = useId()
const idTexto = `${uid}-texto`
const idAyuda = `${uid}-ayuda`
const idError = `${uid}-error`

const campo = useTemplateRef<HTMLTextAreaElement>('campo')

/** Solo se pone a `true` al enviar. Ver la cabecera. */
const enviado = ref(false)

const error = computed(() => {
  if (!enviado.value) return null
  const limpio = texto.value.trim()
  // Vacío NO es error, y esa es una decisión entera de este componente.
  if (limpio.length === 0 || limpio.length >= MIN_DESCRIPCION) return null
  return ERROR_TEXTO_CORTO
})

const vendibles = computed(
  () => catalogo.value?.articulos.filter((a) => !a.obligatorio && a.vendible).length ?? 0,
)

/** Se calla el conteo mientras el catálogo no ha llegado: «los otros 0» miente. */
const resto = computed(() =>
  vendibles.value > 0 ? `los otros ${vendibles.value} módulos` : 'los demás módulos',
)

const sedesIncluidas = computed(() =>
  catalogo.value ? incluidasDelEje(catalogo.value, 'BRANCH') : null,
)

const personasIncluidas = computed(() =>
  catalogo.value ? incluidasDelEje(catalogo.value, 'USER') : null,
)

function enviar(): void {
  enviado.value = true
  if (error.value) {
    campo.value?.focus()
    return
  }
  void router.push({ name: 'planes' })
}
</script>

<template>
  <!-- `tabindex="-1"` para que los anclajes que apuntan aquí muevan el foco
       además del scroll. Mismo patrón que `#planes`. -->
  <section id="cotizador" class="lcot" tabindex="-1" aria-labelledby="cotizador-h2">
    <h2 id="cotizador-h2" class="lcot-h2">Arma tu plan y mira el precio</h2>

    <p class="lcot-encuadre pub-tinted">
      Arma tu propio plan. <strong>Solo el núcleo es obligatorio</strong> — {{ resto }} los
      enciendes uno a uno.
    </p>

    <form novalidate @submit.prevent="enviar">
      <label :for="idTexto" class="lcot-label">Cuéntanos qué hace tu veterinaria</label>
      <!-- La ayuda va FUERA del `placeholder`: un placeholder desaparece al
           escribir y se lee como un valor ya introducido. -->
      <p :id="idAyuda" class="lcot-ayuda">
        Está escrito un ejemplo: bórralo y cuéntanos lo tuyo. Si prefieres ir a lo concreto, abre el
        área que te interese y marca lo que uses.
      </p>
      <textarea
        :id="idTexto"
        ref="campo"
        v-model="texto"
        class="pub-campo lcot-texto"
        :class="error ? 'ds-field-invalid' : 'pub-campo-rest'"
        rows="3"
        :maxlength="MAX_DESCRIPCION"
        :aria-describedby="error ? `${idAyuda} ${idError}` : idAyuda"
        :aria-invalid="error ? 'true' : undefined"
      />
      <p v-if="error" :id="idError" class="lcot-error" role="alert">{{ error }}</p>

      <LandingSelectorModulos
        class="lcot-selector"
        :catalogo="catalogo"
        :modulos="modulos"
        @alternar="alternarModulo"
      />

      <div class="lcot-cantidades">
        <ContadorCantidad
          v-model="sedes"
          etiqueta="Sedes"
          unidad-singular="sede"
          unidad-plural="sedes"
          :incluidas="sedesIncluidas"
        />
        <ContadorCantidad
          v-model="usuarios"
          etiqueta="Personas que lo usan"
          unidad-singular="persona"
          unidad-plural="personas"
          :incluidas="personasIncluidas"
        />
      </div>

      <BloquePrecioVivo
        class="lcot-precio"
        :catalogo="catalogo"
        :modulos="modulos"
        :sedes="sedes"
        :usuarios="usuarios"
        :ciclo="ciclo"
        :estado="estado"
        :lento="lento"
        :importe="importe"
        :mensaje-de-fallo="mensajeDeFallo"
        :region-viva="regionViva"
        :salto-de-paquete="saltoDePaquete"
        @volver-al-paquete="volverAlPaquete"
      />

      <button type="submit" class="ds-btn ds-btn--primary lcot-enviar">
        Ver mi propuesta y las fechas de prueba
      </button>
      <p class="lcot-pie">
        Prueba gratis, sin tarjeta. Precio orientativo en pesos colombianos: el exacto lo ves antes
        de confirmar.
      </p>
    </form>
  </section>
</template>

<style scoped>
/* Un formulario NO se centra: la tarjeta va alineada a la izquierda dentro del
   hero centrado. Lo único centrado por dentro es el pie. */
.lcot {
  max-inline-size: 560px;
  margin: 34px auto 0;
  padding: 26px;
  border: 1px solid var(--pub-line-strong);
  border-radius: 18px;
  background: var(--pub-surface);
  box-shadow: var(--pub-card-shadow);
  text-align: start;
}

#cotizador:focus {
  outline: none;
}

.lcot-h2 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lcot-encuadre {
  margin: 0 0 16px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.lcot-encuadre strong {
  color: var(--pub-ink-900);
}

.lcot-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lcot-ayuda {
  margin: 5px 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-500);
}

.lcot-texto {
  resize: vertical;
}

.lcot-error {
  margin: 6px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pub-err-tx-2);
}

.lcot-selector {
  margin-block-start: 24px;
}

.lcot-cantidades {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-block-start: 20px;
}

.lcot-precio {
  margin-block-start: 20px;
}

.lcot-enviar {
  inline-size: 100%;
  margin-block-start: 18px;
  min-block-size: 52px;
  font-size: 15.5px;
}

.lcot-pie {
  margin: 11px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-500);
  text-align: center;
}

@media (width <= 600px) {
  .lcot {
    padding: 20px 16px;
  }

  .lcot-cantidades {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
