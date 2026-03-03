# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run lint       # ESLint
npm test           # Run all Jest tests
npm test -- --testPathPattern=pipeline   # Run a single test file
npm test -- -t "test name"              # Run tests matching a name
```

Tests match `**/?(*.)+(test).js` (`.js` only, not `.jsx`). Test files live in `src/core/search/__tests__/`.

The project uses ESM (`"type": "module"`) but Jest runs through Babel with CommonJS — hence `jest.config.cjs` and `babel.config.cjs`.

## What the app does

A client-side React app that transforms a Pokémon GO search string containing parentheses into an equivalent parenthesis-free string, by distributing terms into CNF (Conjunctive Normal Form).

In Pokémon GO's search engine, `,` (OR) binds tighter than `&` (AND). CNF output (AND at top level, OR inside clauses) is therefore unambiguous without parentheses: `a,c&b,c` is read as `(a,c)&(b,c)` by the game.

## Core pipeline

`src/core/search/index.js` — the `transform(input)` function:

```
tokenize → parse → simplify → normalize → simplify → serialize
```

| File | Role |
|---|---|
| `tokenize.js` | Characters → tokens. `,` `:` `;` are all OR. Trims and lowercases TERMs. |
| `parse.js` | Tokens → AST. OR has higher priority than AND (i.e. `a&b,c` parses as `a&(b,c)`). |
| `astUtils.js` | Shared AST helpers: `termNode`, `combineLeft`, `flattenByType`. Used by `parse.js` and the simplify rules. |
| `simplify.js` | Runs simplification passes. Currently: `removeDuplicateClauses`. |
| `simplify/removeDuplicateClauses.js` | Removes structurally equivalent sub-expressions up to commutativity, e.g. `(A&B),(B&A)→(A&B)`. Uses `canonicalKey` (sorts children alphabetically). |
| `normalize.js` | NNF (pushes `!` down to leaves, eliminates `!!`), then validates forbidden negated IV filters, then CNF (distributes OR over AND). |
| `serialize.js` | AST → string. AND→`&`, OR→`,`, NOT→`!`. No parentheses needed because CNF + PoGo precedence. |

The second `simplify` call (after `normalize`) catches duplicates introduced by CNF expansion.

## Adding a new simplification rule

1. Create `src/core/search/simplify/myRule.js`, following the pattern of `removeDuplicateClauses.js` (recurse into children, flatten same-type chains with `flattenByType`, rebuild with `combineLeft`).
2. Import and call it in `simplify.js`.

## Known issue: stale test file

`src/core/search/__tests__/normalize.test.js` imports `toNNF` and `dedupeAst` from `../normalize`, but those names are not exported. The actual exports are `toCNF` and `normalize`. These tests will fail until the imports are fixed.
