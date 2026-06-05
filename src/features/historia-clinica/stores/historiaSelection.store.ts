import { defineStore } from 'pinia'
import { reactive } from 'vue'
import type { Animal, Owner } from '@/types/domain'

interface SelectionState {
  owner: Owner | null
  pet: Animal | null
}

export const useHistoriaSelectionStore = defineStore('historiaSelection', () => {
  const state = reactive<SelectionState>({ owner: null, pet: null })

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
})
