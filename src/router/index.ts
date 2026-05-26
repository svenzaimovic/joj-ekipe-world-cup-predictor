import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: 'predictor',
          name: 'predictor',
          component: () => import('@/views/PredictorView.vue'),
        },
        {
          path: 'leaderboard',
          name: 'leaderboard',
          component: () => import('@/views/LeaderboardView.vue'),
        },
        {
          path: 'draft',
          name: 'draft',
          component: () => import('@/views/DraftView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    try {
      await authStore.init()
    } catch {
      authStore.initialized = true // unblock navigation even if init fails
    }
  }

  // If Supabase fired PASSWORD_RECOVERY, always land on /reset-password
  if (authStore.isRecovering && to.name !== 'reset-password') {
    return { name: 'reset-password' }
  }

  if (to.meta.requiresAuth && !authStore.user) {
    return { name: 'login' }
  }

  if (to.meta.requiresGuest && authStore.user) {
    return { name: 'home' }
  }
})

export default router
