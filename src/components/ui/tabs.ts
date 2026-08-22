import type { Component } from 'vue'

/**
 * Contrato compartido por `BaseTabs` (la tira) y `BaseTabPanel` (el panel).
 *
 * Los dos componentes son HERMANOS, no anidados: la tira vive donde el anfitrión
 * la necesite —dentro de la fila de filtros en `ReportesView`, suelta bajo la
 * cabecera en `CajaView`— y el panel, donde le corresponde al contenido. Al no
 * haber ancestro común propio, no hay `provide`/`inject` que valga (ése es el
 * camino de `fieldContext.ts`, donde `BaseField` sí envuelve a su control), así
 * que el enlace ARIA se calcula de un `name` que ambos reciben: los dos derivan
 * los mismos ids de la misma función y nadie los escribe a mano.
 *
 * `name` debe ser único en el documento. En la práctica es el nombre de la
 * pantalla (`caja`, `cuentas`, `reportes`), lo que además deja ids legibles en
 * el DOM (`#tabs-caja-panel-history`) para los tests de Playwright.
 */
export interface TabItem<V extends string = string> {
  value: V
  label: string
  /**
   * Icono Lucide delante del rótulo. Existe porque la primitiva original solo
   * pintaba texto y las pestañas de `CuentasListaView` (Receipt/Check) y
   * `ReportesView` (BarChart3/ShieldCheck) lo habrían perdido al migrar.
   */
  icon?: Component
  /** Contador detrás del rótulo (cuántas cajas abiertas, cuántas cuentas). */
  badge?: string | number
  /**
   * Punto de estado detrás del rótulo. NO es un contador: en `CajaView` marca
   * «tienes una caja abierta» y por eso un `badge` numérico no servía.
   */
  dot?: boolean
}

/** id de la pestaña. Es el `aria-labelledby` del panel. */
export function tabId(name: string, value: string): string {
  return `tabs-${name}-tab-${value}`
}

/** id del panel. Es el `aria-controls` de la pestaña seleccionada. */
export function panelId(name: string, value: string): string {
  return `tabs-${name}-panel-${value}`
}
