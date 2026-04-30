import { query } from '../config/db.js';

const VEHICLE_CAPACITY = 45;
let latestOptimizationReport = null;

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
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function pickStatus(occupancy, waitMinutes) {
  if (occupancy >= 82 || waitMinutes <= 5) return 'PUBLISHED';
  return 'DRAFT';
}

function parseConfigValue(rows, key, fallback) {
  const item = rows.find((row) => row.config_key === key);
  return Number(item?.config_value ?? fallback);
}

function buildWeightConfig(configRows) {
  return {
    matchWeight: parseConfigValue(configRows, 'genetic_match_weight', 0.4),
    emptyRunWeight: parseConfigValue(configRows, 'empty_run_weight', 0.3),
    waitWeight: parseConfigValue(configRows, 'wait_time_weight', 0.2),
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

async function loadOptimizationContext() {
  const [routes, vehicles, roadConditions, passengerFlows, configRows] = await Promise.all([
    query(
      `SELECT id, route_name, estimated_duration_min
      FROM routes
      WHERE status = 'ACTIVE'
      ORDER BY id ASC`
    ),
    query(
      `SELECT plate_number, route_name
      FROM vehicles
      ORDER BY id ASC`
    ),
    query(
      `SELECT affected_route, status, impact_level, delay_minutes, notes
      FROM road_conditions
      ORDER BY id ASC`
    ),
    query(
      `SELECT route_name, time_slot, passenger_count, date_key, station_hotspot
      FROM passenger_flows
      ORDER BY route_name ASC, passenger_count DESC`
    ),
    query(
      `SELECT config_key, config_value
      FROM system_configs
      WHERE config_key IN ('genetic_match_weight', 'empty_run_weight', 'wait_time_weight', 'dispatch_cost_weight')`
    )
  ]);

  const routeVehicleMap = new Map();
  vehicles.forEach((item) => {
    const current = routeVehicleMap.get(item.route_name) || [];
    current.push(item.plate_number);
    routeVehicleMap.set(item.route_name, current);
  });

  const routeFlowMap = new Map();
  passengerFlows.forEach((item) => {
    const current = routeFlowMap.get(item.route_name) || [];
    current.push(item);
    routeFlowMap.set(item.route_name, current);
  });

  return {
    routes,
    vehicles,
    roadConditions,
    passengerFlows,
    routeVehicleMap,
    routeFlowMap,
    weightConfig: buildWeightConfig(configRows)
  };
}

function createPlanVariants(context) {
  return [
    {
      key: 'balanced',
      label: '平衡优化方案',
      demandBias: 1,
      spacingBias: 0,
      reserveBias: 1,
      description: '兼顾客流匹配、等待时间与空驶率的综合方案'
    },
    {
      key: 'peak_first',
      label: '高峰优先方案',
      demandBias: 1.2,
      spacingBias: -4,
      reserveBias: 2,
      description: '增加高峰运力投放，优先控制拥挤与等待'
    },
    {
      key: 'efficiency_first',
      label: '效率优先方案',
      demandBias: 0.85,
      spacingBias: 6,
      reserveBias: 0,
      description: '减少冗余发车，优先控制空驶率和调度成本'
    }
  ].map((variant) => buildVariantPlan(context, variant));
}

function buildVariantPlan(context, variant) {
  const fallbackVehicles = context.vehicles.map((item) => item.plate_number);
  const schedules = [];
  const routeBreakdown = [];
  let fallbackVehicleIndex = 0;

  for (const route of context.routes) {
    const routeFlows = (context.routeFlowMap.get(route.route_name) || []).slice(0, 3);
    const selectedFlows = routeFlows.length
      ? routeFlows
      : [{ time_slot: '09:00-10:00', passenger_count: 60, station_hotspot: route.route_name }];
    const road = context.roadConditions.find((item) => item.affected_route === route.route_name);
    const delayMinutes = road?.status === 'CLOSED'
      ? 18
      : Number(road?.delay_minutes || 0);
    const dedicatedVehicles = context.routeVehicleMap.get(route.route_name) || [];
    const routeSchedules = [];
    const waitSamples = [];
    const occupancySamples = [];
    let routeDispatchCost = 0;
    let routeDemandGap = 0;

    selectedFlows.forEach((flow, index) => {
      const flowDemand = Number(flow.passenger_count || 0);
      const demandFactor = variant.demandBias + (flowDemand >= 180 ? 0.15 : 0);
      const serviceCount = clamp(
        Math.ceil(flowDemand / (VEHICLE_CAPACITY * demandFactor)) + variant.reserveBias - (road?.status === 'CLOSED' ? 1 : 0),
        1,
        Math.max(1, dedicatedVehicles.length || 2)
      );
      const spacingMinutes = clamp(
        Math.round(Number(route.estimated_duration_min || 12) / serviceCount) + variant.spacingBias + (road?.delay_minutes ? 3 : 0),
        6,
        18
      );

      for (let serviceIndex = 0; serviceIndex < serviceCount; serviceIndex += 1) {
        const departureMinutes = slotToDeparture(flow.time_slot) + serviceIndex * spacingMinutes;
        const arrivalMinutes = departureMinutes + Number(route.estimated_duration_min || 12) + delayMinutes;
        const assignedLoad = Math.round(flowDemand / serviceCount);
        const expectedOccupancy = clamp(Math.round((assignedLoad / VEHICLE_CAPACITY) * 100), 28, 98);
        const waitMinutes = clamp(Math.round(spacingMinutes / 2 + delayMinutes / 3), 3, 15);
        const busCode = dedicatedVehicles[serviceIndex]
          || fallbackVehicles[fallbackVehicleIndex++ % Math.max(fallbackVehicles.length, 1)]
          || `AUTO-${index + 1}-${serviceIndex + 1}`;

        routeSchedules.push({
          routeName: route.route_name,
          departureTime: toTimeString(departureMinutes),
          arrivalTime: toTimeString(arrivalMinutes),
          busCode,
          status: pickStatus(expectedOccupancy, waitMinutes),
          expectedOccupancy,
          notes: `智能生成:${variant.label}|${flow.time_slot}|客流${flowDemand}|热点${flow.station_hotspot || '-'}${road ? `|道路${road.status}` : ''}`,
          metrics: {
            flowDemand,
            assignedLoad,
            waitMinutes,
            delayMinutes,
            serviceCount,
            routeDuration: Number(route.estimated_duration_min || 12) + delayMinutes
          }
        });
        waitSamples.push(waitMinutes);
        occupancySamples.push(expectedOccupancy);
      }

      routeDispatchCost += serviceCount;
      routeDemandGap += Math.abs(flowDemand - serviceCount * VEHICLE_CAPACITY);
    });

    schedules.push(...routeSchedules);
    routeBreakdown.push({
      routeName: route.route_name,
      serviceCount: routeSchedules.length,
      avgOccupancy: Math.round(average(occupancySamples)),
      avgWaitMinutes: Number(average(waitSamples).toFixed(1)),
      demandGap: routeDemandGap,
      roadStatus: road?.status || 'OPEN'
    });
  }

  const metrics = scorePlan(schedules, routeBreakdown, context.weightConfig, variant);

  return {
    ...variant,
    schedules,
    routeBreakdown,
    metrics
  };
}

function scorePlan(schedules, routeBreakdown, weightConfig, variant) {
  const occupancyValues = schedules.map((item) => item.expectedOccupancy);
  const waitValues = schedules.map((item) => item.metrics.waitMinutes);
  const demandGapValues = routeBreakdown.map((item) => item.demandGap);
  const totalServices = schedules.length;
  const avgOccupancy = average(occupancyValues);
  const avgWait = average(waitValues);
  const totalDemandGap = demandGapValues.reduce((sum, value) => sum + value, 0);
  const demandMatchScore = clamp(100 - totalDemandGap / Math.max(totalServices, 1), 45, 98);
  const emptyRunRate = clamp(100 - avgOccupancy, 5, 70);
  const emptyRunScore = clamp(100 - emptyRunRate, 30, 95);
  const waitTimeScore = clamp(100 - avgWait * 6, 20, 94);
  const dispatchCostScore = clamp(100 - totalServices * 4 - variant.reserveBias * 5, 20, 90);
  const overallScore = Number((
    demandMatchScore * weightConfig.matchWeight
    + emptyRunScore * weightConfig.emptyRunWeight
    + waitTimeScore * weightConfig.waitWeight
    + dispatchCostScore * weightConfig.dispatchWeight
  ).toFixed(1));

  return {
    demandMatchScore: Number(demandMatchScore.toFixed(1)),
    emptyRunScore: Number(emptyRunScore.toFixed(1)),
    waitTimeScore: Number(waitTimeScore.toFixed(1)),
    dispatchCostScore: Number(dispatchCostScore.toFixed(1)),
    overallScore,
    avgOccupancy: Number(avgOccupancy.toFixed(1)),
    avgWaitMinutes: Number(avgWait.toFixed(1)),
    estimatedEmptyRunRate: Number(emptyRunRate.toFixed(1)),
    totalServices
  };
}

function buildOptimizationReport(winner, candidates, context) {
  return {
    generatedAt: new Date().toISOString(),
    selectedPlan: {
      key: winner.key,
      label: winner.label,
      description: winner.description
    },
    weights: context.weightConfig,
    constraints: [
      '按线路历史客流高峰时段分配服务数量',
      '按道路状态动态增加运行延迟惩罚',
      '按每车 45 人运力估算满载率与供需缺口',
      '优先使用线路专属车辆，超出部分回退到全局可用车辆',
      '通过需求匹配、空驶率、平均等待和调度成本四项综合评分选优'
    ],
    selectedMetrics: winner.metrics,
    routeBreakdown: winner.routeBreakdown,
    candidatePlans: candidates.map((item) => ({
      key: item.key,
      label: item.label,
      description: item.description,
      metrics: item.metrics
    }))
  };
}

async function persistGeneratedSchedules(winner) {
  await query(`DELETE FROM schedules WHERE notes LIKE '智能生成:%'`);

  for (const item of winner.schedules) {
    const result = await query(
      `INSERT INTO schedules
      (route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.routeName,
        item.departureTime,
        item.arrivalTime,
        item.busCode,
        item.status,
        item.expectedOccupancy,
        item.notes
      ]
    );
    await logScheduleAction(
      result.insertId,
      item.routeName,
      'GENERATE',
      `${item.notes}|评分${latestOptimizationReport?.selectedMetrics?.overallScore || '-'}`,
      'system'
    );
  }
}

export async function listSchedules() {
  return query(
    `SELECT
      s.id,
      s.route_name,
      s.departure_time,
      s.arrival_time,
      s.bus_code,
      s.status,
      s.expected_occupancy,
      s.notes,
      s.created_at
    FROM schedules s
    ORDER BY s.departure_time ASC`
  );
}

export async function createSchedule(payload) {
  const {
    routeName,
    departureTime,
    arrivalTime,
    busCode,
    status = 'DRAFT',
    expectedOccupancy = 0,
    notes = '',
    operatorName = 'system'
  } = payload;

  const result = await query(
    `INSERT INTO schedules
    (route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [routeName, departureTime, arrivalTime, busCode, status, expectedOccupancy, notes]
  );

  await logScheduleAction(result.insertId, routeName, 'CREATE', `创建班次，状态为 ${status}`, operatorName);

  return {
    id: result.insertId,
    ...payload
  };
}

export async function updateSchedule(scheduleId, payload) {
  const currentRows = await query(`SELECT * FROM schedules WHERE id = ?`, [scheduleId]);
  const current = currentRows[0];
  if (!current) {
    throw new Error('Schedule not found');
  }

  const nextSchedule = {
    routeName: payload.routeName ?? current.route_name,
    departureTime: payload.departureTime ?? current.departure_time,
    arrivalTime: payload.arrivalTime ?? current.arrival_time,
    busCode: payload.busCode ?? current.bus_code,
    status: payload.status ?? current.status,
    expectedOccupancy: payload.expectedOccupancy ?? current.expected_occupancy,
    notes: payload.notes ?? current.notes
  };

  await query(
    `UPDATE schedules
    SET route_name = ?, departure_time = ?, arrival_time = ?, bus_code = ?, status = ?, expected_occupancy = ?, notes = ?
    WHERE id = ?`,
    [
      nextSchedule.routeName,
      nextSchedule.departureTime,
      nextSchedule.arrivalTime,
      nextSchedule.busCode,
      nextSchedule.status,
      nextSchedule.expectedOccupancy,
      nextSchedule.notes,
      scheduleId
    ]
  );

  await logScheduleAction(
    scheduleId,
    nextSchedule.routeName,
    'UPDATE',
    `更新班次为 ${nextSchedule.departureTime} - ${nextSchedule.arrivalTime}`,
    payload.operatorName || 'system'
  );

  return { id: scheduleId, ...nextSchedule };
}

export async function batchUpdateScheduleStatus(payload) {
  const { ids = [], status, operatorName = 'system' } = payload;
  if (!ids.length) {
    throw new Error('No schedules selected');
  }

  const placeholders = ids.map(() => '?').join(', ');
  await query(`UPDATE schedules SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);

  const updatedRows = await query(`SELECT id, route_name FROM schedules WHERE id IN (${placeholders})`, ids);
  for (const item of updatedRows) {
    await logScheduleAction(item.id, item.route_name, 'STATUS_UPDATE', `批量调整状态为 ${status}`, operatorName);
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
  if (latestOptimizationReport) {
    return latestOptimizationReport;
  }

  return {
    generatedAt: null,
    selectedPlan: null,
    constraints: [
      '尚未执行智能排班，可先点击“智能生成今日排班”产出优化报告'
    ],
    selectedMetrics: null,
    routeBreakdown: [],
    candidatePlans: []
  };
}

export async function generateSuggestedSchedules() {
  const context = await loadOptimizationContext();
  const candidates = createPlanVariants(context).sort((a, b) => b.metrics.overallScore - a.metrics.overallScore);
  const winner = candidates[0];

  latestOptimizationReport = buildOptimizationReport(winner, candidates, context);
  await persistGeneratedSchedules(winner);
  await refreshRouteMetrics();

  return {
    schedules: await listSchedules(),
    report: latestOptimizationReport
  };
}

export async function refreshRouteMetrics() {
  const metrics = await query(
    `SELECT
      route_name,
      MAX(passenger_count) AS peakPassengerFlow,
      ROUND(GREATEST(3, AVG(LEAST(12, passenger_count / 40))), 1) AS avgWaitMinutes
    FROM passenger_flows
    GROUP BY route_name`
  );

  await query(`DELETE FROM route_metrics`);
  for (const item of metrics) {
    await query(
      `INSERT INTO route_metrics (route_name, peak_passenger_flow, avg_wait_minutes)
      VALUES (?, ?, ?)`,
      [item.route_name, item.peakPassengerFlow, item.avgWaitMinutes]
    );
  }
}
