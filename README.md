# Mole for Alfred

An [Alfred 5](https://www.alfredapp.com/) workflow that puts [Mole](https://github.com/tw93/Mole) (`mo`) one keystroke away. Clean, uninstall, optimize, analyze and monitor your Mac without leaving Alfred.

## Requirements

- macOS with [Alfred 5](https://www.alfredapp.com/) and the Powerpack
- [Mole](https://github.com/tw93/Mole) installed (`mo` on your `PATH`)

## Install

1. Download `Mole.alfredworkflow` from this repo.
2. Double-click it and click **Import** in Alfred.

The workflow looks for `mo` at `/opt/homebrew/bin/mo`, then `/usr/local/bin/mo`. If yours lives elsewhere, set **mo path** in the workflow's configuration.

## Usage

Type `mo` in Alfred.

| Keyword | What it does |
| --- | --- |
| `mo` | Lists all Mole commands (clean, uninstall, optimize, analyze, status, history, purge, installer, slim, touchid, update). |
| `mo dry` | Lists only the `--dry-run` previews (also matches `preview`, e.g. `mo clean dry`). |
| `mo status` | Live health, CPU, memory, disks and trash, refreshed every 2 seconds. |
| `mo uninstall <app>` | Searches installed apps. |
| `mo analyze <path>` | Explores disk usage of a path. Leave blank for the whole machine. |
| `mo history` | Recent cleanup sessions. |

### Modifiers

| Key | Action |
| --- | --- |
| `↵` | Run the command in your terminal |
| `⌘↵` | Preview only (`--dry-run`), where the command supports it. Rows that support it say so in the subtitle. Touch ID previews `mo touchid enable --dry-run`. |
| `⌥↵` | On an app in `mo uninstall`: also select personal data |
| `⌃↵` | On an app in `mo uninstall`: reveal it in Finder |
| `⇥` | Drill into a command |

Commands run in the terminal set in **Alfred Preferences → Features → Terminal**, because Mole is interactive and may ask for your password.

## Build from source

```sh
python3 build.py src Mole.alfredworkflow
```

`build.py` generates `src/info.plist` (the workflow definition) and zips it with `src/mole.js` and `src/icon.png` into the `.alfredworkflow`. Edit the workflow graph in `build.py`, not in `info.plist`, which is regenerated on every build.

To try the script outside Alfred:

```sh
osascript -l JavaScript src/mole.js "status "
```

## How it works

`src/mole.js` is a JXA Script Filter that calls `mo` (using its `--json` output for `status`, `history` and `uninstall --list`) and returns Alfred result items. Each item carries the full command as its argument, and a conditional routes it to Run in Terminal, Reveal in Finder or Open File.

## License

[MIT](LICENSE)

## Credits

Built on [Mole](https://github.com/tw93/Mole) by tw93. This workflow is an unofficial front-end and is not affiliated with that project.
