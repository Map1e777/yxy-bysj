import {
  createDispatchEvent,
  executeDispatchEvent,
  listDispatchEvents,
  rollbackDispatchEvent
} from '../services/dispatchService.js';

export async function getDispatchEvents(req, res, next) {
  try {
    const data = await listDispatchEvents();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postDispatchEvent(req, res, next) {
  try {
    const data = await createDispatchEvent(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postDispatchExecution(req, res, next) {
  try {
    const data = await executeDispatchEvent(req.params.id, {
      ...req.body,
      operatorName: req.user.username
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postDispatchRollback(req, res, next) {
  try {
    const data = await rollbackDispatchEvent(req.params.id, req.user.username);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
