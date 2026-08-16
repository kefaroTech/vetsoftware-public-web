/** Configuración general del sistema (global, clave-valor). El UVT vive en la fila property_name='uvt'. */
export interface SystemConfigurationResponse {
  id: number
  propertyName: string
  value: string
  createdDate: string
  enabled: boolean
}

export interface SetSystemConfigurationRequest {
  propertyName: string
  value: string
}
