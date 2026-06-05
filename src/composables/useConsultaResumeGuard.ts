import {
  useConsultaResumeGuardStore,
  type ResumeOrNewOptions,
} from '@/stores/consultaResumeGuard.store'

export type { ResumeOrNewOptions }

export function showResumeOrNewDialog(opts: ResumeOrNewOptions) {
  useConsultaResumeGuardStore().show(opts)
}

export function useConsultaResumeGuard() {
  const store = useConsultaResumeGuardStore()
  return {
    state: store.state,
    close: store.close,
    handleContinue: store.handleContinue,
    handleCreateNew: store.handleCreateNew,
  }
}
