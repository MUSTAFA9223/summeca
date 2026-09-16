# SUMMECA mobile performance audit — 2026-09-16

Scope: homepage/auth presentation plus the authenticated InvoiceFlow and LeadFollow AI workspaces.

## Findings

- The current production homepage and auth screen do **not** mount the previous Spline/Three.js robot. They render the lightweight `WorkspaceOverviewPreview` instead, so the current public first screen does not pay an active 3D/WebGL runtime cost.
- InvoiceFlow loaded up to 300 client rows and 300 invoice rows using `select('*')`. The dashboard now requests only the fields it actually uses.
- LeadFollow AI loaded 100 leads plus up to 600 message rows using `select('*')`. The dashboard is now capped at 50 leads per page and up to 300 recent message rows, with explicit field selection.
- The auth login/signup transition used CSS blur filters plus an extra-large backdrop blur on small screens. Blur-filter animation was removed and the mobile backdrop blur was reduced while preserving the existing transform/opacity animation.

## Safety

No payment, authentication, entitlement, download, database schema, mailbox OAuth, or security behavior is changed by this audit. No 3D experience is reintroduced as part of a performance pass.
