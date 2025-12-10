import { ref, computed, onUnmounted } from 'vue'
import { SignalWire } from '@signalwire/js'

/**
 * SignalWire Browser SDK wrapper
 * Based on patterns from briankwest/swdialer
 * 
 * Token refresh: Tokens have TTL (default 1 hour). 
 * We refresh at 80% of lifetime to avoid disconnects.
 */

// Singleton state (shared across components)
const client = ref(null)
const isConnected = ref(false)
const isConnecting = ref(false)
const activeCall = ref(null)
const incomingCall = ref(null)
const callState = ref('idle') // idle, dialing, ringing, active, ended
const isMuted = ref(false)
const callDuration = ref(0)
const error = ref(null)

// Token management
let tokenRefreshTimeout = null
let durationInterval = null

export function useCallFabric() {
  
  /**
   * Connect to SignalWire with a subscriber token
   * @param {string} token - Subscriber token from backend
   * @param {object} options - Optional config { onTokenRefresh: fn }
   */
  const connect = async (token, options = {}) => {
    if (isConnected.value || isConnecting.value) {
      console.log('Already connected or connecting')
      return
    }

    try {
      isConnecting.value = true
      error.value = null

      console.log('🔌 Connecting to SignalWire...')

      // Initialize SignalWire client
      client.value = await SignalWire({
        token,
        // rootElement is optional - we'll handle audio ourselves
      })

      // Set up event listeners
      setupEventListeners(options)

      isConnected.value = true
      isConnecting.value = false
      console.log('✅ SignalWire connected')

      // Schedule token refresh at 80% of TTL (assume 1 hour = 3600s)
      // Refresh at ~48 minutes
      scheduleTokenRefresh(options.onTokenRefresh, 48 * 60 * 1000)

    } catch (err) {
      console.error('❌ SignalWire connection failed:', err)
      error.value = err.message
      isConnecting.value = false
      throw err
    }
  }

  /**
   * Set up SignalWire event listeners
   */
  const setupEventListeners = (options = {}) => {
    if (!client.value) return

    // Incoming call
    client.value.on('call.received', (call) => {
      console.log('📞 Incoming call:', call.from)
      incomingCall.value = call
      callState.value = 'ringing'

      // Set up call event listeners
      setupCallListeners(call)
    })

    // Connection state changes
    client.value.on('signalwire.ready', () => {
      console.log('✅ SignalWire ready')
      isConnected.value = true
    })

    client.value.on('signalwire.error', (err) => {
      console.error('❌ SignalWire error:', err)
      error.value = err.message
    })

    client.value.on('signalwire.socket.close', () => {
      console.log('🔌 SignalWire socket closed')
      isConnected.value = false
    })
  }

  /**
   * Set up event listeners for a specific call
   */
  const setupCallListeners = (call) => {
    console.log('📞 Setting up call listeners for:', call.id || call.uuid)

    // Log ALL events for debugging
    const events = [
      'room.started', 'room.updated', 'room.ended',
      'call.state', 'call.joined', 'call.left', 
      'member.joined', 'member.left', 'member.updated',
      'destroy', 'answered', 'active', 'ending', 'ended',
      'ringing', 'early', 'hangup'
    ]
    
    events.forEach(eventName => {
      call.on(eventName, (data) => {
        console.log(`📞 Event [${eventName}]:`, data)
      })
    })

    // State change handler
    call.on('call.state', (state) => {
      console.log('📞 Call state changed:', state)
      if (state === 'active' || state === 'answered') {
        callState.value = 'active'
        startDurationTimer()
      } else if (state === 'ending' || state === 'ended' || state === 'hangup' || state === 'destroy') {
        callState.value = 'idle'
        activeCall.value = null
        stopDurationTimer()
      }
    })

    call.on('destroy', () => {
      console.log('📞 Call destroyed')
      activeCall.value = null
      incomingCall.value = null
      callState.value = 'idle'
      isMuted.value = false
      stopDurationTimer()
    })

    call.on('room.joined', () => {
      console.log('📞 Room joined - call active')
      callState.value = 'active'
      startDurationTimer()
    })

    call.on('room.ended', () => {
      console.log('📞 Room ended')
      callState.value = 'idle'
      activeCall.value = null
      stopDurationTimer()
    })
  }

  /**
   * Disconnect from SignalWire
   */
  const disconnect = async () => {
    try {
      if (activeCall.value) {
        await hangup()
      }
      
      if (client.value) {
        await client.value.disconnect()
        client.value = null
      }

      isConnected.value = false
      clearTokenRefresh()
      console.log('🔌 Disconnected from SignalWire')
    } catch (err) {
      console.error('Error disconnecting:', err)
    }
  }

  /**
   * Request microphone permissions
   * Must be called before dialing/answering to satisfy browser requirements
   */
  const requestMediaPermissions = async () => {
    try {
      console.log('🎤 Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop the tracks immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop())
      console.log('✅ Microphone permission granted')
      return true
    } catch (err) {
      console.error('❌ Microphone permission denied:', err)
      error.value = 'Microphone permission denied. Please allow microphone access to make calls.'
      throw err
    }
  }

  /**
   * Make an outbound call
   * @param {string} destination - Phone number or SIP address
   * @param {object} options - Optional: { fromFabricAddressId, rootElement }
   */
  const dial = async (destination, options = {}) => {
    if (!client.value || !isConnected.value) {
      throw new Error('Not connected to SignalWire')
    }

    if (activeCall.value) {
      throw new Error('Already on a call')
    }

    try {
      callState.value = 'dialing'
      error.value = null

      // Request microphone permission first (required by browser)
      await requestMediaPermissions()

      // Format phone number if needed
      const phoneNumber = formatPhoneNumber(destination)
      
      // Dial the phone number directly
      // Caller ID comes from the Subscriber's assigned number in SignalWire
      const to = phoneNumber

      const rootElement = options.rootElement || document.getElementById('sw-call-container')
      
      console.log('📞 Dialing:', to)
      console.log('📞 rootElement:', rootElement)

      console.log('📞 Calling client.dial() to:', to)
      
      const call = await client.value.dial({
        to,
        rootElement,
        audio: true,
        video: false,
      })
      console.log('📞 client.dial() returned:', call)

      activeCall.value = call
      setupCallListeners(call)
      
      // START THE CALL - this is required!
      console.log('📞 Starting call...')
      await call.start()
      console.log('📞 Call started!')

      return call
    } catch (err) {
      console.error('❌ Dial failed:', err)
      console.error('❌ Error details:', err.message, err.stack)
      error.value = err.message
      callState.value = 'idle'
      throw err
    }
  }

  /**
   * Answer incoming call
   */
  const answer = async () => {
    if (!incomingCall.value) {
      throw new Error('No incoming call to answer')
    }

    try {
      console.log('📞 Answering call...')
      await incomingCall.value.answer()
      activeCall.value = incomingCall.value
      incomingCall.value = null
      callState.value = 'active'
      startDurationTimer()
    } catch (err) {
      console.error('❌ Answer failed:', err)
      error.value = err.message
      throw err
    }
  }

  /**
   * Reject incoming call
   */
  const reject = async () => {
    if (!incomingCall.value) {
      throw new Error('No incoming call to reject')
    }

    try {
      console.log('📞 Rejecting call...')
      await incomingCall.value.hangup()
      incomingCall.value = null
      callState.value = 'idle'
    } catch (err) {
      console.error('❌ Reject failed:', err)
      error.value = err.message
      throw err
    }
  }

  /**
   * Hang up active call
   */
  const hangup = async () => {
    const call = activeCall.value || incomingCall.value
    if (!call) {
      console.log('No call to hang up')
      return
    }

    try {
      console.log('📞 Hanging up...')
      await call.hangup()
      activeCall.value = null
      incomingCall.value = null
      callState.value = 'idle'
      stopDurationTimer()
    } catch (err) {
      console.error('❌ Hangup failed:', err)
      error.value = err.message
      throw err
    }
  }

  /**
   * Mute microphone
   */
  const mute = async () => {
    if (!activeCall.value) return

    try {
      await activeCall.value.audioMute()
      isMuted.value = true
      console.log('🔇 Muted')
    } catch (err) {
      console.error('❌ Mute failed:', err)
      error.value = err.message
    }
  }

  /**
   * Unmute microphone
   */
  const unmute = async () => {
    if (!activeCall.value) return

    try {
      await activeCall.value.audioUnmute()
      isMuted.value = false
      console.log('🔊 Unmuted')
    } catch (err) {
      console.error('❌ Unmute failed:', err)
      error.value = err.message
    }
  }

  /**
   * Toggle mute state
   */
  const toggleMute = async () => {
    if (isMuted.value) {
      await unmute()
    } else {
      await mute()
    }
  }

  /**
   * Send DTMF tones during active call
   * @param {string} digits - DTMF digits to send
   */
  const sendDTMF = async (digits) => {
    if (!activeCall.value) return

    try {
      await activeCall.value.sendDigits(digits)
      console.log('🔢 Sent DTMF:', digits)
    } catch (err) {
      console.error('❌ DTMF failed:', err)
    }
  }

  /**
   * Go online for queue(s) - receive calls from queues
   * @param {string[]} queues - Array of queue names
   */
  const goOnline = async (queues = []) => {
    if (!client.value || !isConnected.value) {
      throw new Error('Not connected to SignalWire')
    }

    try {
      await client.value.online({ queues })
      console.log('🟢 Online for queues:', queues)
    } catch (err) {
      console.error('❌ Go online failed:', err)
      error.value = err.message
      throw err
    }
  }

  /**
   * Go offline - stop receiving queue calls
   */
  const goOffline = async () => {
    if (!client.value || !isConnected.value) return

    try {
      await client.value.offline()
      console.log('🔴 Offline')
    } catch (err) {
      console.error('❌ Go offline failed:', err)
      error.value = err.message
    }
  }

  // ============ Helper Functions ============

  /**
   * Format phone number to E.164
   */
  const formatPhoneNumber = (number) => {
    // Remove all non-digit characters
    const digits = number.replace(/\D/g, '')
    
    // If it starts with 1 and is 11 digits, it's already E.164
    if (digits.length === 11 && digits.startsWith('1')) {
      return '+' + digits
    }
    
    // If 10 digits, assume US and add +1
    if (digits.length === 10) {
      return '+1' + digits
    }
    
    // Otherwise return as-is with + prefix
    return number.startsWith('+') ? number : '+' + digits
  }

  /**
   * Schedule token refresh
   */
  const scheduleTokenRefresh = (refreshCallback, delay) => {
    clearTokenRefresh()
    
    if (!refreshCallback) return

    tokenRefreshTimeout = setTimeout(async () => {
      console.log('🔄 Refreshing SignalWire token...')
      try {
        const newToken = await refreshCallback()
        // Reconnect with new token
        await disconnect()
        await connect(newToken, { onTokenRefresh: refreshCallback })
      } catch (err) {
        console.error('❌ Token refresh failed:', err)
        error.value = 'Token refresh failed'
      }
    }, delay)
  }

  /**
   * Clear token refresh timer
   */
  const clearTokenRefresh = () => {
    if (tokenRefreshTimeout) {
      clearTimeout(tokenRefreshTimeout)
      tokenRefreshTimeout = null
    }
  }

  /**
   * Start call duration timer
   */
  const startDurationTimer = () => {
    callDuration.value = 0
    durationInterval = setInterval(() => {
      callDuration.value++
    }, 1000)
  }

  /**
   * Stop call duration timer
   */
  const stopDurationTimer = () => {
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
    callDuration.value = 0
  }

  /**
   * Format duration as mm:ss
   */
  const formattedDuration = computed(() => {
    const minutes = Math.floor(callDuration.value / 60)
    const seconds = callDuration.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  // Cleanup on unmount
  onUnmounted(() => {
    clearTokenRefresh()
    stopDurationTimer()
  })

  return {
    // State
    client,
    isConnected,
    isConnecting,
    activeCall,
    incomingCall,
    callState,
    isMuted,
    callDuration,
    formattedDuration,
    error,

    // Actions
    connect,
    disconnect,
    dial,
    answer,
    reject,
    hangup,
    mute,
    unmute,
    toggleMute,
    sendDTMF,
    goOnline,
    goOffline,

    // Helpers
    formatPhoneNumber
  }
}

