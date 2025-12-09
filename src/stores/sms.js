import { defineStore } from 'pinia'
import { ref } from 'vue'

// Pinia store for SMS threads
// Will be implemented in Phase 2

export const useSmsStore = defineStore('sms', () => {
  const threads = ref([])
  const isLoading = ref(false)

  const fetchThreads = async () => {
    // Fetch SMS threads from Supabase
    console.log('smsStore.fetchThreads() - TODO')
  }

  const addMessage = (threadId, message) => {
    console.log('smsStore.addMessage() - TODO', { threadId, message })
  }

  return {
    threads,
    isLoading,
    fetchThreads,
    addMessage
  }
})

