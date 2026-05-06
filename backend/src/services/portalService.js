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
        position: (stop.lat != null && stop.lng != null)
          ? { lat: Number(stop.lat), lng: Number(stop.lng) }
          : toCoordinate(stop.stop_name)
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

const STOP_COORDINATES = {
  '宿舍区A': { lat: 29.53512, lng: 106.59928 },
  '宿舍区A西门': { lat: 29.53534, lng: 106.59886 },
  '第一教学楼': { lat: 29.53708, lng: 106.60076 },
  '教学楼B': { lat: 29.53762, lng: 106.60146 },
  '图书馆': { lat: 29.53854, lng: 106.60258 },
  '图书馆西门': { lat: 29.53846, lng: 106.60204 },
  '中心广场': { lat: 29.53754, lng: 106.60128 },
  '食堂南门': { lat: 29.53608, lng: 106.60178 },
  '实验楼': { lat: 29.53692, lng: 106.60356 },
  '实验楼北门': { lat: 29.53718, lng: 106.60394 },
  '体育馆': { lat: 29.53642, lng: 106.60296 },
  '行政楼': { lat: 29.53888, lng: 106.60372 }
};

function hashNumber(text) {
  return Array.from(String(text || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function toCoordinate(stopName) {
  const normalized = String(stopName || '').trim();
  if (STOP_COORDINATES[normalized]) {
    return STOP_COORDINATES[normalized];
  }

  const seed = hashNumber(normalized);
  return {
    lat: Number((29.5354 + (seed % 18) * 0.0002).toFixed(6)),
    lng: Number((106.5994 + (seed % 20) * 0.00018).toFixed(6))
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
    `SELECT id, route_id, stop_name, stop_order, lat, lng
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

export async function updateStopPosition(stopName, lat, lng) {
  await query(
    `UPDATE route_stops SET lat = ?, lng = ? WHERE stop_name = ?`,
    [lat, lng, stopName]
  );
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

export async function listDrivers() {
  return query(
    `SELECT id, name, phone, license_number, max_daily_hours, status, created_at
    FROM drivers
    ORDER BY id ASC`
  );
}

export async function createDriver(payload) {
  const { name, phone = '', licenseNumber = '', maxDailyHours = 8.0, status = 'ACTIVE' } = payload;
  const result = await query(
    `INSERT INTO drivers (name, phone, license_number, max_daily_hours, status) VALUES (?, ?, ?, ?, ?)`,
    [name, phone, licenseNumber, maxDailyHours, status]
  );
  return { id: result.insertId, ...payload };
}

export async function updateDriver(driverId, payload) {
  const [current] = await query(`SELECT * FROM drivers WHERE id = ?`, [driverId]);
  if (!current) throw new Error('Driver not found');
  const next = {
    name:          payload.name          ?? current.name,
    phone:         payload.phone         ?? current.phone,
    licenseNumber: payload.licenseNumber ?? current.license_number,
    maxDailyHours: payload.maxDailyHours ?? current.max_daily_hours,
    status:        payload.status        ?? current.status
  };
  await query(
    `UPDATE drivers SET name=?, phone=?, license_number=?, max_daily_hours=?, status=? WHERE id=?`,
    [next.name, next.phone, next.licenseNumber, next.maxDailyHours, next.status, driverId]
  );
  return { id: driverId, ...next };
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
    const stopPositionMap = new Map(stops.map((s) => [s.stop_name, s.position]));
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
      position: stopPositionMap.get(currentStop) || toCoordinate(currentStop),
      nextPosition: stopPositionMap.get(nextStop) || toCoordinate(nextStop)
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

  // 空驶率：expected_occupancy < 35 的班次视为空驶/轻载
  const emptyRunStats = await query(
    `SELECT
      route_name,
      COUNT(*) AS total_services,
      SUM(CASE WHEN expected_occupancy < 35 THEN 1 ELSE 0 END) AS empty_count,
      ROUND(100.0 * SUM(CASE WHEN expected_occupancy < 35 THEN 1 ELSE 0 END) / COUNT(*), 1) AS empty_run_rate
    FROM schedules
    WHERE status != 'CANCELLED'
    GROUP BY route_name
    ORDER BY empty_run_rate DESC`
  );

  return {
    routeMetrics,
    occupancy,
    eventsBySeverity,
    passengerFlowTrend,
    roadStatusSummary,
    emptyRunStats
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
