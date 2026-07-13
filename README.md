# Gates of Hell Toolkit

Data/code-only tooling for Call to Arms: Gates of Hell modding — no 3D/animation assets.

## Structure
- `backend/` - Express + TypeScript API that parses the game's `.set` config
  grammar (extracted from `gamelogic.pak`) into structured JSON.
  - `src/logic/parser/` - tokenizer, AST parser, and squad/tech-tree extractors
  - `src/data/samples/` - raw `.set` files for all 5 factions
  - `src/data/loader.ts` - auto-discovers `units_<faction>.set` /
    `unit_research_<faction>.set` pairs dropped into `samples/`
- `frontend/` - React 18 + Vite app with six pages: squad/unit browser with
  advanced filters, squad/tech-tree builder (including loading an existing
  squad for editing), squad comparison, an interactive tech-tree editor
  (zoom/pan/search/PNG export + live validation), a Conquest save file
  editor, and "Ask the Mod" structured query search.

## Status
- All 5 factions seeded (`ger`, `rus`, `usa`, `eng`, `fin`), extracted from
  `gamelogic.pak`. Parser verified clean across all of them: 0 squads
  missing name/side in any faction, and the only unresolved tech-tree
  `requires` reference in each faction is `single_officer(<faction>)` - a
  known quirk where that root node is defined structurally via a separate
  `positions` block rather than as a normal tech entry (confirmed in the
  source file's own comments).
  - eng: 272 squads, 260 tech nodes
  - fin: 185 squads, 183 tech nodes
  - ger: 223 squads, 217 tech nodes
  - rus: 208 squads, 206 tech nodes
  - usa: 173 squads, 175 tech nodes
- Module 2 (squad/tech-tree builder) verified: `serialize.ts` round-trips
  ALL 1061 real squads and 1041 real tech nodes cleanly (parse → serialize →
  re-parse → identical data). Backend build endpoints
  (`POST /api/build/squad`, `POST /api/build/technode`) re-parse their own
  output before returning it as a safety check. Manually confirmed against
  both plain squads and vehicle-crew squads (the trickier `{"name" (...)}`
  wrapper format) across multiple factions.
- Module 3 (Conquest save editor) is built and verified against a real
  Conquest save (`conquest_8.sav`, uploaded by the user). Confirmed:
  - `mp`/`sp`/`ap`/`rp` (manpower/support/army/resource points) read and
    write correctly through the actual HTTP API.
  - Every other file inside the .sav (`campaign.scn`, map-point files,
    etc.) survives the edit byte-for-byte identical - verified with a
    direct buffer comparison, not just "it didn't crash".
  - Uses a generic AST round-trip approach (not a hand-modeled schema)
    since the status file has many fields (`unlockedResearch`,
    `mapPoints`, `roundsHistory`, ...) beyond the 4 editable ones; the
    untouched round-trip was proven byte-identical before any edit logic
    was trusted.
  - Earlier uploads (`defense.sav`, `autosave5.sav`, `game_progress.set`)
    were single-mission/campaign-progress saves without this resource
    economy - confirmed by inspection, not assumed.
- Tech-Tree graph view: renders the real `requires` dependency graph using
  the game's own grid coordinates (not a synthetic layout) - genuine data,
  not a guess at what the tree "should" look like.
- Advanced filtering on the squad browser: cost range and stage range use
  real per-unit cost data; the "must include unit type" filter matches
  against real unit ids (not fabricated tag categories like "AT capable",
  since that classification doesn't exist in the source data).
- Squad Comparison tool: cost, men count, and cost-per-man are computed from
  real per-soldier cost data (`inf_<faction>.set`), verified against 1061
  squads across all 5 factions - 1057/1061 (99.6%) fully priced, the rest
  explicitly flagged as missing a price rather than silently shown as free.
  DPS and armor penetration are NOT shown: soldier-to-weapon linkage lives in
  a data source (likely an entity pak) not present in `gamelogic.pak` -
  `.weapon` files with real damage/penetration data exist, but nothing found
  so far maps a specific soldier to a specific weapon.
- Tech-Tree editor with live validation: click any node to edit
  `requires`/`cost`/`position`, with real-time checks (debounced, calls
  `POST /api/techtree/validate`) for cyclic dependencies, self-reference,
  unknown requires, out-of-bounds grid position (checked against the real
  observed range per faction, not an arbitrary guess), and position
  collisions. Verified: zero false-positive errors when every one of the
  1041 real tech nodes across all 5 factions is validated against its own
  faction's tree (only the known `single_officer` quirk shows as a
  warning); a deliberately-injected cycle
  (`defense_level_1 -> defense_level_2 -> defense_level_1`) and an
  out-of-bounds position were both correctly caught in testing
  (`backend/src/verify-techtree-validation.ts`).
- Tech-Tree view now uses React Flow (`reactflow` + `html-to-image`) instead
  of a custom SVG, while still positioning every node at the game's own
  real grid coordinates (`position.x * 160, position.y * 50`) rather than
  a library-computed auto-layout - you get React Flow's built-in zoom, pan,
  minimap, and PNG export (via `html-to-image`, the standard approach for
  this) without losing the real layout data. Unresolved requires (the
  `single_officer` quirk) show as a red-bordered node rather than a
  dangling edge, since React Flow requires both endpoints to exist.
  Verified: clean TypeScript build, clean production build, and the page's
  module resolves and transforms correctly through the dev server with no
  errors, and every API call it depends on (`/api/techtree`,
  `/api/techtree/validate`) tested working through the live proxy. Full
  visual/interaction testing wasn't possible in the sandbox this was built
  in (no browser automation tool available) - worth a quick look once you
  have it running locally.
- Squad Builder can now load an existing squad's real data into the form
  for editing (not just building from scratch), matching its template
  shape, composition, and metadata automatically.
- "Ask the Mod" (`/api/ask`, new "Ask the Mod" tab): structured query
  search over the already-parsed, verified data - regex-based intent
  detection for "which squads use/with/contain X", "what unlocks X", and
  "costing more/less than N", with a free-text fallback. This is
  explicitly NOT embeddings/vector-based semantic search (the UI says so)
  - it's real and correct for these three patterns (all three of the
  original example queries tested and verified against live data), but
  won't handle arbitrary paraphrases. One real, verified limitation worth
  knowing: unit ids are mostly role-based (`fusilier_mg`, `mgun_1`) rather
  than literal weapon names, so a search for "MG42" specifically will only
  match the few ids that happen to contain that literal substring (e.g.
  `vet_partisan_mg42`), not the full set of units that actually carry an
  MG42 in-game - that mapping would need the same soldier-to-weapon data
  that blocked DPS/armor-pen work.
- Localization/display-name lookup: SOLVED, and expanded further. After 5
  dead-end paks (`gamelogic`, `entity`, `properties`, `interface`,
  `pages`), the real data was in `default.pak`, found via a
  `localizations` folder at the game's root (sibling to `resource`, not
  inside it) - specifically `default/interface/text/desc/*.pot`, standard
  gettext files (`msgctxt "desc/squad/<id>(<faction>)"` ->
  `msgid "<Display Name>"`). Two real naming inconsistencies had to be
  handled, not assumed uniform: USA's squad file is
  `desc_squad_mp_usa.pot` (extra "mp_" infix), and the "eng" faction's
  soldier names live in `desc_breed_mp_uk.pot` (not "eng"). The game's own
  text also embeds rich-text markup (`<c(A5A095)>(1)</c> Osttruppen
  squad`) which is stripped for clean display.
  - Individual soldiers: ger 330/331, rus 297/297, eng 387/456, fin
    360/364, usa 513/518 - consistently ~95-100%.
  - Squads (base file only): ger 40/223, rus 31/208, eng 78/272, fin
    55/185, usa 39/173.
  - Found `desc_squad_<faction>_dcg_late.pot` supplements by listing
    default.pak's full contents rather than assuming the base file was
    complete ("dcg" = Dynamic Campaign = Conquest mode) - these contain
    squad ids genuinely absent from the base file
    (`squad_fusilier_late_con(ger)` isn't in `desc_squad_ger.pot` but is
    in the dcg_late supplement). No "eng" dcg_late file exists in
    default.pak. After merging: ger 65/223, rus 67/208, fin 76/185, usa
    62/173 (eng unchanged at 78/272, correctly - no supplement to merge).
  - Found `desc_vehicles_<faction>.pot` (+ a shared `_generic` file, +
    German-only `_fh` "Finest Hour" DLC supplement) keyed by
    `desc/entity/<id>` - covers both `Squad.vehicle` fields and, since
    many tech-tree node ids ARE vehicle/weapon entity ids (e.g. `tiger1h`,
    `panzer4h`), tech node names too. Verified coverage: vehicle-crewed
    squads are 100% named in all 5 factions (29/29, 15/15, 15/15, 11/11,
    23/23); tech tree nodes (trying squad name first, then entity name)
    reach ger 209/217, rus 194/206, eng 252/260, fin 174/183, usa 167/175
    - roughly 90-97%.
  - Squad-name gaps: checked why rather than assuming a bug. Many
    conquest-specific squad variants simply don't have their own `.pot`
    entry even though sibling squads do (`squad_fallschirmjaeger(ger)`
    has one, several similar `_con` variants don't) - looks like the base
    game's own localization being incomplete for some conquest squad
    variants, not a lookup failure. Falls back to the internal id
    everywhere when no display name exists.
  - Applied throughout: squad browser table, compare page (headers +
    dropdowns), squad builder's "load existing" dropdown, tech-tree
    editor (node labels, search, edit panel header), and Ask the Mod's
    structured results.

## Running locally
    cd backend && npm install && npm run dev     (http://localhost:3001)
    cd frontend && npm install && npm run dev    (http://localhost:5173, proxies /api)

## Deployment (Vercel)
Uses Vercel's **Services** feature (Beta, confirmed current via Vercel's
own docs as of this writing) rather than a serverless-function wrapper.
This runs the backend as an actual persistent Express server (via
`backend/src/server.ts`, which already respects `process.env.PORT` -
required for this to work as a Vercel Web Service), not a serverless
function - simpler than the api-wrapper approach, and avoids the
serverless bundler's file-inclusion gotcha entirely since the backend
reads its data files normally from disk at runtime.

`vercel.json` defines two services (`frontend`, `backend`) and two
top-level rewrites exposing them: `/api/*` routes to the backend
(matching the existing `/api/...` routes already defined in
`backend/src/app.ts` - no path rewriting needed), everything else routes
to the frontend. The backend service needs an explicit `entrypoint`
pointing at the file that calls `server.listen()` (`src/server.ts`) -
this was NOT optional in practice: the first real deploy attempt failed
with `Service "backend" detected framework "express" in "backend" and
must specify an "entrypoint" for runtime "node"`, contradicting my
earlier assumption that Vercel's auto-detection would fill this in on
its own. Fixed based on that actual error message.

When importing the repo into Vercel:
- **Root Directory** must be the repo root (`./`), NOT a subfolder like
  `backend` or `frontend` - the services model needs the top-level
  `vercel.json` to see both folders. If Vercel's import UI defaults the
  Root Directory field to something else, change it back to `./` /
  leave it blank before deploying.
- **Project Name**: use the umbrella project name (e.g.
  `gates-of-hell-toolkit`), not something like
  `gates-of-hell-toolkit-backend` - this one project serves both
  services together on one domain.
- Vercel's own auto-detection correctly identified the frontend as Vite
  and the backend as Express - but building the backend as a Node service
  requires the explicit `entrypoint` field regardless (see above), it is
  not auto-filled.

NOT verified: an actual live deployment through this exact flow (not
possible from the sandbox this was built in, and this specific Vercel
feature is very new). If the backend service fails to start, check
whether it's actually running `npm start` (which runs
`tsx src/server.ts`) and whether `PORT` is being respected - both should
already be correct based on the code, but this is the first thing to
check.

### SEO
- `frontend/index.html` has a real `<title>`/meta description mentioning
  both "Gates of Hell" and "GOH" (the common abbreviation), Open Graph
  tags, and JSON-LD structured data (`WebApplication` schema).
- `frontend/public/robots.txt` and `sitemap.xml` (currently one URL - this
  is a single-page app with no distinct routes yet; expand the sitemap if
  that changes).
- Recommended project name: `gates-of-hell-toolkit` - the literal phrase
  match matters more for the domain than "GOH" alone, and the page
  content (title/meta) already covers the abbreviation.
