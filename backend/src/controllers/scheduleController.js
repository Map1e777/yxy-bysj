import {
  batchUpdateScheduleStatus,
  createSchedule,
  generateSuggestedSchedules,
  getLatestScheduleOptimizationReport,
  listScheduleLogs,
  listSchedules,
  updateSchedule
} from '../services/scheduleService.js';

export async function getSchedules(req, res, next) {
  try {
    const data = await listSchedules();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postSchedule(req, res, next) {
  try {
    const data = await createSchedule(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function patchSchedule(req, res, next) {
  try {
    const data = await updateSchedule(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postGeneratedSchedules(req, res, next) {
  try {
    const data = await generateSuggestedSchedules();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function patchScheduleBatchStatus(req, res, next) {
  try {
    const data = await batchUpdateScheduleStatus(req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getScheduleLogs(req, res, next) {
  try {
    const data = await listScheduleLogs();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getScheduleOptimizationReport(req, res, next) {
  try {
    const data = await getLatestScheduleOptimizationReport();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
