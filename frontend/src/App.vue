<template>
  <RouterView v-if="route.meta.public" />

  <div v-else class="app-shell">
    <aside class="app-sidebar">
      <div class="brand-block">
        <p class="brand-kicker">Campus Shuttle OS</p>
        <h1>校园通勤班车智能排班系统</h1>
        <p class="brand-copy">围绕排班、调度、师生服务和运营分析构建更清晰的管理工作台。</p>
      </div>

      <el-menu
        :default-active="route.path"
        class="app-menu"
        router
        background-color="transparent"
        text-color="rgba(255,255,255,.78)"
        active-text-color="#ffffff"
      >
        <el-menu-item v-for="item in visibleMenus" :key="item.path" :index="item.path">
          {{ item.label }}
        </el-menu-item>
      </el-menu>

      <div class="sidebar-foot">
        <span>{{ auth.state.user?.username }} · {{ auth.state.user?.role }}</span>
        <el-button plain class="logout-button" @click="handleLogout">退出登录</el-button>
      </div>
    </aside>

    <main class="app-content">
      <div class="content-inner">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const menus = [
  { path: '/dashboard', label: '运行概览', roles: ['ADMIN', 'DISPATCHER'] },
  { path: '/passenger', label: '师生服务', roles: ['ADMIN', 'DISPATCHER', 'STUDENT'] },
  { path: '/schedules', label: '班次管理', roles: ['ADMIN', 'DISPATCHER'] },
  { path: '/dispatch', label: '调度事件', roles: ['ADMIN', 'DISPATCHER'] },
  { path: '/resources', label: '基础资源', roles: ['ADMIN', 'DISPATCHER'] },
  { path: '/analytics', label: '统计分析', roles: ['ADMIN', 'DISPATCHER'] }
];

const visibleMenus = computed(() => {
  const role = auth.state.user?.role;
  return menus.filter((item) => item.roles.includes(role));
});

function handleLogout() {
  auth.clearAuth();
  router.push('/login');
}
</script>
