# Architecture – CC2026 Applications

Diagrams below describe what is actually deployed. Nothing else (no database, no gateway, no monitoring service) is deployed yet; later project parts extend this.

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
            subgraph plan["Container Apps environment"]
                fe["Frontend container app<br/>Nginx + React (port 8080)"]
                be["Backend container app<br/>FastAPI (port 8000)"]
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

    subgraph azure["«node» Microsoft Azure – Container Apps environment"]
        subgraph feapp["«executionEnvironment» Frontend container app<br/>container: frontend:&lt;sha&gt;"]
            nginx["«component» Nginx :8080<br/>static files, /config.js, /healthz"]
        end
        subgraph beapp["«executionEnvironment» Backend container app<br/>container: backend:&lt;sha&gt;"]
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

The Container Apps ingress terminates TLS on port 443 and forwards traffic to the target port of each app (8080 frontend, 8000 backend).

## CI/CD flow

```mermaid
flowchart LR
    push[Push to main] --> test["Test / build<br/>pytest · tsc + vite build"]
    test --> login[Azure login<br/>GitHub OIDC]
    login --> build[docker build<br/>tag :sha and :latest]
    build --> pushimg[docker push to ACR]
    pushimg --> exists{Container app exists?}
    exists -- no --> notice[Notice: run Terraform<br/>with CREATE_WEB_APPS=true]
    exists -- yes --> deploy["az containerapp update<br/>--image acr/image:sha"]
    deploy --> verify[Poll /health or /version.txt<br/>until it returns the sha]
```

Pull requests run only the test/build job. Azure credentials are never available to pull request runs.
