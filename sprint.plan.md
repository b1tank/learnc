# Sprint: K&R Chapter 1 Walkthrough

**Goal:** populate every Chapter 1 lesson stub with original, runnable walk-throughs so the site works as a read-the-book replacement. PDF used as factual reference only; all prose, examples, and exercise solutions written in original voice. Each section ships as its own commit + push so GitHub Pages updates incrementally and the author can read live.

## Conventions for this sprint

- **File naming**: section titles, lowercase, dash-separated, e.g. `01-03-the-for-statement.md`.
- **One commit per lesson** (`feat(ch1): section 1.x …` / `feat(ch1): exercise 1-NN …`).
- **Each lesson** ends with a `## Notes from the author` block flagging what to revise.
- **No K&R prose reproduced.** Concepts are factual and free to discuss; expression is original.
- **Verify** each lesson loads in the local dev server before commit.

## Tasks (in order)

0. [ ] Rename `01-01-hello.md` → `01-01-getting-started.md`; `01-02-temp.md` → `01-02-variables-and-arithmetic-expressions.md`. Update manifest ids and `prev`/`next` chain. *(Single refactor commit.)*
1. [ ] §1.3 The `for` Statement → `01-03-the-for-statement.md`
2. [ ] §1.4 Symbolic Constants → `01-04-symbolic-constants.md`
3. [ ] §1.5 Character Input and Output → `01-05-character-input-and-output.md`
4. [ ] §1.6 Arrays → `01-06-arrays.md`
5. [ ] §1.7 Functions → `01-07-functions.md`
6. [ ] §1.8 Arguments — Call by Value → `01-08-arguments-call-by-value.md`
7. [ ] §1.9 Character Arrays → `01-09-character-arrays.md`
8. [ ] §1.10 External Variables and Scope → `01-10-external-variables-and-scope.md`
9. [ ] Exercises 1-1 … 1-24 → `ex-1-NN.md`, in numeric order, each a separate commit.
10. [ ] Build/perf smoke-check, push final commits.

## Hiccups & Notes

*(append here as work proceeds)*
