<template>
  <section class="page-screen">
    <div class="page-heading">
      <div>
        <p class="page-kicker">Dispatch</p>
        <h2>调度事件</h2>
        <p class="page-subtitle">统一登记异常，执行应急处理，并支持将受影响线路回滚到调度前排班。</p>
      </div>
      <el-button type="primary" @click="handleCreate">新增事件</el-button>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>事件录入</h3>
              <p>登记车辆故障、道路施工和临时活动</p>
            </div>
          </div>
        </template>
        <el-form label-position="top">
          <div class="form-2col">
            <el-form-item label="事件类型"><el-input v-model="form.eventType" /></el-form-item>
            <el-form-item label="影响线路"><el-input v-model="form.impactRoute" /></el-form-item>
            <el-form-item label="严重等级">
              <el-select v-model="form.severity">
                <el-option label="低" value="LOW" />
                <el-option label="中" value="MEDIUM" />
                <el-option label="高" value="HIGH" />
              </el-select>
            </el-form-item>
            <el-form-item label="调度建议"><el-input v-model="form.suggestion" /></el-form-item>
          </div>
        </el-form>
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>执行调度</h3>
              <p>选择事件后，发布应急策略或执行回滚</p>
            </div>
          </div>
        </template>
        <el-form label-position="top">
          <el-form-item label="目标事件">
            <el-select v-model="resolutionForm.eventId" placeholder="请选择事件">
              <el-option
                v-for="item in events"
                :key="item.id"
                :label="`${item.id} · ${item.impact_route} · ${item.event_type}`"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <div class="form-2col">
            <el-form-item label="处理类型">
              <el-select v-model="resolutionForm.resolutionType">
                <el-option label="整体延后" value="DELAY" />
                <el-option label="临时停运" value="CANCEL" />
                <el-option label="线路绕行" value="REROUTE" />
                <el-option label="替换车辆" value="REPLACE_VEHICLE" />
                <el-option label="增开班次" value="EXTRA_SERVICE" />
              </el-select>
            </el-form-item>
            <el-form-item label="延后分钟"><el-input-number v-model="resolutionForm.delayMinutes" :min="0" /></el-form-item>
            <el-form-item label="替换车辆"><el-input v-model="resolutionForm.replacementBusCode" /></el-form-item>
            <el-form-item label="增开发车时间"><el-input v-model="resolutionForm.extraDepartureTime" placeholder="18:10:00" /></el-form-item>
            <el-form-item label="增开到达时间"><el-input v-model="resolutionForm.extraArrivalTime" placeholder="18:25:00" /></el-form-item>
            <el-form-item label="处理说明"><el-input v-model="resolutionForm.actionNotes" /></el-form-item>
          </div>
          <div class="toolbar-row">
            <el-button type="success" @click="handleExecute">发布调度结果</el-button>
            <el-button type="warning" @click="handleRollback">回滚到调度前版本</el-button>
          </div>
        </el-form>
      </el-card>
    </div>

    <div class="dashboard-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>事件摘要</h3>
              <p>快速判断当前调度压力</p>
            </div>
          </div>
        </template>
        <div class="summary-list">
          <div class="summary-item">
            <span>总事件</span>
            <strong>{{ events.length }}</strong>
          </div>
          <div class="summary-item">
            <span>高等级事件</span>
            <strong>{{ highCount }}</strong>
          </div>
          <div class="summary-item">
            <span>处理中</span>
            <strong>{{ processingCount }}</strong>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h3>已处理结果</h3>
              <p>查看最近一次处理类型、处理人和说明</p>
            </div>
          </div>
        </template>
        <el-table :data="resolvedEvents" stripe>
          <el-table-column prop="impact_route" label="影响线路" min-width="170" />
          <el-table-column prop="resolution_type" label="处理类型" width="140" />
          <el-table-column prop="handled_by" label="处理人" width="120" />
          <el-table-column prop="action_notes" label="说明" min-width="220" show-overflow-tooltip />
        </el-table>
      </el-card>
    </div>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-head">
          <div>
            <h3>事件列表</h3>
            <p>按最近上报时间排序，可查看处理与回滚状态</p>
          </div>
        </div>
      </template>
      <el-table :data="events" stripe>
        <el-table-column prop="event_type" label="事件类型" min-width="140" />
        <el-table-column prop="impact_route" label="影响线路" min-width="180" />
        <el-table-column label="等级" width="110">
          <template #default="{ row }">
            <el-tag :type="severityTagType(row.severity)">{{ row.severity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="suggestion" label="建议" min-width="180" show-overflow-tooltip />
        <el-table-column prop="resolution_type" label="结果类型" width="140" />
        <el-table-column prop="action_notes" label="处理说明" min-width="200" show-overflow-tooltip />
        <el-table-column prop="handled_by" label="处理人" width="100" />
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
import {
  createDispatchEvent,
  executeDispatchEvent,
  fetchDispatchEvents,
  rollbackDispatchEvent
} from '../api/dashboard';

const events = ref([]);
const form = reactive({
  eventType: '',
  impactRoute: '',
  severity: 'MEDIUM',
  status: 'OPEN',
  suggestion: ''
});
const resolutionForm = reactive({
  eventId: null,
  resolutionType: 'DELAY',
  delayMinutes: 5,
  replacementBusCode: '',
  extraDepartureTime: '',
  extraArrivalTime: '',
  actionNotes: ''
});

const highCount = computed(() => events.value.filter((item) => item.severity === 'HIGH').length);
const processingCount = computed(() => events.value.filter((item) => item.status === 'PROCESSING').length);
const resolvedEvents = computed(() => events.value.filter((item) => item.resolution_type).slice(0, 5));

function formatTime(value) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-';
}

function severityTagType(severity) {
  if (severity === 'HIGH') return 'danger';
  if (severity === 'MEDIUM') return 'warning';
  return 'info';
}

function statusTagType(status) {
  if (status === 'RESOLVED') return 'success';
  if (status === 'PROCESSING') return 'warning';
  return 'danger';
}

async function loadEvents() {
  events.value = await fetchDispatchEvents();
}

async function handleCreate() {
  await createDispatchEvent({ ...form });
  Object.assign(form, {
    eventType: '',
    impactRoute: '',
    severity: 'MEDIUM',
    status: 'OPEN',
    suggestion: ''
  });
  await loadEvents();
  ElMessage.success('调度事件已创建');
}

async function handleExecute() {
  if (!resolutionForm.eventId) {
    ElMessage.warning('请先选择目标事件');
    return;
  }
  const result = await executeDispatchEvent(resolutionForm.eventId, { ...resolutionForm });
  await loadEvents();
  ElMessage.success(result.message || '调度结果已发布');
}

async function handleRollback() {
  if (!resolutionForm.eventId) {
    ElMessage.warning('请先选择目标事件');
    return;
  }
  const result = await rollbackDispatchEvent(resolutionForm.eventId);
  await loadEvents();
  ElMessage.success(result.message || '已回滚到调度前版本');
}

onMounted(loadEvents);
</script>
