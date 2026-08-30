<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { MAX_DESCRIPCION } from '../content/copy.content'

/**
 * `FUERA_DE_DOMINIO` — el negocio del prospecto no es de cuidado animal.
 *
 * ── Por qué esta pantalla existe, y qué pasaba sin ella ─────────────────────
 * `out_of_domain` es un booleano **obligatorio** del esquema de salida del
 * modelo, tiene su regla en el prompt, su caso en el conjunto de referencia y su
 * nombre en la lista de estados. Y **no tenía pantalla**. Un estado sin pantalla
 * se implementa cableándolo al vecino más parecido, y el vecino es
 * `NO_ENTENDIDO` — cuya pantalla ofrece **Agenda e Historia clínica como punto
 * de partida**. Es decir: a la peluquería de señoras se le ofrecen historias
 * clínicas veterinarias, y el modelo había acertado. Esto es lo que impide eso.
 *
 * ── Por qué NO es lo mismo que `NO_ENTENDIDO`, y la diferencia lo gobierna todo
 * En `NO_ENTENDIDO` el texto no se entendió y **reescribirlo sirve**. Aquí el
 * texto se entendió perfectamente y **reescribirlo no sirve para nada**, porque
 * el negocio no es del dominio. Tratar los dos igual es hacerle perder el tiempo
 * a alguien para llegar al mismo sitio.
 *
 * ── Las cuatro decisiones de la pantalla ────────────────────────────────────
 *
 *  1. **`ds-banner--info`, no `--warning`.** No hay nada anómalo. El usuario no
 *     ha cometido ningún fallo y el sistema tampoco: simplemente no somos para
 *     él. Un tono de advertencia le diría que algo salió mal.
 *  2. **Su texto sigue ahí, intacto y editable, con el foco puesto** — pero
 *     acompañado de una frase que explica **para qué** sirve editarlo. Sin esa
 *     frase, un campo editable debajo de un «esto no es para ti» es una trampa:
 *     invita a reintentar sin decir qué cambiaría.
 *  3. **Ni una línea de catálogo.** Ni de punto de partida, ni comparador, ni
 *     cuadro de refinamiento, ni botón de continuar. El error caro aquí **no es
 *     perder el lead** —no era un lead—: **es venderle software veterinario a
 *     quien no tiene animales y que lo descubra después de pagar**. Enseñar un
 *     catálogo «por si acaso» es exactamente eso, con el agravante de que la
 *     interfaz ya le dijo que no era para él — quien compre igual, compra contra
 *     nuestra propia advertencia.
 *  4. **Dos salidas honestas**: volver a la portada, y un correo humano. Quien
 *     está en el borde del dominio —una guardería que además vende juguetes—
 *     merece hablar con alguien, no pelearse con un cuadro de texto.
 *
 * <p>El foco va al `<h2>` y no al `<textarea>`: quien navega con lector tiene
 * que oír **primero por qué** está viendo esto. Enfocar el campo directamente le
 * pone el cursor en un cuadro sin haberle dicho que el producto no es para su
 * negocio.
 */
defineProps<{ texto: string }>()

defineEmits<{ 'update:texto': [valor: string]; reintentar: [] }>()

const encabezado = ref<HTMLElement | null>(null)

onMounted(async () => {
  await nextTick()
  encabezado.value?.focus()
})
</script>

<template>
  <section class="afd" aria-labelledby="fd-h2">
    <h2 id="fd-h2" ref="encabezado" tabindex="-1" class="afd-h2">
      Creemos que VetSoftware no es para tu negocio
    </h2>

    <p class="ds-banner ds-banner--info afd-aviso" role="status">
      Parece que tu negocio no es una veterinaria ni un centro de cuidado animal. VetSoftware está
      hecho solo para eso, así que preferimos decírtelo ahora y no después de que pagues.
    </p>

    <label for="fd-texto" class="afd-label">Esto es lo que nos contaste</label>
    <p id="fd-ayuda" class="afd-ayuda">
      Si nos explicamos mal y sí atiendes animales, cuéntanoslo de otra forma y lo volvemos a mirar.
    </p>
    <textarea
      id="fd-texto"
      class="afd-campo"
      rows="5"
      :maxlength="MAX_DESCRIPCION"
      :value="texto"
      aria-describedby="fd-ayuda"
      @input="$emit('update:texto', ($event.target as HTMLTextAreaElement).value)"
    />

    <div class="afd-acciones">
      <button type="button" class="ds-btn ds-btn--primary afd-boton" @click="$emit('reintentar')">
        Volver a intentarlo
      </button>
      <RouterLink :to="{ name: 'landing' }" class="afd-salida"
        >Volver a la página principal</RouterLink
      >
    </div>

    <p class="afd-soporte">
      ¿Crees que sí encajas y no lo estamos viendo? Escríbenos a
      <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a>.
    </p>
  </section>
</template>

<style scoped>
.afd-h2 {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.afd-aviso {
  font-size: 13.5px;
  line-height: 1.55;
}

.afd-label {
  display: block;
  margin-block-start: 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pub-ink-700);
}

.afd-ayuda {
  margin: 4px 0 8px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.afd-campo {
  inline-size: 100%;
  padding: 10px 12px;
  border: 2px solid var(--pub-ame-600);
  border-radius: 10px;
  background: var(--pub-surface);
  font: inherit;
  font-size: 16px;
  line-height: 1.5;
  color: var(--pub-ink-900);
  resize: vertical;
}

.afd-acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-block-start: 16px;
}

.afd-boton {
  min-block-size: 44px;
}

.afd-salida {
  font-size: 13px;
  font-weight: 600;
}

.afd-soporte {
  margin: 16px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}
</style>
