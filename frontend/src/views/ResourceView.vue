<template>
  <section class="page-screen">
    <div class="page-heading">
      <div>
        <p class="page-kicker">Resources</p>
        <h2>基础资源与系统配置</h2>
        <p class="page-subtitle">把线路、站点、车辆、通知、客流、道路状态、用户和导入任务拆成清晰模块。</p>
      </div>
      <el-button type="primary" @click="loadData">刷新资源</el-button>
    </div>

    <el-tabs>
      <el-tab-pane label="线路与站点">
        <div class="dashboard-grid">
          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>新增线路</h3><p>维护路线基本信息</p></div></div></template>
            <el-form label-position="top">
              <div class="form-2col">
                <el-form-item label="线路名称"><el-input v-model="routeForm.routeName" /></el-form-item>
                <el-form-item label="状态"><el-select v-model="routeForm.status"><el-option label="启用" value="ACTIVE" /><el-option label="停用" value="INACTIVE" /></el-select></el-form-item>
                <el-form-item label="起点站"><el-input v-model="routeForm.startStop" /></el-form-item>
                <el-form-item label="终点站"><el-input v-model="routeForm.endStop" /></el-form-item>
                <el-form-item label="里程(km)"><el-input-number v-model="routeForm.totalDistanceKm" :min="0" :step="0.1" /></el-form-item>
                <el-form-item label="预计耗时(分钟)"><el-input-number v-model="routeForm.estimatedDurationMin" :min="0" /></el-form-item>
              </div>
              <el-button type="primary" @click="handleCreateRoute">新增线路</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>新增站点</h3><p>维护站点顺序</p></div></div></template>
            <el-form label-position="top">
              <el-form-item label="所属线路"><el-select v-model="stopForm.routeId"><el-option v-for="route in routes" :key="route.id" :label="route.route_name" :value="route.id" /></el-select></el-form-item>
              <el-form-item label="站点名称"><el-input v-model="stopForm.stopName" /></el-form-item>
              <el-form-item label="站点序号"><el-input-number v-model="stopForm.stopOrder" :min="1" /></el-form-item>
              <el-button @click="handleCreateStop">添加站点</el-button>
            </el-form>
          </el-card>
        </div>

        <el-card shadow="never" class="panel-card compact-top">
          <template #header><div class="panel-head"><div><h3>线路列表</h3><p>展开查看各线路站点顺序</p></div></div></template>
          <el-collapse accordion>
            <el-collapse-item v-for="route in routes" :key="route.id" :title="route.route_name" :name="route.id">
              <div class="route-meta">
                <el-tag>{{ route.start_stop }} → {{ route.end_stop }}</el-tag>
                <el-tag type="success">{{ route.total_distance_km }} km</el-tag>
                <el-tag>{{ route.status }}</el-tag>
              </div>
              <div class="stop-list">
                <el-tag v-for="stop in route.stops" :key="stop.id" effect="plain">{{ stop.stop_order }}. {{ stop.stop_name }}</el-tag>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="车辆与通知">
        <div class="dashboard-grid">
          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>车辆信息</h3><p>维护运行中车辆状态</p></div></div></template>
            <el-form label-position="top">
              <div class="form-2col">
                <el-form-item label="车牌号"><el-input v-model="vehicleForm.plateNumber" /></el-form-item>
                <el-form-item label="司机姓名"><el-input v-model="vehicleForm.driverName" /></el-form-item>
                <el-form-item label="当前线路"><el-input v-model="vehicleForm.routeName" /></el-form-item>
                <el-form-item label="下一站"><el-input v-model="vehicleForm.nextStop" /></el-form-item>
                <el-form-item label="ETA(分钟)"><el-input-number v-model="vehicleForm.etaMinutes" :min="0" /></el-form-item>
                <el-form-item label="拥挤度"><el-select v-model="vehicleForm.occupancyLevel"><el-option label="低" value="低" /><el-option label="中" value="中" /><el-option label="高" value="高" /></el-select></el-form-item>
              </div>
              <el-button type="primary" @click="handleCreateVehicle">新增车辆</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>发布通知</h3><p>支持师生和管理员消息下发</p></div></div></template>
            <el-form label-position="top">
              <el-form-item label="通知标题"><el-input v-model="notificationForm.title" /></el-form-item>
              <el-form-item label="通知内容"><el-input v-model="notificationForm.content" type="textarea" :rows="3" /></el-form-item>
              <div class="form-2col">
                <el-form-item label="通知类型"><el-input v-model="notificationForm.type" /></el-form-item>
                <el-form-item label="目标角色"><el-select v-model="notificationForm.targetRole"><el-option label="全体用户" value="ALL" /><el-option label="师生" value="STUDENT" /><el-option label="管理员" value="ADMIN" /></el-select></el-form-item>
              </div>
              <el-button @click="handleCreateNotification">发布通知</el-button>
            </el-form>
          </el-card>
        </div>

        <div class="dashboard-grid compact-top">
          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>车辆列表</h3></div></div></template>
            <el-table :data="vehicles" stripe>
              <el-table-column prop="plate_number" label="车牌" width="120" />
              <el-table-column prop="driver_name" label="司机" width="110" />
              <el-table-column prop="route_name" label="线路" min-width="170" />
              <el-table-column prop="next_stop" label="下一站" min-width="110" />
              <el-table-column prop="eta_minutes" label="ETA" width="90" />
              <el-table-column prop="occupancy_level" label="拥挤度" width="100" />
            </el-table>
          </el-card>

          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>最近通知</h3></div></div></template>
            <el-table :data="notifications.slice(0, 6)" stripe>
              <el-table-column prop="title" label="标题" min-width="160" />
              <el-table-column prop="type" label="类型" width="100" />
              <el-table-column prop="target_role" label="目标" width="100" />
              <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="客流与道路数据">
        <div class="dashboard-grid">
          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>客流数据录入</h3><p>支持人工维护算法输入样本</p></div></div></template>
            <el-form label-position="top">
              <div class="form-2col">
                <el-form-item label="线路"><el-input v-model="flowForm.routeName" /></el-form-item>
                <el-form-item label="日期"><el-input v-model="flowForm.dateKey" placeholder="2026-04-09" /></el-form-item>
                <el-form-item label="时段"><el-input v-model="flowForm.timeSlot" placeholder="07:00-08:00" /></el-form-item>
                <el-form-item label="客流量"><el-input-number v-model="flowForm.passengerCount" :min="0" /></el-form-item>
                <el-form-item label="热点站点"><el-input v-model="flowForm.stationHotspot" /></el-form-item>
                <el-form-item label="模拟数据"><el-switch v-model="flowSimulated" /></el-form-item>
              </div>
              <el-button type="primary" @click="handleCreatePassengerFlow">新增客流记录</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>道路状态录入</h3><p>支持施工、限行和封闭状态</p></div></div></template>
            <el-form label-position="top">
              <div class="form-2col">
                <el-form-item label="道路名称"><el-input v-model="roadForm.roadName" /></el-form-item>
                <el-form-item label="影响线路"><el-input v-model="roadForm.affectedRoute" /></el-form-item>
                <el-form-item label="状态"><el-select v-model="roadForm.status"><el-option label="开放" value="OPEN" /><el-option label="受限" value="LIMITED" /><el-option label="封闭" value="CLOSED" /></el-select></el-form-item>
                <el-form-item label="影响等级"><el-select v-model="roadForm.impactLevel"><el-option label="低" value="LOW" /><el-option label="中" value="MEDIUM" /><el-option label="高" value="HIGH" /></el-select></el-form-item>
                <el-form-item label="延误分钟"><el-input-number v-model="roadForm.delayMinutes" :min="0" /></el-form-item>
                <el-form-item label="备注"><el-input v-model="roadForm.notes" /></el-form-item>
              </div>
              <el-button @click="handleCreateRoadCondition">新增道路状态</el-button>
            </el-form>
          </el-card>
        </div>

        <div class="dashboard-grid compact-top">
          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>客流样本</h3></div></div></template>
            <el-table :data="passengerFlows.slice(0, 12)" stripe>
              <el-table-column prop="route_name" label="线路" min-width="160" />
              <el-table-column prop="date_key" label="日期" width="120" />
              <el-table-column prop="time_slot" label="时段" width="120" />
              <el-table-column prop="passenger_count" label="客流量" width="100" />
              <el-table-column prop="station_hotspot" label="热点站点" min-width="120" />
            </el-table>
          </el-card>

          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>道路状态</h3></div></div></template>
            <el-table :data="roadConditions.slice(0, 12)" stripe>
              <el-table-column prop="road_name" label="道路" min-width="140" />
              <el-table-column prop="affected_route" label="影响线路" min-width="160" />
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column prop="impact_level" label="等级" width="100" />
              <el-table-column prop="delay_minutes" label="延误" width="90" />
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane v-if="isAdmin" label="用户与导入导出">
        <div class="dashboard-grid">
          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>系统用户</h3><p>维护管理员、调度员和师生账号</p></div></div></template>
            <el-form label-position="top">
              <div class="form-2col">
                <el-form-item label="用户名"><el-input v-model="userForm.username" /></el-form-item>
                <el-form-item label="角色"><el-select v-model="userForm.role"><el-option label="管理员" value="ADMIN" /><el-option label="调度员" value="DISPATCHER" /><el-option label="师生" value="STUDENT" /></el-select></el-form-item>
                <el-form-item label="手机号"><el-input v-model="userForm.phone" /></el-form-item>
                <el-form-item label="状态"><el-select v-model="userForm.status"><el-option label="启用" value="ACTIVE" /><el-option label="停用" value="INACTIVE" /></el-select></el-form-item>
              </div>
              <el-button type="primary" @click="handleCreateUser">新增用户</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>批量导入</h3><p>支持 CSV 文本导入模拟数据</p></div></div></template>
            <el-form label-position="top">
              <el-form-item label="导入类型"><el-select v-model="importForm.importType"><el-option label="客流数据" value="PASSENGER_FLOW" /><el-option label="道路状态" value="ROAD_CONDITION" /></el-select></el-form-item>
              <el-form-item label="来源名称"><el-input v-model="importForm.sourceName" /></el-form-item>
              <el-form-item label="CSV 内容"><el-input v-model="importForm.csvText" type="textarea" :rows="8" placeholder="route_name,date_key,time_slot,passenger_count,station_hotspot,is_simulated" /></el-form-item>
              <div class="toolbar-row">
                <el-button @click="handleImport">执行导入</el-button>
                <el-button type="success" @click="handleExport('passenger_flows')">导出客流数据</el-button>
                <el-button type="success" @click="handleExport('road_conditions')">导出道路数据</el-button>
              </div>
              <el-input v-model="exportPreview" type="textarea" :rows="6" readonly />
            </el-form>
          </el-card>
        </div>

        <div class="dashboard-grid compact-top">
          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>用户列表</h3></div></div></template>
            <el-table :data="users" stripe>
              <el-table-column prop="username" label="用户名" min-width="120" />
              <el-table-column prop="role" label="角色" width="120" />
              <el-table-column prop="phone" label="手机号" min-width="140" />
              <el-table-column prop="status" label="状态" width="100" />
            </el-table>
          </el-card>

          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>导入任务</h3></div></div></template>
            <el-table :data="importJobs" stripe>
              <el-table-column prop="import_type" label="类型" width="140" />
              <el-table-column prop="source_name" label="来源" min-width="160" />
              <el-table-column prop="total_rows" label="行数" width="90" />
              <el-table-column prop="status" label="状态" width="90" />
              <el-table-column label="时间" min-width="180">
                <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane v-if="isAdmin" label="系统参数与反馈">
        <div class="dashboard-grid">
          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>系统参数</h3><p>用于算法与通知策略调节</p></div></div></template>
            <el-form label-position="top" class="form-stack">
              <div class="form-2col">
                <el-form-item v-for="item in configs" :key="item.id" :label="item.config_label">
                  <el-input v-model="item.config_value" />
                </el-form-item>
              </div>
              <el-button type="primary" @click="handleSaveConfigs">保存配置</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never" class="panel-card">
            <template #header><div class="panel-head"><div><h3>用户反馈</h3><p>便于调度人员跟踪需求和问题</p></div></div></template>
            <el-table :data="feedbacks" stripe>
              <el-table-column prop="user_name" label="用户" width="110" />
              <el-table-column prop="route_name" label="线路" min-width="180" />
              <el-table-column prop="content" label="反馈内容" min-width="220" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="110" />
              <el-table-column label="时间" min-width="180">
                <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  createImportJob,
  createNotification,
  createPassengerFlow,
  createRoadCondition,
  createRoute,
  createRouteStop,
  createUser,
  createVehicle,
  fetchConfigs,
  fetchDatasetExport,
  fetchFeedback,
  fetchImportJobs,
  fetchNotifications,
  fetchPassengerFlows,
  fetchRoadConditions,
  fetchRoutes,
  fetchUsers,
  fetchVehicles,
  updateConfigs
} from '../api/dashboard';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const isAdmin = computed(() => auth.state.user?.role === 'ADMIN');

const routes = ref([]);
const vehicles = ref([]);
const notifications = ref([]);
const configs = ref([]);
const feedbacks = ref([]);
const roadConditions = ref([]);
const passengerFlows = ref([]);
const users = ref([]);
const importJobs = ref([]);
const exportPreview = ref('');

const routeForm = reactive({
  routeName: '',
  startStop: '',
  endStop: '',
  totalDistanceKm: 0,
  estimatedDurationMin: 0,
  status: 'ACTIVE'
});

const stopForm = reactive({
  routeId: null,
  stopName: '',
  stopOrder: 1
});

const vehicleForm = reactive({
  plateNumber: '',
  driverName: '',
  routeName: '',
  nextStop: '',
  etaMinutes: 0,
  occupancyLevel: '中'
});

const notificationForm = reactive({
  title: '',
  content: '',
  type: '调整',
  targetRole: 'ALL',
  isRead: 0
});

const flowForm = reactive({
  routeName: '',
  dateKey: '2026-04-09',
  timeSlot: '',
  passengerCount: 0,
  stationHotspot: ''
});
const flowSimulated = ref(true);

const roadForm = reactive({
  roadName: '',
  affectedRoute: '',
  status: 'OPEN',
  impactLevel: 'LOW',
  delayMinutes: 0,
  notes: ''
});

const userForm = reactive({
  username: '',
  role: 'DISPATCHER',
  phone: '',
  status: 'ACTIVE'
});

const importForm = reactive({
  importType: 'PASSENGER_FLOW',
  sourceName: 'manual-csv',
  csvText: ''
});

function formatTime(value) {
  return new Date(value).toLocaleString('zh-CN');
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map((row) => headers.map((key) => row[key]).join(','))].join('\n');
}

async function loadData() {
  routes.value = await fetchRoutes();
  vehicles.value = await fetchVehicles();
  notifications.value = await fetchNotifications();
  roadConditions.value = await fetchRoadConditions();
  passengerFlows.value = await fetchPassengerFlows();
  importJobs.value = await fetchImportJobs();
  if (isAdmin.value) {
    configs.value = await fetchConfigs();
    feedbacks.value = await fetchFeedback();
    users.value = await fetchUsers();
  } else {
    configs.value = [];
    feedbacks.value = [];
    users.value = [];
  }
}

async function handleCreateRoute() {
  await createRoute({ ...routeForm });
  Object.assign(routeForm, {
    routeName: '',
    startStop: '',
    endStop: '',
    totalDistanceKm: 0,
    estimatedDurationMin: 0,
    status: 'ACTIVE'
  });
  await loadData();
  ElMessage.success('线路已新增');
}

async function handleCreateStop() {
  await createRouteStop({ ...stopForm });
  Object.assign(stopForm, { routeId: null, stopName: '', stopOrder: 1 });
  await loadData();
  ElMessage.success('站点已添加');
}

async function handleCreateVehicle() {
  await createVehicle({ ...vehicleForm });
  Object.assign(vehicleForm, {
    plateNumber: '',
    driverName: '',
    routeName: '',
    nextStop: '',
    etaMinutes: 0,
    occupancyLevel: '中'
  });
  await loadData();
  ElMessage.success('车辆信息已新增');
}

async function handleCreateNotification() {
  await createNotification({ ...notificationForm });
  Object.assign(notificationForm, {
    title: '',
    content: '',
    type: '调整',
    targetRole: 'ALL',
    isRead: 0
  });
  await loadData();
  ElMessage.success('通知已发布');
}

async function handleCreatePassengerFlow() {
  await createPassengerFlow({
    ...flowForm,
    isSimulated: flowSimulated.value ? 1 : 0
  });
  Object.assign(flowForm, {
    routeName: '',
    dateKey: '2026-04-09',
    timeSlot: '',
    passengerCount: 0,
    stationHotspot: ''
  });
  flowSimulated.value = true;
  await loadData();
  ElMessage.success('客流记录已新增');
}

async function handleCreateRoadCondition() {
  await createRoadCondition({ ...roadForm });
  Object.assign(roadForm, {
    roadName: '',
    affectedRoute: '',
    status: 'OPEN',
    impactLevel: 'LOW',
    delayMinutes: 0,
    notes: ''
  });
  await loadData();
  ElMessage.success('道路状态已新增');
}

async function handleCreateUser() {
  await createUser({ ...userForm });
  Object.assign(userForm, {
    username: '',
    role: 'DISPATCHER',
    phone: '',
    status: 'ACTIVE'
  });
  await loadData();
  ElMessage.success('用户已新增');
}

async function handleImport() {
  await createImportJob({ ...importForm });
  await loadData();
  ElMessage.success('导入任务已完成');
}

async function handleExport(dataset) {
  const rows = await fetchDatasetExport(dataset);
  exportPreview.value = toCsv(rows);
  ElMessage.success('导出数据已生成到预览框');
}

async function handleSaveConfigs() {
  configs.value = await updateConfigs(
    configs.value.map((item) => ({
      configKey: item.config_key,
      configValue: item.config_value
    }))
  );
  ElMessage.success('系统参数已保存');
}

onMounted(loadData);
</script>
