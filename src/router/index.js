import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import LoginView from '@/views/LoginView.vue'
import PhoneView from '@/views/PhoneView.vue'
import HistoryView from '@/views/HistoryView.vue'
import SmsView from '@/views/SmsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/phone',
      name: 'phone',
      component: PhoneView,
      meta: { requiresAuth: true }
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
      meta: { requiresAuth: true }
    },
    {
      path: '/sms',
      name: 'sms',
      component: SmsView,
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard to protect routes
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta.requiresAuth

  // Check if this is an OAuth callback (has access_token in hash)
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const hasOAuthToken = hashParams.has('access_token')

  if (hasOAuthToken) {
    // This is an OAuth callback - Supabase will automatically parse the hash
    // and establish a session. We need to wait for it to complete.
    try {
      // Exchange the hash tokens for a session
      const { data, error } = await supabase.auth.setSession({
        access_token: hashParams.get('access_token'),
        refresh_token: hashParams.get('refresh_token')
      })
      
      if (error) {
        console.error('OAuth callback error:', error)
        next('/login')
        return
      }

      if (data.session) {
        // Clear the hash and navigate cleanly
        window.history.replaceState(null, '', to.path)
        next()
        return
      }
    } catch (err) {
      console.error('Error processing OAuth callback:', err)
      next('/login')
      return
    }
  }

  if (requiresAuth) {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      // Not authenticated, redirect to login
      next('/login')
    } else {
      // Authenticated, allow navigation
      next()
    }
  } else {
    // Public route, allow navigation
    next()
  }
})

export default router

