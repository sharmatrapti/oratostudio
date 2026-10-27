# Oratostudio

MCP server plus renderer that turns prompts into finished animated videos. No visual editor, ever
(decision D1). Claude in the client is the author; this server validates, lays out, previews and renders.

## Read first
- `docs/04-decisions-mcp-only-pipeline.md` is binding. D1 to D13. When a decision changes, edit it there with a date.
- `docs/07-technical-spec.md` is the design; `docs/08-implementation-plan.md` is the ordered work (WP 0.1 onward).
- `docs/05-roadmap.md` stages and gates; `docs/06-product-requirements.md` FR-n requirements.
- `docs/01` to `03` are research on CreateStudio, the reference app. Its mechanisms and open-source
  libraries are reused; its characters, scenes, templates and music are never shipped (D8).

## Ground rules
- Product name Oratostudio; npm scope `@oratostudio/*`; MCP server name `oratostudio`; first character is Nikki (D13).
- Server is dumb and deterministic: no LLM calls inside it except TTS and STT providers (D3). Edits are
  patches to `scene.json` plus a history snapshot.
- Words are first-class values (slots, size words, timing words, preset names). Pixels are an escape hatch (D4, D5).
- Nothing in `docs/discovery*` is imported by package code. No CreateStudio dependency at runtime (D8).
- Measurements (probe output, render speed) are written into `docs/04` under a dated heading, never assumed.
- Spec first: a WP that needs a schema or tool change edits `docs/07` in the same change.

## Working agreement
- One branch per work package, commit title starts with the WP number. Do not push unless asked.
- Each WP ends with its proof (test or recorded measurement) from `docs/08`.
- Tests: vitest with `unit`, `browser` and `e2e` tags; golden frames compared with pixelmatch.

## Toolchain on the dev laptop (verified 2026-10-27)
Node 20.16, pnpm 10.10, Python 3.9, system ffmpeg 8.1 with h264_nvenc / libx264 / libvpx-vp9 on PATH,
Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`, GeForce GTX 1650 Ti (driver 457.49).
`gh` is not logged in.
