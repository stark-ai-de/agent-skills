# Icon catalog and policy

Icons are essential for architecture and technical diagrams, but labels remain mandatory unless the user asks for icon-only output.

## Decision ladder

1. Native draw.io stencils and style strings.
2. Shape search through available MCP `search_shapes` or an explicitly configured local shape index.
3. Approved local SVG/icon cache, embedded as a data URI.
4. Generic draw.io shapes if no icon is found.

## Self-contained output

Generated diagrams must embed SVG/image data as data URIs. Do not rely on remote image URLs inside diagram XML.

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
| AWS API Gateway | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.api_gateway;` + `icon` | 60x60 | Use a labelled box fallback if unavailable. |
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
| Browser / client | `shape=mxgraph.mockup.forms.window;` + `box` | 140x80 | Fallback: rounded box labelled `Client`. |
| Generic server | `shape=mxgraph.networks.server;` + `box` | 100x80 | Fallback: rounded box labelled `Server`. |
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

Use theSVG only after native stencils and configured local shape search miss a needed brand/product icon. Network access, CLI install, MCP use, or icon download requires explicit user approval unless the needed SVG already exists in an approved local cache.

Lookup workflow:

1. Search any approved local icon cache first.
2. If the user approves network lookup, inspect `https://thesvg.org/api/registry.json` and match by slug, title, aliases, categories, and available variants.
3. Prefer `mono`, `light`, or `dark` variants for theme-aware diagrams. Use `default` brand-color variants only on neutral chip backgrounds.
4. Fetch only the selected SVG, for example `https://thesvg.org/icons/{slug}/{variant}.svg`, then embed it as a data URI.
5. Record the source, slug, variant, and any license/trademark note available from the manifest in the final response.

High-value lookup examples to verify at runtime:

| Domain        | Example lookup terms                                                                 |
| ------------- | ------------------------------------------------------------------------------------ |
| AI            | OpenAI, ChatGPT, Anthropic, Mistral, Hugging Face, Cohere, Gemini, LangChain, Ollama |
| Automation    | n8n, Make, Zapier, Airbyte, Apache Airflow, Retool                                   |
| SaaS/Business | Salesforce, HubSpot, Slack, Notion, Odoo, SAP, Microsoft                             |
| Cloud/Runtime | AWS, Azure, Google Cloud, Cloudflare, Vercel, Supabase, Docker, Kubernetes           |
| Data/Ops      | PostgreSQL, Snowflake, Databricks, dbt, BigQuery, Grafana, Prometheus                |
| Dev/Security  | GitHub, GitLab, Python, TypeScript, React, Next.js, Node.js, Auth0, Okta, Sentry     |

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

Check that each icon source resolved, dimensions are positive, aspect ratio is preserved, the icon is not larger than its parent node, the icon does not overlap the label, embedded data is valid in portable mode, remote image URLs are absent, and light/dark variants remain visible.

## External icons

Do not fetch or embed remote icons without explicit user approval. When using a local icon cache, preserve source/license notes in the task output and embed the selected SVG as a data URI.

Sources: integrated from draw.io stencil/library practice, current draw.io stencil prefixes, the existing architecture icon fixture, and icon validation rules.
