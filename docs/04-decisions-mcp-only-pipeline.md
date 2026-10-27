# Decisions: MCP-only video pipeline

**Status:** agreed, 2026-10-27. Follows `03-createstudio-internals-and-own-pipeline.md`. This is the decision log for development; when a decision changes, edit it here and date the change.

---

## D1. No editor. MCP only.

**Decision:** The product is an MCP server plus a renderer. There is no visual editor, now or planned. Users create and edit videos through prompts in an MCP client (Claude Code, Claude Desktop, or any MCP client).

**Why:**
- CreateStudio's editor is a GUI that mutates a JSON scene; its engine is a web page that renders that JSON. An MCP server is the same thing without the GUI.
- The vendor's moat is the editor and asset library. Ours is that Claude writes the scene. Building an editor competes on their moat with a team of one.
- An editor could be reconsidered later only as a read-only viewer, never as the primary authoring path.

## D2. "No editor" must not mean "no preview"

**Decision:** Fast preview tools are part of milestone 1, not polish. Without a scrubber the loop is render, look, prompt again, so the renderer must be fast at previews.

**Tools required from day one:**

| Tool | Returns | Purpose |
|---|---|---|
| `render_frame(t, overlay?)` | PNG as MCP image content | Claude sees the frame and fixes overlaps, cut-off text, bad contrast before the user asks |
| `render_contact_sheet` | one PNG with ~12 frames | whole video in one call |
| `render_draft` | 480p MP4, no loudness normalisation | quick watch |
| `layout_report(t)` | JSON: bounding boxes, overlaps, text overflow, out-of-safe-area | deterministic layout linter, run after every edit |
| `render_probe` | JSON: WebGL renderer string, hardware H.264 support, measured fps | the system reports which render path it is on |

The `overlay` option burns thirds, safe area, slot outlines and each element's id and box into the preview.

## D3. The server is dumb and deterministic

**Decision:** No LLM calls inside the MCP server, except specialised models for voice (TTS) and transcription (STT). Claude in the client is the brain.

- Tools validate against a schema, apply structured edits, and render.
- Edits are local patches to `scene.json`, never full regeneration.
- Undo is numbered snapshots of `scene.json` on disk; "undo the last change" works through a prompt.
- Keeps the server testable without a model in the loop.

## D4. No natural-language converter component

**Decision:** We do not build an NL-to-edit parser or an internal LLM "converter". Claude in the client is the converter. We build the controlled vocabulary that makes its conversion reliable.

**What we build instead:**
- **Words as valid values.** Size accepts `larger`, `smaller`, `xl` as well as numbers. Position accepts slot names. Timing accepts `after t1`, `with c1`, as well as seconds. Animations accept preset names.
- **Tool descriptions that teach.** Each tool description carries 2 to 3 example calls in plain English with matching arguments.
- **Error messages that correct.** Unknown value: the reply lists the nearest valid values (`slot "bottom" unknown; did you mean "lower-third"`).
- **A style resource.** MCP resource describing vocabulary, slots, presets, house conventions; the client reads it once per session.
- **Few tools, strong shapes.** Around ten tools with precise schemas. Models choose wrong tools more often than they fill wrong arguments.

**Deferred:** an optional `apply_instruction(text)` tool that calls Claude inside the server, only if a weak or non-Claude client ever needs it. Not in v1.

## D5. Layout: slots, relative ops, linter, overlay

**Decision:** Users and Claude should almost never say pixels. Pixel coordinates remain as an escape hatch.

1. **Slots instead of coordinates.** `slot: "lower-third"` rather than x/y. One slot table per aspect ratio (16:9, 9:16, 1:1), each slot a box in safe-area percentages: title-top, title-center, lower-third, caption, corner-tl/tr/bl/br, split-left/right, character-left/right, full-bleed. Slots resolve to pixels at render time, so changing aspect ratio re-lays out the video. Text shrinks and wraps to fit its slot; images use `cover` or `contain`.
2. **Relative edit operations.** Nudges in percent, align to another element, size steps, simple vertical stacking with a gap (title + subtitle need one position).
3. **Layout linter.** `layout_report(t)` as above; Claude runs it after each edit like a type checker.
4. **Guides overlay** on `render_frame`; vision is the second check after the linter.

## D6. Render host: Playwright + full Chrome, with a fallback ladder

**Decision:** Playwright driving headless Chromium, launched as the full browser so the GPU is available. A pure Node skia renderer was rejected because it loses WebGL (transitions, shader effects) and three.js.

**Launch rules (Windows):**
- `channel: 'chrome'` (new headless = full Chrome binary, GPU-capable). If the probe still reports SwiftShader, run headed with the window off-screen and minimised, which is what the vendor's hidden Electron window is.
- Flags: ANGLE on Direct3D 11, ignore GPU blocklist, disable background timer throttling and renderer backgrounding.
- Frames are driven by `timeline.seek()` in an explicit loop; never depend on `requestAnimationFrame`.

**Fallback ladder (same shape as the vendor's):**
1. Hardware WebCodecs `VideoEncoder` in the page, then `mp4-muxer` (or `webm-muxer` for alpha), chunks streamed to disk.
2. Software WebCodecs in the page.
3. Raw RGBA frames from the page over a localhost WebSocket to Node, piped to ffmpeg `h264_nvenc` (GTX 1650 Ti) or `libx264`. About 250 MB/s at 1080p30, fine on localhost. On this rung the browser only draws; ffmpeg does the encode.

Software WebGL (SwiftShader) is a speed cost, not a blocker: milestone 1 (text, images, audio, animations) does not need WebGL; only transitions, shader effects and 3D do.

## D7. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript, Node 22, pnpm workspace | Fabric, GSAP, three and the MCP SDK are all JS; one language end to end |
| Scene schema | zod, exported to JSON Schema | same schema validates `scene.json` and defines tool inputs |
| MCP server | `@modelcontextprotocol/sdk`, stdio transport | one config line in Claude Code / Desktop; HTTP transport later if hosted |
| Render page | Fabric.js 6 + GSAP 3 + lottie-web + gl-transitions + three.js, Vite bundle, single HTML | the vendor's proven combination |
| Render host | Playwright + full Chrome | see D6 |
| Encode | WebCodecs in page + mp4-muxer; fallback raw frames to ffmpeg | see D6 |
| Audio and mux | `ffmpeg-static`, vendor's filter chain (doc 03 section 2.6) | already documented |
| Voice | edge-tts free to start; OpenAI / ElevenLabs behind the same tool | swappable |
| Captions | whisper.cpp or faster-whisper locally for word timings | feeds the 12-style caption model |
| Lip-sync | vendor's RMS amplitude method (doc 03 section 4), ported to Node | fully understood |
| Storage | project folder on disk: `scene.json`, `media/`, `renders/`, `history/` | no database, no web server, no UI |
| Characters | Blender to VP9 alpha WebM + `info.json` action map | unchanged from doc 03 section 6.2 |

**Proposed workspace layout:** `packages/scene-schema`, `packages/renderer` (browser bundle), `packages/render-host` (Playwright + ffmpeg), `packages/mcp-server`, `packages/assets` (characters, presets, fonts).

## D8. CreateStudio stays out of the product

**Decision:** No CreateStudio tool in the MCP server. CDP driving remains a dev-time script in `docs/discovery-4.0/`.

**Why:**
- A CDP path needs the app installed, signed in, with credits, on every user's machine, and breaks on app updates. Fine for us this week, unacceptable as a dependency for anyone else.
- Exported clips are ours to use in videos we make, not ours to ship as a character library. So a CDP tool could only ever serve our own demos.
- It costs nothing to skip: a generic alpha-video element in the renderer accepts a CreateStudio export, a Blender render or a stock pack identically. The server never knows where a clip came from.

**Character work runs in parallel with engine work.** The first character is Blender art work; its brief can start now, and the engine will be ready for it by milestone 2.

## D9. Build order (revised from doc 03 section 6.5)

1. **Milestone 1:** scene JSON + schema, MCP server with about 10 tools, renderer skeleton (text, image, audio, animations, transitions, generic alpha-video element), preview tools (D2), layout slots and linter (D5), render probe and fallback ladder (D6), output MP4. The tool surface is the product, so the server and renderer are built together; the Claude storyboarder is no longer a late step.
2. **Milestone 2:** 2D character support on the alpha-video element + first custom character (user's brief, started in parallel).
3. Captions from Whisper word timings with the 12-style caption model.
4. Voice (edge-tts / OpenAI); amplitude lip-sync.
5. Catalog of our own presets and scene templates (scene folder zipped, as doc 03 section 6.1).
6. Optional: 3D GLB characters, GPU particles, per-element shader effects.

## D10. Product name: Oratostudio

**Decision (2026-10-27):** The product is called **Oratostudio** (Orato, Latin "I speak", plus studio). Package scope `@oratostudio/*`, MCP server name `oratostudio`, repo name `oratostudio`. Checked free on npm; `.com`, `.ai` and `.dev` had no DNS record at the time; trademarks and social handles not checked. The folder `D:\workspaces\createstudio` keeps its name until the repo is created (D11 pending: git).

## Milestone 1 acceptance

- `render_probe` on the dev laptop reports a real GPU renderer and hardware H.264 encode; a 10 s 1080p30 render finishes faster than real time. If a rung of the ladder fails, the probe names it and the measured time is recorded here, not assumed.
- Ten natural-language edits ("make the title bigger", "put the character on the right", "caption at the bottom", ...) each resolve in one tool call with no pixel numbers, and `layout_report` shows zero overlaps afterwards.
- Doc 01's M0 test video renders end to end through the MCP server.

## Open points (to discuss next)

- Final list and names of the about 10 tools.
- Slot table values per aspect ratio.
- Which TTS and STT to wire first.
- First character: look and action list.
