/**
 * Ajuste de empresa: la tabla `company_settings` es clave-valor de texto libre, así que
 * añadir un ajuste no necesita migración ni un DTO propio.
 *
 * Vive en `agenda/` porque hoy la agenda es su único consumidor —igual que
 * `/system-configurations` vive en `facturacion/`, que es quien lee el UVT—. Si una segunda
 * feature necesita otro ajuste, este trío (tipo + api + store) sube a `src/features/company/`.
 */
export interface CompanySettingDto {
  propertyName: string
  /** Texto libre. Nada garantiza que sea el número que espera quien lo lee: parsea a la defensiva. */
  value: string | null
}
