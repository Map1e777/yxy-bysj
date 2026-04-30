#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env"
SQL_FILE="$ROOT_DIR/sql/init.sql"

if ! command -v mysql >/dev/null 2>&1; then
  echo "未找到 mysql 客户端，请先安装 MySQL 客户端。"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "未找到 $ENV_FILE"
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "未找到 $SQL_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-campus_shuttle}"

echo "正在初始化数据库: ${DB_NAME}"
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" < "$SQL_FILE"
echo "数据库初始化完成。"
