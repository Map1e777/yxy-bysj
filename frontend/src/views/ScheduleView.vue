<template>
  <section class="page-screen">
    <div class="page-heading">
      <div>
        <p class="page-kicker">Schedules</p>
        <h2>班次管理</h2>
        <p class="page-subtitle">把智能排班、人工调整、批量发布和操作日志放在一个页面里。</p>
      </div>
      <div class="toolbar-row">
        <el-button @click="handleGenerate">智能生成今日排班</el-button>
        <el-button type="success" @click="handleBatchStatus('PUBLISHED')">批量发布</el-button>
        <el-button type="warning" @click="handleBatchStatus('CANCELLED')">批量取消</el-button>
        <el-button type="primary" @click="handleCreate">新增班次</el-button>
      </div>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>{{ editingId ? '编辑班次' : '快速录入' }}</h3>
              <p>用于手动补录、修正和发布班次</p>
            </div>
          </div>
        </template>
        <el-form label-position="top" class="form-stack">
          <div class="form-2col">
            <el-form-item label="线路名称"><el-input v-model="form.routeName" /></el-form-item>
            <el-form-item label="车辆编号"><el-input v-model="form.busCode" /></el-form-item>
            <el-form-item label="发车时间"><el-input v-model="form.departureTime" placeholder="07:30:00" /></el-form-item>
            <el-form-item label="到达时间"><el-input v-model="form.arrivalTime" placeholder="07:45:00" /></el-form-item>
            <el-form-item label="预计满载率">
              <el-input-number v-model="form.expectedOccupancy" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="form.status">
                <el-option label="草稿" value="DRAFT" />
                <el-option label="已发布" value="PUBLISHED" />
                <el-option label="已取消" value="CANCELLED" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item label="备注">
            <el-input v-model="form.notes" type="textarea" :rows="3" />
          </el-form-item>
          <div class="toolbar-row">
            <el-button type="primary" @click="handleSubmit">{{ editingId ? '保存修改' : '新增班次' }}</el-button>
            <el-button v-if="editingId" @click="resetForm">取消编辑</el-button>
          </div>
        </el-form>
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>状态摘要</h3>
              <p>帮助快速判断班次分布和排班操作情况</p>
            </div>
          </div>
        </template>
        <div class="summary-list">
          <div class="summary-item">
            <span>班次数量</span>
            <strong>{{ schedules.length }}</strong>
          </div>
          <div class="summary-item">
            <span>已发布</span>
            <strong>{{ publishedCount }}</strong>
          </div>
          <div class="summary-item">
            <span>平均满载率</span>
            <strong>{{ averageOccupancy }}%</strong>
          </div>
        </div>
      </el-card>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>优化报告</h3>
              <p>展示当前最优方案评分、约束和分线路拆解</p>
            </div>
          </div>
        </template>
        <div v-if="optimizationReport.selectedPlan" class="optimization-summary">
          <div class="summary-item">
            <span>选中方案</span>
            <strong>{{ optimizationReport.selectedPlan.label }}</strong>
          </div>
          <div class="summary-item">
            <span>综合得分</span>
            <strong>{{ optimizationReport.selectedMetrics?.overallScore }}</strong>
          </div>
          <div class="summary-item">
            <span>平均等待</span>
            <strong>{{ optimizationReport.selectedMetrics?.avgWaitMinutes }} 分钟</strong>
          </div>
        </div>
        <p v-if="optimizationReport.selectedPlan" class="optimization-copy">
          {{ optimizationReport.selectedPlan.description }}
        </p>
        <div v-else class="empty-note">还没有生成优化报告，先执行一次智能排班。</div>
        <div class="optimization-constraints">
          <el-tag v-for="item in optimizationReport.constraints" :key="item" effect="plain">
            {{ item }}
          </el-tag>
        </div>
        <EChartPanel :option="scoreChartOption" height="300px" />
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>候选方案对比</h3>
              <p>展示平衡、高峰优先、效率优先三套方案得分</p>
            </div>
          </div>
        </template>
        <el-table :data="optimizationReport.candidatePlans || []" stripe>
          <el-table-column prop="label" label="方案" min-width="140" />
          <el-table-column prop="metrics.overallScore" label="综合分" width="90" />
          <el-table-column prop="metrics.avgWaitMinutes" label="平均等待" width="110" />
          <el-table-column prop="metrics.estimatedEmptyRunRate" label="估算空驶率" width="120" />
          <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
        </el-table>
      </el-card>
    </div>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-head">
          <div>
            <h3>线路优化拆解</h3>
            <p>查看每条线路服务数量、平均等待和道路约束影响</p>
          </div>
        </div>
      </template>
      <el-table :data="optimizationReport.routeBreakdown || []" stripe>
        <el-table-column prop="routeName" label="线路" min-width="180" />
        <el-table-column prop="serviceCount" label="班次数" width="90" />
        <el-table-column prop="avgOccupancy" label="平均满载率" width="110" />
        <el-table-column prop="avgWaitMinutes" label="平均等待" width="100" />
        <el-table-column prop="demandGap" label="供需缺口" width="100" />
        <el-table-column prop="roadStatus" label="道路状态" width="100" />
      </el-table>
    </el-card>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-head">
          <div>
            <h3>班次列表</h3>
            <p>支持单条编辑与多选批量状态调整</p>
          </div>
        </div>
      </template>
      <el-table :data="schedules" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="route_name" label="线路" min-width="180" />
        <el-table-column prop="departure_time" label="发车" width="110" />
        <el-table-column prop="arrival_time" label="到达" width="110" />
        <el-table-column prop="bus_code" label="车辆" width="120" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expected_occupancy" label="满载率" width="100" />
        <el-table-column prop="notes" label="备注" min-width="260" show-overflow-tooltip />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="startEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-head">
          <div>
            <h3>操作日志</h3>
            <p>记录创建、生成和批量状态调整过程</p>
          </div>
        </div>
      </template>
      <el-table :data="logs" stripe>
        <el-table-column prop="route_name" label="线路" min-width="180" />
        <el-table-column prop="action_type" label="动作" width="120" />
        <el-table-column prop="operator_name" label="操作人" width="110" />
        <el-table-column prop="action_detail" label="详情" min-width="240" show-overflow-tooltip />
        <el-table-column label="时间" min-width="180">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import EChartPanel from '../components/EChartPanel.vue';
import {
  batchUpdateSchedules,
  createSchedule,
  fetchScheduleLogs,
  fetchScheduleOptimizationReport,
  fetchSchedules,
  generateSchedules,
  updateSchedule
} from '../api/dashboard';

const schedules = ref([]);
const logs = ref([]);
const selectedIds = ref([]);
const editingId = ref(null);
const optimizationReport = reactive({
  constraints: [],
  selectedPlan: null,
  selectedMetrics: null,
  candidatePlans: [],
  routeBreakdown: []
});

const form = reactive({
  routeName: '',
  departureTime: '',
  arrivalTime: '',
  busCode: '',
  status: 'DRAFT',
  expectedOccupancy: 0,
  notes: ''
});

const publishedCount = computed(() => schedules.value.filter((item) => item.status === 'PUBLISHED').length);
const averageOccupancy = computed(() => {
  if (!schedules.value.length) return 0;
  const total = schedules.value.reduce((sum, item) => sum + Number(item.expected_occupancy || 0), 0);
  return Math.round(total / schedules.value.length);
});

const scoreChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  color: ['#2563eb', '#10b981', '#f59e0b', '#ef4444'],
  grid: { left: 36, right: 18, top: 36, bottom: 40, containLabel: true },
  xAxis: {
    type: 'category',
    data: (optimizationReport.candidatePlans || []).map((item) => item.label)
  },
  yAxis: { type: 'value', max: 100 },
  series: [
    {
      name: '综合分',
      type: 'bar',
      barWidth: 22,
      data: (optimizationReport.candidatePlans || []).map((item) => item.metrics?.overallScore || 0)
    },
    {
      name: '需求匹配',
      type: 'line',
      data: (optimizationReport.candidatePlans || []).map((item) => item.metrics?.demandMatchScore || 0)
    },
    {
      name: '等待得分',
      type: 'line',
      data: (optimizationReport.candidatePlans || []).map((item) => item.metrics?.waitTimeScore || 0)
    },
    {
      name: '空驶得分',
      type: 'line',
      data: (optimizationReport.candidatePlans || []).map((item) => item.metrics?.emptyRunScore || 0)
    }
  ]
}));

function statusTagType(status) {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'CANCELLED') return 'danger';
  return 'info';
}

function formatTime(value) {
  return new Date(value).toLocaleString('zh-CN');
}

function resetForm() {
  editingId.value = null;
  Object.assign(form, {
    routeName: '',
    departureTime: '',
    arrivalTime: '',
    busCode: '',
    status: 'DRAFT',
    expectedOccupancy: 0,
    notes: ''
  });
}

function startEdit(row) {
  editingId.value = row.id;
  Object.assign(form, {
    routeName: row.route_name,
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    busCode: row.bus_code,
    status: row.status,
    expectedOccupancy: row.expected_occupancy,
    notes: row.notes
  });
}

function handleSelectionChange(rows) {
  selectedIds.value = rows.map((item) => item.id);
}

function applyReport(nextReport) {
  optimizationReport.constraints = nextReport?.constraints || [];
  optimizationReport.selectedPlan = nextReport?.selectedPlan || null;
  optimizationReport.selectedMetrics = nextReport?.selectedMetrics || null;
  optimizationReport.candidatePlans = nextReport?.candidatePlans || [];
  optimizationReport.routeBreakdown = nextReport?.routeBreakdown || [];
}

async function loadData() {
  schedules.value = await fetchSchedules();
  logs.value = await fetchScheduleLogs();
  applyReport(await fetchScheduleOptimizationReport());
}

async function handleGenerate() {
  const result = await generateSchedules();
  schedules.value = result.schedules;
  applyReport(result.report);
  logs.value = await fetchScheduleLogs();
  ElMessage.success(`已生成 ${result.report?.selectedPlan?.label || '优化方案'}，综合得分 ${result.report?.selectedMetrics?.overallScore || '-'}`);
}

async function handleSubmit() {
  if (editingId.value) {
    await updateSchedule(editingId.value, { ...form, operatorName: 'admin01' });
    ElMessage.success('班次已更新');
  } else {
    await createSchedule({ ...form, operatorName: 'admin01' });
    ElMessage.success('班次已新增');
  }
  resetForm();
  await loadData();
}

async function handleCreate() {
  await handleSubmit();
}

async function handleBatchStatus(status) {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择班次');
    return;
  }
  schedules.value = await batchUpdateSchedules({
    ids: selectedIds.value,
    status,
    operatorName: 'admin01'
  });
  logs.value = await fetchScheduleLogs();
  ElMessage.success(`已批量更新为 ${status}`);
}

onMounted(loadData);
</script>
