# Icon catalog and policy

Icons are essential for architecture and technical diagrams. Labels remain mandatory unless the user asks for icon-only output.

## Icon mode default

Default and recommended mode is `icon-first` whenever the notation supports it. In architecture and technical-system diagrams, every primary component gets a relevant visual symbol plus a label:

- use the real product, vendor, model, or service logo when a recognizable technology is named
- use a native semantic icon or stencil for generic concepts such as users, queues, documents, policies, and generic services
- preserve canonical ER, UML, sequence, BPMN, and flowchart notation when its shapes already carry the visual semantics

Offer `simplified-icons` only when the user explicitly requests non-branded or vendor-neutral output. Lack of network access or one missing logo does not disable icons: use the best semantic icon for that node, keep its label, disclose the substitution, and leave resolved logos intact.

Do not silently replace a missing brand with an unrelated glyph or a bare text box. If Google Drive, Salesforce, and SAP use real logos, then Slack, Anthropic, OpenAI, code repositories, databases, queues, and other named products should also get real logos when available and specific semantic icons otherwise.

When a detailed official/product logo exists, do not replace it with a simplified monochrome glyph just to fit the diagram palette. Preserve the source artwork and adjust the chip/background, label placement, or surrounding fill to make it readable in light and dark mode.

## Lookup and setup behavior

Use already embedded icons, built-in draw.io stencils, configured local icon caches, and local manifests first. When the host permits read-only web access, retrieve only the selected public SVGs needed for the diagram and embed them. This is a technical asset lookup, not a legal-clearance decision and not a reason for a separate wizard.

Ask only when the host requires network consent or the action would install a package, write MCP configuration, use a hosted service, download a bulk pack/index, or create a persistent cache. If lookup is unavailable or declined, continue with per-node native semantic icons; do not remove visual symbols or downgrade a whole family to text boxes.

Repository icon contracts usually govern application UI/code, not architecture diagrams. Default is to ignore repo icon contracts for diagrams. Ask only when the user explicitly wants the diagram to follow those contracts.

## Provider routing

Use the narrowest source that yields a clean, recognizable icon. Preserve provider, slug/style, and variant in the task report.

| Priority | Source                                               | Best for                                                            | Notes                                                                                                                                                         |
| -------: | ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|        1 | Existing embedded icon or local cache                | repeat edits, offline/private work                                  | Reuse the exact accepted variant.                                                                                                                             |
|        2 | Native draw.io stencils/style strings                | AWS, Azure, GCP, Kubernetes, networking, architecture primitives    | Usually the most editable and reliable service-level representation.                                                                                          |
|        3 | [Lobe Icons](https://github.com/lobehub/lobe-icons)  | AI/LLM models, providers, and AI applications                       | Prefer the static SVG package; use color/brand-color symbols before monochrome or text lockups.                                                               |
|        4 | [Simple Icons](https://simpleicons.org/)             | broad software, SaaS, database, developer-tool, and platform brands | Broad slug-based coverage and brand-color SVG delivery.                                                                                                       |
|        5 | theSVG registry/cache                                | color/product variants or brands missing above                      | Prefer symbol variants over wordmarks.                                                                                                                        |
|        6 | Iconify, Devicon, developer-icons, Web3/crypto packs | maintained domain-specific gaps                                     | Fetch only the selected SVG and embed it.                                                                                                                     |
|        7 | Native/generic vector libraries                      | non-brand concepts and unresolved brands                            | Material Symbols, Tabler, Lucide, Font Awesome, Bootstrap Icons, and Heroicons provide semantic fallbacks. Keep the original product label when substituting. |

## Logo consistency rules

- Prefer pure symbol/icon variants. Do not use a text wordmark, such as a full OpenAI wordmark, unless all logos in that visual group are wordmarks or the user requested wordmarks.
- If color logos are used in a diagram, use color variants for all logos where the source offers color. Do not mix color logos with monochrome variants except when a brand only offers black/white.
- If a logo exists only in black or only in white, use exactly that source variant on a background where it remains visible. Do not recolor black/white logos.
- Do not tint, recolor, crop, stretch, skew, rotate, invert, or dark-mode-filter brand logos.
- Preserve aspect ratio. Image/logo cells must include `aspect=fixed` or an equivalent fixed-aspect image setting, and their geometry should match the SVG `viewBox` ratio whenever possible.
- Put fixed-color logos on neutral chip backgrounds that work in light and dark mode. Change the chip/background when contrast is weak instead of changing the logo.
- Use consistent chip geometry in a visual family. Common default chips are 44x44 or 48x48 with 6-8 px padding; use a non-square chip only when the source viewBox requires it, and then keep similar logos consistent.
- A missing real logo is a per-node warning to resolve or disclose, not a reason to remove icons from peer nodes.

## Common logo pitfalls to avoid

- Bun: preserve the original Bun logo artwork. Do not invert or simplify it; use a neutral chip/background with enough contrast instead.
- Redis: use the recognizable Redis logo from the provider route, not an unrelated red glyph or outdated-looking placeholder.
- BullMQ: avoid washed-out low-contrast marks in dark mode. Use a recognizable mark where available, or a labelled semantic queue icon for that node.
- Mixed chips: avoid 42x42, 40x48, and 48x48 chips in the same row unless viewBox ratios require it and the difference is deliberate.

## Self-contained output

Generated diagrams must embed SVG/image data as data URIs. Do not rely on remote image URLs inside diagram XML. Percent-encode the SVG payload, or use draw.io's marker-less base64 form so the style parser does not split on a `;base64` delimiter.

Use:

```text
shape=image;image=data:image/svg+xml,BASE64_PAYLOAD;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;html=1;
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

| Need                       | Preferred style prefix                                                                                                           |   Size | Notes                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -----: | ------------------------------------------------------------------- |
| AWS Lambda                 | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda;` + `icon`                                                          |  60x60 | Known-good fixture style.                                           |
| AWS EC2 / compute          | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2;` + `icon`                                                             |  60x60 | Verify with shape search when exact service naming matters.         |
| AWS API Gateway            | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.api_gateway;` + `icon`                                                     |  60x60 | Fallback: labelled native API/service icon.                         |
| AWS S3 / object storage    | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.s3;` + `icon`                                                              |  60x60 | Generic storage fallback: `data`.                                   |
| AWS RDS                    | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.rds;` + `icon`                                                             |  60x60 | Generic relational DB fallback: `data`.                             |
| AWS DynamoDB               | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.dynamodb;` + `icon`                                                        |  60x60 | Generic NoSQL DB fallback: `data`.                                  |
| AWS SQS / queue            | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sqs;` + `icon`                                                             |  60x60 | Generic fallback: `shape=mxgraph.flowchart.stored_data;` + `box`.   |
| AWS SNS / pub-sub          | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sns;` + `icon`                                                             |  60x60 | Use edge labels for topic/event semantics.                          |
| AWS EventBridge            | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.eventbridge;` + `icon`                                                     |  60x60 | Generic fallback: `shape=message;outlineConnect=0;` + `icon`.       |
| AWS CloudFront / CDN       | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.cloudfront;` + `icon`                                                      |  60x60 | Generic fallback: cloud shape.                                      |
| AWS VPC / network boundary | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.vpc;` + `icon`                                                             |  60x60 | Often better as a labelled container.                               |
| Azure App Service          | `shape=mxgraph.azure.app_services;` + `icon`                                                                                     |  60x60 | Verify exact Azure library name before delivery.                    |
| Azure Functions            | `shape=mxgraph.azure.function_apps;` + `icon`                                                                                    |  60x60 | Use AWS Lambda/generic function shape only in non-Azure diagrams.   |
| Azure Storage              | `shape=mxgraph.azure.storage_accounts;` + `icon`                                                                                 |  60x60 | Generic storage fallback: `data`.                                   |
| Azure SQL Database         | `shape=mxgraph.azure.sql_database;` + `icon`                                                                                     |  60x60 | Generic relational DB fallback: `data`.                             |
| Azure Service Bus          | `shape=mxgraph.azure.service_bus;` + `icon`                                                                                      |  60x60 | Generic queue fallback when missing.                                |
| Azure Key Vault            | `shape=mxgraph.azure.key_vaults;` + `icon`                                                                                       |  60x60 | Generic fallback: labelled lock.                                    |
| Azure Virtual Network      | `shape=mxgraph.azure.virtual_networks;` + `icon`                                                                                 |  60x60 | Usually pair with a container.                                      |
| GCP Compute Engine         | `shape=mxgraph.gcp2.compute_engine;` + `icon`                                                                                    |  60x60 | Verify with search for current GCP2 stencil names.                  |
| GCP Cloud Run              | `shape=mxgraph.gcp2.cloud_run;` + `icon`                                                                                         |  60x60 | Generic fallback: `shape=mxgraph.networks.server;` + `icon`.        |
| GCP Cloud Functions        | `shape=mxgraph.gcp2.cloud_functions;` + `icon`                                                                                   |  60x60 | Generic fallback: `shape=mxgraph.archimate3.function;` + `box`.     |
| GCP Cloud Storage          | `shape=mxgraph.gcp2.cloud_storage;` + `icon`                                                                                     |  60x60 | Generic storage fallback: `data`.                                   |
| GCP Pub/Sub                | `shape=mxgraph.gcp2.pubsub;` + `icon`                                                                                            |  60x60 | Generic fallback: `shape=message;outlineConnect=0;` + `icon`.       |
| GCP BigQuery               | `shape=mxgraph.gcp2.bigquery;` + `icon`                                                                                          |  60x60 | Generic fallback: `data`.                                           |
| GCP Cloud SQL              | `shape=mxgraph.gcp2.cloud_sql;` + `icon`                                                                                         |  60x60 | Generic relational DB fallback: `data`.                             |
| GCP Load Balancing         | `shape=mxgraph.gcp2.cloud_load_balancing;` + `icon`                                                                              |  60x60 | Generic fallback: `shape=mxgraph.networks.load_balancer;` + `icon`. |
| Kubernetes API             | `shape=mxgraph.kubernetes.api;` + `icon`                                                                                         |  60x60 | Native Kubernetes stencil prefix.                                   |
| Kubernetes Pod             | `shape=mxgraph.kubernetes.pod;` + `icon`                                                                                         |  60x60 | Use for runtime placement, not logical service.                     |
| Kubernetes Service         | `shape=mxgraph.kubernetes.svc;` + `icon`                                                                                         |  60x60 | Label as `Service`, not just `svc`.                                 |
| Kubernetes Ingress         | `shape=mxgraph.kubernetes.ing;` + `icon`                                                                                         |  60x60 | Keep edge direction external -> ingress -> service.                 |
| Kubernetes Deployment      | `shape=mxgraph.kubernetes.deploy;` + `icon`                                                                                      |  60x60 | Generic fallback: `shape=mxgraph.networks.server;` + `icon`.        |
| Kubernetes ConfigMap       | `shape=mxgraph.kubernetes.cm;` + `icon`                                                                                          |  60x60 | Use a document fallback if missing.                                 |
| Kubernetes Secret          | `shape=mxgraph.kubernetes.secret;` + `icon`                                                                                      |  60x60 | Use a lock fallback if missing.                                     |
| Kubernetes Namespace       | `shape=mxgraph.kubernetes.ns;` + `icon`                                                                                          |  60x60 | Usually better as a labelled container.                             |
| User / actor               | `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;`                                                          |  40x70 | Good for flow and architecture entrypoints.                         |
| Browser / client           | `shape=mxgraph.mockup.forms.window;` + `box`                                                                                     | 140x80 | Semantic browser/client symbol.                                     |
| Generic server             | `shape=mxgraph.networks.server;` + `box`                                                                                         | 100x80 | Semantic server symbol.                                             |
| Generic database           | `data`                                                                                                                           | 100x70 | Portable and theme-friendly.                                        |
| Generic queue              | `shape=mxgraph.flowchart.stored_data;` + `box`                                                                                   | 120x60 | Label with queue/topic name.                                        |
| Lock / secret              | `shape=mxgraph.networks2.icon;network2Icon=mxgraph.networks2.lock;network2IconW=0.8;network2IconH=0.9999;aspect=fixed;` + `icon` |  48x48 | Label the icon `Lock` or `Secret` according to its role.            |
| Firewall                   | `shape=mxgraph.cisco19.firewall;` + `icon`                                                                                       |  60x60 | Verify Cisco stencil availability if exact style matters.           |
| Cloud boundary             | `shape=cloud;whiteSpace=wrap;html=1;` + `box`                                                                                    | 160x90 | Use as a boundary sparingly.                                        |
| Document                   | `shape=mxgraph.flowchart.document;` + `box`                                                                                      | 120x70 | Good for reports, policies, files.                                  |
| Decision                   | `rhombus;whiteSpace=wrap;html=1;` + `box`                                                                                        | 140x80 | Keep labels short.                                                  |

Treat this table as a fast path, not as the full icon universe. For high-fidelity vendor diagrams, verify uncommon style strings through `search_shapes`, `scripts/search-shapes.mjs`, or the editor before final delivery.

## External SVG lookup

Do not maintain static provider manifests in this skill. Slugs, aliases, variants, and package versions drift. Resolve only the selected assets at task time through Lobe Icons, Simple Icons, theSVG, or the narrower fallback provider chosen above.

Lookup workflow:

1. Search existing embedded assets and local caches first.
2. For AI/LLM brands, query Lobe Icons and retrieve `@lobehub/icons-static-svg@<version>/icons/<slug>.svg` from its documented package/CDN path.
3. For broad technology brands, query Simple Icons by slug; use its documented SVG/package/CDN path and source color when suitable.
4. If those sources miss, inspect theSVG or a narrower maintained provider. Prefer pure symbol/icon variants over wordmarks and use `mono`, `light`, or `dark` only when provided by the source.
5. Fetch only the selected SVG, require a positive viewBox or size, and reject scripts, `foreignObject`, event handlers, DOCTYPE, and non-local `href`/`url(...)` references. Same-document `#fragment` reuse is valid. Then embed it as a data URI; never leave `@latest` or a runtime CDN URL in the final diagram.
6. Record provider, slug/style, variant, and any semantic fallback. Do not perform per-icon legal research unless the user asks for it.

Use these tables as candidate lookup terms, not as pinned slugs. Verify each selected icon against the manifest before embedding or naming a concrete source path.

High-value lookup examples to verify at runtime:

| Domain        | Example lookup terms                                                                 |
| ------------- | ------------------------------------------------------------------------------------ |
| AI            | OpenAI, ChatGPT, Anthropic, Mistral, Hugging Face, Cohere, Gemini, LangChain, Ollama |
| Automation    | n8n, Make, Zapier, Airbyte, Apache Airflow, Retool, BullMQ                           |
| SaaS/Business | Salesforce, HubSpot, Slack, Notion, Odoo, SAP, Microsoft                             |
| Cloud/Runtime | AWS, Azure, Google Cloud, Cloudflare, Vercel, Supabase, Docker, Kubernetes, Bun      |
| Data/Ops      | PostgreSQL, Snowflake, Databricks, dbt, BigQuery, Grafana, Prometheus, Redis         |
| Dev/Security  | GitHub, GitLab, Python, TypeScript, React, Next.js, Node.js, Auth0, Okta, Sentry     |

Business AI workflow lookup pack:

| Workflow area     | Candidate lookup terms                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| LLM/RAG           | LangGraph, LangSmith, LlamaIndex, Perplexity, DeepSeek, Workers AI                                               |
| Automation        | n8n, Make, Zapier, Airbyte, Apache Airflow, Retool, BullMQ                                                       |
| ERP/CRM           | SAP, DATEV, Odoo, Salesforce, HubSpot, Microsoft, Slack, Notion                                                  |
| Cloud/runtime     | AWS, Microsoft Azure, Google Cloud, Cloudflare, Cloudflare Workers AI, Vercel, Supabase, Docker, Kubernetes, Bun |
| Data/BI           | PostgreSQL, Redis, Snowflake, Databricks, dbt, BigQuery, Tableau, Metabase, Grafana, Elasticsearch, Prometheus   |
| Delivery/security | GitHub, GitHub Actions, GitHub Copilot, GitLab, Python, TypeScript, React, Next.js, Node.js, 1Password, Keycloak |

## Icon validation

Check that every primary component has a relevant symbol in `icon-first` mode, each recognized brand/source resolved to a real logo where available, per-node substitutions remain labelled, dimensions are positive, aspect ratio is preserved, chip sizes are consistent within visual families, the icon is not larger than its parent node, the icon does not overlap the label, embedded data is valid in portable mode, remote image URLs are absent, no logo was recolored/inverted/simplified unexpectedly, and light/dark variants remain visible.

## Rights responsibility

When any third-party logo or icon appears—including native vendor stencils and generic third-party icon libraries—add the standard responsibility notice from `delivery.md` once in the final response. Do not put it inside the diagram, claim legal clearance, block delivery on a per-icon license audit, or research individual terms unless the user explicitly requests compliance review.

Sources: integrated from draw.io stencil/library practice, current draw.io stencil prefixes, the existing architecture icon fixture, Lobe Icons, Simple Icons, theSVG, Iconify, Devicon, developer-icons, Material Symbols, Tabler, Lucide, Font Awesome, web3icons, cryptocurrency-icons, business AI workflow lookup feedback, logo preservation feedback, chip consistency feedback, and icon validation rules.
