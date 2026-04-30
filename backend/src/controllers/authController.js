import { getCurrentUser, loginUser } from '../services/authService.js';

export async function postLogin(req, res, next) {
  try {
    const data = await loginUser(req.body);
    res.json({ success: true, data });
  } catch (error) {
    error.statusCode = 401;
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const data = await getCurrentUser(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
