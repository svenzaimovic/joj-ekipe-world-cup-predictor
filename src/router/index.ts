import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public landing page
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/LandingView.vue'),
    },
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
      path: '/home',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: '/profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
        },
        // Legacy routes — redirect to leagues list
        {
          path: '/draft',
          redirect: { name: 'leagues' },
        },
        {
          path: '/leaderboard',
          redirect: { name: 'leagues' },
        },
        // Leagues
        {
          path: '/leagues',
          name: 'leagues',
          component: () => import('@/views/LeagueListView.vue'),
        },
        {
          path: '/leagues/:leagueId',
          component: () => import('@/layouts/LeagueLayout.vue'),
          children: [
            {
              path: '',
              name: 'league-home',
              component: () => import('@/views/LeagueHomeView.vue'),
            },
            {
              path: 'draft',
              name: 'league-draft',
              component: () => import('@/views/DraftView.vue'),
            },
            {
              path: 'draft/practice',
              name: 'league-draft-practice',
              component: () => import('@/views/DraftView.vue'),
              props: { isPractice: true },
            },
            {
              path: 'leaderboard',
              name: 'league-leaderboard',
              component: () => import('@/views/LeaderboardView.vue'),
            },
            {
              path: 'my-teams',
              name: 'league-my-teams',
              component: () => import('@/views/LeagueMyTeamsView.vue'),
            },
            {
              path: 'fixtures',
              name: 'league-fixtures',
              component: () => import('@/views/LeagueFixturesView.vue'),
            },
          ],
        },
      ],
    },
  ],
})

// Add error handler so silent chunk-load failures become visible
router.onError((error) => {
  console.error('[router] navigation error:', error)
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    try {
      // Race getSession() against a 5-second timeout so a hanging Supabase
      // request never permanently blocks the first navigation.
      await Promise.race([
        authStore.init(),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            console.warn('[auth] init timed out — unblocking navigation')
            authStore.initialized = true
            resolve()
          }, 3000),
        ),
      ])
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

  // Authenticated users visiting / or /login land on /home
  if ((to.name === 'landing' || to.meta.requiresGuest) && authStore.user) {
    return { name: 'home' }
  }
})

export default router
