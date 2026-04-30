<template>
  <section class="page-screen">
    <div class="page-heading">
      <div>
        <p class="page-kicker">Passenger Portal</p>
        <h2>师生服务</h2>
        <p class="page-subtitle">围绕路线查询、实时车辆、通知提醒、常用路线和意见反馈组织师生侧信息。</p>
      </div>
      <div class="toolbar-row">
        <el-tag type="info">模拟运行状态 · 每 30 秒刷新</el-tag>
        <el-button type="primary" @click="loadData">刷新服务数据</el-button>
      </div>
    </div>

    <el-alert
      v-if="highlightAlerts.length"
      :title="highlightAlerts[0].title"
      :description="highlightAlerts[0].description"
      :type="highlightAlerts[0].type"
      show-icon
      :closable="false"
    />

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>实时班车</h3>
              <p>展示当前位置、下一站、预计到站和拥挤度</p>
            </div>
          </div>
        </template>
        <div class="live-vehicle-list">
          <div v-for="item in realtimeVehicles" :key="item.id" class="live-vehicle-card">
            <div class="live-vehicle-top">
              <div>
                <strong>{{ item.routeName }}</strong>
                <p>{{ item.plateNumber }} · {{ item.currentStop }} → {{ item.nextStop }}</p>
              </div>
              <el-tag :type="statusTagType(item.runStatus)">{{ item.runStatus }}</el-tag>
            </div>
            <div class="live-vehicle-meta">
              <span>ETA {{ item.etaMinutes }} 分钟</span>
              <span>{{ item.occupancyLevel }} · {{ item.occupancyPercent }}%</span>
              <span>{{ formatTime(item.lastReportedAt) }}</span>
            </div>
            <div class="live-vehicle-note">{{ item.highlight }}</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>校园地图示意</h3>
              <p>用站点示意图查看车辆所在区域与线路分布</p>
            </div>
          </div>
        </template>
        <CampusMapPanel :routes="portal.routes" :vehicles="realtimeVehicles" />
      </el-card>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>出行推荐</h3>
              <p>优先推荐等待时间更短的线路</p>
            </div>
          </div>
        </template>
        <el-table :data="portal.recommendations" stripe>
          <el-table-column prop="route_name" label="线路" min-width="220" />
          <el-table-column prop="peak_passenger_flow" label="峰值客流" width="120" />
          <el-table-column prop="avg_wait_minutes" label="平均等待(分钟)" width="150" />
        </el-table>
      </el-card>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>通知中心</h3>
              <p>班次调整、绕行与高峰提醒</p>
            </div>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="item in portal.notifications"
            :key="item.title + item.created_at"
            :timestamp="formatTime(item.created_at)"
          >
            <div class="timeline-title">{{ item.title }}</div>
            <div class="timeline-content">{{ item.content }}</div>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>线路详情</h3>
              <p>查看站点顺序、里程和预计耗时</p>
            </div>
          </div>
        </template>
        <el-collapse accordion>
          <el-collapse-item v-for="route in portal.routes" :key="route.id" :title="route.route_name" :name="route.id">
            <div class="route-meta">
              <el-tag>{{ route.start_stop }} → {{ route.end_stop }}</el-tag>
              <el-tag type="success">{{ route.total_distance_km }} km</el-tag>
              <el-tag type="warning">{{ route.estimated_duration_min }} 分钟</el-tag>
            </div>
            <div class="stop-list">
              <el-tag v-for="stop in route.stops" :key="stop.id" effect="plain">{{ stop.stop_name }}</el-tag>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-card>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>我的常用路线</h3>
              <p>仅展示当前登录账号收藏内容</p>
            </div>
          </div>
        </template>
        <el-table :data="portal.favorites" stripe>
          <el-table-column prop="route_name" label="线路" min-width="220" />
          <el-table-column label="收藏时间" min-width="180">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
        <el-form label-position="top" class="form-stack compact-top">
          <el-form-item label="收藏线路名称"><el-input v-model="favoriteForm.routeName" /></el-form-item>
          <el-button @click="handleFavorite">添加常用路线</el-button>
        </el-form>
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>意见反馈</h3>
              <p>反馈会自动关联当前账号</p>
            </div>
          </div>
        </template>
        <el-form label-position="top" class="form-stack">
          <el-form-item label="相关线路"><el-input v-model="feedbackForm.routeName" /></el-form-item>
          <el-form-item label="反馈内容"><el-input v-model="feedbackForm.content" type="textarea" :rows="4" /></el-form-item>
          <el-button type="primary" @click="handleFeedback">提交反馈</el-button>
        </el-form>
        <el-divider />
        <el-table :data="portal.feedbackHistory" stripe>
          <el-table-column prop="route_name" label="线路" min-width="180" />
          <el-table-column prop="content" label="反馈内容" min-width="220" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="110" />
        </el-table>
      </el-card>
    </div>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-head">
          <div>
            <h3>班次查询与历史参考</h3>
            <p>用于查看近期发车安排和高峰线路满载情况</p>
          </div>
        </div>
      </template>
      <el-table :data="schedules" stripe>
        <el-table-column prop="route_name" label="线路" min-width="180" />
        <el-table-column prop="departure_time" label="发车时间" width="110" />
        <el-table-column prop="arrival_time" label="到达时间" width="110" />
        <el-table-column prop="bus_code" label="车辆" width="120" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="expected_occupancy" label="预计满载率" width="120" />
      </el-table>
    </el-card>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import CampusMapPanel from '../components/CampusMapPanel.vue';
import {
  createFavorite,
  createFeedback,
  fetchRealtimeVehicles,
  fetchSchedules,
  fetchStudentOverview
} from '../api/dashboard';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const portal = reactive({
  routes: [],
  favorites: [],
  notifications: [],
  recommendations: [],
  feedbackHistory: []
});
const schedules = reactive([]);
const realtimeVehicles = ref([]);
let timerId = null;

const favoriteForm = reactive({
  routeName: ''
});

const feedbackForm = reactive({
  routeName: '',
  content: ''
});

const highlightAlerts = computed(() => realtimeVehicles.value
  .filter((item) => item.runStatus !== '正常')
  .slice(0, 2)
  .map((item) => ({
    title: `${item.routeName} ${item.runStatus}`,
    description: item.highlight,
    type: item.runStatus === '绕行' ? 'warning' : 'error'
  })));

function formatTime(value) {
  return new Date(value).toLocaleString('zh-CN');
}

function statusTagType(status) {
  if (status === '绕行') return 'warning';
  if (status === '延误' || status === '停运') return 'danger';
  return 'success';
}

async function loadRealtimeVehicles() {
  realtimeVehicles.value = await fetchRealtimeVehicles();
}

async function loadData() {
  const data = await fetchStudentOverview();
  const scheduleData = await fetchSchedules();
  portal.routes = data.routes;
  portal.favorites = data.favorites;
  portal.notifications = data.notifications;
  portal.recommendations = data.recommendations;
  portal.feedbackHistory = data.feedbackHistory;
  schedules.splice(0, schedules.length, ...scheduleData);
  await loadRealtimeVehicles();
}

async function handleFavorite() {
  await createFavorite({
    routeName: favoriteForm.routeName
  });
  favoriteForm.routeName = '';
  await loadData();
  ElMessage.success(`${auth.state.user?.username} 的常用路线已更新`);
}

async function handleFeedback() {
  await createFeedback({
    routeName: feedbackForm.routeName,
    content: feedbackForm.content
  });
  feedbackForm.routeName = '';
  feedbackForm.content = '';
  await loadData();
  ElMessage.success('反馈已提交');
}

onMounted(async () => {
  await loadData();
  timerId = window.setInterval(loadRealtimeVehicles, 30000);
});

onBeforeUnmount(() => {
  if (timerId) {
    window.clearInterval(timerId);
  }
});
</script>
