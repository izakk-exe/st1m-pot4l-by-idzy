# Contributing

All community content lives in **`src/data/community.json`** — a pull request is enough, no code to write.

## Technique status (per season)
```json
"statuses": { "superglide": { "s": "ok", "season": "S27", "note": "Verified in game" } }
```
`s` = `ok` | `patched` | `broken`. IDs (`superglide`, `tap-strafe`…) are the ones used by the in-app catalogue
(see `src/data/catalog.js`, first column).

## Videos
```json
"videos": { "tap-strafe": [ { "t": "Tap strafe in 5 minutes", "u": "https://www.youtube.com/watch?v=XXXX", "by": "Nickname" } ] }
```
The app only accepts `https` links to YouTube, Twitch, apexmovement.tech and GitHub.

## News
```json
"news": [ { "d": "2026-10-06", "t": "Title", "b": "Short text", "u": "https://…" } ]
```

## Technique summaries
Add an entry to `ST.TECH_INFO` (`src/data/hub-content.js`) with an **original** text (don't copy the wiki): `fr`, `en`, `acts`, `pre`.

## Rules
- The training tools and the overlay **only measure**: no macros, no input automation.
- Credit your sources and link to the wiki for detailed guides.
