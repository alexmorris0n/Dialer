<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <div class="w-full max-w-md space-y-8">
      <!-- Logo/Header -->
      <div class="text-center">
        <h1 class="text-4xl font-bold tracking-tight">Dispatcher Phone</h1>
        <p class="mt-2 text-muted-foreground">
          Sign in to access your softphone
        </p>
      </div>

      <!-- Sign In Card -->
      <div class="bg-card border rounded-lg shadow-lg p-8 space-y-6">
        <!-- Error Message -->
        <div v-if="error" class="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
          <p class="text-sm font-medium">{{ error }}</p>
        </div>

        <!-- Google Sign In Button -->
        <button
          @click="handleGoogleSignIn"
          :disabled="isLoading"
          class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 rounded-md px-4 py-3 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="!isLoading" class="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span v-if="isLoading">Signing in...</span>
          <span v-else>Sign in with Google</span>
        </button>

        <!-- Info -->
        <div class="text-center text-sm text-muted-foreground">
          <p>Use your company Google account</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center text-xs text-muted-foreground">
        <p>Dispatcher Phone System v1.0</p>
        <p class="mt-1">Powered by SignalWire + Supabase</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const router = useRouter()
const { isAuthenticated, isLoading, error, initAuth, signInWithGoogle } = useAuth()

onMounted(async () => {
  // Initialize auth and check if already signed in
  await initAuth()
  
  // If already authenticated, redirect to phone view
  if (isAuthenticated.value) {
    router.push('/phone')
  }
})

const handleGoogleSignIn = async () => {
  try {
    await signInWithGoogle()
    // OAuth will redirect automatically
  } catch (err) {
    console.error('Sign in failed:', err)
  }
}
</script>


