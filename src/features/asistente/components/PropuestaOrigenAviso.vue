<script setup lang="ts">
/**
 * De dónde salió el carrito que hay debajo del encabezado «Tu propuesta».
 *
 * ── El defecto que cierra ───────────────────────────────────────────────────
 * `PROPOSAL` y `DETERMINISTIC` llegan a la pantalla como la misma clase, y con
 * razón: los dos son un carrito correcto y accionable. Pero solo el primero
 * salió de leer el texto del prospecto. Sin este aviso, quien recibe el segundo
 * ve su propio párrafo arriba y debajo un encabezado que dice «Tu propuesta»,
 * concluye que se le leyó, **no revisa las líneas** y contrata módulos que no va
 * a usar — lo contrario exacto de «paga solo lo que uses». Con el acceso al
 * modelo deshabilitado eso le pasa al 100 % de los usuarios.
 *
 * ── Por qué el texto dice lo que dice ───────────────────────────────────────
 * No nombra la avería («la IA está deshabilitada»): eso es información interna
 * que no ayuda a nadie a decidir. Dice lo único que sirve para actuar bien —que
 * la lista no está personalizada y que hay que revisarla— y la acción que
 * propone es posible en el sitio, porque el catálogo manual está justo debajo.
 *
 * ── Por qué es un componente y no tres líneas más en el panel ───────────────
 * `AsistentePanel.vue` es la máquina de estados de toda la feature y está a
 * pocas decenas de líneas del techo de 500 que `npm run quality` comprueba con
 * cero infractores tolerados. Un banner con su javadoc se comería la mitad de
 * ese margen y dejaría el siguiente cambio sin sitio. Allí entran tres líneas:
 * el `import`, la etiqueta y su prop.
 *
 * ── `status`, no `alert` ────────────────────────────────────────────────────
 * No ha fallado nada: hay una propuesta y se puede contratar. Mismo criterio que
 * `AsistenteEspera`. Y **no recibe el foco**: tras la primera propuesta el foco
 * ya va al `<h2>` «Tu propuesta», y este aviso queda inmediatamente después, así
 * que un lector de pantalla lo encuentra en la primera lectura hacia adelante.
 * Un segundo salto rompería una decisión ya razonada en el panel.
 */
defineProps<{ leyoElTexto: boolean }>()
</script>

<template>
  <p
    v-if="!leyoElTexto"
    class="ds-banner ds-banner--info pori"
    role="status"
    data-testid="propuesta-origen-base"
  >
    <strong>Este es un punto de partida, no una recomendación.</strong> Lo armamos con lo más
    habitual en un negocio como el tuyo, sin leer todavía lo que nos escribiste. Revísalo y quita lo
    que no vayas a usar.
  </p>
</template>

<style scoped>
.pori {
  margin-block: 14px 0;
}
</style>
