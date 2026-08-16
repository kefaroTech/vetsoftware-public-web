export interface SpaTypeResponse {
  id: number
  name: string
  /** TR-01: el backend lo garantiza (columna NOT NULL); no era nulable. */
  description: string
  createdDate: string
}

export interface CreateSpaTypePayload {
  name: string
  description: string
}
