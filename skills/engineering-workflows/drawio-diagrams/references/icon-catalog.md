# Icon catalog and policy

Icons are essential for architecture and technical diagrams. Labels remain mandatory unless the user asks for icon-only output.

## Icon mode default

Default and recommended mode is `brand-logos`: use real product, vendor, and service logos/icons wherever a recognizable brand or technology is named. This maximizes recognition in stakeholder diagrams.

Offer `simplified-icons` as an explicit alternative when the user wants non-branded visuals, legal review is pending, network access is denied, or a diagram should avoid vendor-specific marks. In simplified mode, use generic draw.io shapes consistently for the whole diagram or the whole visual family.

Do not mix real logos with placeholders for equivalent entities. If Google Drive, Salesforce, and SAP use real logos, then Slack, Anthropic, OpenAI, code repositories, databases, queues, and other named products should also get real icons if a source is available. If a logo cannot be found after the approved source cascade, ask whether to continue searching, use a user-supplied logo, or downgrade that family to simplified icons.

## Approval and setup behavior

The skill may use already embedded icons, built-in draw.io stencils, configured local icon caches, and previously approved local manifests without asking again. Network fetches, package installs, MCP config writes, hosted services, and new cache downloads still require explicit approval.

When brand logos are likely needed and no approved local source exists, ask during initial setup, before diagram generation:

```text
Recommended: use real logos for named products and embed them in the .drawio file.
May I fetch missing SVG logos from approved icon sources for this diagram? If not, I will use simplified generic icons consistently.
```

Repository icon contracts usually govern application UI/code, not architecture diagrams. Default is to ignore repo icon contracts for diagrams. Ask only when the user explicitly wants the diagram to follow those contracts.

## Source cascade for real icons

Use the first source that yields a clean SVG/icon with the preferred variant. Preserve source names in the task report.

| Priority | Source | Best for | Notes |
| ---: | --- | --- | --- |
| 1 | Existing embedded icon or approved local cache | repeat edits, offline/private work | Reuse exact logo variants already accepted in the file or project. |
| 2 | Native draw.io stencils/style strings | cloud services, Kubernetes, networking, architecture primitives | Best for AWS/Azure/GCP/Kubernetes service icons and editable shapes. |
| 3 | theSVG registry/cache | broad brand, SaaS, AI, cloud, product logos | Prefer symbol/icon variants over wordmarks; use `light`, `dark`, or `mono` only when the source provides those variants. |
| 4 | Simple Icons / Simple Icons draw.io | popular brand glyphs | Useful when theSVG misses a brand or when a reusable draw.io library is preferred. |
| 5 | Iconify icon sets | broad fallback across many maintained open-source icon sets | Search Iconify when individual libraries miss; export the selected SVG and embed it. |
| 6 | Devicon / developer-icons | programming languages, frameworks, databases, dev tools | Useful for Code, GitHub, TypeScript, Python, React, Node, Docker, PostgreSQL, etc. |
| 7 | Web3 and crypto packs | chains, wallets, coins, protocols | Use `web3icons`, `cryptocurrency-icons`, or equivalent approved caches for blockchain diagrams. |
| 8 | Generic visual libraries | non-brand UI concepts | Material Symbols, Tabler, Lucide, Font Awesome, Bootstrap Icons, and Heroicons are good for generic users, locks, documents, alerts, arrows, servers, and UI metaphors. Lucide explicitly avoids brand logos, so use it only for simplified/generic mode. |

## Logo consistency rules

- Prefer pure symbol/icon variants. Do not use a text wordmark, such as a full OpenAI wordmark, unless all logos in that visual group are wordmarks or the user requested wordmarks.
- If color logos are used in a diagram, use color variants for all logos where the source offers color. Do not mix color logos with monochrome variants except when a brand only offers black/white.
- If a logo exists only in black or only in white, use exactly that source variant on a background where it remains visible. Do not recolor black/white logos.
- Do not tint, recolor, crop, stretch, skew, or rotate brand logos.
- Preserve aspect ratio. Image/logo cells must include `aspect=fixed` or an equivalent fixed-aspect image setting, and their geometry should match the SVG `viewBox` ratio whenever possible.
- Put fixed-color logos on neutral chip backgrounds that work in light and dark mode.
- A missing real icon is a warning to resolve before delivery, not a reason to silently emit a placeholder.

## Self-contained output

Generated diagrams must embed SVG/image data as data URIs. Do not rely on remote image URLs inside diagram XML.

Use:

```text
shape=image;image=data:image/svg+xml;base64,...;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;html=1;
```

Preserve aspect ratio. Use 48x48 or 60x60 icon cells, with label below or adjacent. For non-square logos, size the cell to the source viewBox ratio, for example 96x48 or 120x40.

## Curated native style starters

Use these style strings before searching external icon sources. Keep labels beside or below icons; icons alone are not enough for technical diagrams. The `icon` base is best for 48x48 or 60x60 icon cells with a label below; the `box` base is best when the shape carries the label inside the cell.

Reusable bases:

```text
icon: verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;whiteSpace=wrap;fontSize=12;fontColor=light-dark(#0f172a,#f8fafc);fillColor=none;strokeColor=light-dark(#334155,#cbd5e1);
box: rounded=1;whiteSpace=wrap;html=1;fillColor=light-dark(#ffffff,#1f2937);strokeColor=light-dark(#334155,#cbd5e1);fontColor=light-dark(#111827,#f9fafb);
data: shape=cylinder3d;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=light-dark(#dbeafe,#1e3a8a);strokeColor=light-dark(#2563eb,#93c5fd);fontColor=light-dark(#172554,#eff6ff);
```

| Need | Preferred style prefix | Size | Notes |
| --- | --- | ---: | --- |
| AWS Lambda | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda;` + `icon` | 60x60 | Known-good fixture style. |
| AWS EC2 / compute | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2;` + `icon` | 60x60 | Verify with shape search when exact service naming matters. |
| AWS API Gateway | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.api_gateway;` + `icon` | 60x60 | Use a labelled box fallback only in simplified mode. |
| AWS S3 / object storage | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.s3;` + `icon` | 60x60 | Generic storage fallback: `data`. |
| AWS RDS | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.rds;` + `icon` | 60x60 | Generic relational DB fallback: `data`. |
| AWS DynamoDB | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.dynamodb;` + `icon` | 60x60 | Generic NoSQL DB fallback: `data`. |
| AWS SQS / queue | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sqs;` + `icon` | 60x60 | Generic fallback: `shape=mxgraph.flowchart.stored_data;` + `box`. |
| AWS SNS / pub-sub | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sns;` + `icon` | 60x60 | Use edge labels for topic/event semantics. |
| AWS EventBridge | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.eventbridge;` + `icon` | 60x60 | Generic event bus fallback: rounded box. |
| AWS CloudFront / CDN | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.cloudfront;` + `icon` | 60x60 | Generic fallback: cloud shape. |
| AWS VPC / network boundary | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.vpc;` + `icon` | 60x60 | Often better as a labelled container. |
| Azure App Service | `shape=mxgraph.azure.app_services;` + `icon` | 60x60 | Verify exact Azure library name before delivery. |
| Azure Functions | `shape=mxgraph.azure.function_apps;` + `icon` | 60x60 | Use AWS Lambda/generic function shape only in non-Azure diagrams. |
| Azure Storage | `shape=mxgraph.azure.storage_accounts;` + `icon` | 60x60 | Generic storage fallback: `data`. |
| Azure SQL Database | `shape=mxgraph.azure.sql_database;` + `icon` | 60x60 | Generic relational DB fallback: `data`. |
| Azure Service Bus | `shape=mxgraph.azure.service_bus;` + `icon` | 60x60 | Generic queue fallback when missing. |
| Azure Key Vault | `shape=mxgraph.azure.key_vaults;` + `icon` | 60x60 | Generic fallback: labelled lock. |
| Azure Virtual Network | `shape=mxgraph.azure.virtual_networks;` + `icon` | 60x60 | Usually pair with a container. |
| GCP Compute Engine | `shape=mxgraph.gcp2.compute_engine;` + `icon` | 60x60 | Verify with search for current GCP2 stencil names. |
| GCP Cloud Run | `shape=mxgraph.gcp2.cloud_run;` + `icon` | 60x60 | Generic service box fallback. |
| GCP Cloud Functions | `shape=mxgraph.gcp2.cloud_functions;` + `icon` | 60x60 | Generic function box fallback. |
| GCP Cloud Storage | `shape=mxgraph.gcp2.cloud_storage;` + `icon` | 60x60 | Generic storage fallback: `data`. |
| GCP Pub/Sub | `shape=mxgraph.gcp2.pubsub;` + `icon` | 60x60 | Generic event topic fallback. |
| GCP BigQuery | `shape=mxgraph.gcp2.bigquery;` + `icon` | 60x60 | Generic analytics DB fallback. |
| GCP Cloud SQL | `shape=mxgraph.gcp2.cloud_sql;` + `icon` | 60x60 | Generic relational DB fallback: `data`. |
| GCP Load Balancing | `shape=mxgraph.gcp2.cloud_load_balancing;` + `icon` | 60x60 | Generic load balancer fallback. |
| Kubernetes API | `shape=mxgraph.kubernetes.api;` + `icon` | 60x60 | Native Kubernetes stencil prefix. |
| Kubernetes Pod | `shape=mxgraph.kubernetes.pod;` + `icon` | 60x60 | Use for runtime placement, not logical service. |
| Kubernetes Service | `shape=mxgraph.kubernetes.svc;` + `icon` | 60x60 | Label as `Service`, not just `svc`. |
| Kubernetes Ingress | `shape=mxgraph.kubernetes.ing;` + `icon` | 60x60 | Keep edge direction external -> ingress -> service. |
| Kubernetes Deployment | `shape=mxgraph.kubernetes.deploy;` + `icon` | 60x60 | Generic workload fallback: rounded box. |
| Kubernetes ConfigMap | `shape=mxgraph.kubernetes.cm;` + `icon` | 60x60 | Use a document fallback if missing. |
| Kubernetes Secret | `shape=mxgraph.kubernetes.secret;` + `icon` | 60x60 | Use a lock fallback if missing. |
| Kubernetes Namespace | `shape=mxgraph.kubernetes.ns;` + `icon` | 60x60 | Usually better as a labelled container. |
| User / actor | `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;` | 40x70 | Good for flow and architecture entrypoints. |
| Browser / client | `shape=mxgraph.mockup.forms.window;` + `box` | 140x80 | Simplified-mode fallback for web client. |
| Generic server | `shape=mxgraph.networks.server;` + `box` | 100x80 | Simplified-mode fallback for server. |
| Generic database | `data` | 100x70 | Portable and theme-friendly. |
| Generic queue | `shape=mxgraph.flowchart.stored_data;` + `box` | 120x60 | Label with queue/topic name. |
| Lock / secret | `shape=mxgraph.basic.lock;` + `icon` | 48x48 | Fallback: small rounded box labelled `Secret`. |
| Firewall | `shape=mxgraph.cisco19.firewall;` + `icon` | 60x60 | Verify Cisco stencil availability if exact style matters. |
| Cloud boundary | `shape=cloud;whiteSpace=wrap;html=1;` + `box` | 160x90 | Use as a boundary sparingly. |
| Document | `shape=mxgraph.flowchart.document;` + `box` | 120x70 | Good for reports, policies, files. |
| Decision | `rhombus;whiteSpace=wrap;html=1;` + `box` | 140x80 | Keep labels short. |

Treat this table as a fast path, not as the full icon universe. For high-fidelity vendor diagrams, verify uncommon style strings through `search_shapes`, `scripts/search-shapes.mjs`, or the editor before final delivery.

## Optional theSVG lookup

Do not maintain a static theSVG slug catalog in this skill. Slugs, aliases, variants, and license fields can drift, so verify them against an approved local manifest or the live registry before use.

Use theSVG after local caches, native stencils, and configured local shape search miss a needed brand/product icon. Network access, CLI install, MCP use, or icon download requires explicit user approval unless the needed SVG already exists in an approved local cache.

Lookup workflow:

1. Search any approved local icon cache first.
2. If the user approves network lookup, inspect `https://thesvg.org/api/registry.json` and match by slug, title, aliases, categories, and available variants.
3. Prefer pure icon/symbol variants over wordmarks. Use `mono`, `light`, or `dark` variants only when those variants are provided by the source and match the overall logo color mode.
4. Fetch only the selected SVG, for example `https://thesvg.org/icons/{slug}/{variant}.svg`, then embed it as a data URI.
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

Enterprise / DACH B2B AI lookup pack:

| Workflow area     | Candidate lookup terms                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| LLM/RAG           | LangGraph, LangSmith, LlamaIndex, Perplexity, DeepSeek, Workers AI                                               |
| Automation        | n8n, Make, Zapier, Airbyte, Apache Airflow, Retool                                                               |
| ERP/CRM           | SAP, DATEV, Odoo, Salesforce, HubSpot, Microsoft, Slack, Notion                                                  |
| Cloud/runtime     | AWS, Microsoft Azure, Google Cloud, Cloudflare, Cloudflare Workers AI, Vercel, Supabase, Docker, Kubernetes      |
| Data/BI           | PostgreSQL, Snowflake, Databricks, dbt, BigQuery, Tableau, Metabase, Grafana, Elasticsearch, Prometheus          |
| Delivery/security | GitHub, GitHub Actions, GitHub Copilot, GitLab, Python, TypeScript, React, Next.js, Node.js, 1Password, Keycloak |

## Icon validation

Check that each recognized brand/source resolved to a real logo in `brand-logos` mode, dimensions are positive, aspect ratio is preserved, the icon is not larger than its parent node, the icon does not overlap the label, embedded data is valid in portable mode, remote image URLs are absent, no black/white logo was recolored, and light/dark variants remain visible.

## External icons

Do not fetch or embed remote icons without explicit user approval. When using a local icon cache, preserve source/license notes in the task output and embed the selected SVG as a data URI.

Sources: integrated from draw.io stencil/library practice, current draw.io stencil prefixes, the existing architecture icon fixture, theSVG, Simple Icons, Iconify, Devicon, developer-icons, Material Symbols, Tabler, Lucide, Font Awesome, web3icons, cryptocurrency-icons, enterprise AI lookup feedback, and icon validation rules.
