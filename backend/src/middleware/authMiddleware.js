import { verifyToken } from '../utils/auth.js';

export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : '';
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录或登录已过期' });
    }
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '认证失败' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录或登录已过期' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '无权限访问该资源' });
    }
    next();
  };
}
