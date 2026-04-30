import { getDashboardData } from '../services/dashboardService.js';

export async function getDashboard(req, res, next) {
  try {
    const data = await getDashboardData();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
