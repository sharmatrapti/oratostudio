# CreateStudio 4.0.32 discovery (2026-10-25)

## Install
- Installer: `D:\downloads\createstudio4\CreateStudio4 Setup 4.0.32.exe` (969 MB, SHA-512 matches `https://autoupdate4.createstudiopro.com/win/latest.yml`, Authenticode valid: Vidello Ltd., Essex, GB). Release date 2026-10-23.
- Installed silently with `/S /D=D:\apps\CreateStudio4` (C: had 4.7 GB free). 7,740 files, 1.13 GB. HKCU uninstall entry "CreateStudio4 4.0.32" registered. No Start Menu shortcut was created (silent install).
- 1.9.6 untouched at `C:\Users\incre\AppData\Local\Programs\createstudiopro`; full backup at `D:\apps\backups\createstudiopro-1.9.6` (585 MB).
- Update feed for 4.x: S3 bucket `cs4-autoupdate`, cache dir `createstudio4-updater`.
- Launch for automation: `D:\apps\CreateStudio4\CreateStudio4.exe --remote-debugging-port=9223` (9222 stays for 1.9.6). CDP `/json` answers; `Runtime.evaluate` and `Page.captureScreenshot` work.

## Runtime (pre-login, verified over CDP)
| Item | 1.9.6 | 4.0.32 |
|---|---|---|
| Vue | 3.1.1 | **3.5.13**, Pinia present (stores so far: `notification`, `dialog`) |
| Node integration in renderer | ON (`window.require`) | **OFF**; contextIsolation with a preload bridge `window.cs` |
| Vue globals | $settings $helpers $ipc $router $eventBus $userSettings | $pinia $router $route $filters $eventBus $settings $helpers $userSettings |
| Routes | /login /dashboard /video-builder /project | same four plus `/` (Intro) |
| Element defaults | 40 types | 43 types: adds **`model`** (3D character: `mouthOpen`, `lipsyncLinks`, `lipsyncMultiplier`), **`particles`**, `placeholder`, `basePlaceholder` |
| Export formats | MP4, WEBM, WEBM-alpha, MOV, MOV-alpha | same |
| Main-process deps | Electron 13 | Electron (version TBD from `process.versions` after login), three.js 0.156, onnxruntime (local background removal), mixpanel, Sentry, reka-ui |
| Bundles | index.js 16.7 MB | index.js 12.9 MB, rendering-worker.js 7.7 MB, editor-worker.js, rem-bg-worker.js, editor-preload.js 1.1 MB |

## `$settings` keys that prove the AI features are in this build
`vslStyles`, `explainerBuilder` (a full scene recipe with fx/animations), `elevenLabsLanguages` (incl. **Hindi**), `speechToTextLanguages` (Whisper-style list incl. Bengali, Assamese, Cantonese...), `textToImageStyles` (SD-style prompt templates), `hookTitleSettings`.

## `$helpers` additions vs 1.9.6
`adjustCaptionsOffset`, `shiftCaptionsOffset`, `getCaptionsMissingCustomFonts`, `getHookTitleMissingCustomFonts`, `take3DPresetSnapshot`, `get3DPresetTransformMatrix`, `isAapLifetime`, `platinum`, `getCurrentPlan`, `getCurrentBadge`, `isTrial*`.

## The preload bridge `window.cs` (this is the new automation surface)
Exposed via `contextBridge.exposeInMainWorld("cs", ...)` from `dist/electron/editor-preload.js`. Namespaces and methods:

- `app`: platform, perfTiming, systemInfo, bootstrap, prepareStartup, machineId, setHomeSection, routeChanged, clearCache
- `events`: onOpenFile, onSettingsUpdated, onNewProjectScratch, onNewProjectLightning, **onNewProjectAiShorts, onNewProjectAiExplainer, onNewProjectAiVsl**, onNewProjectTemplate, onSelectProjectDialog, onEditorUndo/Redo, onUpdate*, **onRenderJobFinished**
- `ai`: removeBackgroundMask (local ONNX)
- `chat`: readAttachment
- `fs`: existsSync, readFileSync, readFile, readInflated, writeFileSync, writeFile, writeFileAtomicSync, mkdirSync, readdirSync, statSync, copyFile(Sync), renameSync, unlinkSync, rmSync, pathForFile ... (full fs access from the page)
- `process`: **run** (spawn a process from the page)
- `renderQueue`: **submit**, openPanel, openJobPath (programmatic export)
- `tasks`: download, copy, hash, folderSize, tar, zip
- `project`: setFolder, grantRecent, markSystemFolder
- `crypto`: encrypt, decrypt (project file encryption, `cryptr`)
- `media`: demuxer · `peaks`: read/write · `models`: read · `text`: font shaping (fontkit) · `dialog`, `shell`, `window`, `clipboard`, `path`, `permissions`, `settings`, `log`, `update`, `unsavedChanges`

Only one raw IPC channel is used (`binder`); everything is multiplexed through it, so the bridge object above is the API to script against.

## Files here
- `cdp-probe4.js` — full dump (targets, Vue globals, routes, component tree, resources, screenshot). `node cdp-probe4.js <ws-module> 9223 .`
- `cdp-eval.js` — one-shot `Runtime.evaluate` helper.
- `probe.json`, `component-tree.txt`, `targets.json`, `screen.png` — login-screen run.
- `settings-ai.json` — AI-related `$settings` slices.
- `window-cs.json` — the bridge enumeration.

## Next (needs the user signed in)
1. Re-run `cdp-probe4.js` on `/dashboard`: user/plan (`getCurrentPlan`, `isAapLifetime`), AI credit balance, catalog size, component tree with AI builder components.
2. Open an AI Explainer / Shorts builder from the dashboard, map its component data + methods.
3. Open a project, dump the editor component methods and the `model` (3D character) lip-sync flow, the captions panel, and the TTS panel.
4. Try `cs.renderQueue.submit` on a trivial project → MP4.

---

## Post-login findings (2026-10-25, signed in as the lifetime Pro account)

### Account as seen by 4.0
| Field | Value | Meaning |
|---|---|---|
| `planId` | 1, badge **Standard** | lifetime licence recognised; no watermark on exports (`shouldAddWatermark` is true only for planId 2) |
| `aapActive` / `isAapLifetime` | false / false | All Access Pass lapsed 2025-01-12 |
| `aiRemainingCount` | **0** | AI credits. The "1,000 credits with lifetime" in the support article did **not** apply to this account |
| `ttsElevenRemainingCount` | 3,000, renews monthly | legacy 3.0 TTS characters; the 4.0 TTS panel still checks `aiRemainingCount`, so **AI TTS is blocked** ("not-enough-credits" modal, verified with a 31-char test) |
| `bgRemovalRemainingCount` | 100 / month | background removal still works |
| `permissions` | installations 2, audio false, captions absent | **Magic Captions unavailable** (`showCaptionsOption` needs AAP or `permissions.captions`) |
| AAP 7-day free trial | available, never used | would unlock AAP assets + 1,500 credits for a week |

### What works for this account without paying
- **Editor composition over CDP**: project model is the same shape as 1.9.6 (`settings, tracks[].elements[], camera, media, ui` + `addedScenes, guidelines`). Editor proxy exposes `addText/addTextBox/addImage/addVideo/addAudio/addModel/addScene/addPreset/addParticles/addPlaceholder/updateElementProperty/...` (setup functions; call them on `component.proxy`, not on `setupState`, or `this.projectManager` is undefined).
- **Programmatic export**: Publish component → `setPublishFormat("video","mp4")`, set `outputFile`, `studioSync=false`, `addQueue()`. The job JSON goes to `Roaming\CreateStudio4\queue\<uuid>.json` and `window.cs.renderQueue.submit()` runs it in a hidden render-worker window (WebCodecs H.264, hardware accelerated) then ffmpeg `-c:v copy`. **M0 exit test passed**: 4 s 1080p30 MP4 with our text, rendered in 5 s (`editor/m0-frame.png`).
  - Use forward slashes in `outputFile`; a path with backslashes passed through the CDP shell wrapper lost them and the file landed in the app's cwd.
  - Leave `studioSync` false: the job otherwise reads the output "to upload" to the vendor's StudioSync cloud.
  - A job with 0-duration content fails with "FFMPEG exited with error code: 1"; add elements first.
- **Catalog**: same 19,876 items; now each has a real `free` flag. Free: 9,273 (47%). By main category (free/total): icons 3377/3476, stickers 403/403, transitions 202/202, titles 151/151, social-media 184/184, hands 106/106, shapes 307/334, effects 201/223, backgrounds 667/994, characters 220/337, audio 418/2062, templates 229/1855, video-builder (all ratios) 1,945/7,724, vfx 159/478, doodle 230/475, boost 187/442, scroll-stoppers 107/213, **3dcharacters 10/15** (Laura, Lily, Zac, Leo, Bella, Danny, Tom, Lenka, Emoji Female, Emoji Male are free), cta 0/32.
- **Lip-sync** is local: `setLipSync(model)` pushes the audio element id into `model.lipsyncLinks` and recomputes waveforms. No credits, works with the 10 free 3D characters and any imported audio (so OpenAI/edge-tts audio can drive mouths).
- **Stock panels** (Pexels, Pixabay, Giphy, Coverr, Unsplash, SVG API) and Google Fonts.
- **TTS voices list** loads (218 ElevenLabs voices, 29 languages incl. Hindi and Tamil) but generation is credit-gated.

### Endpoints the app talks to
`https://api.createstudiopro.com/`, `https://api-v2.prod.createstudiopro.com/v2`, `https://api.elevenlabs.io/` (proxied with the user token), `https://assets.createstudiopro.com/resources/` (asset downloads), `https://assets.createstudiopro.com/credit-packages/credit-packages.json`, `https://sync.createstudio.com` (StudioSync), Mixpanel, Sentry. Unleash feature flags: `elevenlabs-speech-to-text`, `openai-image-generation`, `new-ai-shorts-builder` on; `custom-3d-models`, `cs5-agent`, `cs5-video-models` off.

### AI builders (dashboard)
`AiShortsBuilderV2` and the Explainer/VSL builders run client-side: `_generateScript → _generateImages → _generateSpeech → _generateCaptions → _generateProject`, each a credit-charged API call, then a local project is assembled (`newProjectSettings` + story). With 0 AI credits every step stops at `checkCreditBalance`. Quoted cost: shorts 60, explainer 85, VSL 50.

### Data folder
`C:\Users\incre\AppData\Roaming\CreateStudio4\` (project, queue, temp, resources, models, ai-models, logs). It lives on C:, which is down to ~1.9 GB free; asset downloads go there.

### Scripts
The probe scripts take the path to a `ws` module as their first argument; no project setup is needed. Example: `node cdp-probe4.js <path-to-ws-module> 9223 out`.
