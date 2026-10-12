# AI-powered university data collection

This collector uses Gemini with Google Search grounding to research each university in the existing `ALL_DIRECTORY_UNIVERSITIES` catalog. It proposes official websites, department names, official logo-page links, and source URLs.

## One-time setup
1. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**.
2. Add `GEMINI_API_KEY` with a Gemini API key from Google AI Studio. Never commit the key to the repository.
3. Open **Actions → AI university data research → Run workflow**.
4. Choose a zero-based `start_index` and `batch_size` (1–30). The first 10 entries use start index `0`; next batch starts at `10`, then `20`, etc.
5. Review the workflow artifact and `src/data/research-candidates/university-data-candidates.json`.

## Output and safeguards
- AI results are candidates only; each item is marked `needs_manual_verification`.
- Sources include URLs, titles, and what the source is claimed to support; collection timestamps are stored.
- Research failures are logged in notes; previous data for that university is preserved where possible.
- Weekly schedule researches the first small batch to limit API usage. Run additional manual batches to cover the rest of the directory.
- The script does not alter the live university catalog, department IDs, or alumni records. Merge/use candidate data only after a person checks sources and duplicates.
- Search grounding improves discovery but does not guarantee accuracy. Verify the cited page really supports each claim, especially departments and logo identity.
