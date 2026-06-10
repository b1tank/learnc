# learnc lessons

One markdown file per lesson. The site fetches these at runtime - no build step.

## Format

Each lesson is a markdown file with YAML frontmatter and two optional fenced code blocks with special tags:

- ` ```c:starter ` - the code loaded into the editor
- ` ```output ` - the expected stdout, used for the ✓/✗ match badge (optional)

See [`_template.md`](_template.md) for the full skeleton.

## File naming

- Sections: `<chapter>-<section>-<keyword>.md` (e.g. `01-04-define.md`)
- Exercises: `ex-<chapter>-<num>.md` (e.g. `ex-1-1.md`)

Use the exact `id` from [`manifest.json`](manifest.json) as the filename.

## The manifest

[`manifest.json`](manifest.json) is the spine of the site - it lists every section and exercise across all 8 chapters of K&R. When you write a lesson:

1. Find its entry in `manifest.json`.
2. Set `status` to `"draft"` (work in progress) or `"done"` (full walkthrough).
3. Make sure your markdown file's name matches `id`.

Items with no `status` are treated as stubs and show a "no walkthrough yet" panel.

## Status values

- `done` - complete walkthrough, ready for readers
- `draft` - partial; useful but rough
- *(unset)* - stub, no file yet

## Style notes

- Write in your own voice. Short sentences. Concrete.
- Do not reproduce K&R text. Paraphrase, explain, add modern context.
- Use a `## Modern note` heading wherever K&R's 1988 style differs from current C99+ practice.
- End every section lesson with a `## Try it` list - 3–5 experiments.
- Keep each lesson to one screen of prose plus the runner. Density beats length.
