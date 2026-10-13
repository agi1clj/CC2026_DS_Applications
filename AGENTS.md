# AGENTS.md

Teaching project (UTCN Cloud Computing). Keep changes small and explainable to students.

## Layout
- `backend/` FastAPI (Python 3.15). Routes in `app/main.py`, settings in `app/config.py`, data source behind `MeasurementSource` in `app/data.py`.
- `frontend/` React + TypeScript (Vite), served by Nginx on 8080. Backend URL comes from runtime `/config.js`, never from the build.
- Infrastructure lives in the companion Infra repository.

## Verify before finishing
- `cd backend && python -m pytest`
- `cd frontend && npm ci && npm run build` (type-check + build)
- `docker compose up --build` → http://localhost:3000 shows the table
- `actionlint .github/workflows/*.yml`, `shellcheck scripts/*.sh frontend/docker/*.sh`

## Rules
- No secrets anywhere. Frontend config is public (`window.APP_CONFIG`).
- Ports are contracts with Terraform: backend 8000, frontend 8080. Change both repos together.
- Deployments use image tag `<commit-sha>`; `latest` exists only for first Web App creation.
- Workflows log in with OIDC (`azure/login`, `id-token: write`); do not add publish profiles or client secrets.
- Pin dependency versions; keep `package-lock.json` in sync.
- Commits follow Conventional Commits: `type(scope): summary` with type in feat, fix, docs, refactor, test, ci, build, chore (e.g. `fix(bootstrap): reuse existing state resource group`).
