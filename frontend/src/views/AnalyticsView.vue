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

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>排班适配准确率</h3>
              <p>有客流需求的（线路,时段）组合中，已有发布班次覆盖的比例</p>
            </div>
          </div>
        </template>
        <div class="accuracy-display">
          <span class="accuracy-value" :class="analytics.scheduleAccuracy >= 90 ? 'good' : 'warn'">
            {{ analytics.scheduleAccuracy !== null ? analytics.scheduleAccuracy + '%' : '—' }}
          </span>
          <span class="accuracy-label">
            {{ analytics.scheduleAccuracy === null ? '暂无客流数据' : analytics.scheduleAccuracy >= 90 ? '已达标（目标 ≥ 90%）' : '未达标（目标 ≥ 90%）' }}
          </span>
        </div>
        <p class="accuracy-formula">
          计算公式：排班适配准确率 = 已覆盖需求时段数 ÷ 总需求时段数 × 100%
        </p>
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>空驶率分析</h3>
              <p>预计满载率 &lt; 35% 的班次视为轻载/空驶，用于识别冗余班次</p>
            </div>
          </div>
        </template>
        <EChartPanel :option="emptyRunChartOption" height="320px" />
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>空驶率明细</h3>
              <p>各线路轻载班次数量与空驶率数值</p>
            </div>
          </div>
        </template>
        <el-table :data="analytics.emptyRunStats" stripe>
          <el-table-column prop="route_name" label="线路" min-width="200" />
          <el-table-column prop="total_services" label="总班次" width="100" />
          <el-table-column prop="empty_count" label="轻载班次" width="110" />
          <el-table-column label="空驶率" width="110">
            <template #default="{ row }">
              <el-tag :type="row.empty_run_rate > 40 ? 'danger' : row.empty_run_rate > 20 ? 'warning' : 'success'">
                {{ row.empty_run_rate }}%
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
    <el-card v-if="analytics.baselineComparison" shadow="never" class="panel-card">
      <template #header>
        <div class="panel-head">
          <div>
            <h3>人工基线 vs GA+PSO 优化对比</h3>
            <p>人工基线为固定30分钟间隔方案（7:00–18:00），优化方案为当前已发布班次实测数据</p>
          </div>
        </div>
      </template>
      <el-table
        :data="[analytics.baselineComparison.baseline, analytics.baselineComparison.optimized]"
        border
      >
        <el-table-column prop="label" label="方案" min-width="160" />
        <el-table-column prop="totalServices" label="总班次数" width="110" />
        <el-table-column prop="avgOccupancy" label="平均满载率(%)" width="130" />
        <el-table-column prop="avgWaitMinutes" label="平均等待(分钟)" width="140" />
        <el-table-column prop="emptyRunRate" label="空驶率(%)" width="110">
          <template #default="{ row }">
            <el-tag :type="row.emptyRunRate > 30 ? 'danger' : 'success'">{{ row.emptyRunRate }}%</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="peakCoverage" label="需求覆盖率(%)" width="130">
          <template #default="{ row }">
            <el-tag :type="row.peakCoverage >= 90 ? 'success' : 'warning'">{{ row.peakCoverage }}%</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { fetchAnalytics } from '../api/dashboard';
import EChartPanel from '../components/EChartPanel.vue';

const analytics = reactive({
  routeMetrics: [],
  occupancy: [],
  eventsBySeverity: [],
  emptyRunStats: [],
  scheduleAccuracy: null,
  baselineComparison: null
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
  tooltip: { trigger: 'axis', formatter: '{b}: {c} 个班次' },
  color: ['#f59e0b'],
  grid: { left: 40, right: 20, top: 30, bottom: 40, containLabel: true },
  xAxis: {
    type: 'category',
    name: '满载率区间',
    data: analytics.occupancy.map((item) => item.bucket),
    axisLabel: { interval: 0 }
  },
  yAxis: { type: 'value', name: '班次数', minInterval: 1 },
  series: [
    {
      type: 'bar',
      data: analytics.occupancy.map((item) => item.shift_count),
      barWidth: 36,
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

const emptyRunChartOption = computed(() => ({
  tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
  color: ['#ef4444'],
  grid: { left: 40, right: 20, top: 30, bottom: 40, containLabel: true },
  xAxis: {
    type: 'category',
    data: analytics.emptyRunStats.map((item) => item.route_name),
    axisLabel: { interval: 0, rotate: 16 }
  },
  yAxis: { type: 'value', max: 100, name: '%', axisLabel: { formatter: '{value}%' } },
  series: [
    {
      name: '空驶率',
      type: 'bar',
      barWidth: 32,
      data: analytics.emptyRunStats.map((item) => ({
        value: item.empty_run_rate,
        itemStyle: { color: item.empty_run_rate > 40 ? '#ef4444' : item.empty_run_rate > 20 ? '#f59e0b' : '#10b981', borderRadius: [8, 8, 0, 0] }
      }))
    }
  ]
}));

async function loadData() {
  const data = await fetchAnalytics();
  analytics.routeMetrics = data.routeMetrics;
  analytics.occupancy = data.occupancy;
  analytics.eventsBySeverity = data.eventsBySeverity;
  analytics.emptyRunStats = data.emptyRunStats || [];
  analytics.scheduleAccuracy = data.scheduleAccuracy ?? null;
  analytics.baselineComparison = data.baselineComparison ?? null;
}

onMounted(loadData);
</script>

<style scoped>
.accuracy-display {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 24px 0 12px;
}

.accuracy-value {
  font-size: 52px;
  font-weight: 700;
  line-height: 1;
}

.accuracy-value.good { color: #10b981; }
.accuracy-value.warn { color: #f59e0b; }

.accuracy-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.accuracy-formula {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
