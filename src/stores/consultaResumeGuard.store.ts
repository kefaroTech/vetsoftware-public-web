import { defineStore } from 'pinia'
import { reactive } from 'vue'

interface GuardState {
  open: boolean
  ownerName: string
  petName: string
  step: number
  onContinue: () => void
  onCreateNew: () => void
}

export interface ResumeOrNewOptions {
  ownerName: string
  petName?: string
  step?: number
  onContinue: () => void
  onCreateNew: () => void
}

export const useConsultaResumeGuardStore = defineStore('consultaResumeGuard', () => {
  const state = reactive<GuardState>({
    open: false,
    ownerName: '',
    petName: '',
    step: 1,
    onContinue: () => {},
    onCreateNew: () => {},
  })

  function show(opts: ResumeOrNewOptions) {
    state.ownerName = opts.ownerName
    state.petName = opts.petName ?? ''
    state.step = opts.step ?? 1
    state.onContinue = opts.onContinue
    state.onCreateNew = opts.onCreateNew
    state.open = true
  }

  function close() {
    state.open = false
  }

  function handleContinue() {
    const cb = state.onContinue
    close()
    cb()
  }

  function handleCreateNew() {
    const cb = state.onCreateNew
    close()
    cb()
  }

  return { state, show, close, handleContinue, handleCreateNew }
})
