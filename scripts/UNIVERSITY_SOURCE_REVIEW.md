# University source refresh and manual verification

## What the scheduled job does
- Runs weekly on Monday at 03:20 UTC (09:20 Bangladesh time); it can also be started manually from **Actions → Scheduled university data and logo source refresh → Run workflow**.
- Re-runs the existing university logo candidate collector against the university directory already present in the repository.
- Stores a provenance manifest and candidate images as a workflow artifact, then commits changed candidate files to the automation branch.
- It does **not** publish candidate logos into the live UI or overwrite the canonical university directory automatically.

## Source tracking
Each entry in `src/data/official-logo-manifest.json` should retain:
- university name and category as represented in the project directory;
- source URL and source file/title, when available;
- license metadata when supplied by the source;
- collection status and a verification status.

Treat automated search results as leads, not proof of official identity. Prefer an institution's own website or a government/UGC directory for institution identity. Wikimedia Commons can be a discovery source, but verify the original file page and its license.

## Manual review checklist
For each candidate:
1. Compare the image with the university's official website or a trusted government/UGC listing.
2. Confirm the institution name, emblem/wordmark, and country match; reject campus photos, unrelated seals, and similarly named institutions.
3. Open the source page and record the direct source URL, author/owner, license, and any attribution requirement.
4. Check image clarity, crop, transparency, and that the asset is not a low-resolution thumbnail.
5. Only after review, set `verification` to `verified` and record the reviewer/date and evidence URL in the manifest (or the project's designated reviewed-source file).
6. Keep unresolved entries as `needs_visual_review`; use `not_found` rather than inventing a logo.

## University data sync boundary
The job refreshes source-backed candidates for the existing university list. It intentionally does not silently add, rename, or delete canonical universities/departments from scraped pages. Those changes can affect IDs, alumni associations, and department relationships. Propose catalog changes separately with the source URL, retrieval date, and a human review before merging.

## Important
A successful workflow means the collection ran; it does not mean every logo is official or legally cleared for reuse. Review the manifest and artifact before merging or using assets publicly.
