import { reactive } from 'vue'

interface GuardState {
  open: boolean
  ownerName: string
  petName: string
  step: number
  onContinue: () => void
  onCreateNew: () => void
}

const state = reactive<GuardState>({
  open: false,
  ownerName: '',
  petName: '',
  step: 1,
  onContinue: () => {},
  onCreateNew: () => {},
})

export interface ResumeOrNewOptions {
  ownerName: string
  petName?: string
  step?: number
  onContinue: () => void
  onCreateNew: () => void
}

export function showResumeOrNewDialog(opts: ResumeOrNewOptions) {
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

export function useConsultaResumeGuard() {
  return {
    state,
    close,
    handleContinue,
    handleCreateNew,
  }
}
