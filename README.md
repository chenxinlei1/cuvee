# Cuvée 葡萄酒智能与溯源平台

Cuvée 是一个面向葡萄酒业务的 Web 平台，覆盖酒庄分析、贸易工作区、批次溯源、公开扫码验真、报告管理和平台权限管理。

项目基于 Next.js、PostgreSQL、Drizzle ORM 和 Tailwind CSS 构建，支持本地开发、Docker Compose、以及 Kubernetes / minikube 部署。当前版本重点补齐了酒庄与酒商的权限隔离、溯源产品管理、公开扫码页、多语言界面和简约化后台管理。

## 主要功能

- 葡萄酒年份与产区分析：结合气候、风土、公开资料和上传文档生成结构化分析报告。
- 酒庄工作区：面向酒庄管理员和酒庄操作员，管理酒庄侧分析与报告。
- 贸易工作区：面向酒商、商超、采购等角色，管理贸易侧分析与报告。
- 葡萄酒溯源：支持产品新增、删除、证据上传、来源记录、批次证明和公开链接生成。
- 公开扫码验真：通过公开链接查看产品来源、二维码、验证状态、风险提示和公开编号。
- 平台管理：管理用户、角色权限、组织、审计记录和分析任务队列。
- 权限隔离：酒庄用户与贸易用户按角色和组织类型进入不同工作区，平台管理员拥有全局管理权限。
- 多语言界面：面向中、英、法三语界面逐步完善，当前核心页面已中文化。
- 运维能力：提供健康检查、备份恢复、指标接口、Grafana / Loki 观测栈和 Helm Chart。

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL
- Drizzle ORM
- Docker / Docker Compose
- Kubernetes / Helm
- OpenAI、Anthropic、Qwen、DeepSeek、Ollama 等可选 LLM Provider
- Tavily、Brave、SearXNG 等可选检索 Provider

## 快速启动

### 环境要求

| 工具 | 最低版本 | 检查命令 |
| --- | --- | --- |
| Node.js | 20 | `node -v` |
| pnpm | 10 | `pnpm -v` |
| PostgreSQL | 16 | `psql --version` |
| Docker | 可选 | `docker version` |

macOS、Linux 和 WSL2 均可运行。原生 Windows 暂未重点测试。

### 1. 安装依赖

```bash
git clone https://github.com/weijt606/cuvee.git
cd cuvee
pnpm install
```

如果本机 Node 版本混乱，建议使用 Node 20：

```bash
nvm install 20
nvm use 20
corepack enable
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

至少需要配置：

```env
DATABASE_URL=postgresql://cuvee:cuvee-local@127.0.0.1:5432/cuvee
CUVEE_AUTH_SECRET=replace-with-a-random-secret-of-at-least-32-characters
CUVEE_DOWNLOAD_SECRET=replace-with-an-independent-random-secret
CUVEE_LLM_PROVIDER=openai
OPENAI_API_KEY=
TAVILY_API_KEY=
```

本地开发可以不填真实 LLM 和检索 Key，但分析功能会降级为 fixture 或 fallback。生产环境不要提交任何真实密钥。

### 3. 启动数据库并执行迁移

```bash
docker compose up -d postgres
pnpm db:migrate
```

### 4. 启动本地开发服务

```bash
pnpm dev
```

打开：

```text
http://localhost:3000
```

健康检查：

```text
http://localhost:3000/api/health
```

## 常用测试和检查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:rbac
pnpm test:security
pnpm test:tasks
```

权限、用户、组织、报告分享相关改动后，建议至少运行：

```bash
pnpm test:rbac
pnpm test:report-auth
pnpm test:org-admin
```

## 演示账号

开发环境会自动写入演示账号。生产环境只有在 `CUVEE_SEED_DEMO_USERS=true` 时才会写入，公开部署不要开启这个开关。

| 角色 | 邮箱 | 密码 |
| --- | --- | --- |
| 平台超级管理员 | `peradmin@cuvee.demo` | `cuvee-platform-2024` |
| 酒庄管理员 | `winery-admin@cuvee.demo` | `cuvee-winery-2024` |
| 酒庄操作员 | `winery-staff@cuvee.demo` | `cuvee-cellar-2024` |
| 商超 / 酒商管理员 | `buyer-admin@cuvee.demo` | `cuvee-buyer-admin-2024` |
| 采购员 | `buyer-staff@cuvee.demo` | `cuvee-buyer-staff-2024` |

## 角色与权限

系统内置五类角色：

- `platformAdmin`：平台超级管理员，可访问 `/admin`，管理用户、组织、权限、审计和任务。
- `wineryAdmin`：酒庄管理员，可访问酒庄工作区和本组织资源。
- `wineryStaff`：酒庄操作员，可访问酒庄工作区。
- `buyerAdmin`：商超 / 酒商管理员，可访问贸易工作区和本组织资源。
- `buyerStaff`：采购员，可访问贸易工作区。

工作区访问由数据库权限控制，不只依赖前端隐藏按钮。酒庄侧用户默认进入 `/vineyard`，贸易侧用户默认进入 `/trade`，平台管理员默认进入 `/admin`。

## 重要页面

| 页面 | 说明 |
| --- | --- |
| `/login` | 登录 |
| `/register` | 注册申请 |
| `/vineyard` | 酒庄工作区 |
| `/trade` | 贸易工作区 |
| `/provenance` | 葡萄酒溯源管理 |
| `/provenance/scan/[token]` | 公开扫码验真页 |
| `/reports` | 报告列表 |
| `/admin` | 平台管理 |
| `/admin/organizations` | 组织管理 |
| `/account/security` | 账号安全 |

## Docker Compose

完整本地栈包括应用、PostgreSQL、备份服务、Loki、Promtail 和 Grafana：

```bash
docker compose up -d --build
```

访问：

```text
应用：http://localhost:3000
Grafana：http://localhost:3001
Loki：http://localhost:3100
```

立即备份数据库：

```bash
pnpm db:backup
```

恢复数据库：

```bash
DATABASE_URL=postgresql://... pnpm db:restore -- backups/cuvee-TIMESTAMP.dump
```

## minikube 镜像更新

如果本地源码改完后要同步到 minikube，需要重新构建镜像、加载到 minikube，并重启 Deployment：

```bash
cd /Users/xinleichen/Documents/Codex/2026-08-17/du/cuvee

docker build -t cuvee:local .
minikube image load cuvee:local --overwrite
kubectl -n cuvee rollout restart deployment/cuvee
kubectl -n cuvee rollout status deployment/cuvee
```

如果 worker 也要同步：

```bash
kubectl -n cuvee rollout restart deployment/cuvee-worker
kubectl -n cuvee rollout status deployment/cuvee-worker
```

本地 `pnpm dev` 常占用 3000，minikube 可以转发到 3001：

```bash
kubectl -n cuvee port-forward service/cuvee 3001:80
```

访问：

```text
http://localhost:3001
```

## Helm 部署

Helm Chart 位于：

```text
deploy/helm/cuvee
```

它会部署独立的 Web Deployment 和 Worker Deployment，需要外部 PostgreSQL 和 Kubernetes Secret。详细步骤见：

```text
deploy/helm/cuvee/README.md
```

## GitHub 推送

提交当前可运行版本：

```bash
git status
git add .
git commit -m "feat: improve cuvee platform"
git push origin main
```

如果远端已有新提交：

```bash
git pull --rebase origin main
git push origin main
```

## 常见问题

### 页面没有更新

Next.js 开发服务有时会保留旧缓存。可以停止服务后清理 `.next` 再启动：

```bash
mv .next ../cuvee-next-backup-$(date +%Y%m%d%H%M%S)
pnpm dev
```

### pnpm 找不到

```bash
corepack enable
corepack prepare pnpm@10.28.0 --activate
pnpm -v
```

如果仍然不行，可以临时使用：

```bash
npx pnpm@10.28.0 dev
```

### Git 命令崩溃

如果系统里存在架构不匹配的 MacPorts Git，可以直接用 macOS 自带 Git：

```bash
/usr/bin/git status
```

### Sentry 开发日志很吵

开发环境可能看到 `import-in-the-middle can't be external` 或 `require-in-the-middle can't be external` 警告。它通常不会阻止页面运行，后续可通过调整 `instrumentation.ts` 的开发环境导入逻辑进一步处理。

## 目录说明

```text
src/app                  Next.js App Router 页面和 API
src/components           前端组件
src/lib                  业务逻辑、权限、数据库、i18n、任务队列
drizzle                  数据库迁移
data                     本地数据和运行时缓存
scripts                  数据库、测试、备份和导入脚本
deploy/helm/cuvee        Kubernetes Helm Chart
monitoring               Grafana、Loki、Promtail 配置
```

## 许可证

MIT
