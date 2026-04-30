import { query } from '../config/db.js';
import { refreshRouteMetrics } from './scheduleService.js';
import { hashPassword } from '../utils/auth.js';

function mergeRoutesWithStops(routes, stops) {
  return routes.map((route) => ({
    ...route,
    stops: stops
      .filter((stop) => stop.route_id === route.id)
      .sort((a, b) => a.stop_order - b.stop_order)
      .map((stop) => ({
        ...stop,
        position: toCoordinate(stop.stop_name)
      }))
  }));
}

function parseCsv(csvText) {
  const lines = String(csvText || '')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((item) => item.trim());
    return headers.reduce((acc, header, index) => {
      acc[header] = cells[index] ?? '';
      return acc;
    }, {});
  });
}

function hashNumber(text) {
  return Array.from(String(text || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function toCoordinate(stopName) {
  const seed = hashNumber(stopName);
  return {
    lat: Number((29.5600 + (seed % 40) * 0.00045).toFixed(6)),
    lng: Number((106.5700 + (seed % 35) * 0.00042).toFixed(6))
  };
}

function occupancyToLevel(percent) {
  if (percent >= 90) return '较满载';
  if (percent >= 75) return '拥挤';
  if (percent >= 55) return '一般';
  if (percent >= 35) return '较舒适';
  return '空闲';
}

export async function listRoutesWithStops() {
  const routes = await query(
    `SELECT
      id,
      route_name,
      start_stop,
      end_stop,
      total_distance_km,
      estimated_duration_min,
      status
    FROM routes
    ORDER BY id ASC`
  );

  const stops = await query(
    `SELECT id, route_id, stop_name, stop_order
    FROM route_stops
    ORDER BY route_id ASC, stop_order ASC`
  );

  return mergeRoutesWithStops(routes, stops);
}

export async function createRoute(payload) {
  const {
    routeName,
    startStop,
    endStop,
    totalDistanceKm,
    estimatedDurationMin,
    status = 'ACTIVE'
  } = payload;

  const result = await query(
    `INSERT INTO routes
    (route_name, start_stop, end_stop, total_distance_km, estimated_duration_min, status)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [routeName, startStop, endStop, totalDistanceKm, estimatedDurationMin, status]
  );

  return {
    id: result.insertId,
    ...payload
  };
}

export async function createRouteStop(payload) {
  const { routeId, stopName, stopOrder } = payload;
  const result = await query(
    `INSERT INTO route_stops (route_id, stop_name, stop_order)
    VALUES (?, ?, ?)`,
    [routeId, stopName, stopOrder]
  );

  return {
    id: result.insertId,
    ...payload
  };
}

export async function listVehicles() {
  return query(
    `SELECT id, plate_number, driver_name, route_name, next_stop, eta_minutes, occupancy_level
    FROM vehicles
    ORDER BY id ASC`
  );
}

export async function createVehicle(payload) {
  const {
    plateNumber,
    driverName,
    routeName,
    nextStop,
    etaMinutes,
    occupancyLevel
  } = payload;
  const result = await query(
    `INSERT INTO vehicles
    (plate_number, driver_name, route_name, next_stop, eta_minutes, occupancy_level)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [plateNumber, driverName, routeName, nextStop, etaMinutes, occupancyLevel]
  );

  return {
    id: result.insertId,
    ...payload
  };
}

export async function listNotifications() {
  return query(
    `SELECT id, title, content, type, target_role, is_read, created_at
    FROM notifications
    ORDER BY created_at DESC`
  );
}

export async function createNotification(payload) {
  const { title, content, type, targetRole, isRead = 0 } = payload;
  const result = await query(
    `INSERT INTO notifications (title, content, type, target_role, is_read)
    VALUES (?, ?, ?, ?, ?)`,
    [title, content, type, targetRole, isRead]
  );

  return {
    id: result.insertId,
    ...payload
  };
}

export async function listFeedback() {
  return query(
    `SELECT id, user_name, route_name, content, status, created_at
    FROM feedback
    ORDER BY created_at DESC`
  );
}

export async function createFeedback(payload) {
  const { userName, routeName, content, status = 'NEW' } = payload;
  const result = await query(
    `INSERT INTO feedback (user_name, route_name, content, status)
    VALUES (?, ?, ?, ?)`,
    [userName, routeName, content, status]
  );

  return {
    id: result.insertId,
    ...payload
  };
}

export async function listFavorites() {
  return query(
    `SELECT id, user_name, route_name, created_at
    FROM favorites
    ORDER BY created_at DESC`
  );
}

export async function createFavorite(payload) {
  const { userName, routeName } = payload;
  const result = await query(
    `INSERT INTO favorites (user_name, route_name)
    VALUES (?, ?)`,
    [userName, routeName]
  );

  return {
    id: result.insertId,
    ...payload
  };
}

export async function listRoadConditions() {
  return query(
    `SELECT id, road_name, affected_route, status, impact_level, delay_minutes, notes, created_at
    FROM road_conditions
    ORDER BY created_at DESC`
  );
}

export async function createRoadCondition(payload) {
  const {
    roadName,
    affectedRoute,
    status = 'OPEN',
    impactLevel = 'LOW',
    delayMinutes = 0,
    notes = ''
  } = payload;
  const result = await query(
    `INSERT INTO road_conditions
    (road_name, affected_route, status, impact_level, delay_minutes, notes)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [roadName, affectedRoute, status, impactLevel, delayMinutes, notes]
  );

  return { id: result.insertId, ...payload };
}

export async function listPassengerFlows() {
  return query(
    `SELECT id, route_name, date_key, time_slot, passenger_count, station_hotspot, is_simulated, created_at
    FROM passenger_flows
    ORDER BY date_key DESC, time_slot ASC`
  );
}

export async function createPassengerFlow(payload) {
  const {
    routeName,
    dateKey,
    timeSlot,
    passengerCount,
    stationHotspot,
    isSimulated = 1
  } = payload;
  const result = await query(
    `INSERT INTO passenger_flows
    (route_name, date_key, time_slot, passenger_count, station_hotspot, is_simulated)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [routeName, dateKey, timeSlot, passengerCount, stationHotspot, isSimulated]
  );
  await refreshRouteMetrics();
  return { id: result.insertId, ...payload };
}

export async function listUsers() {
  return query(
    `SELECT id, username, role, phone, status, created_at
    FROM system_users
    ORDER BY id ASC`
  );
}

export async function createUser(payload) {
  const { username, password = 'ChangeMe123', role, phone = '', status = 'ACTIVE' } = payload;
  const result = await query(
    `INSERT INTO system_users (username, password_hash, role, phone, status)
    VALUES (?, ?, ?, ?, ?)`,
    [username, hashPassword(password), role, phone, status]
  );
  return { id: result.insertId, ...payload };
}

export async function createImportJob(payload) {
  const { importType, sourceName = 'manual', csvText = '' } = payload;
  const rows = parseCsv(csvText);
  let inserted = 0;

  if (importType === 'PASSENGER_FLOW') {
    for (const row of rows) {
      await query(
        `INSERT INTO passenger_flows
        (route_name, date_key, time_slot, passenger_count, station_hotspot, is_simulated)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          row.route_name,
          row.date_key,
          row.time_slot,
          Number(row.passenger_count || 0),
          row.station_hotspot,
          Number(row.is_simulated || 1)
        ]
      );
      inserted += 1;
    }
    await refreshRouteMetrics();
  }

  if (importType === 'ROAD_CONDITION') {
    for (const row of rows) {
      await query(
        `INSERT INTO road_conditions
        (road_name, affected_route, status, impact_level, delay_minutes, notes)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          row.road_name,
          row.affected_route,
          row.status || 'OPEN',
          row.impact_level || 'LOW',
          Number(row.delay_minutes || 0),
          row.notes || ''
        ]
      );
      inserted += 1;
    }
  }

  const result = await query(
    `INSERT INTO data_import_jobs (import_type, source_name, total_rows, status)
    VALUES (?, ?, ?, ?)`,
    [importType, sourceName, inserted, 'DONE']
  );

  return {
    id: result.insertId,
    importType,
    sourceName,
    totalRows: inserted,
    status: 'DONE'
  };
}

export async function listImportJobs() {
  return query(
    `SELECT id, import_type, source_name, total_rows, status, created_at
    FROM data_import_jobs
    ORDER BY created_at DESC`
  );
}

export async function exportDataset(dataset) {
  if (dataset === 'passenger_flows') {
    const rows = await listPassengerFlows();
    return rows.map((item) => ({
      route_name: item.route_name,
      date_key: item.date_key,
      time_slot: item.time_slot,
      passenger_count: item.passenger_count,
      station_hotspot: item.station_hotspot
    }));
  }

  if (dataset === 'road_conditions') {
    const rows = await listRoadConditions();
    return rows.map((item) => ({
      road_name: item.road_name,
      affected_route: item.affected_route,
      status: item.status,
      impact_level: item.impact_level,
      delay_minutes: item.delay_minutes
    }));
  }

  throw new Error('Unsupported dataset export');
}

export async function getStudentOverview(user) {
  const routes = await listRoutesWithStops();
  const favorites = await query(
    `SELECT user_name, route_name, created_at
    FROM favorites
    WHERE user_name = ?
    ORDER BY created_at DESC
    LIMIT 5`,
    [user.username]
  );
  const notifications = await query(
    `SELECT title, content, type, target_role, created_at
    FROM notifications
    WHERE target_role IN ('ALL', ?)
    ORDER BY created_at DESC
    LIMIT 5`,
    [user.role]
  );
  const recommendations = await query(
    `SELECT route_name, peak_passenger_flow, avg_wait_minutes
    FROM route_metrics
    ORDER BY avg_wait_minutes ASC
    LIMIT 3`
  );
  const feedbackHistory = await query(
    `SELECT route_name, content, status, created_at
    FROM feedback
    WHERE user_name = ?
    ORDER BY created_at DESC
    LIMIT 5`,
    [user.username]
  );

  return {
    routes,
    favorites,
    notifications,
    recommendations,
    feedbackHistory
  };
}

export async function getRealtimeVehicles(user) {
  const routes = await listRoutesWithStops();
  const vehicles = await listVehicles();
  const roadConditions = await listRoadConditions();
  const recentEvents = await query(
    `SELECT impact_route, event_type, severity, status, action_notes, suggestion
    FROM dispatch_events
    ORDER BY created_at DESC`
  );
  const routeMetrics = await query(
    `SELECT route_name, peak_passenger_flow
    FROM route_metrics`
  );

  const routeMap = new Map(routes.map((route) => [route.route_name, route]));
  const metricMap = new Map(routeMetrics.map((item) => [item.route_name, Number(item.peak_passenger_flow || 0)]));

  return vehicles.map((vehicle, index) => {
    const route = routeMap.get(vehicle.route_name);
    const stops = route?.stops || [];
    const road = roadConditions.find((item) => item.affected_route === vehicle.route_name);
    const event = recentEvents.find((item) => item.impact_route === vehicle.route_name && item.status !== 'RESOLVED');
    const cycleSize = Math.max(stops.length, 2);
    const seed = hashNumber(`${vehicle.plate_number}-${vehicle.route_name}`);
    const tick = Math.floor(Date.now() / 30000);
    const currentIndex = stops.length ? (tick + seed + index) % cycleSize : 0;
    const currentStop = stops[currentIndex]?.stop_name || vehicle.next_stop;
    const nextStop = stops[(currentIndex + 1) % Math.max(stops.length, 1)]?.stop_name || vehicle.next_stop;
    const baseEta = Math.max(1, Number(vehicle.eta_minutes || 3));
    const roadDelay = Number(road?.delay_minutes || 0);
    const etaMinutes = baseEta + (tick % 3) + roadDelay;
    const occupancySeed = Math.min(100, Math.max(15, Math.round((metricMap.get(vehicle.route_name) || 180) / 4 + (tick % 4) * 8)));
    let runStatus = '正常';
    let highlight = '模拟运行状态';

    if (road?.status === 'CLOSED') {
      runStatus = '绕行';
      highlight = road.notes || '道路封闭，已启用绕行方案';
    } else if (event?.resolution_type === 'CANCEL' || event?.status === 'OPEN' && event?.severity === 'HIGH') {
      runStatus = '延误';
      highlight = event?.action_notes || event?.suggestion || `${event?.event_type || '异常事件'}处理中`;
    } else if (road?.status === 'LIMITED') {
      runStatus = '延误';
      highlight = road.notes || '道路受限，预计晚点';
    }

    return {
      id: vehicle.id,
      plateNumber: vehicle.plate_number,
      routeName: vehicle.route_name,
      currentStop,
      nextStop,
      etaMinutes,
      occupancyPercent: occupancySeed,
      occupancyLevel: occupancyToLevel(occupancySeed),
      runStatus,
      highlight,
      isSimulated: true,
      lastReportedAt: new Date().toISOString(),
      position: toCoordinate(currentStop),
      nextPosition: toCoordinate(nextStop)
    };
  }).filter((item) => user.role !== 'STUDENT' || Boolean(item.routeName));
}

export async function getAnalyticsData() {
  const routeMetrics = await query(
    `SELECT route_name, peak_passenger_flow, avg_wait_minutes
    FROM route_metrics
    ORDER BY peak_passenger_flow DESC`
  );

  const occupancy = await query(
    `SELECT route_name, expected_occupancy, status
    FROM schedules
    ORDER BY expected_occupancy DESC`
  );

  const eventsBySeverity = await query(
    `SELECT severity, COUNT(*) AS total
    FROM dispatch_events
    GROUP BY severity`
  );

  const passengerFlowTrend = await query(
    `SELECT time_slot, SUM(passenger_count) AS total_passenger_count
    FROM passenger_flows
    GROUP BY time_slot
    ORDER BY time_slot ASC`
  );

  const roadStatusSummary = await query(
    `SELECT status, COUNT(*) AS total
    FROM road_conditions
    GROUP BY status`
  );

  return {
    routeMetrics,
    occupancy,
    eventsBySeverity,
    passengerFlowTrend,
    roadStatusSummary
  };
}

export async function listConfigs() {
  return query(
    `SELECT id, config_key, config_label, config_value
    FROM system_configs
    ORDER BY id ASC`
  );
}

export async function updateConfigs(payload) {
  for (const item of payload) {
    await query(
      `UPDATE system_configs
      SET config_value = ?
      WHERE config_key = ?`,
      [String(item.configValue), item.configKey]
    );
  }

  return listConfigs();
}
