# Cuvée 可观测性运维手册

这份手册覆盖 Loki + Promtail + Grafana 观测栈的日常管理。核心原则：

> **配置即代码。** 数据源、告警规则、看板全部由 `monitoring/` 目录下的文件
> 管理（Grafana provisioning），改配置 = 改文件 + `docker compose restart`。
> 在 Grafana UI 里直接改 provisioned 对象会在容器重启后被覆盖。

## 1. 架构与端口

| 服务 | 端口 | 作用 |
|---|---|---|
| `app` | 3000 | Cuvée 应用 + `/api/metrics`（Prometheus 文本指标） |
| `postgres` | 5432 | 应用数据库 |
| `backup` | — | 每日校验备份（同时为备份告警提供日志信号） |
| `loki` | 3100 | 日志聚合存储（默认保留 7 天） |
| `promtail` | — | 采集 Docker 容器日志 → 推送 Loki |
| `grafana` | 3001 | 看板 + 告警 |

数据流：

```
容器 stdout/stderr ── promtail(docker socket 采集) ──> Loki ──> Grafana 查询
app /api/metrics   ────────────────────────────────────────> Grafana Prometheus 数据源
```

## 1.5 状态速查卡（先看这里）

| 想知道的 | 去哪看 |
|---|---|
| 后端活着吗 / 数据库通不通 | `http://localhost:3000/api/health`（`ok` / `database` 字段） |
| 运行指标（分析数、失败率、任务队列、worker 心跳、内存） | `http://localhost:3000/api/metrics`（纯文本）；图形化看 Grafana → Cuvée Overview |
| 有没有告警 | Grafana → Alerting（五条规则状态） |
| 日志（错误、分析失败、备份） | Grafana → Explore（Loki），或 `docker compose logs -f app` |
| 业务层审计（登录、权限变更、下载） | 应用内 `/admin` → Security activity |
| 容器/服务健康 | `docker compose ps` |
| 每次提交后代码是否健康 | GitHub Actions（lint / typecheck / 测试 / 构建 / Docker 冒烟 / 观测栈冒烟） |

速记：**实时看 `health` + `metrics`，长期/告警看 Grafana，业务安全看 `/admin` 审计。**

## 2. 日常起停

```bash
docker compose up -d --build    # 全家桶（含观测栈）
docker compose ps               # 查看容器状态
docker compose logs -f app      # 应用日志
docker compose logs -f promtail # 采集器日志
docker compose logs -f grafana  # Grafana 日志
docker compose down             # 停止（数据卷保留）
docker compose restart grafana  # 改完 provisioning 后重启生效
```

> 注意端口占用：`app` 用 3000、`grafana` 用 3001。如果本地还开着
> `npm run dev`（占 3000），先停掉再 `docker compose up`。

## 3. Grafana 使用

- 地址：http://localhost:3001
- 账号：`admin` / `GRAFANA_ADMIN_PASSWORD`（默认 `admin`，**首次部署务必修改**）
- 看板：左侧 **Dashboards → Cuvée Overview**（分析吞吐、失败率、任务队列、
  worker 心跳、数据库健康、进程内存、报告活动）
- 告警：**Alerting** 页查看五条规则状态（Normal / Pending / Firing）
- 通知：**Alerting → Contact points** 维护 `cuvee-alerts`

## 4. 告警规则

预置五条（见 `monitoring/grafana/provisioning/alerting/alert-rules.yml`）：

| 规则 | 触发条件 | 级别 |
|---|---|---|
| Analysis failure rate high | 10 分钟失败率 > 20% | critical |
| Analysis worker heartbeat stale | worker 心跳缺失或 > 120s | critical |
| PostgreSQL unreachable | `cuvee_database_up == 0` 持续 2 分钟 | critical |
| Database backup missing | 25 小时无 `cuvee-*.dump` 成功记录 | warning |
| Database backup failed | 备份容器日志出现 error/failed/fatal | critical |

### 新增/修改规则

1. 编辑 `alert-rules.yml`（结构参考现有规则：`data` 里 A=查询、B=阈值、C=reduce）；
2. `docker compose restart grafana`；
3. 在 Alerting 页确认规则已加载（或交给 CI 的 `observability-smoke` 校验）。

### 临时静默

告警误报或维护窗口期：Grafana → Alerting → **Silences** → 新建静默
（按规则名/标签匹配，可设过期时间）。静默只影响通知，不影响规则状态。

### 通知配置

在 `.env` 中设置后重启 `grafana`：

```dotenv
ALERT_WEBHOOK_URL=https://hooks.example.com/cuvee   # 企业微信/钉钉/Slack 等
ALERT_EMAIL=ops@example.com
GF_SMTP_ENABLED=true
GF_SMTP_HOST=smtp.example.com:587
GF_SMTP_USER=...
GF_SMTP_PASSWORD=...
GF_SMTP_FROM_ADDRESS=alerts@cuvee.demo
```

webhook 和邮箱会同时挂在 `cuvee-alerts` 联系点上；都不配置时，告警只在
Grafana 内可见。

## 5. 查询日志（Loki）

在 Grafana → **Explore**（数据源选 Loki）里写 LogQL，或直接：

```bash
# 应用错误事件
curl -G 'http://localhost:3100/loki/api/v1/query' \
  --data-urlencode 'query={container="cuvee-app-1"} | json level="error"' \
  --data-urlencode 'limit=100' \
  --data-urlencode "time=$(date +%s)"

# 按事件名过滤（如分析失败）
curl -G 'http://localhost:3100/loki/api/v1/query' \
  --data-urlencode 'query={compose_service="app"} |= "analysis.failed"' \
  --data-urlencode 'limit=50' \
  --data-urlencode "time=$(date +%s)"

# 备份容器日志
curl -G 'http://localhost:3100/loki/api/v1/query' \
  --data-urlencode 'query={container="cuvee-backup-1"}' \
  --data-urlencode 'limit=20' \
  --data-urlencode "time=$(date +%s)"
```

常用标签：`container`（如 `cuvee-app-1`）、`compose_service`（如 `app`）、
`level`、`event`（结构化日志提取）。

## 6. 指标

- 应用指标：`curl http://localhost:3000/api/metrics`；
- 指标包含：分析/任务计数、报告活动、登录、worker 心跳、进程 uptime/heap/RSS、
  数据库健康；
- 若设置了 `CUVEE_METRICS_TOKEN`，Grafana 的 Prometheus 数据源需加
  Authorization 请求头（见
  `monitoring/grafana/provisioning/datasources/datasources.yml` 注释块）。

## 7. 数据与磁盘

- Loki 默认保留 7 天：改 `monitoring/loki/config.yaml` 的
  `limits_config.retention_period`；
- 数据落在命名卷：`loki-data`、`grafana-data`（备份不受影响，在 `backups/`）；
- 清空历史日志（谨慎）：

```bash
docker compose down
docker volume rm cuvee_loki-data cuvee_grafana-data
```

## 8. 排障速查

| 症状 | 排查 |
|---|---|
| Grafana 打不开 3001 | `docker compose ps` 看 grafana 是否 Running；`docker compose logs grafana` 看启动报错；确认 3001 未被其它进程占用 |
| 看板/规则没加载 | provisioning 文件语法错误会导致整份配置加载失败；本地先 `python3 -c "import yaml,sys; yaml.safe_load(open('monitoring/grafana/provisioning/alerting/alert-rules.yml'))"` 校验，再 `docker compose restart grafana` |
| Loki 查不到日志 | `docker compose logs promtail` 看采集报错；确认 docker socket 挂载正常；临时 `curl http://localhost:3100/ready` 确认 Loki 健康 |
| 告警一直 Pending 不 Firing | 规则有 `for:` 持续时间，等够时间；或在规则页看查询是否真的有数据 |
| 分析失败率告警无数据 | 应用还没产生 `cuvee_analyses_total`/`cuvee_analysis_errors_total`，属正常；无数据时规则默认 OK |
| 端口冲突 | `lsof -nP -iTCP:3000 -sTCP:LISTEN` 找占用进程，停掉 dev server 或换端口 |

## 9. 自动化保障

CI 的 `observability-smoke` job 每次提交都会：启动完整 compose 栈 → 校验
两个数据源、五条告警规则、看板加载成功 → 查询 Loki 确认 promtail 日志管道
真实在工作。改 `monitoring/` 后推代码即可获得回归验证。
