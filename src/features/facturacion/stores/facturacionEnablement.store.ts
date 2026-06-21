import { defineStore } from 'pinia'
import { ref } from 'vue'
import { companyTaxProfileApi } from '../api/companyTaxProfile.api'
import { dianProviderConfigApi } from '../api/dianProviderConfig.api'
import { numberingResolutionApi } from '../api/numberingResolution.api'
import { withholdingConfigApi } from '../api/withholdingConfig.api'
import type {
  CompanyTaxProfileResponse,
  DianProviderConfigResponse,
  NumberingResolutionResponse,
  SaveCompanyTaxProfileRequest,
  SaveDianProviderConfigRequest,
  SaveNumberingResolutionRequest,
  SaveWithholdingConfigRequest,
  WithholdingConfigResponse,
} from '../types/facturacion'

/**
 * Estado de habilitación fiscal de la empresa (singletons + resoluciones).
 * Centraliza la carga de los 4 recursos de configuración para componer el
 * tablero "¿lista para facturar?" y el wizard de habilitación.
 */
export const useFacturacionEnablementStore = defineStore('facturacionEnablement', () => {
  const profile = ref<CompanyTaxProfileResponse | null>(null)
  const provider = ref<DianProviderConfigResponse | null>(null)
  const resolutions = ref<NumberingResolutionResponse[]>([])
  const withholding = ref<WithholdingConfigResponse | null>(null)

  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  async function loadAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [p, pr, res, wh] = await Promise.all([
        companyTaxProfileApi.find(),
        dianProviderConfigApi.find(),
        numberingResolutionApi.listAll(),
        withholdingConfigApi.find(),
      ])
      profile.value = p
      provider.value = pr
      resolutions.value = res
      withholding.value = wh
      loaded.value = true
    } catch (e) {
      error.value = 'No se pudo cargar la configuración de facturación electrónica.'
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Carga perezosa con deduplicación de la promesa en vuelo. */
  function ensureLoaded(): Promise<void> {
    if (loaded.value) return Promise.resolve()
    if (!inflight) inflight = loadAll().finally(() => (inflight = null))
    return inflight
  }

  async function saveProfile(
    payload: SaveCompanyTaxProfileRequest,
  ): Promise<CompanyTaxProfileResponse> {
    const saved = profile.value
      ? await companyTaxProfileApi.update(payload)
      : await companyTaxProfileApi.create(payload)
    profile.value = saved
    return saved
  }

  async function saveProvider(
    payload: SaveDianProviderConfigRequest,
  ): Promise<DianProviderConfigResponse> {
    const saved = provider.value
      ? await dianProviderConfigApi.update(payload)
      : await dianProviderConfigApi.create(payload)
    provider.value = saved
    return saved
  }

  async function upsertResolution(
    id: number | null,
    payload: SaveNumberingResolutionRequest,
  ): Promise<NumberingResolutionResponse> {
    const saved =
      id != null
        ? await numberingResolutionApi.update(id, payload)
        : await numberingResolutionApi.create(payload)
    const idx = resolutions.value.findIndex((r) => r.id === saved.id)
    if (idx >= 0) resolutions.value.splice(idx, 1, saved)
    else resolutions.value.push(saved)
    return saved
  }

  async function saveWithholding(
    payload: SaveWithholdingConfigRequest,
  ): Promise<WithholdingConfigResponse> {
    const saved = await withholdingConfigApi.save(payload)
    withholding.value = saved
    return saved
  }

  return {
    profile,
    provider,
    resolutions,
    withholding,
    loading,
    error,
    loaded,
    loadAll,
    ensureLoaded,
    saveProfile,
    saveProvider,
    upsertResolution,
    saveWithholding,
  }
})
