<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAsistente } from '@/features/asistente/composables/useAsistente'
import {
  EJEMPLOS_COTIZADOR,
  ERROR_TEXTO_CORTO,
  MAX_DESCRIPCION,
  MIN_DESCRIPCION,
} from '@/features/asistente/content/copy.content'
import { irAAncla } from '../composables/anclaConFoco'

/**
 * La caja de arranque del hero: lo primero que un prospecto puede tocar.
 *
 * ── Qué es y, sobre todo, qué NO es ─────────────────────────────────────────
 * Es un campo que **siembra el store y navega**. No llama a ninguna API, no pide
 * correo, no pide consentimiento y no genera propuesta. Las tres cosas tienen el
 * mismo motivo y ninguno es de simplicidad:
 *
 *  · **Legal.** El texto libre viaja a un encargado en EE. UU., y eso exige dos
 *    autorizaciones separadas (Ley 1581, art. 9 y art. 26 lit. a) que ya están
 *    implementadas y razonadas en `AsistenteEntrada`. Duplicarlas aquí sería un
 *    muro de consentimiento sobre el primer pliegue; **no duplicarlas y enviar
 *    sería ilegal.** Por eso el texto no sale del navegador hasta `/planes`.
 *  · **Conversión.** Pedir el correo antes de que el prospecto haya escrito una
 *    palabra convierte la pantalla en un muro de captura de lead.
 *  · **Arquitectura.** El embudo tiene **una sola URL** para el paso 2. Esto no
 *    es una segunda pantalla del asistente: es su pórtico.
 *
 * ── Formulario, no conversación ─────────────────────────────────────────────
 * Etiqueta visible, ayuda, `<textarea>` y botón de envío. Nada de burbujas ni de
 * preguntas encadenadas: en el ensayo comparado de formularios digitales el
 * formato conversacional quedó último en usabilidad y cuadruplicó los errores.
 * Lo único que se toma del mundo conversacional es la caja de texto libre como
 * puerta principal.
 *
 * ── Validación: al enviar, y NUNCA al `blur` ────────────────────────────────
 * Es una desviación consciente de la convención `@blur` del repositorio, y está
 * forzada por el sitio: en una caja del primer pliegue el `blur` ocurre
 * constantemente —el usuario mira la página— y marcaría el campo como tocado sin
 * que haya intentado nada. Un error rojo por haber mirado hacia abajo es la
 * forma más rápida de perder a quien todavía no había decidido escribir.
 *
 * ── La caja vacía NO es un error ────────────────────────────────────────────
 * Vacío + enviar navega igual, sin queja. El hero no puede ser una puerta
 * cerrada: quien solo mira debe poder avanzar, y el mismo campo —más grande y
 * con su contexto— le espera en el destino. El error solo aparece cuando **lo
 * intentó** y se quedó corto, porque ahí arreglarlo cuesta un segundo y hacerlo
 * tras una navegación sería una regañina en otra pantalla.
 */
const { texto } = useAsistente()
const router = useRouter()

const uid = useId()
const idTexto = `${uid}-texto`
const idAyuda = `${uid}-ayuda`
const idError = `${uid}-error`
const idEjemplos = `${uid}-ejemplos`

const campo = useTemplateRef<HTMLTextAreaElement>('campo')

/** Solo se pone a `true` al enviar. Ver la cabecera. */
const enviado = ref(false)

const error = computed(() => {
  if (!enviado.value) return null
  const limpio = texto.value.trim()
  // Vacío NO es error, y esa es la decisión entera de este componente.
  if (limpio.length === 0 || limpio.length >= MIN_DESCRIPCION) return null
  return ERROR_TEXTO_CORTO
})

function enviar(): void {
  enviado.value = true
  if (error.value) {
    campo.value?.focus()
    return
  }
  void router.push({ name: 'planes' })
}

/**
 * Un ejemplo pulsable: **rellena, no envía**.
 *
 * <p>Y **añade, no reemplaza.** El texto que el usuario ya tecleó es lo más caro
 * que hay en esta pantalla y no se destruye nunca; si el campo estaba vacío,
 * simplemente lo escribe. El foco salta al final del `<textarea>` porque es lo
 * que hace que un lector de pantalla anuncie el valor nuevo y que quien lo pulsó
 * pueda seguir escribiendo. Es un cambio de contexto provocado por una acción
 * explícita del usuario, así que no infringe §3.2.2.
 */
function usar(ejemplo: string): void {
  const actual = texto.value.trim()
  texto.value = actual ? `${actual} ${ejemplo}` : ejemplo
  void nextTick(() => {
    const el = campo.value
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  })
}
</script>

<template>
  <!-- `tabindex="-1"` para que los anclajes que apuntan aquí muevan el foco
       además del scroll. Mismo patrón que `#planes`.

       Y `aria-label`, que aquí no es adorno: un `<section>` SIN nombre accesible
       no se expone como `region`. Dos enlaces traen el foco hasta aquí, y quien
       seguía «Cuéntanos qué necesitas» aterrizaba en un contenedor mudo mientras
       el camino simétrico —`#planes`, con su `aria-labelledby`— sí anunciaba el
       suyo: el camino que la landing quiere destacar era el peor tratado.

       El nombre repite el rótulo del enlace que trae hasta aquí, para que lo que
       se anuncia al llegar sea lo que se prometió al pulsar. Va como `aria-label`
       y no como `aria-labelledby` al `<label>` del campo porque ese texto es el
       nombre accesible del `<textarea>`: reusarlo haría que el lector leyera la
       misma frase larga dos veces seguidas, primero como región y luego como
       campo. -->
  <section id="cotizador" class="lcot" tabindex="-1" aria-label="Cuéntanos qué necesitas">
    <form novalidate @submit.prevent="enviar">
      <label :for="idTexto" class="lcot-label">
        Cuéntanos qué hace tu veterinaria y te decimos qué necesitas.
      </label>
      <!-- La ayuda va FUERA del `placeholder`: un placeholder desaparece al
           escribir y se lee como un valor ya introducido. -->
      <p :id="idAyuda" class="lcot-ayuda">
        Una o dos frases bastan. Qué atiendes, qué vendes, cuántas sedes.
      </p>
      <textarea
        :id="idTexto"
        ref="campo"
        v-model="texto"
        class="pub-campo"
        :class="error ? 'ds-field-invalid' : 'pub-campo-rest'"
        rows="3"
        :maxlength="MAX_DESCRIPCION"
        :aria-describedby="error ? `${idAyuda} ${idError}` : idAyuda"
        :aria-invalid="error ? 'true' : undefined"
      />
      <p v-if="error" :id="idError" class="lcot-error" role="alert">{{ error }}</p>

      <p :id="idEjemplos" class="lcot-ejemplos-label">O empieza por aquí:</p>
      <ul class="lcot-ejemplos" :aria-labelledby="idEjemplos">
        <li v-for="ejemplo in EJEMPLOS_COTIZADOR" :key="ejemplo">
          <button type="button" class="ds-btn ds-btn--ghost lcot-ejemplo" @click="usar(ejemplo)">
            {{ ejemplo }}
          </button>
        </li>
      </ul>

      <button type="submit" class="ds-btn ds-btn--primary lcot-enviar">Ver qué necesito</button>
      <p class="lcot-tranquilidad">
        Todavía no lo enviamos. En el siguiente paso lo revisas y decides.
      </p>
    </form>

    <p class="lcot-alterna">
      ¿Prefieres no escribir?
      <a href="#planes" class="pub-enlace" @click="irAAncla('planes', $event)"
        >Mira los tres paquetes ya armados.</a
      >
    </p>
  </section>
</template>

<style scoped>
.lcot {
  max-inline-size: 560px;
  margin: 30px auto 0;
  text-align: start;
}

#cotizador:focus {
  outline: none;
}

.lcot-label {
  display: block;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--pub-ink-900);
}

.lcot-ayuda {
  margin: 6px 0 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.lcot-error {
  margin: 6px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pub-err-tx-2);
}

.lcot-ejemplos-label {
  margin: 14px 0 8px;
  font-size: 13px;
  color: var(--pub-ink-600);
}

.lcot-ejemplos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 44 px de alto: el listón de la landing, que se usa con el animal delante. */
.lcot-ejemplo {
  min-block-size: 44px;
}

.lcot-enviar {
  inline-size: 100%;
  margin-block-start: 16px;
  min-block-size: 48px;
}

.lcot-tranquilidad {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.lcot-alterna {
  margin: 14px 0 0;
  font-size: 13.5px;
  color: var(--pub-ink-600);
}
</style>
