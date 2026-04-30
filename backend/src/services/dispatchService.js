import { query } from '../config/db.js';
import { toMinutes, toTimeString } from './scheduleService.js';

function appendNote(original, next) {
  return [original, next].filter(Boolean).join(' | ');
}

async function createLinkedNotification(title, content, targetRole = 'ALL') {
  const result = await query(
    `INSERT INTO notifications (title, content, type, target_role, is_read)
    VALUES (?, ?, ?, ?, 0)`,
    [title, content, '调度', targetRole]
  );
  return result.insertId;
}

async function listAffectedSchedules(routeName) {
  return query(
    `SELECT id, route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes
    FROM schedules
    WHERE route_name = ?
    ORDER BY departure_time ASC, id ASC`,
    [routeName]
  );
}

function serializeSnapshot(rows) {
  return JSON.stringify(rows);
}

function parseSnapshot(raw) {
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

export async function listDispatchEvents() {
  return query(
    `SELECT
      id,
      event_type,
      impact_route,
      severity,
      status,
      suggestion,
      resolution_type,
      resolution_payload,
      action_notes,
      handled_by,
      handled_at,
      notification_id,
      created_at
    FROM dispatch_events
    ORDER BY created_at DESC`
  );
}

export async function createDispatchEvent(payload) {
  const { eventType, impactRoute, severity, status = 'OPEN', suggestion } = payload;
  const result = await query(
    `INSERT INTO dispatch_events
    (event_type, impact_route, severity, status, suggestion)
    VALUES (?, ?, ?, ?, ?)`,
    [eventType, impactRoute, severity, status, suggestion]
  );

  return {
    id: result.insertId,
    ...payload
  };
}

export async function executeDispatchEvent(eventId, payload) {
  const {
    resolutionType,
    operatorName = 'system',
    delayMinutes = 0,
    actionNotes = '',
    replacementBusCode = '',
    extraDepartureTime = '',
    extraArrivalTime = ''
  } = payload;

  const [event] = await query(`SELECT * FROM dispatch_events WHERE id = ?`, [eventId]);
  if (!event) {
    throw new Error('Dispatch event not found');
  }
  if (event.status === 'RESOLVED') {
    throw new Error('Dispatch event already resolved');
  }

  const impactedSchedules = await listAffectedSchedules(event.impact_route);
  const originalSnapshot = impactedSchedules.length
    ? serializeSnapshot(impactedSchedules)
    : serializeSnapshot([]);

  let affectedCount = impactedSchedules.length;
  let resultMessage = '';

  if (resolutionType === 'DELAY') {
    for (const item of impactedSchedules) {
      const nextDeparture = toTimeString(toMinutes(item.departure_time) + Number(delayMinutes || 0));
      const nextArrival = toTimeString(toMinutes(item.arrival_time) + Number(delayMinutes || 0));
      await query(
        `UPDATE schedules
        SET departure_time = ?, arrival_time = ?, notes = ?
        WHERE id = ?`,
        [
          nextDeparture,
          nextArrival,
          appendNote(item.notes, `调度延后${delayMinutes}分钟`),
          item.id
        ]
      );
    }
    resultMessage = `${event.impact_route} 已整体延后 ${delayMinutes} 分钟`;
  } else if (resolutionType === 'CANCEL') {
    await query(
      `UPDATE schedules
      SET status = 'CANCELLED', notes = CONCAT(IFNULL(notes, ''), CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' | ' END, '紧急停运')
      WHERE route_name = ?`,
      [event.impact_route]
    );
    resultMessage = `${event.impact_route} 已执行临时停运`;
  } else if (resolutionType === 'REROUTE') {
    await query(
      `UPDATE schedules
      SET notes = CONCAT(IFNULL(notes, ''), CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' | ' END, ?)
      WHERE route_name = ?`,
      [`临时绕行:${actionNotes || event.suggestion}`, event.impact_route]
    );
    resultMessage = `${event.impact_route} 已标记绕行方案`;
  } else if (resolutionType === 'REPLACE_VEHICLE') {
    const [nextSchedule] = impactedSchedules;
    if (!nextSchedule) {
      throw new Error('No schedules available for vehicle replacement');
    }
    await query(
      `UPDATE schedules
      SET bus_code = ?, notes = ?
      WHERE id = ?`,
      [
        replacementBusCode || nextSchedule.bus_code,
        appendNote(nextSchedule.notes, `调度换车:${replacementBusCode}`),
        nextSchedule.id
      ]
    );
    affectedCount = 1;
    resultMessage = `${event.impact_route} 已替换执行车辆`;
  } else if (resolutionType === 'EXTRA_SERVICE') {
    const [baseSchedule] = impactedSchedules;
    const departureTime = extraDepartureTime || baseSchedule?.departure_time || '18:00:00';
    const arrivalTime = extraArrivalTime || baseSchedule?.arrival_time || '18:15:00';
    const busCode = replacementBusCode || baseSchedule?.bus_code || '应急车';
    await query(
      `INSERT INTO schedules
      (route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes)
      VALUES (?, ?, ?, ?, 'PUBLISHED', ?, ?)`,
      [
        event.impact_route,
        departureTime,
        arrivalTime,
        busCode,
        Math.min(100, Number(baseSchedule?.expected_occupancy || 70)),
        appendNote('应急调度增开班次', actionNotes)
      ]
    );
    affectedCount += 1;
    resultMessage = `${event.impact_route} 已增开应急班次`;
  } else {
    throw new Error('Unsupported resolution type');
  }

  const latestSnapshot = serializeSnapshot(await listAffectedSchedules(event.impact_route));
  const notificationId = await createLinkedNotification(
    `调度更新：${event.impact_route}`,
    `${resultMessage}。${actionNotes || event.suggestion || '请留意最新班次安排。'}`,
    'ALL'
  );

  await query(
    `UPDATE dispatch_events
    SET status = 'RESOLVED',
        resolution_type = ?,
        resolution_payload = ?,
        action_notes = ?,
        handled_by = ?,
        handled_at = CURRENT_TIMESTAMP,
        original_schedule_snapshot = ?,
        latest_schedule_snapshot = ?,
        affected_count = ?,
        notification_id = ?
    WHERE id = ?`,
    [
      resolutionType,
      JSON.stringify({
        delayMinutes,
        replacementBusCode,
        extraDepartureTime,
        extraArrivalTime
      }),
      actionNotes,
      operatorName,
      originalSnapshot,
      latestSnapshot,
      affectedCount,
      notificationId,
      eventId
    ]
  );

  return {
    message: resultMessage,
    notificationId
  };
}

export async function rollbackDispatchEvent(eventId, operatorName = 'system') {
  const [event] = await query(`SELECT * FROM dispatch_events WHERE id = ?`, [eventId]);
  if (!event) {
    throw new Error('Dispatch event not found');
  }
  if (!event.original_schedule_snapshot) {
    throw new Error('No rollback snapshot available');
  }

  const snapshot = parseSnapshot(event.original_schedule_snapshot);

  await query(`DELETE FROM schedules WHERE route_name = ?`, [event.impact_route]);

  for (const item of snapshot) {
    await query(
      `INSERT INTO schedules
      (id, route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.route_name,
        item.departure_time,
        item.arrival_time,
        item.bus_code,
        item.status,
        item.expected_occupancy,
        item.notes
      ]
    );
  }

  const notificationId = await createLinkedNotification(
    `调度回滚：${event.impact_route}`,
    `${event.impact_route} 已回滚到调度前排班版本，请以最新班次信息为准。`,
    'ALL'
  );

  await query(
    `UPDATE dispatch_events
    SET status = 'PROCESSING',
        action_notes = ?,
        handled_by = ?,
        handled_at = CURRENT_TIMESTAMP,
        notification_id = ?
    WHERE id = ?`,
    [
      appendNote(event.action_notes, '已执行回滚'),
      operatorName,
      notificationId,
      eventId
    ]
  );

  return {
    message: `${event.impact_route} 已回滚到调度前版本`,
    notificationId
  };
}
