import http from './http';

export async function fetchDashboard() {
  const { data } = await http.get('/dashboard');
  return data.data;
}

export async function fetchSchedules() {
  const { data } = await http.get('/schedules');
  return data.data;
}

export async function generateSchedules() {
  const { data } = await http.post('/schedules/generate');
  return data.data;
}

export async function fetchScheduleOptimizationReport() {
  const { data } = await http.get('/schedules/optimization-report');
  return data.data;
}

export async function createSchedule(payload) {
  const { data } = await http.post('/schedules', payload);
  return data.data;
}

export async function updateSchedule(id, payload) {
  const { data } = await http.patch(`/schedules/${id}`, payload);
  return data.data;
}

export async function batchUpdateSchedules(payload) {
  const { data } = await http.patch('/schedules/status/batch', payload);
  return data.data;
}

export async function fetchScheduleLogs() {
  const { data } = await http.get('/schedule-logs');
  return data.data;
}

export async function fetchDispatchEvents() {
  const { data } = await http.get('/dispatch-events');
  return data.data;
}

export async function createDispatchEvent(payload) {
  const { data } = await http.post('/dispatch-events', payload);
  return data.data;
}

export async function executeDispatchEvent(id, payload) {
  const { data } = await http.post(`/dispatch-events/${id}/execute`, payload);
  return data.data;
}

export async function rollbackDispatchEvent(id) {
  const { data } = await http.post(`/dispatch-events/${id}/rollback`);
  return data.data;
}

export async function fetchStudentOverview() {
  const { data } = await http.get('/student/overview');
  return data.data;
}

export async function fetchRealtimeVehicles() {
  const { data } = await http.get('/vehicles/realtime');
  return data.data;
}

export async function fetchRoutes() {
  const { data } = await http.get('/routes');
  return data.data;
}

export async function createRoute(payload) {
  const { data } = await http.post('/routes', payload);
  return data.data;
}

export async function createRouteStop(payload) {
  const { data } = await http.post('/route-stops', payload);
  return data.data;
}

export async function fetchVehicles() {
  const { data } = await http.get('/vehicles');
  return data.data;
}

export async function createVehicle(payload) {
  const { data } = await http.post('/vehicles', payload);
  return data.data;
}

export async function fetchNotifications() {
  const { data } = await http.get('/notifications');
  return data.data;
}

export async function createNotification(payload) {
  const { data } = await http.post('/notifications', payload);
  return data.data;
}

export async function fetchFeedback() {
  const { data } = await http.get('/feedback');
  return data.data;
}

export async function createFeedback(payload) {
  const { data } = await http.post('/feedback', payload);
  return data.data;
}

export async function fetchFavorites() {
  const { data } = await http.get('/favorites');
  return data.data;
}

export async function createFavorite(payload) {
  const { data } = await http.post('/favorites', payload);
  return data.data;
}

export async function fetchAnalytics() {
  const { data } = await http.get('/analytics');
  return data.data;
}

export async function fetchConfigs() {
  const { data } = await http.get('/system/configs');
  return data.data;
}

export async function updateConfigs(payload) {
  const { data } = await http.put('/system/configs', payload);
  return data.data;
}

export async function fetchRoadConditions() {
  const { data } = await http.get('/road-conditions');
  return data.data;
}

export async function createRoadCondition(payload) {
  const { data } = await http.post('/road-conditions', payload);
  return data.data;
}

export async function fetchPassengerFlows() {
  const { data } = await http.get('/passenger-flows');
  return data.data;
}

export async function createPassengerFlow(payload) {
  const { data } = await http.post('/passenger-flows', payload);
  return data.data;
}

export async function fetchUsers() {
  const { data } = await http.get('/users');
  return data.data;
}

export async function createUser(payload) {
  const { data } = await http.post('/users', payload);
  return data.data;
}

export async function fetchImportJobs() {
  const { data } = await http.get('/data-imports');
  return data.data;
}

export async function createImportJob(payload) {
  const { data } = await http.post('/data-imports', payload);
  return data.data;
}

export async function fetchDatasetExport(dataset) {
  const { data } = await http.get(`/data-exports/${dataset}`);
  return data.data;
}
