import { defineStore } from 'pinia'
import { ref } from 'vue'

// Pinia store for call history
// Will be implemented in Phase 1G

export const useCallsStore = defineStore('calls', () => {
  const calls = ref([])
  const isLoading = ref(false)

  const fetchCalls = async () => {
    // Fetch calls from Supabase
    console.log('callsStore.fetchCalls() - TODO')
  }

  const addCall = (call) => {
    calls.value.unshift(call)
  }

  return {
    calls,
    isLoading,
    fetchCalls,
    addCall
  }
})

