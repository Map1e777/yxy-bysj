<template>
  <section class="page-screen">
    <div class="page-heading">
      <div>
        <p class="page-kicker">Dashboard</p>
        <h2>运行概览</h2>
        <p class="page-subtitle">把排班状态、热点线路和车辆运行情况收拢到一屏内查看。</p>
      </div>
      <el-button type="primary" @click="loadData">刷新数据</el-button>
    </div>

    <div class="metric-grid">
      <el-card v-for="item in metricCards" :key="item.label" shadow="hover" class="metric-card">
        <div class="metric-label">{{ item.label }}</div>
        <div class="metric-value">{{ item.value }}</div>
        <div class="metric-note">{{ item.note }}</div>
      </el-card>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>热点线路热力</h3>
              <p>高峰客流与平均等待时间对照</p>
            </div>
          </div>
        </template>
        <EChartPanel :option="hotRouteChartOption" height="340px" />
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>在途车辆</h3>
              <p>优先关注即将到站班车</p>
            </div>
          </div>
        </template>
        <el-table :data="dashboard.runningVehicles" stripe>
          <el-table-column prop="plate_number" label="车牌" min-width="110" />
          <el-table-column prop="route_name" label="线路" min-width="180" show-overflow-tooltip />
          <el-table-column prop="next_stop" label="下一站" min-width="120" />
          <el-table-column prop="eta_minutes" label="ETA(分钟)" width="110" />
          <el-table-column label="拥挤度" width="110">
            <template #default="{ row }">
              <el-tag :type="occupancyTagType(row.occupancy_level)">{{ row.occupancy_level }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-head">
          <div>
            <h3>热点线路明细</h3>
            <p>按峰值客流从高到低展示</p>
          </div>
        </div>
      </template>
      <el-table :data="dashboard.routeHotspots" stripe>
        <el-table-column prop="route_name" label="线路" min-width="220" />
        <el-table-column prop="peak_passenger_flow" label="峰值客流" width="120" />
        <el-table-column prop="avg_wait_minutes" label="平均等待(分钟)" width="150" />
      </el-table>
    </el-card>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { fetchDashboard } from '../api/dashboard';
import EChartPanel from '../components/EChartPanel.vue';

const dashboard = reactive({
  metrics: {
    totalSchedules: 0,
    publishedSchedules: 0,
    avgOccupancy: 0,
    openEvents: 0,
    unreadNotifications: 0,
    totalFeedback: 0
  },
  routeHotspots: [],
  runningVehicles: []
});

const metricCards = computed(() => [
  { label: '排班总数', value: dashboard.metrics.totalSchedules, note: '系统中的班次配置总量' },
  { label: '已发布班次', value: dashboard.metrics.publishedSchedules, note: '当前对师生可见的班次' },
  { label: '平均满载率', value: `${dashboard.metrics.avgOccupancy}%`, note: '衡量运力利用情况' },
  { label: '待处理事件', value: dashboard.metrics.openEvents, note: '需要调度跟进的异常' },
  { label: '未读通知', value: dashboard.metrics.unreadNotifications, note: '待查看的运营消息' },
  { label: '反馈总数', value: dashboard.metrics.totalFeedback, note: '来自师生的意见反馈' }
]);

const hotRouteChartOption = computed(() => ({
  color: ['#2563eb', '#f59e0b'],
  tooltip: { trigger: 'axis' },
  legend: { data: ['峰值客流', '平均等待'] },
  grid: { left: 40, right: 20, top: 40, bottom: 30, containLabel: true },
  xAxis: {
    type: 'category',
    data: dashboard.routeHotspots.map((item) => item.route_name),
    axisLabel: { interval: 0, rotate: 15 }
  },
  yAxis: [
    { type: 'value', name: '客流' },
    { type: 'value', name: '分钟' }
  ],
  series: [
    {
      name: '峰值客流',
      type: 'bar',
      data: dashboard.routeHotspots.map((item) => item.peak_passenger_flow),
      barWidth: 28,
      itemStyle: { borderRadius: [8, 8, 0, 0] }
    },
    {
      name: '平均等待',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: dashboard.routeHotspots.map((item) => item.avg_wait_minutes)
    }
  ]
}));

function occupancyTagType(level) {
  if (level === '高') return 'danger';
  if (level === '中') return 'warning';
  return 'success';
}

async function loadData() {
  const data = await fetchDashboard();
  dashboard.metrics = data.metrics;
  dashboard.routeHotspots = data.routeHotspots;
  dashboard.runningVehicles = data.runningVehicles;
}

onMounted(loadData);
</script>
