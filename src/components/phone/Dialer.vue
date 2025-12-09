<template>
  <div class="dialer w-full max-w-xs mx-auto">
    <!-- Phone Number Display -->
    <div class="mb-4">
      <div class="relative">
        <input
          v-model="phoneNumber"
          type="tel"
          placeholder="Enter number"
          class="w-full text-center text-2xl font-mono py-4 px-4 pr-12 bg-muted border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          @keyup.enter="handleCall"
        />
        <!-- Backspace button -->
        <button
          v-if="phoneNumber"
          @click="backspace"
          class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/>
            <line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Dialpad Grid -->
    <div class="grid grid-cols-3 gap-3 mb-4">
      <button
        v-for="key in dialpadKeys"
        :key="key.main"
        @click="pressKey(key.main)"
        class="dialpad-key aspect-square flex flex-col items-center justify-center rounded-full bg-card border hover:bg-accent transition-colors text-lg font-medium"
      >
        <span class="text-xl">{{ key.main }}</span>
        <span v-if="key.sub" class="text-[10px] text-muted-foreground tracking-widest">{{ key.sub }}</span>
      </button>
    </div>

    <!-- Call Button -->
    <div class="flex justify-center">
      <button
        @click="handleCall"
        :disabled="!phoneNumber || isDialing"
        class="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      </button>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['dial'])

const phoneNumber = ref('')
const isDialing = ref(false)
const error = ref(null)

// Dialpad key configuration
const dialpadKeys = [
  { main: '1', sub: '' },
  { main: '2', sub: 'ABC' },
  { main: '3', sub: 'DEF' },
  { main: '4', sub: 'GHI' },
  { main: '5', sub: 'JKL' },
  { main: '6', sub: 'MNO' },
  { main: '7', sub: 'PQRS' },
  { main: '8', sub: 'TUV' },
  { main: '9', sub: 'WXYZ' },
  { main: '*', sub: '' },
  { main: '0', sub: '+' },
  { main: '#', sub: '' },
]

const pressKey = (key) => {
  // Long press 0 for + (handled separately if needed)
  phoneNumber.value += key
  playDTMFTone(key)
}

const backspace = () => {
  phoneNumber.value = phoneNumber.value.slice(0, -1)
}

const handleCall = () => {
  if (!phoneNumber.value) return
  
  error.value = null
  emit('dial', phoneNumber.value)
}

// Simple DTMF tone generation using Web Audio API
const playDTMFTone = (key) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // DTMF frequencies
    const dtmfFreqs = {
      '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
      '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
      '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
      '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
    }

    const freqs = dtmfFreqs[key]
    if (!freqs) return

    const duration = 0.15
    const gainNode = audioContext.createGain()
    gainNode.connect(audioContext.destination)
    gainNode.gain.value = 0.1

    freqs.forEach(freq => {
      const oscillator = audioContext.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.value = freq
      oscillator.connect(gainNode)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + duration)
    })

    // Cleanup
    setTimeout(() => audioContext.close(), duration * 1000 + 100)
  } catch (err) {
    // Ignore audio errors
  }
}

// Expose for parent to set dialing state
defineExpose({
  setDialing: (value) => { isDialing.value = value },
  setError: (msg) => { error.value = msg },
  clear: () => { phoneNumber.value = '' }
})
</script>

<style scoped>
.dialpad-key {
  min-height: 64px;
}

.dialpad-key:active {
  transform: scale(0.95);
}
</style>

