# Cuvée Helm chart

This chart runs the same Cuvée image as two Kubernetes workloads:

- a web Deployment behind a ClusterIP Service;
- a worker Deployment that consumes PostgreSQL analysis tasks using
  `FOR UPDATE SKIP LOCKED`.

The default configuration starts two web Pods and two worker Pods. It requires
an external PostgreSQL database and an existing Kubernetes Secret. PostgreSQL
is deliberately not bundled in the chart so production deployments can use a
managed database with independent backups and upgrades.

## Prerequisites

- Kubernetes 1.27 or newer
- Helm 3.13 or newer
- a PostgreSQL 16 or newer database reachable from the cluster
- a Cuvée container image available to every cluster node

## 1. Build and publish the image

Replace `OWNER` and `TAG` with your GitHub owner and a release identifier. For
a private GHCR image, log in with a GitHub token that has `write:packages`.

```bash
export CUVEE_IMAGE=ghcr.io/chenxinlei1/cuvee
export CUVEE_TAG=0.1.0
docker login ghcr.io -u OWNER
docker build -t "$CUVEE_IMAGE:$CUVEE_TAG" .
docker push "$CUVEE_IMAGE:$CUVEE_TAG"
```

Create an image pull Secret when the package is private. The token needs
`read:packages` access to the package.

```bash
kubectl create namespace cuvee
kubectl -n cuvee create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=OWNER \
  --docker-password='YOUR_GITHUB_TOKEN'
```

## 2. Migrate PostgreSQL

Run migrations once from a trusted checkout before the first install and
before upgrades that add a migration. Use the same database URL that the
cluster will use.

```bash
DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/cuvee?sslmode=require' \
  pnpm db:migrate
```

The application image does not contain the Drizzle development CLI, so the
chart does not run migrations as an install hook.

## 3. Create runtime secrets

Generate independent random values for the auth and download secrets. Add the
key for the selected LLM provider. Retrieval and email provider keys are
optional.

```bash
kubectl -n cuvee create secret generic cuvee-secrets \
  --from-literal=DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/cuvee?sslmode=require' \
  --from-literal=CUVEE_AUTH_SECRET="$(openssl rand -hex 32)" \
  --from-literal=CUVEE_DOWNLOAD_SECRET="$(openssl rand -hex 32)" \
  --from-literal=OPENAI_API_KEY='YOUR_OPENAI_KEY'
```

Optional keys can be added with `kubectl -n cuvee edit secret cuvee-secrets`,
including `TAVILY_API_KEY`, `RESEND_API_KEY`, `CUVEE_MAIL_FROM`, `SENTRY_DSN`,
and `CUVEE_METRICS_TOKEN`.

## 4. Install

Create a small values file for the environment:

```yaml
# values-production.yaml
image:
  repository: ghcr.io/chenxinlei1/cuvee
  tag: "0.1.0"
imagePullSecrets:
  - name: ghcr-pull
config:
  NEXT_PUBLIC_APP_URL: https://cuvee.example.com
  NEXT_PUBLIC_DEMO_MODE: "false"
  NEXT_PUBLIC_DEMO_FAST: "true"
  CUVEE_LLM_PROVIDER: openai
  CUVEE_MEMORY_DISABLED: "true"
  CUVEE_TASK_TTL_MS: "86400000"
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: cuvee.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: cuvee-tls
      hosts: [cuvee.example.com]
```

Install or upgrade idempotently:

```bash
helm upgrade --install cuvee ./deploy/helm/cuvee \
  --namespace cuvee \
  --create-namespace \
  --values values-production.yaml \
  --atomic \
  --timeout 10m
```

## 5. Verify

```bash
kubectl -n cuvee get pods,service,ingress
kubectl -n cuvee rollout status deployment/cuvee
kubectl -n cuvee rollout status deployment/cuvee-worker
kubectl -n cuvee port-forward service/cuvee 3000:80
```

Open <http://localhost:3000/api/health>. A healthy deployment returns HTTP 200
with `"database": true`.

For troubleshooting:

```bash
kubectl -n cuvee describe pod POD_NAME
kubectl -n cuvee logs deployment/cuvee --tail=100
kubectl -n cuvee logs deployment/cuvee-worker --tail=100
helm -n cuvee history cuvee
```

## Persistence and scaling

Persistence is disabled by default and `CUVEE_MEMORY_DISABLED=true` because
the current memory layer uses SQLite. Do not let several Pods write to the
same SQLite file. If the memory layer is required, use one replica with a
`ReadWriteOnce` volume. A multi-node, multi-replica deployment needs a
`ReadWriteMany` storage class for shared files and should still keep the
SQLite memory layer disabled until it is replaced by PostgreSQL or another
multi-writer store.

Web and worker autoscaling are optional. CPU-based autoscaling requires a
working Metrics Server. Worker scaling is safe because queue claims use
PostgreSQL row locking, though LLM rate limits and cost should determine the
maximum replica and concurrency values.
