# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Alfred 5 workflow (`fit.mole.alfred`, keyword `mo`) that fronts the [Mole](https://github.com/tw93/Mole) CLI (`mo`) for cleaning, uninstalling, analyzing and monitoring a Mac. There is no package manager, test suite, or linter. Git repo on `main`, remote `origin` is https://github.com/nigelayen/MoleAlfred (public, MIT). `src/info.plist` and `cache/` are gitignored.

## Build

```
python3 build.py src Mole.alfredworkflow
```

`build.py <srcdir> <dest>` does two things:
1. **Regenerates `src/info.plist` from scratch** (node graph, connections, user config, readme from `src/README.md`). Never hand-edit `src/info.plist` — changes are overwritten. Edit the dicts in `build.py` instead. Node UIDs are fresh random UUIDs every build, so the plist diff is noisy by design.
2. Zips `info.plist`, `mole.js` (marked executable), and `icon.png` into the `.alfredworkflow`. Any new file the workflow needs at runtime must be added to the list in the zip loop.

`Mole.alfredworkflow` at the root is the build artifact; double-click it to install into Alfred. `cache/apps.json` is a sample/leftover of the runtime cache and is not part of the build.

## Architecture

Alfred flow (defined in `build.py`): **Script Filter** (`./mole.js "$1"`) → **Conditional** on the `mode` variable → one of three actions:
- `reveal` → Reveal File action
- `open` → Open File action
- else (default) → **Run in Terminal** with `{query}` (the item's `arg`, i.e. a full `mo ...` command line)

So every result item in `src/mole.js` communicates its behavior through `arg` (the command/path) plus `variables.mode` (`terminal` | `reveal` | `open`). Commands run in the user's Alfred-configured terminal because Mole is interactive and may prompt for sudo.

`src/mole.js` is a JXA (`osascript -l JavaScript`) script that emits Alfred Script Filter JSON. `run()` splits the query into `subcommand rest` and dispatches:
- `status` → `mo status --json`, rendered as items; `rerun: 2` makes Alfred refresh every 2s
- `uninstall <filter>` → `mo uninstall --list` (JSON), cached 10 min in `$alfred_workflow_cache/apps.json` via `cached()`
- `analyze <path>`, `history` (`mo history --json --limit 20`)
- anything else → fuzzy-filtered `COMMANDS` table (the single source of truth for top-level commands; each row carries a dry-run flag that enables the ⌘↵ `--dry-run` modifier)

Conventions to preserve:
- All shell-outs go through `sh()` (adds Homebrew paths to `PATH`, discards stderr) and user-derived strings must be quoted with `q()`.
- The `mo` binary is resolved from the `mo_path` workflow variable (configured in `build.py`'s `userconfigurationconfig`), else `/opt/homebrew/bin/mo`, else `/usr/local/bin/mo`, else bare `mo`.
- Item icons use macOS system CoreTypes `.icns` names via `icon()`.
- JSON shapes from `mo ... --json` are assumed (e.g. `d.cpu.usage`, `d.disks[]`); parse failures return an `errItem` rather than throwing.
- User-facing help text lives in `src/README.md` and is embedded into the plist at build time.

## Testing the script outside Alfred

```
osascript -l JavaScript src/mole.js "status"
```

Env vars Alfred would set (`mo_path`, `alfred_workflow_cache`) are optional; the script falls back to defaults.
