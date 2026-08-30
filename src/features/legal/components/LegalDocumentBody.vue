<script setup lang="ts">
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { formatDateLong } from '@/composables/format'
import { esBorrador } from '../content/legal.content'
import type { LegalDocument } from '../types/legal.types'

/**
 * Un texto legal, pintado como DOCUMENTO y no como una pared.
 *
 * ── Por qué esto tiene sustancia de accesibilidad y no es sólo maquetación ──
 * Un texto legal largo es el caso donde la estructura ES la usabilidad. Quien
 * usa lector de pantalla no lee de arriba abajo: salta por encabezados y por
 * regiones. Y quien lo lee con los ojos tampoco, porque una pared de 3.000
 * palabras sin puntos de entrada no se lee, se acepta a ciegas — que es
 * exactamente lo que la Ley 1581 de 2012 llama consentimiento NO informado.
 * Aquí la accesibilidad y la validez jurídica del consentimiento son la misma
 * cosa, y por eso esto no es maquetación decorativa.
 *
 * Lo que la plantilla hace, por norma:
 *
 *  · §1.3.1 Info and Relationships — jerarquía real: un solo `<h1>`, un `<h2>`
 *    por sección y `<section aria-labelledby>` para que cada bloque se anuncie
 *    con su propio nombre. Las definiciones van en `<dl>/<dt>/<dd>`, no en
 *    párrafos con negrita: la relación término-descripción llega al lector.
 *  · §2.4.5 Multiple Ways — un índice de secciones al principio, dentro de un
 *    `<nav>` con nombre accesible, para saltar a lo que interesa sin recorrer
 *    el documento entero.
 *  · §1.4.8 / §1.4.4 / §1.4.12 — medida de lectura acotada, interlineado 1,7 y
 *    todo en unidades relativas. Las reglas viven en `public-auth.css`, con el
 *    motivo escrito allí.
 *
 * <p>El recuadro de borrador NO es una región viva. Está presente desde el
 * primer pintado y no aparece tras ninguna interacción: un `role="alert"` que
 * nace con su texto dentro no lo anuncia casi ningún lector —el hallazgo que
 * fija `regiones-vivas.spec.ts`— y encima cortaría la locución del título. Se
 * anuncia por lo que es: un aparte destacado, con `<strong>`, dentro del flujo.
 */
const props = defineProps<{ doc: LegalDocument }>()

const borrador = computed(() => esBorrador(props.doc))
</script>

<template>
  <article class="pub-doc">
    <header>
      <p class="pub-doc-eyebrow">Documento legal · VetSoftware Colombia</p>
      <h1 class="pub-doc-title">{{ doc.title }}</h1>
      <p class="pub-doc-resumen">{{ doc.resumen }}</p>

      <dl class="pub-doc-meta">
        <div>
          <dt>Versión</dt>
          <dd>{{ doc.documentVersion }}</dd>
        </div>
        <div>
          <dt>Vigente desde</dt>
          <dd>{{ formatDateLong(doc.effectiveFrom) }}</dd>
        </div>
        <div>
          <dt>Identificador</dt>
          <dd>{{ doc.code }}</dd>
        </div>
      </dl>

      <p v-if="borrador" class="pub-doc-draft">
        <TriangleAlert :size="18" class="pub-doc-draft-icon" aria-hidden="true" />
        <span>
          <strong>Borrador sin valor legal.</strong> Este documento contiene campos sin definir,
          marcados en el texto como «FALTA POR DEFINIR». No puede publicarse ni sustentar ninguna
          autorización de tratamiento de datos hasta que se resuelvan.
        </span>
      </p>
    </header>

    <nav class="pub-doc-toc" aria-labelledby="pub-doc-toc-title">
      <h2 id="pub-doc-toc-title" class="pub-doc-toc-title">Contenido</h2>
      <ol>
        <li v-for="section in doc.sections" :key="section.id">
          <a :href="`#${section.id}`">{{ section.heading }}</a>
        </li>
      </ol>
    </nav>

    <section
      v-for="section in doc.sections"
      :id="section.id"
      :key="section.id"
      :aria-labelledby="`${section.id}-h`"
      class="pub-doc-section"
    >
      <h2 :id="`${section.id}-h`">{{ section.heading }}</h2>

      <template v-for="(block, i) in section.blocks" :key="i">
        <p v-if="block.kind === 'p'">{{ block.text }}</p>

        <ul v-else-if="block.kind === 'ul'">
          <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
        </ul>

        <dl v-else-if="block.kind === 'dl'">
          <template v-for="(item, j) in block.items" :key="j">
            <dt>{{ item.term }}</dt>
            <dd>{{ item.desc }}</dd>
          </template>
        </dl>

        <p v-else class="pub-doc-nota">{{ block.text }}</p>
      </template>
    </section>
  </article>
</template>
