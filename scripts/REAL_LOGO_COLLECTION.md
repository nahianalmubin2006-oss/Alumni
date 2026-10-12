# Real university logo candidate collection

The workflow downloads image candidates for the universities listed in `src/data/initialData.ts`.
It first tries the existing curated URL map in `scripts/generate_all_logos.ts`, then searches Wikimedia Commons for likely logo/seal/emblem files.

## Outputs
- `public/logos/official-candidates/`: downloaded image files.
- `src/data/official-logo-manifest.json`: source URL, filename, license metadata when available, and status for each university.

## Important
A downloaded image is a candidate, not automatically an official logo. Check the image visually, confirm the university identity, and review licensing/attribution before using it publicly. Missing logos are reported in the manifest; the script does not invent substitute logos.
