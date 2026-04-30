import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import ScheduleView from '../views/ScheduleView.vue';
import DispatchView from '../views/DispatchView.vue';
import PassengerView from '../views/PassengerView.vue';
import ResourceView from '../views/ResourceView.vue';
import AnalyticsView from '../views/AnalyticsView.vue';
import LoginView from '../views/LoginView.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: LoginView, meta: { public: true } },
  { path: '/dashboard', component: DashboardView, meta: { roles: ['ADMIN', 'DISPATCHER'] } },
  { path: '/passenger', component: PassengerView, meta: { roles: ['ADMIN', 'DISPATCHER', 'STUDENT'] } },
  { path: '/schedules', component: ScheduleView, meta: { roles: ['ADMIN', 'DISPATCHER'] } },
  { path: '/dispatch', component: DispatchView, meta: { roles: ['ADMIN', 'DISPATCHER'] } },
  { path: '/resources', component: ResourceView, meta: { roles: ['ADMIN', 'DISPATCHER'] } },
  { path: '/analytics', component: AnalyticsView, meta: { roles: ['ADMIN', 'DISPATCHER'] } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const { state } = useAuthStore();
  if (to.meta.public) {
    return true;
  }

  if (!state.token || !state.user) {
    return '/login';
  }

  const roles = to.meta.roles || [];
  if (roles.length && !roles.includes(state.user.role)) {
    return state.user.role === 'STUDENT' ? '/passenger' : '/dashboard';
  }

  return true;
});

export default router;
