import { defineStore } from 'pinia'
import { ref } from 'vue'

// Pinia store for user state
// Will be implemented in Phase 1B

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const status = ref('offline') // 'available' | 'busy' | 'away' | 'offline'
  const signalwireToken = ref(null)

  const setUser = (userData) => {
    user.value = userData
  }

  const setStatus = (newStatus) => {
    status.value = newStatus
  }

  const setSignalwireToken = (token) => {
    signalwireToken.value = token
  }

  const clearUser = () => {
    user.value = null
    status.value = 'offline'
    signalwireToken.value = null
  }

  return {
    user,
    status,
    signalwireToken,
    setUser,
    setStatus,
    setSignalwireToken,
    clearUser
  }
})

