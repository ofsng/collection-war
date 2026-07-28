# ADR-0012: S3-compatible object storage

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

The game will need to store binary assets: creature art, avatars, and eventually
player-uploaded content. These do not belong in PostgreSQL — large binaries in a relational
database bloat backups, slow replication and make every restore slower.

The project has no cloud provider and no intention of choosing one prematurely
([ADR-0019](ADR-0019-cloud-neutral-architecture.md)).

## Decision

**An S3-compatible object storage interface**, with **MinIO** as the local implementation.

The application uses only the common S3 API surface: put, get, delete, presigned URLs.
No provider-specific feature is used without an ADR.

Configuration exposes `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, credentials and
`STORAGE_FORCE_PATH_STYLE` — the last because MinIO needs path-style addressing while most
cloud endpoints prefer virtual-host style.

## Alternatives considered

**Files on the application server's local disk.** Simplest. Rejected: it makes the API
stateful, so replicas cannot share uploads and horizontal scaling breaks. Also no redundancy
and no CDN path.

**Binaries in PostgreSQL (`bytea` or large objects).** Transactional with the rest of the
data, which is genuinely appealing. Rejected: it inflates the database, the backups and the
restore time — and restore time is what matters during an incident.

**A specific provider's SDK (AWS S3, Cloudflare R2, Google Cloud Storage).** Best
integration with that provider. Rejected: lock-in adopted before any provider has been
chosen, and — decisively — none of them can run locally, which breaks the "local development
is real" principle.

**A CDN with its own storage (e.g. Cloudinary).** Convenient for image transformation.
Rejected: a per-asset cost model and a proprietary API for something the project may never
need.

## Positive consequences

- **Provider choice stays open**, and providers can be compared on price and egress —
  the line item that most often surprises people.
- The API stays stateless.
- The same S3 API is exercised locally as in any hosted environment. Not a mock.
- Presigned URLs let clients upload directly, so large files never pass through the API.
- MinIO runs in Docker Compose with a bucket created automatically at startup.

## Negative consequences

- One more local service to run.
- The lowest-common-denominator API means forgoing provider-specific conveniences —
  lifecycle policies, image transformation, event triggers.
- Object storage is **not transactional** with the database. An upload followed by a failed
  transaction leaves an orphaned object, so a cleanup process will eventually be needed.
- Presigned URLs require careful scoping: too permissive, and they become an arbitrary
  upload endpoint.

## Risks

- **File uploads are a security surface** and none of the controls exist yet: content-based
  validation, size limits, generated names, serving from a cookieless domain, never rendering
  user content as HTML. Recorded in
  [security architecture](../architecture/SECURITY_ARCHITECTURE.md#file-uploads).
- **Egress cost.** The most commonly underestimated cloud line item, and a reason to prefer a
  provider that does not charge for it.
- Orphaned objects accumulating without a cleanup job.

## Review conditions

- A provider-specific feature would deliver a large, measurable benefit → new ADR, stating
  what lock-in is being accepted and why.
- Asset delivery cost or latency becomes measurable → evaluate a CDN in front of the bucket,
  which does not change the storage decision.
- **Before the first upload feature:** the upload security requirements must be implemented,
  not merely documented.
