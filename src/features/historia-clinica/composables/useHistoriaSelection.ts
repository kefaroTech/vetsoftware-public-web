import { reactive } from 'vue'
import type { Animal, Owner } from '@/types/domain'

interface SelectionState {
  owner: Owner | null
  pet: Animal | null
}

const state = reactive<SelectionState>({
  owner: null,
  pet: null,
})

export function useHistoriaSelection() {
  function setOwner(owner: Owner | null) {
    state.owner = owner
    state.pet = null
  }

  function setPet(pet: Animal | null) {
    state.pet = pet
  }

  function reset() {
    state.owner = null
    state.pet = null
  }

  return { state, setOwner, setPet, reset }
}
