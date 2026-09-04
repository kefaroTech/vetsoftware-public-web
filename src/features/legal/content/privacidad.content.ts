import { RESPONSABLE } from './responsable'
import { DESTINO_TRANSFERENCIA, regionesEnFrase } from './transferencia'
import type { LegalDocument } from '../types/legal.types'

/**
 * LA POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES.
 *
 * ── Marco: Ley 1581 de 2012, no el RGPD ────────────────────────────────────
 * No es la misma norma con otro nombre y las diferencias son de fondo. La ley
 * colombiana exige una autorización **previa, expresa e informada** (art. 9)
 * como regla, no una de seis bases de legitimación entre las que elegir; sus
 * derechos se llaman conocer, actualizar, rectificar, revocar y suprimir (art.
 * 8) y no «acceso, portabilidad y oposición»; tiene un registro propio (el RNBD,
 * art. 25) y un procedimiento propio de consultas y reclamos con plazos en días
 * hábiles (arts. 14 y 15) que hay que escribir en la política porque el artículo
 * 2.2.2.25.3.1 del Decreto 1074 de 2015 lo enumera entre los contenidos
 * mínimos. Una política con forma de RGPD deja fuera casi todo eso.
 *
 * ── Los seis contenidos mínimos del art. 2.2.2.25.3.1 ──────────────────────
 * Cada uno tiene aquí su sección, y por eso el orden de las secciones no es
 * estético: (1) identificación del responsable con domicilio, correo y teléfono
 * → `responsable`; (2) tratamiento y finalidad → `datos` y `finalidades`;
 * (3) derechos del titular → `derechos`; (4) área responsable de atender
 * peticiones, consultas y reclamos → `ejercicio`; (5) procedimiento para
 * ejercerlos → `ejercicio`; (6) fecha de entrada en vigencia y período de
 * vigencia de la base de datos → `vigencia`.
 *
 * ── Lo que este texto NO puede afirmar todavía ─────────────────────────────
 * La identidad del responsable (ver `responsable.ts`) y los plazos de
 * conservación, que hoy son una propuesta de ingeniería sin validar por nadie
 * con criterio jurídico. Los dos se marcan como tales dentro del propio texto:
 * un plazo escrito como si estuviera decidido se convierte en decidido en la
 * siguiente lectura.
 */
export const PRIVACIDAD: LegalDocument = {
  code: 'PRIVACY_POLICY',
  kind: 'PRIVACY_POLICY',
  title: 'Política de Tratamiento de Datos Personales',
  documentVersion: 1,
  effectiveFrom: '2026-09-01',
  resumen:
    'Qué datos personales recogemos, para qué los usamos, a dónde viajan, cuánto tiempo los ' +
    'conservamos y cómo ejerces tus derechos como Titular. Redactada conforme a la Ley 1581 de ' +
    '2012 y al Capítulo 25 del Decreto 1074 de 2015.',
  sections: [
    {
      id: 'responsable',
      heading: '1. Responsable del Tratamiento',
      blocks: [
        {
          kind: 'p',
          text:
            'El Responsable del Tratamiento de los datos personales recogidos a través de este ' +
            'sitio y de la aplicación Lumbre es:',
        },
        {
          kind: 'dl',
          items: [
            { term: 'Razón social', desc: RESPONSABLE.razonSocial },
            { term: 'NIT', desc: RESPONSABLE.nit },
            { term: 'Domicilio y dirección', desc: RESPONSABLE.domicilio },
            { term: 'Correo electrónico', desc: RESPONSABLE.canalCorreo },
            { term: 'Teléfono', desc: RESPONSABLE.telefono },
            {
              term: 'Área responsable de peticiones, consultas y reclamos',
              desc: RESPONSABLE.areaResponsable,
            },
          ],
        },
        {
          kind: 'nota',
          text:
            'Los campos marcados con «FALTA POR DEFINIR» no están resueltos. Mientras alguno ' +
            'siga presente, este documento es un borrador sin valor legal: no puede publicarse ' +
            'ni servir de base a ninguna autorización.',
        },
      ],
    },
    {
      id: 'definiciones',
      heading: '2. Definiciones',
      blocks: [
        {
          kind: 'p',
          text: 'Con el significado que les da el artículo 3 de la Ley 1581 de 2012:',
        },
        {
          kind: 'dl',
          items: [
            {
              term: 'Titular',
              desc: 'La persona natural cuyos datos personales son objeto de Tratamiento.',
            },
            {
              term: 'Tratamiento',
              desc:
                'Cualquier operación sobre datos personales: recolección, almacenamiento, uso, ' +
                'circulación o supresión.',
            },
            {
              term: 'Responsable del Tratamiento',
              desc: 'Quien decide sobre la base de datos y sobre el Tratamiento de los datos.',
            },
            {
              term: 'Encargado del Tratamiento',
              desc: 'Quien trata los datos por cuenta del Responsable.',
            },
            {
              term: 'Autorización',
              desc:
                'El consentimiento previo, expreso e informado del Titular para que se traten ' +
                'sus datos personales.',
            },
            {
              term: 'Dato sensible',
              desc:
                'El que afecta la intimidad o cuyo uso indebido puede generar discriminación: ' +
                'salud, vida sexual, origen racial o étnico, convicciones religiosas o ' +
                'filosóficas, datos biométricos, pertenencia a sindicatos o partidos.',
            },
          ],
        },
      ],
    },
    {
      id: 'datos',
      heading: '3. Qué datos recogemos',
      blocks: [
        {
          kind: 'p',
          text:
            'Recogemos únicamente los datos que necesitamos para la finalidad que declaramos en ' +
            'cada formulario. Ninguno de ellos es obligatorio: puedes navegar el sitio y ver los ' +
            'planes y precios sin entregar ningún dato personal.',
        },
        {
          kind: 'ul',
          items: [
            'Asistente de propuesta: tu correo electrónico y el texto libre en el que describes ' +
              'tu clínica y lo que necesitas.',
            'Registro y contratación: nombre, documento de identidad, correo electrónico, ' +
              'teléfono y los datos de la empresa que contrata (razón social, NIT y sede).',
            'Uso del servicio: datos técnicos de la sesión —dirección IP, tipo de navegador, ' +
              'páginas visitadas y errores— que registramos para operar y asegurar la plataforma.',
          ],
        },
        {
          kind: 'nota',
          text:
            'El texto libre del asistente de propuesta es un campo abierto y viaja fuera de ' +
            'Colombia (sección 7). Te pedimos que no escribas allí datos sensibles ni datos ' +
            'personales de terceros —de tus pacientes, de sus propietarios o de tu equipo—. ' +
            'Responder a ese campo es facultativo, y también lo es cualquier pregunta sobre ' +
            'datos sensibles: no estás obligado a contestarla.',
        },
      ],
    },
    {
      id: 'finalidades',
      heading: '4. Para qué los usamos',
      blocks: [
        {
          kind: 'ul',
          items: [
            'Elaborar y enviarte una propuesta comercial orientativa a partir de lo que nos ' +
              'cuentas, con apoyo de un sistema automatizado de inteligencia artificial.',
            'Contactarte para resolver dudas sobre esa propuesta y sobre los planes.',
            'Crear y administrar tu cuenta, y prestar el servicio contratado.',
            'Facturar, cobrar y cumplir las obligaciones tributarias y contables aplicables.',
            'Operar, mantener y asegurar la plataforma, incluida la detección de fallos y de ' +
              'abusos.',
            'Cumplir requerimientos de autoridades competentes.',
          ],
        },
        {
          kind: 'p',
          text:
            'No vendemos datos personales, no los cedemos con fines publicitarios de terceros y ' +
            'no elaboramos perfiles con efectos jurídicos sobre ti.',
        },
      ],
    },
    {
      id: 'autorizacion',
      heading: '5. Tu autorización',
      blocks: [
        {
          kind: 'p',
          text:
            'El Tratamiento requiere tu autorización previa, expresa e informada (artículo 9 de ' +
            'la Ley 1581 de 2012). La recogemos mediante una casilla que tú marcas y que nunca ' +
            'viene marcada de antemano: el silencio, la inacción o seguir navegando no cuentan ' +
            'como autorización.',
        },
        {
          kind: 'p',
          text:
            'Al marcarla, guardamos la constancia de qué autorizaste y cuándo, incluida la ' +
            'versión exacta de este documento que estaba vigente en ese momento. Puedes pedirnos ' +
            'copia de esa constancia y volver a leer el texto que aceptaste aunque después haya ' +
            'sido reemplazado por otra versión.',
        },
        {
          kind: 'p',
          text:
            'Este sitio no está dirigido a menores de edad y no recogemos datos de menores de ' +
            'forma consciente. Si crees que nos has entregado datos de un menor, escríbenos y ' +
            'los suprimiremos.',
        },
      ],
    },
    {
      id: 'encargados',
      heading: '6. Quién más trata tus datos',
      blocks: [
        {
          kind: 'p',
          text:
            'Nos apoyamos en proveedores de infraestructura y de servicios que actúan como ' +
            'Encargados del Tratamiento, únicamente siguiendo nuestras instrucciones y bajo ' +
            'contrato. Hoy son Amazon Web Services, Inc. (alojamiento, base de datos y el ' +
            'servicio de inteligencia artificial Amazon Bedrock) y nuestro proveedor de correo ' +
            'transaccional.',
        },
      ],
    },
    {
      id: 'transferencia',
      heading: '7. Transferencia internacional: tus datos salen de Colombia',
      blocks: [
        {
          kind: 'p',
          text:
            'Lo decimos primero y sin rodeos, porque es la parte que la mayoría de las políticas ' +
            'esconde: el texto libre que escribes en el asistente de propuesta, junto con tu ' +
            `correo electrónico, se transfiere a ${DESTINO_TRANSFERENCIA.pais} para generar la ` +
            'propuesta.',
        },
        {
          kind: 'dl',
          items: [
            { term: 'Destinatario', desc: DESTINO_TRANSFERENCIA.encargado },
            {
              term: 'Servicio',
              desc: `${DESTINO_TRANSFERENCIA.servicio} (modelos de inteligencia artificial)`,
            },
            { term: 'País de destino', desc: DESTINO_TRANSFERENCIA.pais },
            { term: 'Regiones concretas', desc: regionesEnFrase() },
          ],
        },
        {
          kind: 'p',
          text:
            'Esas tres regiones son la lista completa: no hay otras. El servicio puede atender ' +
            'tu petición desde cualquiera de ellas y no podemos anticipar cuál. Si esa lista ' +
            'cambiara, modificaríamos primero esta política y volveríamos a pedirte autorización ' +
            'antes de usar una región nueva.',
        },
        {
          kind: 'p',
          text:
            'Base legal de la transferencia: tu autorización expresa e inequívoca, prevista en ' +
            'el literal a) del artículo 26 de la Ley 1581 de 2012. Los Estados Unidos de América ' +
            'figuran además en la lista de países con nivel adecuado de protección del numeral ' +
            '3.2 de la Circular Externa 005 de 2017 de la Superintendencia de Industria y ' +
            'Comercio. Te pedimos la autorización de todos modos, de forma separada y expresa, ' +
            'porque es la que sigue amparando la transferencia si esa lista cambia.',
        },
        {
          kind: 'nota',
          text:
            'Puedes usar Lumbre sin que ningún dato tuyo salga de Colombia: basta con no ' +
            'marcar esta autorización y no usar el asistente de propuesta. Rechazarla no te ' +
            'impide registrarte, ver los precios ni contratar.',
        },
      ],
    },
    {
      id: 'conservacion',
      heading: '8. Cuánto tiempo los conservamos',
      blocks: [
        {
          kind: 'nota',
          text:
            'PLAZOS PROPUESTOS, PENDIENTES DE VALIDACIÓN JURÍDICA. Las dos cifras de abajo son ' +
            'una propuesta del equipo de ingeniería. Nadie con criterio legal las ha revisado ' +
            'todavía, y pueden cambiar antes de que esta política entre en vigencia.',
        },
        {
          kind: 'ul',
          items: [
            'Propuesta: anonimizar el correo electrónico y el texto libre del asistente a los 90 ' +
              'días de la última interacción, de modo que dejen de estar asociados a una persona ' +
              'identificable.',
            'Propuesta: suprimir definitivamente los registros anonimizados a los 24 meses.',
            'Los datos de clientes con contrato vigente se conservan mientras dure la relación ' +
              'y, después, durante los plazos que exija la normativa tributaria, contable y ' +
              'comercial colombiana.',
          ],
        },
        {
          kind: 'p',
          text:
            'Período de vigencia de la base de datos: mientras se mantenga la finalidad que ' +
            'justificó la recolección y, en todo caso, hasta que solicites la supresión de tus ' +
            'datos y no exista una obligación legal o contractual que nos obligue a conservarlos.',
        },
      ],
    },
    {
      id: 'derechos',
      heading: '9. Tus derechos como Titular',
      blocks: [
        {
          kind: 'p',
          text: 'El artículo 8 de la Ley 1581 de 2012 te reconoce, entre otros, el derecho a:',
        },
        {
          kind: 'ul',
          items: [
            'Conocer qué datos tuyos tenemos y cómo los estamos tratando, de forma gratuita.',
            'Actualizarlos cuando cambien.',
            'Rectificarlos cuando sean parciales, inexactos, incompletos o induzcan a error.',
            'Revocar la autorización que nos diste, en cualquier momento.',
            'Solicitar la supresión de tus datos cuando el Tratamiento no respete la ley o ' +
              'cuando hayas revocado la autorización.',
            'Solicitar prueba de la autorización que otorgaste, salvo cuando la ley no la exija.',
            'Ser informado, a petición tuya, sobre el uso que hemos dado a tus datos.',
            'Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones ' +
              'a la ley.',
          ],
        },
        {
          kind: 'p',
          text:
            'La revocatoria y la supresión no proceden cuando exista un deber legal o ' +
            'contractual que nos obligue a conservar el dato; en ese caso te diremos cuál es.',
        },
      ],
    },
    {
      id: 'ejercicio',
      heading: '10. Cómo ejercer tus derechos',
      blocks: [
        {
          kind: 'p',
          text:
            `Escribe a ${RESPONSABLE.canalCorreo}. Atiende las peticiones el ` +
            `${RESPONSABLE.areaResponsable}. Indica tu nombre, un dato de contacto y qué ` +
            'solicitas; si actúas en nombre de otra persona, acredita la representación.',
        },
        {
          kind: 'dl',
          items: [
            {
              term: 'Consultas',
              desc:
                'Respondemos en un máximo de diez (10) días hábiles. Si no fuera posible, te ' +
                'informamos el motivo y la fecha de respuesta, que no superará los cinco (5) ' +
                'días hábiles siguientes al vencimiento del primer plazo (artículo 14).',
            },
            {
              term: 'Reclamos',
              desc:
                'Los tramitamos en un máximo de quince (15) días hábiles. Si no fuera posible, ' +
                'te informamos el motivo y la nueva fecha, que no superará los ocho (8) días ' +
                'hábiles siguientes. Si el reclamo llega incompleto, te pedimos que lo subsanes ' +
                'dentro de los cinco (5) días siguientes; pasados dos (2) meses sin respuesta ' +
                'tuya, entendemos que desististe (artículo 15).',
            },
            {
              term: 'Constancia de reclamo en trámite',
              desc:
                'Dentro de los dos (2) días hábiles siguientes a recibir el reclamo, incluimos ' +
                'en la base de datos la leyenda «reclamo en trámite» junto al dato objeto de ' +
                'discusión, y la mantenemos hasta que el reclamo se resuelva.',
            },
          ],
        },
        {
          kind: 'p',
          text:
            'Puedes presentar queja ante la Superintendencia de Industria y Comercio una vez ' +
            'hayas agotado el trámite ante nosotros (artículo 16 de la Ley 1581 de 2012).',
        },
      ],
    },
    {
      id: 'seguridad',
      heading: '11. Seguridad de la información',
      blocks: [
        {
          kind: 'p',
          text:
            'Aplicamos medidas técnicas, humanas y administrativas para proteger tus datos ' +
            'contra adulteración, pérdida, consulta, uso o acceso no autorizado: cifrado en ' +
            'tránsito, control de acceso por roles, aislamiento entre clínicas y registro de ' +
            'auditoría. Ningún sistema es infalible; si ocurriera un incidente que afecte tus ' +
            'datos, lo reportaremos conforme a la normativa vigente.',
        },
      ],
    },
    {
      id: 'vigencia',
      heading: '12. Vigencia y cambios',
      blocks: [
        {
          kind: 'p',
          text:
            'Esta política rige desde su fecha de entrada en vigencia, indicada al comienzo del ' +
            'documento junto con su número de versión. Cada modificación se publica como una ' +
            'versión nueva con su propia fecha: las versiones anteriores no se editan ni se ' +
            'borran, se suceden, de modo que siempre es posible recuperar el texto exacto que ' +
            'estaba vigente cuando otorgaste tu autorización.',
        },
        {
          kind: 'p',
          text:
            'Si un cambio afecta la finalidad del Tratamiento o el destino de una transferencia ' +
            'internacional, te lo comunicaremos y te pediremos una autorización nueva antes de ' +
            'aplicarlo.',
        },
      ],
    },
  ],
}
