# Product requirements: Oratostudio

**Status:** draft for discussion, 2026-10-27. Decisions in `04-decisions-mcp-only-pipeline.md` are binding; this document states what the product must do. Stages are in `05-roadmap.md`; how it is built is in `07-technical-spec.md`.

---

## 1. One-paragraph description

Oratostudio (Orato: Latin "I speak") is a Model Context Protocol (MCP) server that lets a user create and edit animated marketing and explainer videos by talking to Claude. There is no visual editor. The user describes the video; Claude writes a scene description and calls the server's tools; the server validates, lays out, previews and renders. Edits are prompts ("make the title bigger", "put the character on the right"). The output is an MP4 (or alpha WebM) on disk. Characters, animations, templates and styles are our own.

## 2. Who it is for

| User | Situation | What they need |
|---|---|---|
| **Primary: the owner (us)** | Produces short branded videos (explainers, social clips, product promos) and already works in Claude Code | A video from a brief without opening an editor; fast iteration by prompt; assets we own |
| **Secondary: another Claude Code or Claude Desktop user** | Technical enough to add an MCP server to a config file | Same as above, installable without our dev setup (Stage 6) |
| **Not a target now** | Non-technical users who want a GUI | Explicitly out of scope (D1) |

The user is never asked to think in pixels, frames or timeline tracks. They think in scenes, elements, slots, and plain-English timing.

## 3. Problem

Video tools are editors. Editors are slow for people who already know what they want and can say it. CreateStudio proved the pipeline (JSON scene, web render page, browser encode) but ties it to a GUI and to a licensed asset library we cannot ship. We want the pipeline with Claude as the author, and assets we own.

## 4. Goals and non-goals

**Goals**
1. A prompt produces a finished video. No step requires a GUI.
2. Edits by prompt are precise and cheap: one instruction, one tool call, visible result.
3. Claude can see what it made (frame previews as images) and check it (layout report) before the user has to.
4. Everything the server ships is ours or open source. Nothing depends on CreateStudio at runtime.
5. Renders are faster than real time on the dev laptop at 1080p30.
6. The server is deterministic and testable without a model in the loop.

**Non-goals**
- A visual editor, scrubber or timeline UI (D1). A read-only viewer is the only possible future exception.
- A natural-language parser inside the server (D4).
- Hosting, accounts, collaboration, cloud rendering. Local disk only.
- Reusing the vendor's characters, scenes, templates, music or VFX (doc 03 ground rule).
- Real-time preview at playback speed.

## 5. User journeys

### J1. New video from a brief
1. User: "Make a 20-second 16:9 explainer about our new savings feature, dark background, brand blue, friendly voice."
2. Claude reads the style resource, creates a project, adds scenes and elements using slots and presets, generates voice (Stage 4), runs the layout report, renders a contact sheet, looks at it, fixes anything off, renders a draft, tells the user where it is.
3. User watches the draft and continues with J2.

### J2. Edit by prompt
1. User: "The title is too small and the logo should be top right."
2. Claude calls `element_edit` twice (size step up; move to `corner-tr`), runs `layout_report`, renders the affected frame with the overlay, confirms no overlap, and renders a new draft.
3. User: "Undo the logo move." Claude calls `history_undo`.

### J3. Character scene (Stage 2+)
1. User: "Add Priya on the left, waving, then explaining the three bullets."
2. Claude adds a `character2d` element in `character-left` with actions `wave` then `talk`, timed `with vo1`, and the bullet list stacked in `split-right`.

### J4. Final delivery
1. User: "Looks good, render it final in 1080p and a 9:16 version too."
2. Claude renders final 16:9; sets aspect to 9:16, which re-lays out via slots; runs `layout_report`; fixes anything flagged; renders final 9:16.

### J5. Reuse a template (Stage 5)
1. User: "Use the stat callout template for '47% faster' and put it after scene 2."
2. Claude calls `template_apply`, replaces text, done.

## 6. Functional requirements

Numbered so stages and tests can reference them. Priority: **M1** (Milestone 1), **M2** (characters), **S3** to **S6** by roadmap stage.

### 6.1 Project and scene
- **FR-1 (M1)** Create a project with name, aspect ratio (16:9, 9:16, 1:1) or explicit size, fps (default 30), background colour.
- **FR-2 (M1)** A project is a folder on disk: `scene.json`, `media/`, `renders/`, `history/`. Opening an existing folder restores everything.
- **FR-3 (M1)** The scene is validated against a schema on every write; invalid writes are rejected with a message that names the field and the nearest valid values.
- **FR-4 (M1)** Scenes are composed of ordered scenes (sections) containing elements on tracks; each element has timing, placement, style and animations.
- **FR-5 (M1)** Changing the aspect ratio re-lays out all slot-placed elements without further input.

### 6.2 Elements
- **FR-6 (M1)** Element types: text, image, shape, video (including alpha WebM), audio.
- **FR-7 (M2)** Element type `character2d` with an action sequence.
- **FR-8 (S3)** Element type `captions` with word timings and style presets.
- **FR-9 (M1)** Text fits its slot: shrinks to a minimum size then wraps; overflow is reported, never silently clipped.
- **FR-10 (M1)** Images and video use `cover` or `contain` within their slot.
- **FR-11 (M1)** Elements can be added, edited by id with a partial patch, reordered, and removed.

### 6.3 Layout
- **FR-12 (M1)** Named slots per aspect ratio: title-top, title-center, lower-third, caption, corner-tl, corner-tr, corner-bl, corner-br, split-left, split-right, character-left, character-right, full-bleed.
- **FR-13 (M1)** Relative operations: nudge by percent, align to another element or frame edge, size step (`larger`, `smaller`, named sizes), stack elements vertically with a gap.
- **FR-14 (M1)** Pixel coordinates are accepted as an escape hatch and never required.
- **FR-15 (M1)** `layout_report(t)` returns every visible element's box, all overlaps, text overflow, and anything outside the safe area.

### 6.4 Timing and animation
- **FR-16 (M1)** Timing accepts seconds or relative words: `after <id>`, `with <id>`, `until end`, `match <audioId>`, with optional offsets.
- **FR-17 (M1)** Animation presets: in, out and loop presets by name, with duration, ease and split-text options; a scene can carry an entry and exit transition by name.
- **FR-18 (M1)** Fixed frame rate render; every frame is produced by seeking the timeline; no dropped frames.

### 6.5 Media, voice, captions
- **FR-19 (M1)** Import a local file into `media/`; the server probes duration, dimensions, alpha, and audio presence.
- **FR-20 (M1)** Audio elements support trim, volume, fade in and out; the mix is normalised on final render only.
- **FR-21 (S4)** Generate voice from text with a chosen voice; provider is swappable without changing the scene.
- **FR-22 (S3)** Generate word-timed captions from any audio asset; 12 caption styles; editable per sentence.
- **FR-23 (S4)** Characters lip-sync from the audio amplitude of a named audio asset.

### 6.6 Preview and render
- **FR-24 (M1)** `render_frame(t, overlay?)` returns a PNG as MCP image content. Overlay burns thirds, safe area, slot outlines, element ids and boxes.
- **FR-25 (M1)** `render_contact_sheet` returns one PNG with about 12 evenly spaced frames, each stamped with its time.
- **FR-26 (M1)** `render_video` in `draft` (480p, fast, no loudness normalisation) and `final` (project resolution, normalised audio) quality; result is a file path plus duration and render time.
- **FR-27 (M1)** `render_probe` reports the GPU renderer string, hardware H.264 availability, encode rung in use, and measured fps.
- **FR-28 (M1)** Output formats: MP4 H.264 + AAC; WebM VP9 with alpha when the project is transparent.

### 6.7 History
- **FR-29 (M1)** Every mutating tool writes a numbered snapshot to `history/` with the tool name and arguments.
- **FR-30 (M1)** `history_undo` and `history_redo` restore snapshots; `history_list` shows them in words ("moved logo to corner-tr").

### 6.8 Vocabulary and guidance (D4)
- **FR-31 (M1)** Size, position, timing, colour and animation fields accept controlled words as well as numbers.
- **FR-32 (M1)** Every tool description contains two or three example calls in plain English with matching arguments.
- **FR-33 (M1)** Unknown values produce an error listing the nearest valid values.
- **FR-34 (M1)** A style resource describes vocabulary, slots, presets and house conventions; Claude reads it once per session.

### 6.9 Characters (M2)
- **FR-35** A character is a folder: alpha WebM at one or more sizes plus `info.json` mapping action names to `{start, end, loop, crop}`.
- **FR-36** An element lists actions in order with durations; loops repeat to fill; action switches cut on loop boundaries.
- **FR-37** Characters can be mirrored horizontally and placed in character slots anchored to the bottom.
- **FR-38** The element accepts any alpha WebM with an action map, regardless of origin (D8).

### 6.10 Templates and styles (S5)
- **FR-39** A scene template is a zipped scene folder; applying it clones elements with new ids and copies media.
- **FR-40** A style (palette, type scale, caption style, default transition) is applied at project level and referenced by tokens (`brand`, `accent`, `fg`, `bg`, `muted`).

## 7. Milestone 1 acceptance script: the ten edits

Run against the M0 test video (title text, subtitle, logo image, background, one voice track). Each line is one user prompt and must resolve in one tool call with no pixel numbers; `layout_report` must show zero overlaps after each.

1. "Make the title bigger."
2. "Put the logo in the top right corner."
3. "Move the subtitle under the title with a small gap."
4. "Make the title come in word by word from the top."
5. "Start the subtitle half a second after the title."
6. "Change the background to dark navy."
7. "Make the logo smaller."
8. "Use the brand colour for the title."
9. "Add a lower-third with my name."
10. "Make the whole video 9:16."

Plus: "Undo the last change" restores the previous snapshot.

## 8. Quality requirements

| Area | Requirement |
|---|---|
| Render speed | 10 s of 1080p30 renders faster than real time on the dev laptop (GTX 1650 Ti). Measured, recorded in `04-decisions`. |
| Preview speed | `render_frame` returns within a few seconds including browser warm-up; subsequent frames well under a second. Measured. |
| Determinism | Same `scene.json` and assets produce the same frames (golden-frame tests). |
| Correctness | Fixed fps, no dropped or duplicated frames; audio and video durations match within one frame. |
| Degradation | Each rung of the encode ladder works; the probe says which is in use; software WebGL slows but never breaks text, image and audio videos. |
| Error quality | Every validation error names the field and offers nearest valid values. No stack traces reach the client. |
| Footprint | No database, no web server beyond the local asset server used by the render page, no network calls during render except TTS and STT providers when chosen. |
| Licensing | Nothing shipped is from the vendor's library. Characters, fonts, templates and music carry their licence file in `packages/assets`. |

## 9. Risks and how they are covered

| Risk | Cover |
|---|---|
| Headless Chrome falls back to SwiftShader and software encode | Stage 0 measures it first; D6 flags; headed off-screen window as the next step; ladder rung 3 (ffmpeg NVENC) keeps encode fast even if WebGL is soft |
| Prompt layout is tedious for fine positioning | Slots, relative ops, linter, overlay (D5); pixels as last resort |
| Claude fills tools inconsistently | Few tools, strong schemas, teaching descriptions, corrective errors, style resource (D4); tool-contract tests |
| Character art becomes the bottleneck | Parallel track from the start; alpha-video element accepts any source so engine work never waits on art |
| Text rendering differs from the vendor's (they use their own shaper) | Fabric text plus web fonts for M1; opentype.js or HarfBuzz-wasm shaping only if a real video shows a defect |
| Scope creep toward an editor | D1; the roadmap's only UI item is a read-only viewer in Stage 7 |

## 10. Out of scope for now, recorded so they are not forgotten

- Hosted or multi-user operation; HTTP transport is a Stage 6 option only.
- Stock footage, music or icon libraries. The user brings media; we ship our own small set.
- Real viseme lip-sync; amplitude only, as the vendor does.
- Right-to-left and complex-script text shaping.
- Background removal (ONNX) and green-screen; a possible Stage 7 effect.

## 11. Open questions (to settle in discussion)

Carried from `04-decisions`, with proposals in `07-technical-spec.md` where marked:
1. Final tool list and names (spec section 6, proposed).
2. Slot table values per aspect ratio (spec section 5.2, proposed).
3. Which TTS and STT first: proposal is edge-tts and faster-whisper, both free and local or free-tier.
4. First character: look, name, action list, target render size.
5. Whether `shape` is in Milestone 1 (proposal: yes, rectangles and rounded rectangles only; they are the cheapest way to make lower-thirds and callouts look designed).
