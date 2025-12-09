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

