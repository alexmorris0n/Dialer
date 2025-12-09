import { ref } from 'vue'

// Queue state management
// Will be implemented in Phase 1F

export function useQueue() {
  const callers = ref([])
  const stats = ref({
    waiting: 0,
    averageWaitTime: 0
  })
  const isLoading = ref(false)

  const refresh = async () => {
    console.log('useQueue.refresh() - TODO')
  }

  const answerNext = async () => {
    console.log('useQueue.answerNext() - TODO')
  }

  return {
    callers,
    stats,
    isLoading,
    refresh,
    answerNext
  }
}

