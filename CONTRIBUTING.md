# Contribuer / Contributing

Tout le contenu communautaire est dans **`src/data/community.json`** — une pull request suffit, aucune ligne de code à écrire.

## Statut d'une technique (par saison)
```json
"statuses": { "superglide": { "s": "ok", "season": "S27", "note": "Vérifié en jeu" } }
```
`s` = `ok` | `patched` | `broken`. Les identifiants (`superglide`, `tap-strafe`…) sont ceux du catalogue de l'app
(dans `src/data/catalog.js`, 1re colonne).

## Vidéos
```json
"videos": { "tap-strafe": [ { "t": "Tap strafe en 5 minutes", "u": "https://www.youtube.com/watch?v=XXXX", "by": "Pseudo" } ] }
```
Seuls les liens `https` vers YouTube, Twitch, apexmovement.tech et GitHub sont acceptés par l'app.

## Actus
```json
"news": [ { "d": "2026-10-06", "t": "Titre", "b": "Texte court", "u": "https://…" } ]
```

## Résumés de techniques
Ajoute une entrée dans `ST.TECH_INFO` (`src/data/hub-content.js`) avec un texte **original** (ne copie pas le wiki) : `fr`, `en`, `acts`, `pre`.

## Règles
- Les outils d'entraînement et l'overlay **mesurent** uniquement : pas de macro, pas d'automatisation d'inputs.
- Cite tes sources et renvoie vers le wiki pour les guides détaillés.
