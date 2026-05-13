CREATE DATABASE IF NOT EXISTS campus_shuttle DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campus_shuttle;

DROP TABLE IF EXISTS schedule_operation_logs;
DROP TABLE IF EXISTS schedule_versions;
DROP TABLE IF EXISTS passenger_flows;
DROP TABLE IF EXISTS road_conditions;
DROP TABLE IF EXISTS system_users;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS route_stops;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS route_metrics;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS dispatch_events;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS system_configs;

CREATE TABLE routes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  route_name VARCHAR(100) NOT NULL,
  start_stop VARCHAR(100) NOT NULL,
  end_stop VARCHAR(100) NOT NULL,
  total_distance_km DECIMAL(5,1) NOT NULL,
  estimated_duration_min INT NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE route_stops (
  id INT PRIMARY KEY AUTO_INCREMENT,
  route_id INT NOT NULL,
  stop_name VARCHAR(100) NOT NULL,
  stop_order INT NOT NULL,
  lat DECIMAL(10, 7) DEFAULT NULL,
  lng DECIMAL(10, 7) DEFAULT NULL
);

CREATE TABLE schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  route_name VARCHAR(100) NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  bus_code VARCHAR(50) NOT NULL,
  status ENUM('DRAFT', 'PUBLISHED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  expected_occupancy INT NOT NULL DEFAULT 0,
  notes VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schedule_operation_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  schedule_id INT NULL,
  route_name VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  operator_name VARCHAR(50) NOT NULL DEFAULT 'system',
  action_detail VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE route_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  route_name VARCHAR(100) NOT NULL,
  peak_passenger_flow INT NOT NULL,
  avg_wait_minutes DECIMAL(4,1) NOT NULL
);

CREATE TABLE vehicles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  plate_number VARCHAR(50) NOT NULL,
  driver_name VARCHAR(50) NOT NULL,
  route_name VARCHAR(100) NOT NULL,
  next_stop VARCHAR(100) NOT NULL,
  eta_minutes INT NOT NULL,
  occupancy_level VARCHAR(20) NOT NULL
);

CREATE TABLE dispatch_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(100) NOT NULL,
  impact_route VARCHAR(100) NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('OPEN', 'PROCESSING', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  suggestion VARCHAR(255) NOT NULL,
  resolution_type VARCHAR(50) DEFAULT NULL,
  resolution_payload TEXT DEFAULT NULL,
  action_notes VARCHAR(255) DEFAULT '',
  handled_by VARCHAR(50) DEFAULT '',
  handled_at TIMESTAMP NULL DEFAULT NULL,
  original_schedule_snapshot LONGTEXT DEFAULT NULL,
  latest_schedule_snapshot LONGTEXT DEFAULT NULL,
  affected_count INT NOT NULL DEFAULT 0,
  notification_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  content VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  target_role VARCHAR(20) NOT NULL DEFAULT 'ALL',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE system_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(50) NOT NULL UNIQUE,
  config_label VARCHAR(100) NOT NULL,
  config_value VARCHAR(100) NOT NULL
);

CREATE TABLE road_conditions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  road_name VARCHAR(100) NOT NULL,
  affected_route VARCHAR(100) NOT NULL,
  status ENUM('OPEN', 'LIMITED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  impact_level ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
  delay_minutes INT NOT NULL DEFAULT 0,
  notes VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE passenger_flows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  route_name VARCHAR(100) NOT NULL,
  date_key DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  passenger_count INT NOT NULL,
  station_hotspot VARCHAR(100) NOT NULL,
  is_simulated TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  role ENUM('ADMIN', 'DISPATCHER', 'STUDENT') NOT NULL,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE schedule_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  version_label VARCHAR(100) NOT NULL,
  triggered_by ENUM('GENERATE', 'PUBLISH', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
  operator_name VARCHAR(50) NOT NULL DEFAULT 'system',
  schedule_snapshot LONGTEXT NOT NULL,
  schedule_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO routes (route_name, start_stop, end_stop, total_distance_km, estimated_duration_min, status) VALUES
('宿舍区A - 教学楼B', '宿舍区A', '教学楼B', 3.8, 15, 'ACTIVE'),
('宿舍区A - 图书馆', '宿舍区A', '图书馆', 2.9, 15, 'ACTIVE'),
('教学楼B - 宿舍区A', '教学楼B', '宿舍区A', 3.8, 15, 'ACTIVE'),
('食堂南门 - 实验楼', '食堂南门', '实验楼', 2.1, 10, 'ACTIVE');

INSERT INTO route_stops (route_id, stop_name, stop_order) VALUES
(1, '宿舍区A', 1),
(1, '第一教学楼', 2),
(1, '教学楼B', 3),
(2, '宿舍区A', 1),
(2, '中心广场', 2),
(2, '图书馆', 3),
(3, '教学楼B', 1),
(3, '第一教学楼', 2),
(3, '宿舍区A', 3),
(4, '食堂南门', 1),
(4, '实验楼北门', 2);

INSERT INTO schedules (route_name, departure_time, arrival_time, bus_code, status, expected_occupancy, notes) VALUES
('宿舍区A - 教学楼B', '07:20:00', '07:35:00', '渝A-0001', 'PUBLISHED', 82, '早高峰主力班次'),
('宿舍区A - 图书馆', '08:10:00', '08:25:00', '渝A-0002', 'PUBLISHED', 76, '课前补充班次'),
('教学楼B - 宿舍区A', '17:30:00', '17:45:00', '渝A-0004', 'PUBLISHED', 88, '晚高峰返程');

INSERT INTO schedule_operation_logs (schedule_id, route_name, action_type, operator_name, action_detail) VALUES
(1, '宿舍区A - 教学楼B', 'CREATE', 'system', '初始化早高峰主力班次'),
(2, '宿舍区A - 图书馆', 'CREATE', 'system', '初始化课前补充班次'),
(3, '教学楼B - 宿舍区A', 'CREATE', 'system', '初始化晚高峰返程班次');

INSERT INTO route_metrics (route_name, peak_passenger_flow, avg_wait_minutes) VALUES
('宿舍区A - 教学楼B', 420, 4.5),
('教学楼B - 宿舍区A', 395, 5.0),
('宿舍区A - 图书馆', 280, 3.8),
('食堂南门 - 实验楼', 190, 4.2),
('体育馆 - 行政楼', 140, 3.5);

INSERT INTO vehicles (plate_number, driver_name, route_name, next_stop, eta_minutes, occupancy_level) VALUES
('渝A-0001', '李师傅', '宿舍区A - 教学楼B', '第一教学楼', 3, '高'),
('渝A-0002', '陈师傅', '宿舍区A - 图书馆', '图书馆西门', 5, '中'),
('渝A-0003', '王师傅', '食堂南门 - 实验楼', '实验楼北门', 8, '低'),
('渝A-0004', '赵师傅', '教学楼B - 宿舍区A', '宿舍区A', 6, '高'),
('渝A-0005', '孙师傅', '宿舍区A - 教学楼B', '宿舍区A', 9, '中');

INSERT INTO dispatch_events (event_type, impact_route, severity, status, suggestion) VALUES
('道路施工', '宿舍区A - 教学楼B', 'HIGH', 'OPEN', '建议绕行东侧主干道并增开1辆车'),
('车辆故障', '食堂南门 - 实验楼', 'MEDIUM', 'PROCESSING', '建议将下一班次合并并延后5分钟');

INSERT INTO notifications (title, content, type, target_role, is_read) VALUES
('早高峰加班次已发布', '宿舍区A - 教学楼B 于 07:20 增开班次，请提前候车。', '调整', 'ALL', 0),
('图书馆线路拥挤提醒', '08:00-08:20 为高峰时段，建议错峰乘车。', '预警', 'STUDENT', 0),
('施工绕行通知', '宿舍区A - 教学楼B 临时调整停靠顺序。', '公告', 'ALL', 1);


INSERT INTO system_configs (config_key, config_label, config_value) VALUES
('eta_tolerance', '到站预测误差阈值（分钟）', '2'),
('peak_warning_threshold', '高峰拥挤预警阈值（%）', '80'),
('genetic_match_weight', '客流匹配度权重', '0.4'),
('empty_run_weight', '空驶率权重', '0.3'),
('wait_time_weight', '等待时间权重', '0.2'),
('dispatch_cost_weight', '调度成本权重', '0.1');

INSERT INTO road_conditions (road_name, affected_route, status, impact_level, delay_minutes, notes) VALUES
('东侧主干道', '宿舍区A - 教学楼B', 'LIMITED', 'HIGH', 8, '早高峰施工导致绕行'),
('图书馆西门支路', '宿舍区A - 图书馆', 'OPEN', 'LOW', 0, '正常通行'),
('实验楼北门通道', '食堂南门 - 实验楼', 'LIMITED', 'MEDIUM', 4, '午间人流密集');

INSERT INTO passenger_flows (route_name, date_key, time_slot, passenger_count, station_hotspot, is_simulated) VALUES
('宿舍区A - 教学楼B', '2026-04-07', '07:00-08:00', 210, '宿舍区A', 1),
('宿舍区A - 教学楼B', '2026-04-07', '08:00-09:00', 180, '第一教学楼', 1),
('宿舍区A - 图书馆', '2026-04-07', '08:00-09:00', 145, '图书馆', 1),
('宿舍区A - 图书馆', '2026-04-07', '20:00-21:00', 110, '图书馆', 1),
('教学楼B - 宿舍区A', '2026-04-07', '17:00-18:00', 205, '教学楼B', 1),
('教学楼B - 宿舍区A', '2026-04-07', '21:00-22:00', 90, '教学楼B', 1),
('食堂南门 - 实验楼', '2026-04-07', '12:00-13:00', 98, '食堂南门', 1),
('食堂南门 - 实验楼', '2026-04-07', '18:00-19:00', 70, '实验楼北门', 1);

INSERT INTO system_users (username, password_hash, role, phone, status) VALUES
('admin01', 'e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7', 'ADMIN', '13800001111', 'ACTIVE'),
('dispatch01', 'ae23a94c3a4bc2ba07322bfb722ac068524d1ec8997640ce9aa5c6065b8170c7', 'DISPATCHER', '13800002222', 'ACTIVE'),
('student01', 'b2a1f4fd0a460606b34c8913e2981dac8d2e283d778aba586c416ee2629bfa54', 'STUDENT', '13800003333', 'ACTIVE');

