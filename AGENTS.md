<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules
- Source adapters live in `src/lib/<source>.server.ts`; sync orchestration in `src/lib/sync.server.ts` — keeps each source independent and swappable.
- Business rules (status, dates, amounts, RUC) are pure functions in `src/lib/tender-rules.ts` with tests — shared by sync, server and UI.
- Catalog tables are written only by the service role during sync; users read them via RLS — no user can alter official data.
- All app pages live under `src/routes/_authenticated/`; auth pages are public — session lives in the browser.
- Never store mock/seed tenders; only real synced records — production requirement.
- Public access screens share AuthShell and scoped auth CSS tokens; signup duplicate detection uses only the auth response, never a privileged email lookup — keeps presentation consistent without exposing an account directory.
- Platform colors and motion are centralized in global semantic tokens and shared controls, with reduced-motion overrides — keeps every page consistent without changing business flows.
- Lightweight recommendations run in suggestions.server.ts with the existing Analyze model configuration, authenticated profile reads and paginated catalogue batches; returned real IDs intersect normal search filters before pagination — avoids document downloads, cross-account reads and first-page-only matching.
- Numbered pagination uses the pure helper in src/lib/pagination.ts with boundary tests — keeps visible page ranges deduplicated and within the catalogue bounds.
- User-uploaded bases go to private storage bucket tender-documents via service role and are read first by analysis — SEACE blocks server-side document downloads (403).
