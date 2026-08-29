<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { useId } from 'vue'

/**
 * El aviso de modo demostración.
 *
 * ── La decisión que lo explica todo: el marco es honesto, el contenido es real ──
 * Lo único falso de esta pantalla es **el cobro**. El nombre de la clínica, el
 * plan, el IVA y las fechas de fin de prueba de cada módulo son de verdad. Así
 * que el diseño no disfraza nada: pone un marco explícito alrededor de la única
 * parte que no es real y deja el resto intacto.
 *
 * ── Lo que NO se hace, y por qué ───────────────────────────────────────────
 * **No hay formulario de tarjeta falso.** Ni número, ni CVV, ni «4242 4242 4242
 * 4242». Tres motivos, cualquiera suficiente: pedir dieciséis dígitos de una
 * tarjeta para no cobrar es exactamente lo que hace el fraude; entrena al
 * usuario a teclear datos de pago en un formulario que no está bajo ningún
 * alcance PCI, y esa costumbre no se desaprende cuando llegue la pasarela de
 * verdad; y es trabajo desechable, porque la pasarela traerá el suyo.
 *
 * ── Las tres reglas de este bloque ─────────────────────────────────────────
 *  1. **No es `role="alert"`.** No es un error ni algo que acabe de pasar: está
 *     ahí desde que carga la pantalla, y un `alert` que se anuncia al montar
 *     interrumpe la lectura de la página. Es un `<aside>` con encabezado real y
 *     forma parte del orden de lectura.
 *  2. **No se puede cerrar.** Un aviso descartable que informa de que no hay
 *     cobro real es un aviso que la mitad de la gente no verá.
 *  3. **El icono no es el mensaje.** Va `aria-hidden`; lo que informa es el
 *     texto (§1.1.1, §1.4.1).
 *
 * Se repite exactamente una vez más, en la pantalla de éxito, en una línea
 * (`compacto`), y nunca más.
 */
withDefaults(defineProps<{ compacto?: boolean }>(), { compacto: false })

const uid = useId()
const tituloId = `${uid}-demo`
</script>

<template>
  <aside class="ds-banner ds-banner--warning demo" :aria-labelledby="tituloId">
    <Info :size="18" :stroke-width="1.8" class="ds-banner-icon" aria-hidden="true" />
    <div v-if="compacto" class="demo-body">
      <h3 :id="tituloId" class="demo-title demo-title--sm">Modo demostración</h3>
      <p class="demo-text">
        Como no hay pasarela de pago conectada todavía, hoy no se ha cobrado nada.
      </p>
    </div>
    <div v-else class="demo-body">
      <h3 :id="tituloId" class="demo-title">Modo demostración: no vamos a cobrarte nada</h3>
      <p class="demo-text">
        Todavía no tenemos conectada la pasarela de pago. Al confirmar, tu contratación queda
        registrada con estos importes y nosotros dejamos los módulos listos.
      </p>
      <p class="demo-text demo-text--strong">
        No se te va a cobrar, no vamos a pedirte una tarjeta y no guardamos ningún dato de pago.
        Cuando conectemos la pasarela te escribiremos por correo antes del primer cobro, y podrás
        decidir entonces.
      </p>
    </div>
  </aside>
</template>

<style scoped>
.demo {
  align-items: flex-start;
}

.demo-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.demo-title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
}

.demo-title--sm {
  font-size: 13px;
}

.demo-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}

.demo-text--strong {
  font-weight: 600;
}
</style>
