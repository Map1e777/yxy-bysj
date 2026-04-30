# 校园通勤班车智能排班系统

本项目基于 PRD 实现了一个前后端分离的毕业设计原型：

- 前端：Vue 3 + Vite + Vue Router + Axios
- 后端：Node.js + Express + MySQL
- 数据库脚本：`sql/init.sql`

## 目录结构

- `frontend`：前端项目
- `backend`：后端项目
- `sql`：数据库初始化脚本
- `校园通勤班车智能排班系统PRD.md`：产品需求文档

## 已实现模块

- 运行概览仪表盘
- 师生服务门户
- 班次列表查询与智能生成
- 手动新增班次
- 调度事件登记与列表查看
- 线路、站点、车辆、通知和系统参数管理
- 收藏路线与意见反馈
- 基础统计分析页面
- MySQL 表结构和种子数据

## 后端启动

1. 进入 `backend` 目录。
2. 复制 `.env.example` 为 `.env` 并修改数据库配置。
3. 安装依赖：`npm install`
4. 启动服务：`npm run dev`

默认接口地址：`http://localhost:3000/api`

## 前端启动

1. 进入 `frontend` 目录。
2. 安装依赖：`npm install`
3. 启动项目：`npm run dev`

默认访问地址：`http://localhost:5173`

## 数据库初始化

在 MySQL 中执行：

```sql
SOURCE /Users/tal/Documents/mine/yxy/sql/init.sql;
```

如果你的 MySQL 客户端不支持 `SOURCE`，也可以直接导入该 SQL 文件内容执行。

如果你之前已经初始化过旧版本数据库，建议重新执行一次 [sql/init.sql](/Users/tal/Documents/mine/yxy/sql/init.sql)，因为当前版本新增了线路、站点、通知、反馈、收藏和系统参数相关表。

## 后续可扩展方向

- 接入真实定位数据与地图组件
- 增加登录鉴权和角色权限
- 增加站点、线路、车辆管理页面
- 增加排班调整日志、通知推送和统计图表
- 将“智能生成示例排班”替换为真实算法服务
