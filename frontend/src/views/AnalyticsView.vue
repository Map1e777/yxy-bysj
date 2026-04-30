<template>
  <section class="page-screen">
    <div class="page-heading">
      <div>
        <p class="page-kicker">Analytics</p>
        <h2>统计分析</h2>
        <p class="page-subtitle">用图表看客流、满载率和异常事件，更适合演示和汇报。</p>
      </div>
      <el-button type="primary" @click="loadData">刷新分析数据</el-button>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>线路热度分析</h3>
              <p>峰值客流与平均等待时长</p>
            </div>
          </div>
        </template>
        <EChartPanel :option="routeMetricsChartOption" height="360px" />
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>班次满载率分布</h3>
              <p>用于识别高峰和平峰运力配置</p>
            </div>
          </div>
        </template>
        <EChartPanel :option="occupancyChartOption" height="360px" />
      </el-card>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>事件等级分布</h3>
              <p>调度压力与风险级别概览</p>
            </div>
          </div>
        </template>
        <EChartPanel :option="eventChartOption" height="320px" />
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>分析明细</h3>
              <p>线路客流与等待时间明细表</p>
            </div>
          </div>
        </template>
        <el-table :data="analytics.routeMetrics" stripe>
          <el-table-column prop="route_name" label="线路" min-width="200" />
          <el-table-column prop="peak_passenger_flow" label="峰值客流" width="120" />
          <el-table-column prop="avg_wait_minutes" label="平均等待(分钟)" width="150" />
        </el-table>
      </el-card>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { fetchAnalytics } from '../api/dashboard';
import EChartPanel from '../components/EChartPanel.vue';

const analytics = reactive({
  routeMetrics: [],
  occupancy: [],
  eventsBySeverity: []
});

const routeMetricsChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  color: ['#2563eb', '#10b981'],
  grid: { left: 40, right: 20, top: 30, bottom: 40, containLabel: true },
  xAxis: {
    type: 'category',
    data: analytics.routeMetrics.map((item) => item.route_name),
    axisLabel: { interval: 0, rotate: 16 }
  },
  yAxis: [
    { type: 'value', name: '客流' },
    { type: 'value', name: '分钟' }
  ],
  series: [
    {
      name: '峰值客流',
      type: 'bar',
      data: analytics.routeMetrics.map((item) => item.peak_passenger_flow),
      itemStyle: { borderRadius: [8, 8, 0, 0] }
    },
    {
      name: '平均等待',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: analytics.routeMetrics.map((item) => item.avg_wait_minutes)
    }
  ]
}));

const occupancyChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  color: ['#f59e0b'],
  grid: { left: 40, right: 20, top: 30, bottom: 40, containLabel: true },
  xAxis: {
    type: 'category',
    data: analytics.occupancy.map((item) => item.route_name),
    axisLabel: { interval: 0, rotate: 16 }
  },
  yAxis: { type: 'value', max: 100, name: '%' },
  series: [
    {
      type: 'bar',
      data: analytics.occupancy.map((item) => item.expected_occupancy),
      barWidth: 30,
      itemStyle: { borderRadius: [8, 8, 0, 0] }
    }
  ]
}));

const eventChartOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '46%'],
      label: { formatter: '{b}: {c}' },
      data: analytics.eventsBySeverity.map((item) => ({
        name: item.severity,
        value: item.total
      }))
    }
  ]
}));

async function loadData() {
  const data = await fetchAnalytics();
  analytics.routeMetrics = data.routeMetrics;
  analytics.occupancy = data.occupancy;
  analytics.eventsBySeverity = data.eventsBySeverity;
}

onMounted(loadData);
</script>
