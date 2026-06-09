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

router.onError((error) => {
  console.error('[router] navigation error:', error)
})

// Guard is now fully synchronous — init() reads localStorage instantly and
// sets initialized in the same tick, so no async waiting is needed.
router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) authStore.init()

  if (authStore.isRecovering && to.name !== 'reset-password') {
    return { name: 'reset-password' }
  }

  if (to.meta.requiresAuth && !authStore.user) {
    return { name: 'login' }
  }

  if ((to.name === 'landing' || to.meta.requiresGuest) && authStore.user) {
    return { name: 'home' }
  }
})

export default router
