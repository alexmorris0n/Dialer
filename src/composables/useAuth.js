import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'vue-router'

export function useAuth() {
  const router = useRouter()
  const user = ref(null)
  const session = ref(null)
  const isLoading = ref(true)
  const error = ref(null)

  const isAuthenticated = computed(() => !!session.value)

  // Initialize auth state
  const initAuth = async () => {
    try {
      isLoading.value = true
      
      // Get current session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError
      
      if (currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        
        // Ensure user record exists in our users table
        await ensureUserRecord(currentSession.user)
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
        
        if (newSession?.user) {
          await ensureUserRecord(newSession.user)
        }
      })
    } catch (err) {
      console.error('Auth initialization error:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // Ensure user record exists in our users table
  const ensureUserRecord = async (authUser) => {
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      // If user doesn't exist, create record
      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
            role: 'dispatcher',
            status: 'offline'
          })
        
        if (insertError) {
          console.error('Error creating user record:', insertError)
        }
      }
    } catch (err) {
      console.error('Error ensuring user record:', err)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/phone`
        }
      })
      
      if (signInError) throw signInError
      
      // OAuth will redirect to Google, then back to our app
      return data
    } catch (err) {
      console.error('Sign in error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) throw signOutError
      
      user.value = null
      session.value = null
      
      // Redirect to login
      router.push('/login')
    } catch (err) {
      console.error('Sign out error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get SignalWire Subscriber token from backend
  // Returns: { token, available_lines }
  const getSignalWireToken = async () => {
    try {
      if (!session.value) {
        throw new Error('No active session')
      }
      
      // Call Supabase Edge Function to get SignalWire token
      const { data, error: functionError } = await supabase.functions.invoke('get-signalwire-token', {
        headers: {
          Authorization: `Bearer ${session.value.access_token}`
        }
      })
      
      if (functionError) {
        throw new Error(functionError.message || 'Failed to get SignalWire token')
      }
      
      // Return full response including available_lines for caller ID selection
      return {
        token: data.token,
        subscriber_id: data.subscriber_id,
        expires_at: data.expires_at,
        available_lines: data.available_lines || []
      }
    } catch (err) {
      console.error('Error getting SignalWire token:', err)
      error.value = err.message
      throw err
    }
  }

  // Get user profile from our users table
  const getUserProfile = async () => {
    try {
      if (!user.value) return null
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.value.id)
        .single()
      
      if (fetchError) throw fetchError
      
      return data
    } catch (err) {
      console.error('Error fetching user profile:', err)
      return null
    }
  }

  // Update user status (available, busy, away, offline)
  const updateStatus = async (status) => {
    try {
      if (!user.value) return
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ status })
        .eq('id', user.value.id)
      
      if (updateError) throw updateError
    } catch (err) {
      console.error('Error updating status:', err)
      throw err
    }
  }

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    error,
    initAuth,
    signInWithGoogle,
    signOut,
    getSignalWireToken,
    getUserProfile,
    updateStatus
  }
}

