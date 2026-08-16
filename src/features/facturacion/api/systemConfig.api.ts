import type {
  SystemConfigurationResponse,
  SetSystemConfigurationRequest,
} from '../types/systemConfig.types'
import { http } from '@/services/http/http.client'

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
