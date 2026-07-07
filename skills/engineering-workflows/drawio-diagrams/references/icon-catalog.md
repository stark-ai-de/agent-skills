# Icon catalog and policy

Icons are essential for architecture and technical diagrams, but labels remain mandatory unless the user asks for icon-only output.

## Decision ladder

1. Native draw.io stencils and style strings.
2. Shape search through available MCP `search_shapes` or an explicitly configured local shape index.
3. Approved local SVG/icon cache, embedded as a data URI.
4. Generic draw.io shapes if no icon is found.

## Self-contained output

Generated diagrams must embed SVG/image data as data URIs. Do not rely on remote image URLs inside diagram XML.

## Common style-string families to curate

Maintain a compact table of 30-60 verified common shapes, including:

- AWS: compute, lambda, API gateway, S3, RDS, DynamoDB, SQS/SNS, EventBridge, CloudFront, VPC.
- Azure: app service, functions, storage, SQL database, service bus, key vault, virtual network.
- GCP: compute, cloud functions/run, storage, pub/sub, BigQuery, cloud SQL, load balancer.
- Kubernetes: pod, service, ingress, deployment, config map, secret, namespace.
- Generic: user, browser/client, server, database cylinder, queue, lock, firewall, cloud, document, decision.

## Optional theSVG lookup

Do not maintain a static theSVG slug catalog in this skill. Slugs, aliases, variants, and license fields can drift, so verify them against an approved local manifest or the live registry before use.

Use theSVG only after native stencils and configured local shape search miss a needed brand/product icon. Network access, CLI install, MCP use, or icon download requires explicit user approval unless the needed SVG already exists in an approved local cache.

Lookup workflow:

1. Search any approved local icon cache first.
2. If the user approves network lookup, inspect `https://thesvg.org/api/registry.json` and match by slug, title, aliases, categories, and available variants.
3. Prefer `mono`, `light`, or `dark` variants for theme-aware diagrams. Use `default` brand-color variants only on neutral chip backgrounds.
4. Fetch only the selected SVG, for example `https://thesvg.org/icons/{slug}/{variant}.svg`, then embed it as a data URI unless the user explicitly chooses linked mode.
5. Record the source, slug, variant, and any license/trademark note available from the manifest in the final response.

Use these tables as candidate lookup terms, not as pinned slugs. Verify each selected icon against the manifest before embedding or naming a concrete source path.

High-value lookup examples to verify at runtime:

| Domain        | Example lookup terms                                                                 |
| ------------- | ------------------------------------------------------------------------------------ |
| AI            | OpenAI, ChatGPT, Anthropic, Mistral, Hugging Face, Cohere, Gemini, LangChain, Ollama |
| Automation    | n8n, Make, Zapier, Airbyte, Apache Airflow, Retool                                   |
| SaaS/Business | Salesforce, HubSpot, Slack, Notion, Odoo, SAP, Microsoft                             |
| Cloud/Runtime | AWS, Azure, Google Cloud, Cloudflare, Vercel, Supabase, Docker, Kubernetes           |
| Data/Ops      | PostgreSQL, Snowflake, Databricks, dbt, BigQuery, Grafana, Prometheus                |
| Dev/Security  | GitHub, GitLab, Python, TypeScript, React, Next.js, Node.js, Auth0, Okta, Sentry     |

German B2B AI / stark AI lookup pack:

| Workflow area     | Candidate lookup terms                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| LLM/RAG           | LangGraph, LangSmith, LlamaIndex, Perplexity, DeepSeek, Workers AI                                             |
| Automation        | n8n, Make, Zapier, Airbyte, Apache Airflow, Retool                                                             |
| ERP/CRM           | SAP, DATEV, Odoo, Salesforce, HubSpot, Microsoft, Slack, Notion                                                |
| Cloud/runtime     | AWS, Microsoft Azure, Google Cloud, Cloudflare, Cloudflare Workers AI, Vercel, Supabase, Docker, Kubernetes    |
| Data/BI           | PostgreSQL, Snowflake, Databricks, dbt, BigQuery, Tableau, Metabase, Grafana, Elasticsearch, Prometheus        |
| Delivery/security | GitHub, GitHub Actions, GitHub Copilot, GitLab, Python, TypeScript, React, Next.js, Node.js, 1Password, Keycloak |

## SVG embedding style

Use:

```text
shape=image;image=data:image/svg+xml;base64,...;verticalLabelPosition=bottom;verticalAlign=top;html=1;
```

Preserve aspect ratio. Use 48x48 or 60x60 icon cells, with label below or adjacent.

## Light/dark icon rules

- Prefer native stencils for recolorable architecture symbols.
- Use fixed brand colors only on neutral chip backgrounds.
- Prefer `light`, `dark`, or `mono` variants when available.
- Do not recolor brand logos unless the source provides the variant.

## Icon validation

Check that each icon source resolved, dimensions are positive, aspect ratio is preserved, the icon is not larger than its parent node, the icon does not overlap the label, embedded data is valid in portable mode, linked URLs are disclosed in linked mode, and light/dark variants remain visible.

## External icons

Do not fetch or embed remote icons without explicit user approval. When using a local icon cache, preserve source/license notes in the task output and embed the selected SVG as a data URI unless the user explicitly chooses linked mode.

Sources: integrated from draw.io stencil/library practice and icon validation rules.
