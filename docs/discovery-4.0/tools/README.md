# Research helper scripts (dev-time only)

Small scripts written during the CreateStudio 4.0 bundle analysis (doc 03). They read the vendor's
`app.asar` and the de-obfuscated bundles that lived in a session temp folder (`asar4/`), which is not
kept in this repo. The vendor's code is never committed; these scripts only document how the analysis
was done so it can be repeated on a new app version.

- `asar.py`: list and extract files from an Electron asar archive.
- `sg.py`, `g.py`, `ctx.py`: grep with context over very large single-line bundles.
- `batch2.py`, `batch3.py`, `batch4.py`: the extraction passes that produced the render-worker,
  asset-format and settings reports summarised in doc 03.

Paths inside are from the original session and need adjusting before reuse. Nothing here is
imported by any package (decision D8).
