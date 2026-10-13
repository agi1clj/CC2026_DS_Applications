# Architecture – CC2026 P1 Applications

Diagrams below describe what is actually deployed. Nothing else (no database, no gateway, no monitoring service) is part of P1.

## Conceptual architecture

```mermaid
flowchart TB
    subgraph Users
        browser([User browser])
        dev([Student / developer])
    end

    subgraph GitHub
        repo[CC2026_..._Apps repository]
        gha[GitHub Actions<br/>backend.yml / frontend.yml]
    end

    subgraph Azure["Azure subscription"]
        subgraph rg["Resource group rg-cc2026-&lt;initials&gt;-dev"]
            acr[(Azure Container Registry<br/>backend:&lt;sha&gt;, frontend:&lt;sha&gt;)]
            subgraph plan["App Service Plan (Linux, B1)"]
                fe["Frontend Web App<br/>Nginx + React (port 8080)"]
                be["Backend Web App<br/>FastAPI (port 8000)"]
            end
            id[Managed identity<br/>AcrPull]
        end
    end

    dev -- git push --> repo --> gha
    gha -- "OIDC login + docker push" --> acr
    gha -- "set image tag" --> fe & be
    acr -- "pull (managed identity)" --> fe & be
    id -.- fe & be
    browser -- "HTTPS: HTML/JS" --> fe
    browser -- "HTTPS: GET /api/data (CORS)" --> be
```

## UML deployment diagram

Mermaid has no native UML deployment diagram, so nodes and artifacts are drawn with UML stereotypes.

```mermaid
flowchart LR
    subgraph client["«device» Client computer"]
        subgraph bro["«executionEnvironment» Web browser"]
            spa["«artifact» React SPA (JS bundle)<br/>config.js"]
        end
    end

    subgraph azure["«node» Microsoft Azure – App Service Plan (Linux B1)"]
        subgraph feapp["«executionEnvironment» Frontend Web App<br/>container: frontend:&lt;sha&gt;"]
            nginx["«component» Nginx :8080<br/>static files, /config.js, /healthz"]
        end
        subgraph beapp["«executionEnvironment» Backend Web App<br/>container: backend:&lt;sha&gt;"]
            api["«component» Uvicorn + FastAPI :8000<br/>/health, /api/data, /docs"]
        end
    end

    subgraph registry["«node» Azure Container Registry (Basic)"]
        img1["«artifact» backend image"]
        img2["«artifact» frontend image"]
    end

    spa -- "HTTPS 443" --> nginx
    spa -- "HTTPS 443 / REST + JSON" --> api
    img2 -. "deployed as" .-> feapp
    img1 -. "deployed as" .-> beapp
```

App Service terminates TLS on port 443 and forwards traffic to the port given by `WEBSITES_PORT` (8080 frontend, 8000 backend).

## CI/CD flow

```mermaid
flowchart LR
    push[Push to main] --> test["Test / build<br/>pytest · tsc + vite build"]
    test --> login[Azure login<br/>GitHub OIDC]
    login --> build[docker build<br/>tag :sha and :latest]
    build --> pushimg[docker push to ACR]
    pushimg --> exists{Web App exists?}
    exists -- no --> notice[Notice: run Terraform<br/>with CREATE_WEB_APPS=true]
    exists -- yes --> deploy["az webapp config set<br/>DOCKER|acr/image:sha"]
    deploy --> verify[Poll /health or /version.txt<br/>until it returns the sha]
```

Pull requests run only the test/build job. Azure credentials are never available to pull request runs.
