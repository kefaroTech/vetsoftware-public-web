import { http } from '@/services/http/http.client'

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

/** Clave de la propiedad que guarda el valor del UVT vigente (COP). */
export const UVT_PROPERTY = 'uvt'

export const systemConfigApi = {
  async get(): Promise<SystemConfigurationResponse[]> {
    const { data } = await http.get<SystemConfigurationResponse[]>('/system-configurations', {
      skipGlobalLoader: true,
    })
    return data
  },

  async set(payload: SetSystemConfigurationRequest): Promise<SystemConfigurationResponse> {
    const { data } = await http.put<SystemConfigurationResponse>('/system-configurations', payload)
    return data
  },
}
