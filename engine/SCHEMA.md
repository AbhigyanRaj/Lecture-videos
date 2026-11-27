# Lecture plan schema (one JSON file per step)

```json
{ "step": "0.1", "title": "Living things, cells and organisation", "scenes": [ Scene, ... ] }
```

Every **Scene** has:
- `type`: one of the types below
- `lines`: narration, an array of `{"say": "...", "show": k}`. `show` is optional: element *k* of the scene appears at the moment this line starts. Show every element once, in increasing order; element 0 is usually shown on the first line.
- A line can also be `{"pause": seconds}`: silence (only in `quiz`, 3 to 5 s, while the countdown runs).
- `covers`: the notes sub-heading numbers this scene teaches, e.g. `["0.1.2"]`.
- Type-specific fields, listed below.

On-screen text is **English, short, and uses the exact terms from the notes**. Never put Devanagari on screen.

## ImgRef: a picture made by the image model
`{"id": "snake_case_id", "prompt": "what to draw: one subject, no text", "acc": true}`
- `acc: true` means the biology must be accurate (organelles, cells, organs, molecules), so the better model is used. `acc: false` is for everyday objects and scenes (car, crystal, hot pan, person).
- **Reuse the core library ids** (below) whenever they fit. New ids must start with your step prefix, e.g. `s05_sodium_pump`.
- Prompts describe a single isolated subject on a transparent background. Never ask for text or labels in the picture: labels are drawn by the engine.
- Stick-figure people: say "a simple stick figure with a big round white head".

## Scene types (fields → elements)

| type | fields | elements (in `show` order) |
|---|---|---|
| `title` | `kicker` ("STEP 0.1"), `title` ≤6 words, `subtitle` ≤12 words, `goals` [1–3, ≤8 words each] | 0 title, 1..n goals |
| `term` | `term` ≤3 words, `meaning` ≤14 words, `example` ≤14 words (optional), `img` ImgRef (optional) | 0 term (+img), 1 meaning, 2 example |
| `illus` | `img` ImgRef, `label` ≤4 words, `caption` ≤12 words, `callouts` [0–4 {`text` ≤5 words}] | 0 image+label, 1 caption, 2.. callouts |
| `diagram` | `title` ≤5 words, `img` ImgRef, `parts` [2–6 {`name` ≤3 words, `note` ≤6 words}] | 0 title+image, 1..n parts |
| `zoom` | `levels` [2–5 {`img` ImgRef, `label` ≤2 words, `caption` ≤6 words}]: big → small, or small → big | 0..n-1 one per level (the camera dives from each level into the next) |
| `compare` | `title` ≤6 words, `cols` [2–3 {`head` ≤3 words, `img` ImgRef (optional), `points` [1–3, ≤7 words]}] | 0 title, then each column head (1..c), then the points row by row (col1 pt1, col2 pt1, …) |
| `steps` | `title` ≤5 words, `steps` [2–5 {`label` ≤3 words, `note` ≤8 words, `img` ImgRef (optional)}] | 0 title, 1..n steps (an arrow draws into each) |
| `cycle` | `title` ≤5 words, `center` ≤3 words, `steps` [3–5 {`label` ≤3 words}] | 0 title+center, 1..n steps |
| `table` | `title` ≤6 words, `cols` [2–3 headers], `rows` [2–6 rows of cells ≤6 words] | 0 title+header, 1..n rows |
| `analogy` | `left` {`img`, `label` ≤3 words}, `right` {`img`, `label`}, `points` [1–3, ≤8 words], `verdict` ≤10 words | 0 left, 1 right, 2.. points, last = verdict |
| `confuse` | `title` ≤5 words, `items` [2–4 {`term` ≤3 words, `is` ≤10 words}], `note` ≤12 words | 0 title, 1..n items, last = note |
| `sim` | `mode` (see below), `title` ≤5 words, `labels` {mode-specific} | 0 setup, 1 motion, 2 result |
| `scale` | `title` ≤5 words, `min` number, `max` number, `left` ≤3 words, `right` ≤3 words, `points` [1–4 {`v` number, `label` ≤3 words}] | 0 axis, 1..n points |
| `quiz` | `question` ≤22 words, `options` [2–4, ≤8 words], `answer` index, `why` ≤16 words, `kind` "check" or "mcq" | 0 question, 1..n options, n+1 answer + why |
| `recap` | `title` ≤4 words, `points` [3–7, ≤8 words] | 0..n-1 |

**`sim` modes and labels** (code-drawn particle animations):
- `diffusion`: {`high`, `low`}: particles spread from crowded to empty
- `osmosis`: {`water`, `solute`, `membrane`}: water crosses, solute is blocked
- `channel`: {`ion`, `channel`}: ions flow through a channel down their gradient
- `pump`: {`out`, `in`, `energy`}: pump moves ions using ATP (e.g. 3 Na+ out, 2 K+ in)
- `charge`: {`plus`, `minus`}: opposite charges attract, like charges repel
- `potential`: {`inside`, `outside`}: thin layer of charge separation at the membrane

**`quiz` lines pattern:** read the question (show 0), each option (show 1..n), then `{"pause": 4}`, then the answer line(s) (show n+1).

## Core image library (reuse these ids)
| id | prompt |
|---|---|
| `heart` | anatomically-inspired human heart with vessels (exists) |
| `cardiac_cell` | one cardiac muscle cell, striated, one nucleus (exists) |
| `animal_cell` | round animal cell: membrane, amber cytoplasm, purple nucleus, orange mitochondria, small ribosome dots, blue ER folds near nucleus |
| `plant_cell` | rectangular plant cell: green cell wall, large central vacuole, green chloroplasts, purple nucleus |
| `bacterium` | rod-shaped bacterium: cell wall + membrane, DNA loop floating free (no nucleus), small ribosome dots, tail flagellum |
| `neuron` | one neuron: cell body with purple nucleus, branching dendrites, long axon, axon terminals |
| `red_blood_cell` | a few red blood cells: red biconcave discs, no nucleus |
| `muscle_fibre` | skeletal muscle fibre bundle, striated, warm red-orange |
| `mitochondrion` | one large mitochondrion cut open: orange bean, wavy inner folds |
| `nucleus` | cell nucleus close-up: purple double-membrane sphere with pores, tangled DNA threads inside |
| `dna_helix` | DNA double helix, two backbones, coloured base-pair rungs |
| `chromosome` | one X-shaped chromosome, coiled thread texture |
| `protein_chain` | protein: a chain of round beads folding into a 3D blob |
| `stick_person` | a simple stick figure with a big round white head, standing, friendly |
| `human_body` | simple stick-figure human outline with a glowing heart and faint blood vessels |

## Fixed visual vocabulary (continuity across all blocks)
Nucleus = purple · mitochondria = orange "power plants" · cytoplasm = amber · membrane = dark-orange outline · DNA bases A/T/G/C = red/yellow/green/blue · water = light blue drops · Na+ = amber · K+ = purple · ATP = yellow lightning battery · signal molecule (ligand) = small green key-shaped molecule · receptor = protein in the membrane shaped to fit it.
