<template>
  <div class="min-h-screen bg-background">
    <!-- Container for SignalWire call audio (must not be display:none) -->
    <div id="sw-call-container" class="sr-only"></div>

    <!-- Incoming Call Overlay -->
    <IncomingCall
      v-if="incomingCall"
      :caller-number="incomingCall.from || 'Unknown'"
      @answer="handleAnswer"
      @reject="handleReject"
    />

    <!-- Main Layout -->
    <div class="p-4">
      <!-- Header -->
      <div class="max-w-md mx-auto mb-6">
        <div class="bg-card border rounded-lg shadow p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {{ userInitials }}
            </div>
            <div>
              <p class="font-medium">{{ userProfile?.name || 'User' }}</p>
              <p class="text-xs text-muted-foreground">{{ userProfile?.email }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <!-- Connection Status -->
            <div class="flex items-center gap-1.5">
              <span 
                class="w-2 h-2 rounded-full"
                :class="isConnected ? 'bg-green-500' : 'bg-gray-400'"
              ></span>
              <span class="text-xs text-muted-foreground">
                {{ isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Offline' }}
              </span>
            </div>
            <!-- Sign Out -->
            <button
              @click="handleSignOut"
              class="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-md hover:bg-accent transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <!-- Phone Interface -->
      <div class="max-w-md mx-auto">
        <div class="bg-card border rounded-lg shadow p-6">
          <!-- Active Call View -->
          <ActiveCall
            v-if="callState !== 'idle'"
            :phone-number="currentCallNumber"
            :duration="formattedDuration"
            :call-state="callState"
            :is-muted="isMuted"
            @hangup="handleHangup"
            @toggle-mute="handleToggleMute"
            @send-d-t-m-f="handleSendDTMF"
          />

          <!-- Dialer View -->
          <Dialer
            v-else
            ref="dialerRef"
            @dial="handleDial"
          />
        </div>

        <!-- Error Display -->
        <div v-if="callError" class="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center">
          {{ callError }}
        </div>

        <!-- Debug Info (remove in production) -->
        <div class="mt-4 p-3 bg-muted rounded-md text-xs text-muted-foreground">
          <p><strong>Debug:</strong></p>
          <p>Call State: {{ callState }}</p>
          <p>Token: {{ signalwireToken ? '✅ Obtained' : '❌ Missing' }}</p>
          <p>Connected: {{ isConnected ? '✅' : '❌' }}</p>
          <p v-if="userProfile?.signalwire_subscriber_id">
            Subscriber: {{ userProfile.signalwire_subscriber_id.substring(0, 15) }}...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCallFabric } from '@/composables/useCallFabric'
import Dialer from '@/components/phone/Dialer.vue'
import ActiveCall from '@/components/phone/ActiveCall.vue'
import IncomingCall from '@/components/phone/IncomingCall.vue'

// Auth
const { signOut, getUserProfile, getSignalWireToken, initAuth } = useAuth()

// Call Fabric
const {
  isConnected,
  isConnecting,
  activeCall,
  incomingCall,
  callState,
  isMuted,
  formattedDuration,
  error: callError,
  connect,
  disconnect,
  dial,
  answer,
  reject,
  hangup,
  toggleMute,
  sendDTMF
} = useCallFabric()

// Local state
const userProfile = ref(null)
const signalwireToken = ref(null)
const currentCallNumber = ref('')
const dialerRef = ref(null)

// Computed
const userInitials = computed(() => {
  if (!userProfile.value?.name) return 'U'
  const names = userProfile.value.name.split(' ')
  return names.map(n => n[0]).join('').substring(0, 2).toUpperCase()
})

// Lifecycle
onMounted(async () => {
  // Initialize auth state first
  await initAuth()
  
  // Load user profile
  userProfile.value = await getUserProfile()
  
  // Get SignalWire token and connect
  try {
    console.log('🔄 Getting SignalWire token...')
    signalwireToken.value = await getSignalWireToken()
    console.log('✅ SignalWire token obtained')
    
    // Connect to SignalWire with token refresh callback
    await connect(signalwireToken.value, {
      onTokenRefresh: getSignalWireToken
    })
  } catch (err) {
    console.error('❌ Failed to initialize SignalWire:', err)
  }
})

onUnmounted(() => {
  // Disconnect when leaving view
  disconnect()
})

// Handlers
const handleDial = async (phoneNumber) => {
  if (!isConnected.value) {
    console.error('Not connected to SignalWire')
    return
  }

  try {
    dialerRef.value?.setDialing(true)
    currentCallNumber.value = phoneNumber
    await dial(phoneNumber)
    dialerRef.value?.clear()
  } catch (err) {
    console.error('Dial failed:', err)
    dialerRef.value?.setError(err.message)
  } finally {
    dialerRef.value?.setDialing(false)
  }
}

const handleAnswer = async () => {
  try {
    currentCallNumber.value = incomingCall.value?.from || 'Unknown'
    await answer()
  } catch (err) {
    console.error('Answer failed:', err)
  }
}

const handleReject = async () => {
  try {
    await reject()
  } catch (err) {
    console.error('Reject failed:', err)
  }
}

const handleHangup = async () => {
  try {
    await hangup()
    currentCallNumber.value = ''
  } catch (err) {
    console.error('Hangup failed:', err)
  }
}

const handleToggleMute = async () => {
  await toggleMute()
}

const handleSendDTMF = async (digit) => {
  await sendDTMF(digit)
}

const handleSignOut = async () => {
  await disconnect()
  await signOut()
}
</script>
