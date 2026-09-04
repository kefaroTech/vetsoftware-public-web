import { RESPONSABLE } from './responsable'
import { DESTINO_TRANSFERENCIA, regionesEnFrase } from './transferencia'
import type { LegalDocument } from '../types/legal.types'

/**
 * LOS TÉRMINOS DEL SERVICIO.
 *
 * ── Por qué existen a la vez que la política, y no después ─────────────────
 * La casilla del paso de contratación ya dice «He leído y acepto los Términos
 * del servicio y la Política de tratamiento de datos» desde antes de que
 * ninguno de los dos existiera. Una casilla que remite a un documento
 * inexistente no recoge un consentimiento informado: recoge un clic. Los dos
 * documentos se publican juntos porque la casilla los nombra juntos.
 *
 * ── Qué NO es este documento ───────────────────────────────────────────────
 * No es el acuerdo de tratamiento de datos entre la clínica y Lumbre por
 * los datos de SUS pacientes y propietarios. Ese es otro documento —el backend
 * ya reserva para él el `kind` `DATA_PROCESSING_AGREEMENT`— y tiene otras
 * partes: allí la clínica es Responsable y Lumbre es Encargado. Aquí se
 * enuncia la distinción (sección 6) y nada más, porque enunciarla mal es peor
 * que no tenerla.
 *
 * Como la política, arrastra los marcadores de `responsable.ts` y es un borrador
 * mientras alguno siga presente.
 */
export const TERMINOS: LegalDocument = {
  code: 'TERMS_OF_SERVICE',
  kind: 'TERMS',
  title: 'Términos del Servicio',
  documentVersion: 1,
  effectiveFrom: '2026-09-01',
  resumen:
    'Las condiciones bajo las que se presta Lumbre: quién lo presta, qué incluye, cómo se ' +
    'cobra, qué puedes esperar del asistente de propuesta y qué ley lo rige.',
  sections: [
    {
      id: 'prestador',
      heading: '1. Quién presta el servicio',
      blocks: [
        {
          kind: 'p',
          text: 'Lumbre es un servicio de software prestado por:',
        },
        {
          kind: 'dl',
          items: [
            { term: 'Razón social', desc: RESPONSABLE.razonSocial },
            { term: 'NIT', desc: RESPONSABLE.nit },
            { term: 'Domicilio y dirección', desc: RESPONSABLE.domicilio },
            { term: 'Correo de contacto', desc: RESPONSABLE.canalCorreo },
          ],
        },
        {
          kind: 'nota',
          text:
            'Los campos marcados con «FALTA POR DEFINIR» no están resueltos. Mientras alguno ' +
            'siga presente, este documento es un borrador sin valor legal y no vincula a nadie.',
        },
      ],
    },
    {
      id: 'objeto',
      heading: '2. Objeto y aceptación',
      blocks: [
        {
          kind: 'p',
          text:
            'Estos términos regulan el acceso y el uso de Lumbre, un software de gestión ' +
            'para clínicas veterinarias que se presta a través de internet. Al marcar la casilla ' +
            'de aceptación o al usar el servicio, aceptas estos términos en la versión vigente ' +
            'en ese momento, cuyo número y fecha aparecen al comienzo de este documento.',
        },
        {
          kind: 'p',
          text:
            'Si contratas en nombre de una clínica o empresa, declaras que tienes facultades ' +
            'para obligarla, y estos términos vinculan a esa empresa.',
        },
      ],
    },
    {
      id: 'cuenta',
      heading: '3. Cuenta, credenciales y usuarios',
      blocks: [
        {
          kind: 'ul',
          items: [
            'Los datos que registras deben ser veraces y estar actualizados.',
            'Eres responsable de la confidencialidad de tus credenciales y de la actividad que ' +
              'ocurra bajo tu cuenta.',
            'Cada persona que use el servicio debe tener su propio usuario: compartir ' +
              'credenciales impide saber quién hizo qué en la historia clínica.',
            'Debes avisarnos en cuanto sospeches de un acceso no autorizado.',
          ],
        },
      ],
    },
    {
      id: 'planes',
      heading: '4. Planes, precios y facturación',
      blocks: [
        {
          kind: 'p',
          text:
            'Los precios que se muestran en la portada y en el configurador de planes son ' +
            'orientativos y se rotulan como tales. El importe vinculante es el que calcula el ' +
            'servidor en el paso de confirmación, con las cantidades y el ciclo que hayas ' +
            'elegido; si difiere del orientativo, se te muestra la diferencia y debes volver a ' +
            'aceptarla antes de confirmar.',
        },
        {
          kind: 'ul',
          items: [
            'Los valores se expresan en pesos colombianos e incluyen los impuestos aplicables ' +
              'cuando así se indique.',
            'La facturación sigue el ciclo contratado —mensual o anual— y se renueva salvo que ' +
              'canceles antes del corte.',
            'Los períodos de prueba, cuando aplican, se indican por artículo en el momento de ' +
              'contratar.',
          ],
        },
      ],
    },
    {
      id: 'asistente',
      heading: '5. El asistente de propuesta con inteligencia artificial',
      blocks: [
        {
          kind: 'p',
          text:
            'El asistente genera una propuesta a partir de lo que escribes usando un modelo ' +
            'automatizado de inteligencia artificial. Esa propuesta es orientativa: no es una ' +
            'oferta mercantil vinculante, no constituye asesoría profesional y puede contener ' +
            'errores. Lo vinculante sigue siendo el importe que confirmas al contratar.',
        },
        {
          kind: 'p',
          text:
            `Para generarla, el texto que escribes se transfiere a ${DESTINO_TRANSFERENCIA.pais} ` +
            `(${DESTINO_TRANSFERENCIA.encargado}, servicio ${DESTINO_TRANSFERENCIA.servicio}, ` +
            `regiones ${regionesEnFrase()}). Usar el asistente es voluntario y requiere tu ` +
            'autorización expresa; el detalle está en la sección 7 de la Política de ' +
            'Tratamiento de Datos Personales.',
        },
      ],
    },
    {
      id: 'datos-clinicos',
      heading: '6. Los datos de tus pacientes y de sus propietarios',
      blocks: [
        {
          kind: 'p',
          text:
            'Respecto de los datos personales que tú cargas en la plataforma —los propietarios ' +
            'de los pacientes, tu equipo— la clínica es el Responsable del Tratamiento y ' +
            'Lumbre actúa como Encargado: los tratamos siguiendo tus instrucciones y para ' +
            'prestarte el servicio, no para fines propios.',
        },
        {
          kind: 'p',
          text:
            'Corresponde a la clínica obtener las autorizaciones de esos titulares, informarles ' +
            'su política de tratamiento y atender sus consultas y reclamos. Nuestra Política de ' +
            'Tratamiento de Datos Personales cubre los datos de quien visita este sitio y ' +
            'contrata el servicio, no los de tus pacientes.',
        },
      ],
    },
    {
      id: 'uso',
      heading: '7. Uso aceptable',
      blocks: [
        {
          kind: 'ul',
          items: [
            'No uses el servicio para actividades ilícitas ni para vulnerar derechos de ' +
              'terceros.',
            'No intentes acceder a datos de otras clínicas, ni sortear los controles de acceso o ' +
              'los límites de uso.',
            'No cargues software malicioso ni contenido que no tengas derecho a cargar.',
            'No revendas ni cedas el acceso a terceros sin nuestro acuerdo escrito.',
          ],
        },
      ],
    },
    {
      id: 'disponibilidad',
      heading: '8. Disponibilidad, soporte y cambios en el servicio',
      blocks: [
        {
          kind: 'p',
          text:
            'Trabajamos para mantener el servicio disponible, pero no garantizamos una ' +
            'disponibilidad ininterrumpida: hay mantenimientos programados, incidentes y ' +
            'dependencias de terceros. Anunciaremos con antelación razonable los mantenimientos ' +
            'que impliquen interrupción y los cambios que retiren funcionalidad relevante.',
        },
        {
          kind: 'p',
          text: `El soporte se presta por correo electrónico en ${RESPONSABLE.canalCorreo}.`,
        },
      ],
    },
    {
      id: 'propiedad',
      heading: '9. Propiedad intelectual',
      blocks: [
        {
          kind: 'p',
          text:
            'El software, la marca y la documentación son nuestros o de nuestros licenciantes, y ' +
            'estos términos no te transfieren su propiedad: te conceden un derecho de uso ' +
            'limitado, no exclusivo e intransferible mientras dure tu contratación. Los datos ' +
            'que cargas siguen siendo tuyos.',
        },
      ],
    },
    {
      id: 'terminacion',
      heading: '10. Terminación y recuperación de datos',
      blocks: [
        {
          kind: 'p',
          text:
            'Puedes cancelar en cualquier momento con efecto al final del ciclo pagado. Podemos ' +
            'suspender o terminar el servicio por incumplimiento grave de estos términos o por ' +
            'falta de pago, avisando previamente salvo que la urgencia lo impida.',
        },
        {
          kind: 'p',
          text:
            'Tras la terminación conservamos tus datos durante un período razonable para que ' +
            'puedas exportarlos, y después los suprimimos salvo que una obligación legal nos ' +
            'obligue a conservarlos.',
        },
      ],
    },
    {
      id: 'responsabilidad',
      heading: '11. Responsabilidad',
      blocks: [
        {
          kind: 'p',
          text:
            'Lumbre es una herramienta de gestión: no sustituye el criterio clínico del ' +
            'profesional veterinario, que es quien responde por sus decisiones y por los ' +
            'registros que produce. Ninguna cláusula de estos términos excluye la ' +
            'responsabilidad que la ley colombiana no permite excluir, en particular frente a ' +
            'consumidores.',
        },
      ],
    },
    {
      id: 'ley',
      heading: '12. Ley aplicable, cambios y vigencia',
      blocks: [
        {
          kind: 'p',
          text:
            'Estos términos se rigen por la ley colombiana. Las controversias se someten a los ' +
            'jueces de la República de Colombia.',
        },
        {
          kind: 'p',
          text:
            'Cada modificación se publica como una versión nueva, con su número y su fecha de ' +
            'entrada en vigencia. Las versiones anteriores no se editan ni se borran: se ' +
            'suceden, de modo que siempre es posible recuperar el texto exacto que aceptaste.',
        },
      ],
    },
  ],
}
