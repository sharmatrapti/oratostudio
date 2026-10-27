# Implementation plan: Oratostudio

**Status:** draft for approval, 2026-10-27. Executes `05-roadmap.md` against `07-technical-spec.md`. Work packages (WP) are ordered; each names the files it creates, what it does, and the proof that it is done. No dates. Stages 0 and 1 are planned in full because they are next; later stages are outlined and will be expanded when their stage opens.

---

## 1. Environment, verified today

| Item | Found | Consequence |
|---|---|---|
| Node | 20.16.0 | Spec said 22. Node 20 runs everything we need; set `engines: ">=20"`. Upgrade to 22 is optional, not a prerequisite. |
| pnpm | 10.10.0 | ok |
| Python | 3.9.2 | enough for `edge-tts` and `faster-whisper` (Stages 3 and 4) |
| ffmpeg | 8.1 full build on PATH, has `h264_nvenc`, `libx264`, `libvpx-vp9`, `aac` | Use the system ffmpeg when present; `ffmpeg-static` only as a fallback for other machines. NVENC on rung 3 is available on this laptop. |
| Chrome | `C:\Program Files\Google\Chrome\Application\chrome.exe` | Playwright `channel: 'chrome'` will find it |
| GPU | GeForce GTX 1650 Ti, driver 457.49 | Old driver. If the probe reports SwiftShader, a driver update is the first thing to try before the headed-offscreen fallback. |
| Repo | `D:\workspaces\oratostudio`, own git repo, remote `github.com/sharmatrapti/oratostudio`, contains `docs/` and README | WP 0.1 adds the workspace on top of it |

## 2. Decisions needed before WP 0.1 (defaults in bold)

1. **Git:** done (D11). Own repository at `D:\workspaces\oratostudio`.
2. **Spec open items:** accepted as written (D12).
3. **TTS and STT:** edge-tts and faster-whisper first (D12).
4. **First character:** named Nikki (D13); her brief is designed when Stage 2 opens, and the art track starts then.

Nothing is open. Work starts with WP 0.1 on your go.

## 3. Working agreement

- One branch per work package, squash-merged to `main` with the WP number in the commit title. I commit; nothing is pushed unless you ask.
- Every WP ends with its proof run and the result pasted into the PR description or, for measurements, into `04-decisions`.
- Spec first: if a WP needs a schema or tool change not in `07-technical-spec.md`, the spec is edited in the same PR.
- Vertical slice before breadth: the MCP loop (prompt to MP4) works end to end on a tiny feature set before any feature is widened.
- Nothing from `docs/discovery-4.0` is imported by package code.

---

## Stage 0: Foundation

### WP 0.1 Repository bootstrap
**Creates:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.workspace.ts`, `.gitignore`, `.editorconfig`, `.prettierrc`, `eslint.config.js`, `packages/*/package.json` skeletons (`scene-schema`, `renderer`, `render-host`, `mcp-server`, `assets`), `fixtures/`, `scripts/`, `README.md`.
**Does:** pnpm workspace in the existing repo; strict TS; tsup build for Node packages; vitest with `unit`, `browser`, `e2e` tags; `pnpm test`, `pnpm build`, `pnpm lint` scripts; `engines >= 20`.
**Proof:** fresh clone, `pnpm install && pnpm build && pnpm test` green with one placeholder test per package.

### WP 0.2 Scene schema and resolver
**Creates:** `packages/scene-schema/src/{scene.ts, elements.ts, animation.ts, vocabulary.ts, slots/*.json, resolve.ts, nearest.ts, index.ts}`, `fixtures/scenes/{m0.json, ten-edits-start.json, invalid-*.json}`.
**Does:** zod schema per spec section 3; JSON Schema export; vocabulary enums and synonym table with `nearest()`; slot tables per spec 5.2; `resolveScene()` turning words, slots and relative timings into pixels and global seconds (text fit needs font metrics, so it takes a `measure` function; a table-based mock for tests).
**Proof:** unit tests: valid fixtures parse; each invalid fixture fails with a message naming the field and a nearest value; `resolveScene(m0)` matches a stored expected JSON; changing aspect 16:9 to 9:16 moves every slot-placed element.

### WP 0.3 Throwaway renderer page
**Creates:** `packages/renderer/{index.html, src/main.ts, src/api.ts, vite.config.ts}`.
**Does:** Vite single-file build; `window.renderer` with `load`, `seek`, `capture('png'|'rgba')`, `probe`, and `encode.start/frame/finish` (WebCodecs + chunk streaming over a WebSocket URL passed by the host); draws a coloured rectangle moving with GSAP and the time stamp. No Fabric yet; this proves the host loop, not the scene graph.
**Proof:** `pnpm --filter renderer build` emits one HTML file under 1 MB; opening it in Chrome and calling `renderer.seek(1.5)` from devtools shows the rectangle at the expected place.

### WP 0.4 Render host: launch, probe, asset server, encode ladder
**Creates:** `packages/render-host/src/{browser.ts, assetServer.ts, probe.ts, frameLoop.ts, encode/{rung1-webcodecs.ts, rung3-ffmpeg.ts, mux.ts}, ffmpeg.ts, index.ts}`.
**Does:** Playwright launch with the D6 flags and headed-offscreen fallback; local HTTP asset server with `Range`; `probe()` per spec 8.2 writing `probe.json`; frame loop `seek -> encode|capture`; rung 1 (page WebCodecs, chunks over `ws` to Node, `mp4-muxer`), rung 2 (same, software flag), rung 3 (RGBA over `ws` to `ffmpeg -f rawvideo`, `h264_nvenc` else `libx264`); `findFfmpeg()` preferring PATH, then `ffmpeg-static`.
**Proof:** `pnpm --filter render-host probe` prints the probe JSON; `pnpm --filter render-host demo --rung 1|2|3 --seconds 5` produces an MP4 on each rung that `ffprobe` reports as 30 fps, 150 frames, H.264.

### WP 0.5 Stage 0 measurement and gate
**Does:** run probe and the three rung demos at 1080p30; record GPU string, hardware encode yes/no, seconds per 10 s of video per rung in `04-decisions` under a dated "Measurements" heading. If SwiftShader: try the driver update, then headed-offscreen, record both.
**Proof:** the Stage 0 exit gate in the roadmap, with numbers written down.

---

## Stage 1: Core engine + MCP server (Milestone 1)

### WP 1.0 Thin vertical slice
**Creates:** `packages/mcp-server/src/{server.ts, project.ts, history.ts, tools/{project_open.ts, element_add.ts, render_video.ts, render_probe.ts}, index.ts}`, `.mcp.json` at repo root, first Fabric-based renderer (`text` only, no animation).
**Does:** MCP server over stdio; project folder create and open; `scene.json` atomic write and history snapshot; `element_add` for text in a slot; `render_video` draft via the ladder; `render_probe`. Registered in `.mcp.json` as `oratostudio` so Claude Code in this repo can call it.
**Proof:** in Claude Code: "open a project at fixtures/out/slice, add a title saying Hello in title-center, render a draft" produces an MP4 with the text. The in-process tool-contract test does the same without a model.

### WP 1.1 Renderer elements
**Creates:** `packages/renderer/src/elements/{text.ts, image.ts, shape.ts, video.ts, audio.ts, base.ts}`, `src/scene.ts` (Fabric StaticCanvas, element factory, `updateAtTime`), `src/fonts.ts`.
**Does:** one Fabric object per element; text via `Textbox` with web fonts through `FontFace` from the asset server; image and video with `cover`/`contain`; alpha WebM through `<video>`; shape rect and rounded; audio elements not drawn. Video seeks awaited before draw.
**Proof:** golden-frame tests on `fixtures/scenes/elements.json` at four times, `pixelmatch` under threshold; an alpha WebM over a coloured background shows transparency in the golden frame.

### WP 1.2 Animations
**Creates:** `packages/assets/presets/animations/*.json`, `packages/renderer/src/animation/{compile.ts, split.ts}`.
**Does:** preset JSON (`properties[].keyframes[]`, `$param`) compiled to GSAP tweens nested on the paused timeline; in, out, loop; `-back`, `-bounce`, `-elastic` variants through ease; split text by word and letter with stagger (one Fabric object per fragment created at `load`).
**Proof:** golden frames mid-animation for every preset in the vocabulary (one fixture generates them); a loop at `t` and `t + period` matches.

### WP 1.3 Transitions
**Creates:** `packages/renderer/src/transitions/{index.ts, gl.ts, fallback2d.ts}`, `packages/assets/presets/transitions.json`.
**Does:** scene-boundary rendering into two offscreen canvases; gl-transitions shader pass on WebGL2 for the vocabulary names mapped to gl-transitions entries; `cut` and `fade` in 2D; automatic 2D fallback when the probe reports software WebGL and the name has a 2D equivalent, else render with a warning in the result.
**Proof:** golden frames at 25%, 50%, 75% of a `crosszoom` and a `fade`; the render result carries `warnings: []` on hardware WebGL.

### WP 1.4 Layout: fit, ops, linter, overlay
**Creates:** `packages/scene-schema/src/layout/{fit.ts, ops.ts, lint.ts}`, `packages/renderer/src/{measure.ts, overlay.ts}`.
**Does:** text shrink-then-wrap against role minimums; stack with gap; relative ops persisted as `nudge`, `scale`, `alignTo`; `layout_report` per spec 5.3 using a font-metrics cache filled from the page's `measureText`; overlay layer drawing thirds, safe areas, slot outlines, element ids and boxes.
**Proof:** unit tests for overlap, overflow, out-of-safe detection on crafted fixtures; `render_frame(overlay: true)` golden frame; the ten-edit fixture ends with zero issues after the scripted edits.

### WP 1.5 Audio graph and final mux
**Creates:** `packages/render-host/src/audio/{stems.ts, mix.ts, mux.ts}`.
**Does:** per-element stems cached by key, `adelay` + `amix`, `loudnorm` on final only, AAC mux for MP4, Opus for WebM alpha; draft at 480p without normalisation; audio in parallel with the frame loop.
**Proof:** `ffprobe` on a final render shows one video and one audio stream with equal duration within one frame; a fixture with two overlapping clips and fades matches a stored loudness measurement (`ebur128`) within 1 LU.

### WP 1.6 Full MCP tool set and resources
**Creates:** remaining `packages/mcp-server/src/tools/*.ts` (`project_settings`, `scene_add`, `scene_edit`, `element_edit`, `element_remove`, `media_import`, `layout_report`, `render_frame`, `render_contact_sheet`, `history`), `src/resources/*.ts`, `tools/*.md` description sources, `src/errors.ts`.
**Does:** all 14 M1 tools per spec 6.1; resources `scene://current`, `scene://resolved`, `style://guide` (generated from the schema), `slots://*`, `presets://*`; descriptions with examples generated from the markdown sources; error formatter with `nearest()`; `media_import` probing with ffprobe.
**Proof:** tool-contract tests: every example in every description executes and validates; every tool rejects a malformed call with a message containing a nearest value; `history` undo and redo restore exact snapshots.

### WP 1.7 Previews
**Creates:** `packages/render-host/src/preview.ts`, `packages/renderer/src/contactSheet.ts`.
**Does:** `render_frame` at preview width via CSS scale of the same canvas; contact sheet composed in the page (second canvas) with time and scene stamps; both returned as PNG image content; warm browser reuse keyed by scene hash.
**Proof:** warm `render_frame` under 1 s and contact sheet under 5 s on the dev laptop, numbers recorded; the PNGs appear as images in Claude Code.

### WP 1.8 Milestone 1 acceptance
**Creates:** `fixtures/e2e/{m0.test.ts, ten-edits.test.ts}`, `README.md` quickstart.
**Does:** M0 video through the server end to end; the ten edits (PRD section 7) as a scripted test with `layout_report` zero issues after each; manual run of the same ten prompts in Claude Code, transcript saved under `docs/acceptance/m1/`; measurements written to `04-decisions`.
**Proof:** the Milestone 1 acceptance list in `04-decisions`, every line checked, with recorded numbers and any failed rung named.

---

## Stage 2: 2D characters (Milestone 2)

| WP | Scope | Proof |
|---|---|---|
| 2.1 | `character2d` schema, `info.json` loader, sprite timeline builder, action sequencing rules (spec 9.1) | unit tests on action to video-time mapping including loops and exits |
| 2.2 | Renderer element: video seek into action ranges, crop, mirror, bottom anchoring in character slots | golden frames at action boundaries; no seam frame at a loop wrap |
| 2.3 | `character_add` tool, `assets://characters` resource, character edits through `element_edit` | tool-contract tests |
| 2.4 | `scripts/blender/export_character.py`, `scripts/pack-character.ts` (PNG sequence to VP9 alpha + `info.json` from `actions.yaml`) | a test character packaged from a tiny synthetic PNG sequence |
| 2.5 | First real character integrated; CreateStudio alpha export dropped into `media/` renders through the same element | Stage 2 gate in the roadmap |

Art track (parallel, starts on the brief): model and rig; idle; talk; listen; point; wave; thumbs-up; walk; sit; render; package with 2.4.

## Stage 3: Captions

| WP | Scope | Proof |
|---|---|---|
| 3.1 | `scripts/stt.py` (faster-whisper, word timestamps) with whisper.cpp alternative; normalised words JSON | words JSON for a fixture clip within one frame of a hand-checked reference |
| 3.2 | `captions` schema, sentence splitting rules, 12 style presets | unit tests on splitting; contact sheet of all 12 styles in three aspects passes the linter |
| 3.3 | Renderer captions element with per-word highlight and animations; `captions_generate` tool; per-sentence edits | golden frames; tool-contract tests |

## Stage 4: Voice + lip-sync

| WP | Scope | Proof |
|---|---|---|
| 4.1 | Provider interface; edge-tts provider; `voice_generate` tool; `assets://voices` resource; `match <audioId>` timing | a generated voice asset with probed duration; an element timed `match vo1` ends with it |
| 4.2 | OpenAI and ElevenLabs providers behind the same interface, keys from env | provider switch changes nothing in `scene.json` |
| 4.3 | Amplitude curve extraction (spec 9.3) and 2D talk/idle gating; curve stored as `<id>.mouth.json` | the mouth moves only during speech in a scripted check against the curve |

## Stage 5: Presets + templates

| WP | Scope | Proof |
|---|---|---|
| 5.1 | Extended animation library and loop set; `presets://*` complete | every preset has a golden frame |
| 5.2 | Style JSON, colour tokens and type scale resolved at render; `styles://list`; `project_settings.style` | one scene rendered under two styles differs only in palette and type |
| 5.3 | Template format (zipped scene folder + `template.json`), `template_apply`, six starter templates | six-scene video from templates only passes the linter |

## Stage 6: Packaging + hardening

| WP | Scope | Proof |
|---|---|---|
| 6.1 | `npx`-able package, one-line config for Claude Code and Claude Desktop, optional HTTP transport | fresh machine install following README only |
| 6.2 | First-run doctor: Chrome, ffmpeg, GPU, rung; actionable messages | run on a machine without NVIDIA; output recorded |
| 6.3 | Render cache (stems, unchanged frame ranges), generated tool reference docs | second render of an unchanged scene is near-instant |

## Stage 7: Optional
Opened only when a real video needs it: 3D GLB characters (three.js `AnimationMixer`, morph targets), GPU particles, shader effects, camera keyframes, read-only viewer.

---

## 4. First session after approval

1. WP 0.1 bootstrap and the git decision.
2. WP 0.2 schema with fixtures, because every later package imports it.
3. WP 0.3 and 0.4 together, ending with the probe and the three rung demos.
4. WP 0.5: numbers into `04-decisions`, Stage 0 gate reviewed with you before Stage 1 opens.
