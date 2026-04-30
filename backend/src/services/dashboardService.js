import { query } from '../config/db.js';

export async function getDashboardData() {
  const [scheduleSummary] = await query(
    `SELECT
      COUNT(*) AS totalSchedules,
      SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) AS publishedSchedules,
      ROUND(AVG(expected_occupancy), 1) AS avgOccupancy
    FROM schedules`
  );

  const [eventSummary] = await query(
    `SELECT
      COUNT(*) AS totalEvents,
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS openEvents
    FROM dispatch_events`
  );

  const [notificationSummary] = await query(
    `SELECT
      COUNT(*) AS totalNotifications,
      SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unreadNotifications
    FROM notifications`
  );

  const [feedbackSummary] = await query(
    `SELECT COUNT(*) AS totalFeedback FROM feedback`
  );

  const routeHotspots = await query(
    `SELECT route_name, peak_passenger_flow, avg_wait_minutes
    FROM route_metrics
    ORDER BY peak_passenger_flow DESC
    LIMIT 5`
  );

  const runningVehicles = await query(
    `SELECT id, plate_number, driver_name, route_name, next_stop, eta_minutes, occupancy_level
    FROM vehicles
    ORDER BY eta_minutes ASC
    LIMIT 6`
  );

  return {
    metrics: {
      totalSchedules: Number(scheduleSummary?.totalSchedules || 0),
      publishedSchedules: Number(scheduleSummary?.publishedSchedules || 0),
      avgOccupancy: Number(scheduleSummary?.avgOccupancy || 0),
      totalEvents: Number(eventSummary?.totalEvents || 0),
      openEvents: Number(eventSummary?.openEvents || 0),
      unreadNotifications: Number(notificationSummary?.unreadNotifications || 0),
      totalFeedback: Number(feedbackSummary?.totalFeedback || 0)
    },
    routeHotspots,
    runningVehicles
  };
}
