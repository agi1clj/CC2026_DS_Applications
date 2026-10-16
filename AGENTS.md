# AGENTS.md

Teaching project (UTCN Cloud Computing). Keep changes small and explainable to students.

## Layout
- `backend/` FastAPI (Python 3.15). Routes in `app/main.py`, settings in `app/config.py`, data source behind `MeasurementSource` in `app/data.py`.
- `frontend/` React + TypeScript (Vite), served by Nginx on 8080. Backend URL comes from runtime `/config.js`, never from the build.
- Infrastructure lives in the companion Infra repositories: `..._Infra` (Azure) and `..._Infra_AWS` (AWS).
- `deploy/aws/` Elastic Beanstalk bundle: `docker-compose.yml` (image placeholders filled by CI) + `proxy/nginx.conf` (routes `/api/*`, `/health` → backend, rest → frontend).

## Verify before finishing
- `cd backend && python -m pytest`
- `cd frontend && npm ci && npm run build` (type-check + build)
- `docker compose up --build` → http://localhost:3000 shows the table
- `actionlint .github/workflows/*.yml`, `shellcheck scripts/*.sh frontend/docker/*.sh`
- AWS proxy config: `docker run --rm -v "$PWD/deploy/aws/proxy/nginx.conf:/etc/nginx/conf.d/default.conf:ro" --add-host backend:127.0.0.1 --add-host frontend:127.0.0.1 public.ecr.aws/nginx/nginx:1.31-alpine nginx -t`

## Rules
- No secrets anywhere. Frontend config is public (`window.APP_CONFIG`).
- Ports are contracts with Terraform and `deploy/aws/`: backend 8000, frontend 8080. Change all of them together.
- Deployments use image tag `<commit-sha>`; `latest` exists only for first Web App creation (Azure).
- Azure workflows (`backend.yml`, `frontend.yml`) and the AWS workflow (`deploy-aws.yml`) are independent; each deploys only when its cloud variable is set (`AZURE_CLIENT_ID` / `AWS_DEPLOY_ROLE_ARN`). Never make one depend on the other.
- Workflows log in with OIDC (`azure/login`, `aws-actions/configure-aws-credentials`, `id-token: write`); do not add publish profiles, client secrets or AWS access keys.
- Pin dependency versions; keep `package-lock.json` in sync.
- Commits follow Conventional Commits: `type(scope): summary` with type in feat, fix, docs, refactor, test, ci, build, chore (e.g. `fix(bootstrap): reuse existing state resource group`).

## Agent skills (recommended)
Claude Code offers the Azure skills and AWS's Agent Toolkit (`aws-core`; `aws-containers` covers Elastic Beanstalk and ECR) automatically when you trust the folder (`.claude/settings.json`). Other agents: `npx skills add microsoft/azure-skills` (azure-diagnostics helps with App Service container start-up issues; this project does not use azd), `npx skills add aws/agent-toolkit-for-aws/skills`.
