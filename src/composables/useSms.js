import { ref } from 'vue'

// SMS operations
// Will be implemented in Phase 2

export function useSms() {
  const threads = ref([])
  const currentThread = ref([])
  const isLoading = ref(false)

  const loadThreads = async () => {
    console.log('useSms.loadThreads() - TODO')
  }

  const loadThread = async (phoneNumber) => {
    console.log('useSms.loadThread() - TODO', phoneNumber)
  }

  const sendMessage = async (to, body, mediaUrls = []) => {
    console.log('useSms.sendMessage() - TODO', { to, body, mediaUrls })
  }

  return {
    threads,
    currentThread,
    isLoading,
    loadThreads,
    loadThread,
    sendMessage
  }
}

