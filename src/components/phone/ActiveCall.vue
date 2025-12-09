<template>
  <div class="active-call w-full max-w-xs mx-auto text-center">
    <!-- Call Status -->
    <div class="mb-8">
      <p class="text-sm text-muted-foreground mb-2">{{ statusText }}</p>
      <h2 class="text-2xl font-mono font-bold">{{ formattedNumber }}</h2>
      <p class="text-3xl font-mono mt-4 text-primary">{{ duration }}</p>
    </div>

    <!-- Call Controls -->
    <div class="grid grid-cols-3 gap-6 mb-8">
      <!-- Mute Button -->
      <div class="flex flex-col items-center gap-2">
        <button
          @click="$emit('toggleMute')"
          :class="[
            'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
            isMuted ? 'bg-red-500 text-white' : 'bg-muted hover:bg-accent'
          ]"
        >
          <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="2" x2="22" y1="2" y2="22"/>
            <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
            <path d="M5 10v2a7 7 0 0 0 12 5"/>
            <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
        </button>
        <span class="text-xs text-muted-foreground">{{ isMuted ? 'Unmute' : 'Mute' }}</span>
      </div>

      <!-- Keypad Button -->
      <div class="flex flex-col items-center gap-2">
        <button
          @click="showKeypad = !showKeypad"
          :class="[
            'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
            showKeypad ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
          ]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <circle cx="8" cy="8" r="1"/>
            <circle cx="16" cy="8" r="1"/>
            <circle cx="8" cy="12" r="1"/>
            <circle cx="16" cy="12" r="1"/>
            <circle cx="12" cy="8" r="1"/>
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="16" r="1"/>
          </svg>
        </button>
        <span class="text-xs text-muted-foreground">Keypad</span>
      </div>

      <!-- Speaker Button (placeholder) -->
      <div class="flex flex-col items-center gap-2">
        <button
          @click="speakerOn = !speakerOn"
          :class="[
            'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
            speakerOn ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
          ]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        </button>
        <span class="text-xs text-muted-foreground">Speaker</span>
      </div>
    </div>

    <!-- In-call DTMF Keypad -->
    <div v-if="showKeypad" class="mb-8">
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="key in ['1','2','3','4','5','6','7','8','9','*','0','#']"
          :key="key"
          @click="$emit('sendDTMF', key)"
          class="p-4 text-lg font-medium bg-muted rounded-lg hover:bg-accent transition-colors"
        >
          {{ key }}
        </button>
      </div>
    </div>

    <!-- Hang Up Button -->
    <div class="flex justify-center">
      <button
        @click="$emit('hangup')"
        class="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
          <line x1="22" x2="2" y1="2" y2="22"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  phoneNumber: {
    type: String,
    default: ''
  },
  duration: {
    type: String,
    default: '00:00'
  },
  callState: {
    type: String,
    default: 'active' // dialing, ringing, active
  },
  isMuted: {
    type: Boolean,
    default: false
  }
})

defineEmits(['hangup', 'toggleMute', 'sendDTMF'])

const showKeypad = ref(false)
const speakerOn = ref(false)

const statusText = computed(() => {
  switch (props.callState) {
    case 'dialing': return 'Calling...'
    case 'ringing': return 'Ringing...'
    case 'active': return 'On Call'
    case 'ending': return 'Ending...'
    default: return ''
  }
})

const formattedNumber = computed(() => {
  const num = props.phoneNumber
  // Simple US number formatting
  const digits = num.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }
  return num
})
</script>

