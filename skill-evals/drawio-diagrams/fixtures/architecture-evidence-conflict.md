# Fictional Architecture Evidence Bundle

All names and values in this fixture are synthetic.

## README excerpt — revision A

The application requires Redis between the API and worker. The architecture overview shows Redis as a current production dependency.

## Accepted ADR excerpt — revision B

Status: Accepted. New deployments should use the durable queue directly; Redis is no longer a required runtime dependency.

## Deployment manifest excerpt — revision C

The worker still declares `CACHE_MODE=redis`, while the API has no Redis configuration. The deployment metadata does not explain whether this is active, transitional, or stale.

## Existing diagram note

The current editable view labels Redis as “Required” and has no freshness or uncertainty marker.
