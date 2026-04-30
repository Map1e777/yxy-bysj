import {
  createFavorite,
  createFeedback,
  createImportJob,
  createNotification,
  createPassengerFlow,
  createRoadCondition,
  createRoute,
  createRouteStop,
  createUser,
  createVehicle,
  exportDataset,
  getAnalyticsData,
  getRealtimeVehicles,
  getStudentOverview,
  listConfigs,
  listFavorites,
  listFeedback,
  listImportJobs,
  listNotifications,
  listPassengerFlows,
  listRoadConditions,
  listRoutesWithStops,
  listUsers,
  listVehicles,
  updateConfigs
} from '../services/portalService.js';

export async function getRoutes(req, res, next) {
  try {
    const data = await listRoutesWithStops();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postRoute(req, res, next) {
  try {
    const data = await createRoute(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postRouteStop(req, res, next) {
  try {
    const data = await createRouteStop(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getVehicles(req, res, next) {
  try {
    const data = await listVehicles();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postVehicle(req, res, next) {
  try {
    const data = await createVehicle(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getNotifications(req, res, next) {
  try {
    const data = await listNotifications();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postNotification(req, res, next) {
  try {
    const data = await createNotification(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getFeedback(req, res, next) {
  try {
    const data = await listFeedback();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postFeedback(req, res, next) {
  try {
    const data = await createFeedback({
      ...req.body,
      userName: req.user.username
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getFavorites(req, res, next) {
  try {
    const data = await listFavorites();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postFavorite(req, res, next) {
  try {
    const data = await createFavorite({
      ...req.body,
      userName: req.user.username
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStudentPortal(req, res, next) {
  try {
    const data = await getStudentOverview(req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getRealtimeVehicleFeed(req, res, next) {
  try {
    const data = await getRealtimeVehicles(req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAnalytics(req, res, next) {
  try {
    const data = await getAnalyticsData();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSystemConfigs(req, res, next) {
  try {
    const data = await listConfigs();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function putSystemConfigs(req, res, next) {
  try {
    const data = await updateConfigs(req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getRoadConditions(req, res, next) {
  try {
    const data = await listRoadConditions();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postRoadCondition(req, res, next) {
  try {
    const data = await createRoadCondition(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getPassengerFlows(req, res, next) {
  try {
    const data = await listPassengerFlows();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postPassengerFlow(req, res, next) {
  try {
    const data = await createPassengerFlow(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req, res, next) {
  try {
    const data = await listUsers();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postUser(req, res, next) {
  try {
    const data = await createUser(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getImportJobs(req, res, next) {
  try {
    const data = await listImportJobs();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postImportJob(req, res, next) {
  try {
    const data = await createImportJob(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getDatasetExport(req, res, next) {
  try {
    const data = await exportDataset(req.params.dataset);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
