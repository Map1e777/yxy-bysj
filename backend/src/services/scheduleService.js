import { query } from '../config/db.js';

// ─── 算法超参数 ────────────────────────────────────────────────────────────────
const VEHICLE_CAPACITY = 45;
const GA_POPULATION_SIZE = 20;
const GA_GENERATIONS = 30;
const GA_MUTATION_RATE = 0.15;
const PSO_PARTICLES = 5;
const PSO_ITERATIONS = 10;
const PSO_INERTIA = 0.6;
const PSO_C1 = 1.4;
const PSO_C2 = 1.4;

let latestOptimizationReport = null;

// ─── 工具函数 ──────────────────────────────────────────────────────────────────
function toMinutes(timeValue) {
  const [hours, minutes] = String(timeValue).split(':').map(Number);
  return hours * 60 + minutes;
}

function toTimeString(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}:00`;
}

export { toMinutes, toTimeString };

function slotToDeparture(timeSlot) {
  const [start] = String(timeSlot).split('-');
  const [hours, minutes] = start.split(':').map(Number);
  return hours * 60 + minutes + 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function average(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, v) => sum + v, 0) / numbers.length;
}

function pickStatus(occupancy, waitMinutes) {
  return occupancy >= 82 || waitMinutes <= 5 ? 'PUBLISHED' : 'DRAFT';
}

function parseConfigValue(rows, key, fallback) {
  const item = rows.find((row) => row.config_key === key);
  return Number(item?.config_value ?? fallback);
}

function buildWeightConfig(configRows) {
  return {
    matchWeight:    parseConfigValue(configRows, 'genetic_match_weight', 0.4),
    emptyRunWeight: parseConfigValue(configRows, 'empty_run_weight', 0.3),
    waitWeight:     parseConfigValue(configRows, 'wait_time_weight', 0.2),
    dispatchWeight: parseConfigValue(configRows, 'dispatch_cost_weight', 0.1)
  };
}

async function logScheduleAction(scheduleId, routeName, actionType, actionDetail, operatorName = 'system') {
  await query(
    `INSERT INTO schedule_operation_logs
    (schedule_id, route_name, action_type, operator_name, action_detail)
    VALUES (?, ?, ?, ?, ?)`,
    [scheduleId, routeName, actionType, operatorName, actionDetail]
  );
}

// ─── 数据加载 ──────────────────────────────────────────────────────────────────
async function loadOptimizationContext() {
  const [routes, vehicles, roadConditions, passengerFlows, configRows] = await Promise.all([
    query(`SELECT id, route_name, estimated_duration_min FROM routes WHERE status = 'ACTIVE' ORDER BY id ASC`),
    query(`SELECT plate_number, route_name FROM vehicles ORDER BY id ASC`),
    query(`SELECT affected_route, status, impact_level, delay_minutes, notes FROM road_conditions ORDER BY id ASC`),
    query(`SELECT route_name, time_slot, passenger_count, date_key, station_hotspot FROM passenger_flows ORDER BY route_name ASC, passenger_count DESC`),
    query(`SELECT config_key, config_value FROM system_configs WHERE config_key IN ('genetic_match_weight','empty_run_weight','wait_time_weight','dispatch_cost_weight')`)
  ]);

  const routeVehicleMap = new Map();
  vehicles.forEach((v) => {
    const list = routeVehicleMap.get(v.route_name) || [];
    list.push(v.plate_number);
    routeVehicleMap.set(v.route_name, list);
  });

  const routeFlowMap = new Map();
  passengerFlows.forEach((f) => {
    const list = routeFlowMap.get(f.route_name) || [];
    list.push(f);
    routeFlowMap.set(f.route_name, list);
  });

  return { routes, vehicles, roadConditions, passengerFlows, routeVehicleMap, routeFlowMap, weightConfig: buildWeightConfig(configRows) };
}

// ─── 适应度评分（与 system_configs 权重对应）─────────────────────────────────
function scorePlan(schedules, routeBreakdown, weightConfig) {
  if (!schedules.length) return { overallScore: 0, demandMatchScore: 0, emptyRunScore: 0, waitTimeScore: 0, dispatchCostScore: 0, avgOccupancy: 0, avgWaitMinutes: 0, estimatedEmptyRunRate: 0, totalServices: 0 };

  const occupancyValues = schedules.map((s) => s.expectedOccupancy);
  const waitValues      = schedules.map((s) => s.metrics.waitMinutes);
  const demandGapValues = routeBreakdown.map((r) => r.demandGap);
  const totalServices   = schedules.length;
  const avgOccupancy    = average(occupancyValues);
  const avgWait         = average(waitValues);
  const totalDemandGap  = demandGapValues.reduce((s, v) => s + v, 0);

  const demandMatchScore  = clamp(100 - totalDemandGap / Math.max(totalServices, 1), 45, 98);
  const emptyRunRate      = clamp(100 - avgOccupancy, 5, 70);
  const emptyRunScore     = clamp(100 - emptyRunRate, 30, 95);
  const waitTimeScore     = clamp(100 - avgWait * 6, 20, 94);
  const dispatchCostScore = clamp(100 - totalServices * 4, 20, 90);
  const overallScore = Number((
    demandMatchScore  * weightConfig.matchWeight +
    emptyRunScore     * weightConfig.emptyRunWeight +
    waitTimeScore     * weightConfig.waitWeight +
    dispatchCostScore * weightConfig.dispatchWeight
  ).toFixed(1));

  return {
    demandMatchScore:  Number(demandMatchScore.toFixed(1)),
    emptyRunScore:     Number(emptyRunScore.toFixed(1)),
    waitTimeScore:     Number(waitTimeScore.toFixed(1)),
    dispatchCostScore: Number(dispatchCostScore.toFixed(1)),
    overallScore,
    avgOccupancy:           Number(avgOccupancy.toFixed(1)),
    avgWaitMinutes:         Number(avgWait.toFixed(1)),
    estimatedEmptyRunRate:  Number(emptyRunRate.toFixed(1)),
    totalServices
  };
}

// ─── GA+PSO：染色体编码 ────────────────────────────────────────────────────────
// 染色体 = 整数数组，每个基因对应一个 (路线, 时段) 对的服务班次数 [1,4]
// 编码方式：班次ID=路线×时段×发车时间，站点序列=路线站点，发车时间=时段+间隔，配车=专属车/回退全局车

function buildGeneMap(context) {
  const entries = [];
  for (const route of context.routes) {
    const flows = context.routeFlowMap.get(route.route_name) || [];
    const slots = flows.length > 0
      ? flows.slice(0, 3)
      : [{ time_slot: '09:00-10:00', passenger_count: 60, station_hotspot: route.route_name }];
    for (const flow of slots) {
      entries.push({ route, flow });
    }
  }
  return entries;
}

function buildPlanFromChromosome(chromosome, context, geneMap) {
  const fallbackVehicles = context.vehicles.map((v) => v.plate_number);
  const schedules = [];
  const routeBreakdown = [];
  let fallbackVehicleIndex = 0;

  const routeEntries = new Map();
  context.routes.forEach((r) => routeEntries.set(r.route_name, []));
  geneMap.forEach((entry, i) => {
    const numServices = clamp(Math.round(chromosome[i]), 1, 4);
    routeEntries.get(entry.route.route_name).push({ ...entry, numServices });
  });

  for (const route of context.routes) {
    const entries = routeEntries.get(route.route_name) || [];
    const road = context.roadConditions.find((r) => r.affected_route === route.route_name);
    const delayMinutes = road?.status === 'CLOSED' ? 18 : Number(road?.delay_minutes || 0);
    const dedicatedVehicles = context.routeVehicleMap.get(route.route_name) || [];
    const routeSchedules = [];
    const waitSamples = [];
    const occupancySamples = [];
    let routeDemandGap = 0;

    for (const entry of entries) {
      const serviceCount = entry.numServices;
      const flowDemand   = Number(entry.flow.passenger_count || 0);
      const spacingMinutes = clamp(
        Math.round(Number(route.estimated_duration_min || 12) / serviceCount) + (road?.delay_minutes ? 3 : 0),
        6, 18
      );

      for (let si = 0; si < serviceCount; si++) {
        const departureMinutes  = slotToDeparture(entry.flow.time_slot) + si * spacingMinutes;
        const arrivalMinutes    = departureMinutes + Number(route.estimated_duration_min || 12) + delayMinutes;
        const assignedLoad      = Math.round(flowDemand / serviceCount);
        const expectedOccupancy = clamp(Math.round((assignedLoad / VEHICLE_CAPACITY) * 100), 28, 98);
        const waitMinutes       = clamp(Math.round(spacingMinutes / 2 + delayMinutes / 3), 3, 15);
        const busCode = dedicatedVehicles[si]
          || fallbackVehicles[fallbackVehicleIndex++ % Math.max(fallbackVehicles.length, 1)]
          || `AUTO-${si + 1}`;

        routeSchedules.push({
          routeName: route.route_name,
          departureTime: toTimeString(departureMinutes),
          arrivalTime:   toTimeString(arrivalMinutes),
          busCode,
          status: pickStatus(expectedOccupancy, waitMinutes),
          expectedOccupancy,
          notes: `智能生成:GA+PSO|${entry.flow.time_slot}|客流${flowDemand}|热点${entry.flow.station_hotspot || '-'}${road ? `|道路${road.status}` : ''}`,
          metrics: { flowDemand, assignedLoad, waitMinutes, delayMinutes, serviceCount, routeDuration: Number(route.estimated_duration_min || 12) + delayMinutes }
        });
        waitSamples.push(waitMinutes);
        occupancySamples.push(expectedOccupancy);
      }
      routeDemandGap += Math.abs(flowDemand - serviceCount * VEHICLE_CAPACITY);
    }

    schedules.push(...routeSchedules);
    routeBreakdown.push({
      routeName:       route.route_name,
      serviceCount:    routeSchedules.length,
      avgOccupancy:    Math.round(average(occupancySamples)),
      avgWaitMinutes:  Number(average(waitSamples).toFixed(1)),
      demandGap:       routeDemandGap,
      roadStatus:      road?.status || 'OPEN'
    });
  }

  return { schedules, routeBreakdown };
}

// ─── GA 核心操作 ───────────────────────────────────────────────────────────────
function evaluateChromosome(chromosome, context, geneMap) {
  const plan = buildPlanFromChromosome(chromosome, context, geneMap);
  return scorePlan(plan.schedules, plan.routeBreakdown, context.weightConfig).overallScore;
}

function seedChromosome(context, geneMap, demandBias, reserveBias) {
  return geneMap.map(({ flow }) => {
    const flowDemand = Number(flow.passenger_count || 0);
    const raw = Math.ceil(flowDemand / (VEHICLE_CAPACITY * demandBias)) + reserveBias;
    return clamp(raw, 1, 4);
  });
}

function randomChromosome(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 4) + 1);
}

function tournamentSelect(population, fitnesses) {
  const a = Math.floor(Math.random() * population.length);
  const b = Math.floor(Math.random() * population.length);
  return fitnesses[a] >= fitnesses[b] ? population[a] : population[b];
}

function singlePointCrossover(p1, p2) {
  const point = 1 + Math.floor(Math.random() * (p1.length - 1));
  return [
    [...p1.slice(0, point), ...p2.slice(point)],
    [...p2.slice(0, point), ...p1.slice(point)]
  ];
}

function mutateChromosome(chromosome) {
  return chromosome.map((gene) =>
    Math.random() < GA_MUTATION_RATE
      ? clamp(gene + (Math.random() < 0.5 ? 1 : -1), 1, 4)
      : gene
  );
}

function runGA(context, geneMap) {
  const numGenes = geneMap.length;
  if (numGenes === 0) return { bestChromosome: [], fitnesses: [] };

  // 初始种群：3 个固定偏置种子 + 随机个体
  const population = [
    seedChromosome(context, geneMap, 1.0, 1),   // 平衡方案
    seedChromosome(context, geneMap, 1.2, 2),   // 高峰优先
    seedChromosome(context, geneMap, 0.85, 0),  // 效率优先
    ...Array.from({ length: GA_POPULATION_SIZE - 3 }, () => randomChromosome(numGenes))
  ];

  let fitnesses = population.map((c) => evaluateChromosome(c, context, geneMap));

  for (let gen = 0; gen < GA_GENERATIONS; gen++) {
    const bestIdx = fitnesses.indexOf(Math.max(...fitnesses));
    const nextPop = [[...population[bestIdx]]]; // 精英保留

    while (nextPop.length < GA_POPULATION_SIZE) {
      const p1 = tournamentSelect(population, fitnesses);
      const p2 = tournamentSelect(population, fitnesses);
      const [c1, c2] = singlePointCrossover(p1, p2);
      nextPop.push(mutateChromosome(c1));
      if (nextPop.length < GA_POPULATION_SIZE) nextPop.push(mutateChromosome(c2));
    }

    population.splice(0, population.length, ...nextPop.slice(0, GA_POPULATION_SIZE));
    fitnesses = population.map((c) => evaluateChromosome(c, context, geneMap));
  }

  const bestIdx = fitnesses.indexOf(Math.max(...fitnesses));
  return { bestChromosome: population[bestIdx], fitnesses };
}

// ─── PSO 局部精化 ──────────────────────────────────────────────────────────────
function roundChromosome(floatArr) {
  return floatArr.map((v) => clamp(Math.round(v), 1, 4));
}

function runPSO(gaChromosome, context, geneMap) {
  const numGenes = gaChromosome.length;
  if (numGenes === 0) return gaChromosome;

  // 以 GA 最优解为中心初始化粒子群
  const particles  = Array.from({ length: PSO_PARTICLES }, () =>
    gaChromosome.map((g) => clamp(g + (Math.random() - 0.5) * 1.0, 1, 4))
  );
  const velocities = Array.from({ length: PSO_PARTICLES }, () =>
    Array.from({ length: numGenes }, () => (Math.random() - 0.5) * 0.5)
  );
  const pBest = particles.map((p) => [...p]);
  const pBestFitness = pBest.map((p) => evaluateChromosome(roundChromosome(p), context, geneMap));

  let gBestIdx = pBestFitness.indexOf(Math.max(...pBestFitness));
  let gBest = [...pBest[gBestIdx]];
  let gBestFitness = pBestFitness[gBestIdx];

  for (let iter = 0; iter < PSO_ITERATIONS; iter++) {
    for (let i = 0; i < PSO_PARTICLES; i++) {
      for (let j = 0; j < numGenes; j++) {
        velocities[i][j] = clamp(
          PSO_INERTIA * velocities[i][j]
            + PSO_C1 * Math.random() * (pBest[i][j] - particles[i][j])
            + PSO_C2 * Math.random() * (gBest[j]    - particles[i][j]),
          -1.5, 1.5
        );
        particles[i][j] = clamp(particles[i][j] + velocities[i][j], 1, 4);
      }
      const fitness = evaluateChromosome(roundChromosome(particles[i]), context, geneMap);
      if (fitness > pBestFitness[i]) {
        pBest[i] = [...particles[i]];
        pBestFitness[i] = fitness;
        if (fitness > gBestFitness) {
          gBest = [...particles[i]];
          gBestFitness = fitness;
        }
      }
    }
  }

  return roundChromosome(gBest);
}

// ─── 优化报告 ──────────────────────────────────────────────────────────────────
function buildGAPSOReport(psoChromosome, gaChromosome, context, geneMap) {
  const psoPlan    = buildPlanFromChromosome(psoChromosome, context, geneMap);
  const psoMetrics = scorePlan(psoPlan.schedules, psoPlan.routeBreakdown, context.weightConfig);
  const gaPlan     = buildPlanFromChromosome(gaChromosome, context, geneMap);
  const gaMetrics  = scorePlan(gaPlan.schedules, gaPlan.routeBreakdown, context.weightConfig);

  const w = context.weightConfig;
  return {
    generatedAt: new Date().toISOString(),
    algorithm: 'GA+PSO混合优化',
    algorithmDetail: `遗传算法（种群${GA_POPULATION_SIZE}，迭代${GA_GENERATIONS}代，变异率${GA_MUTATION_RATE * 100}%）+ 粒子群优化（${PSO_PARTICLES}粒子，${PSO_ITERATIONS}迭代，惯性权重${PSO_INERTIA}）`,
    selectedPlan: {
      key: 'pso_refined',
      label: 'GA+PSO 混合最优解',
      description: '遗传算法全局搜索最优染色体，粒子群优化在邻域内局部精化'
    },
    weights: w,
    constraints: [
      `遗传算法：种群大小 ${GA_POPULATION_SIZE}，迭代 ${GA_GENERATIONS} 代，精英保留 + 锦标赛选择`,
      `染色体编码：每个(线路×时段)基因取值[1,4]对应班次服务数；单点交叉，变异率 ${GA_MUTATION_RATE * 100}%`,
      '初始种群：平衡方案/高峰优先/效率优先三组偏置种子 + 随机个体',
      `粒子群优化：${PSO_PARTICLES} 粒子在 GA 最优解邻域精化 ${PSO_ITERATIONS} 迭代，惯性系数 ${PSO_INERTIA}，c1/c2=${PSO_C1}`,
      `适应度权重：客流匹配 ${(w.matchWeight * 100).toFixed(0)}%，空驶率 ${(w.emptyRunWeight * 100).toFixed(0)}%，等待时间 ${(w.waitWeight * 100).toFixed(0)}%，调度成本 ${(w.dispatchWeight * 100).toFixed(0)}%`
    ],
    selectedMetrics: psoMetrics,
    routeBreakdown: psoPlan.routeBreakdown,
    candidatePlans: [
      { key: 'ga_best',     label: 'GA 最优解',    description: `遗传算法迭代 ${GA_GENERATIONS} 代选出的全局最优染色体`,   metrics: gaMetrics },
      { key: 'pso_refined', label: 'PSO 精化解',   description: `在 GA 最优解基础上经粒子群局部搜索精化（最终采用方案）`, metrics: psoMetrics }
    ]
  };
}

// ─── 写入数据库 ────────────────────────────────────────────────────────────────
async function persistGeneratedSchedules(plan) {
  await query(`DELETE FROM schedules WHERE notes LIKE '智能生成:%'`);
  for (const item of plan.schedules) {
    const result = await query(
      `INSERT INTO schedules (route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.routeName, item.departureTime, item.arrivalTime, item.busCode, item.status, item.expectedOccupancy, item.notes]
    );
    await logScheduleAction(
      result.insertId,
      item.routeName,
      'GENERATE',
      `${item.notes}|综合得分${latestOptimizationReport?.selectedMetrics?.overallScore || '-'}`,
      'system'
    );
  }
}

// ─── 版本管理 ──────────────────────────────────────────────────────────────────
export async function saveScheduleVersion(label, triggeredBy = 'MANUAL', operatorName = 'system') {
  const current = await listSchedules();
  const result = await query(
    `INSERT INTO schedule_versions (version_label, triggered_by, operator_name, schedule_snapshot, schedule_count)
    VALUES (?, ?, ?, ?, ?)`,
    [label, triggeredBy, operatorName, JSON.stringify(current), current.length]
  );
  return { id: result.insertId, versionLabel: label, triggeredBy, operatorName, scheduleCount: current.length };
}

export async function listScheduleVersions() {
  return query(
    `SELECT id, version_label, triggered_by, operator_name, schedule_count, created_at
    FROM schedule_versions
    ORDER BY created_at DESC
    LIMIT 20`
  );
}

export async function rollbackToScheduleVersion(versionId, operatorName = 'system') {
  const [version] = await query(`SELECT * FROM schedule_versions WHERE id = ?`, [versionId]);
  if (!version) throw new Error('Version not found');

  const snapshot = JSON.parse(version.schedule_snapshot || '[]');
  await query(`DELETE FROM schedules`);
  for (const item of snapshot) {
    await query(
      `INSERT INTO schedules (id, route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.route_name, item.departure_time, item.arrival_time, item.bus_code, item.status, item.expected_occupancy, item.notes, item.created_at]
    );
  }

  await logScheduleAction(null, '全部线路', 'ROLLBACK', `回滚至版本 "${version.version_label}"（${snapshot.length} 条班次）`, operatorName);
  return { message: `已回滚至版本 "${version.version_label}"`, scheduleCount: snapshot.length };
}

// ─── 班次 CRUD ─────────────────────────────────────────────────────────────────
export async function listSchedules() {
  return query(`SELECT id, route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes, created_at FROM schedules ORDER BY departure_time ASC`);
}

export async function createSchedule(payload) {
  const { routeName, departureTime, arrivalTime, busCode, status = 'DRAFT', expectedOccupancy = 0, notes = '', operatorName = 'system' } = payload;
  const result = await query(
    `INSERT INTO schedules (route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [routeName, departureTime, arrivalTime, busCode, status, expectedOccupancy, notes]
  );
  await logScheduleAction(result.insertId, routeName, 'CREATE', `创建班次，状态为 ${status}`, operatorName);
  return { id: result.insertId, ...payload };
}

export async function updateSchedule(scheduleId, payload) {
  const [current] = await query(`SELECT * FROM schedules WHERE id = ?`, [scheduleId]);
  if (!current) throw new Error('Schedule not found');

  const next = {
    routeName:        payload.routeName        ?? current.route_name,
    departureTime:    payload.departureTime    ?? current.departure_time,
    arrivalTime:      payload.arrivalTime      ?? current.arrival_time,
    busCode:          payload.busCode          ?? current.bus_code,
    status:           payload.status           ?? current.status,
    expectedOccupancy: payload.expectedOccupancy ?? current.expected_occupancy,
    notes:            payload.notes            ?? current.notes
  };

  await query(
    `UPDATE schedules SET route_name=?, departure_time=?, arrival_time=?, bus_code=?, status=?, expected_occupancy=?, notes=? WHERE id=?`,
    [next.routeName, next.departureTime, next.arrivalTime, next.busCode, next.status, next.expectedOccupancy, next.notes, scheduleId]
  );
  await logScheduleAction(scheduleId, next.routeName, 'UPDATE', `更新班次为 ${next.departureTime}-${next.arrivalTime}`, payload.operatorName || 'system');
  return { id: scheduleId, ...next };
}

export async function batchUpdateScheduleStatus(payload) {
  const { ids = [], status, operatorName = 'system' } = payload;
  if (!ids.length) throw new Error('No schedules selected');

  const placeholders = ids.map(() => '?').join(', ');
  await query(`UPDATE schedules SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);

  const updated = await query(`SELECT id, route_name FROM schedules WHERE id IN (${placeholders})`, ids);
  for (const item of updated) {
    await logScheduleAction(item.id, item.route_name, 'STATUS_UPDATE', `批量调整状态为 ${status}`, operatorName);
  }

  // 发布时自动存档版本
  if (status === 'PUBLISHED') {
    const label = `批量发布-${new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16)}`;
    await saveScheduleVersion(label, 'PUBLISH', operatorName);
  }

  return listSchedules();
}

export async function listScheduleLogs() {
  return query(
    `SELECT id, schedule_id, route_name, action_type, operator_name, action_detail, created_at
    FROM schedule_operation_logs
    ORDER BY created_at DESC
    LIMIT 50`
  );
}

export async function getLatestScheduleOptimizationReport() {
  if (latestOptimizationReport) return latestOptimizationReport;
  return {
    generatedAt: null,
    algorithm: 'GA+PSO混合优化',
    selectedPlan: null,
    constraints: ['尚未执行智能排班，点击"智能生成今日排班"产出优化报告'],
    selectedMetrics: null,
    routeBreakdown: [],
    candidatePlans: []
  };
}

export async function refreshRouteMetrics() {
  const metrics = await query(
    `SELECT route_name,
      MAX(passenger_count) AS peakPassengerFlow,
      ROUND(GREATEST(3, AVG(LEAST(12, passenger_count / 40))), 1) AS avgWaitMinutes
    FROM passenger_flows
    GROUP BY route_name`
  );
  await query(`DELETE FROM route_metrics`);
  for (const item of metrics) {
    await query(
      `INSERT INTO route_metrics (route_name, peak_passenger_flow, avg_wait_minutes) VALUES (?, ?, ?)`,
      [item.route_name, item.peakPassengerFlow, item.avgWaitMinutes]
    );
  }
}

// ─── 主入口：GA+PSO 混合排班生成 ───────────────────────────────────────────────
export async function generateSuggestedSchedules() {
  const context = await loadOptimizationContext();
  const geneMap = buildGeneMap(context);

  // Step 1：遗传算法全局搜索
  const { bestChromosome: gaChromosome } = runGA(context, geneMap);

  // Step 2：粒子群优化局部精化
  const psoChromosome = geneMap.length > 0 ? runPSO(gaChromosome, context, geneMap) : gaChromosome;

  // Step 3：构建最终排班方案
  const finalPlan = buildPlanFromChromosome(psoChromosome, context, geneMap);

  // Step 4：生成优化报告
  latestOptimizationReport = buildGAPSOReport(psoChromosome, gaChromosome, context, geneMap);

  // Step 5：持久化并刷新指标
  await persistGeneratedSchedules(finalPlan);
  await refreshRouteMetrics();

  // Step 6：自动存档版本
  const label = `GA+PSO生成-${new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16)}`;
  await saveScheduleVersion(label, 'GENERATE', 'system');

  return { schedules: await listSchedules(), report: latestOptimizationReport };
}
