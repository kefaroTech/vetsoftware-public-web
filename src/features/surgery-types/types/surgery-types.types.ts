export interface SurgeryTypeResponse {
  id: number
  name: string
  /** TR-01: el backend lo garantiza (columna NOT NULL); no era nulable. */
  description: string
  /**
   * TR-01: el backend los devuelve y este repositorio no los declaraba, así que el admin y este
   * describían el mismo catálogo de forma distinta. `general` distingue el catálogo de plataforma
   * del propio de la empresa, y `company` es null justo cuando es general.
   */
  company: { id: number; name: string } | null
  general: boolean
  createdDate: string
}

export interface CreateSurgeryTypePayload {
  name: string
  description: string
}
