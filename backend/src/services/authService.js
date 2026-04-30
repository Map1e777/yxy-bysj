import { query } from '../config/db.js';
import { hashPassword, signToken } from '../utils/auth.js';

export async function loginUser(payload) {
  const { username, password } = payload;
  const rows = await query(
    `SELECT id, username, password_hash, role, phone, status
    FROM system_users
    WHERE username = ?`,
    [username]
  );

  const user = rows[0];
  if (!user || user.password_hash !== hashPassword(password)) {
    throw new Error('用户名或密码错误');
  }

  if (user.status !== 'ACTIVE') {
    throw new Error('当前账号不可用');
  }

  const token = signToken({
    id: user.id,
    username: user.username,
    role: user.role
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      phone: user.phone,
      status: user.status
    }
  };
}

export async function getCurrentUser(userId) {
  const rows = await query(
    `SELECT id, username, role, phone, status
    FROM system_users
    WHERE id = ?`,
    [userId]
  );
  return rows[0] || null;
}
