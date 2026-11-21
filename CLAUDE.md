# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run lint       # ESLint
npm test           # Run all Jest tests
npm test -- --runTestsByPath src/core/search/__tests__/pipeline.test.js   # Run a single test file
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
tokenize → parse → prepareForCNF → simplify → preOptimizeSearch
→ validate constructed leaves → toCNF → simplify → serialize
```

| File                                 | Role                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokenize.js`                        | Characters → tokens. `,` `:` `;` `\|` are all OR. Trims and lowercases TERMs.                                                                                                                                                                                                                                                                                                               |
| `parse.js`                           | Tokens → AST. OR has higher priority than AND (i.e. `a&b,c` parses as `a&(b,c)`).                                                                                                                                                                                                                                                                                                           |
| `astUtils.js`                        | Shared AST helpers: `termNode`, `combineLeft`, `flattenByType`, `canonicalKey`. Used by `parse.js` and the simplify rules.                                                                                                                                                                                                                                                                  |
| `simplify.js`                        | Runs `removeDuplicateClauses`, `absorb`, then `factorCommonConjuncts`.                                                                                                                                                                                                                                                                                                                      |
| `simplify/removeDuplicateClauses.js` | Removes structurally equivalent sub-expressions up to commutativity, e.g. `(A&B),(B&A)→(A&B)`. Uses `canonicalKey` (sorts children alphabetically).                                                                                                                                                                                                                                         |
| `simplify/absorb.js`                 | Removes subsumed expressions, e.g. `A,(A&B)→A`.                                                                                                                                                                                                                                                                                                                                             |
| `simplify/factorCommonConjuncts.js`  | Factors shared AND terms from OR branches, e.g. `(A&B),(A&C)→A&(B,C)`. Running before normalization can reduce intermediate CNF expansion.                                                                                                                                                                                                                                                  |
| `normalize.js`                       | `prepareForCNF` pushes `!` to leaves, eliminates `!!`, converts supported English IV negations to positive ranges, and validates remaining unsupported operations without expansion. `countCNFConjuncts` estimates expansion without allocating products. `toCNF` distributes exactly without a fixed clause cap; direct `normalize` composes preparation and CNF, not partition selection. |
| `searchRules.js`                     | Parses supported IV ranges and builds positive complement terms. Rejects French IV aliases, Mega negations and regrouped region exclusions. Classifies conservative English selector domains and proves non-overlap for compact conversion.                                                                                                                                                 |
| `preOptimizeSearch.js`               | Reduces verified Lucky/Traded facts in prepared ASTs, reuses factoring, and compacts costly OR groups only with a proved selector partition. Otherwise leaves them for exact expansion.                                                                                                                                                                                                     |
| `serialize.js`                       | AST → string. AND→`&`, OR→`,`, NOT→`!`. No parentheses needed because CNF + PoGo precedence.                                                                                                                                                                                                                                                                                                |

Preparation converts supported English IV negations, then validates before the
first `simplify` so absorption cannot hide an unsupported filter. French IV
aliases and Mega negations remain unsupported. An empty IV complement is
removed from an OR alternative or reported as an impossible expression when
it is required. The first simplification reduces work before CNF expansion;
the second catches duplicates and subsumed clauses introduced by expansion.
Lucky implies Traded: impossible Lucky-and-not-Traded branches are removed and
Traded is redundant alongside Lucky. If every alternative is impossible,
`preOptimizeSearch` throws an informative `Impossible expression` error through
the same Error/message path used for parser errors, rather than emitting a
no-match or empty search.

The web app has no fixed expansion limit. COMPACT_CNF_THRESHOLD (32) is only
a heuristic for when to try compaction and avoid costly selector complements,
not a rejection threshold. `preOptimizeSearch` tries supported common selector dimensions
in input order, groups identical selectors and requires pairwise non-overlap.
Branch CNF can expose selector unions hidden by shared factoring.
Remainders retain every required clause; standalone alternatives shield every
restriction. IV complements use compact positive ranges. Other supported
selector unions use ANDs of reliable leaf negations.

The engine recursively processes selector-free remainders, never its generated
restrictions. If compact conversion cannot help, ordinary exact CNF conversion
still runs. Unknown overlap blocks this compact method, not exact conversion.
There is no approximation or raw grouped output. Selector choice is conservative
and deterministic, not a global minimizer. Very large irreducible searches can
still exhaust browser resources.

## Search tests

| File                                  | Role                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `__tests__/simplify.test.js`          | Exercises duplicate removal, absorption, and factoring, including nested and commutative expressions. Factoring tests compare factored ASTs and reparsed `transform()` output using bounded Boolean truth tables; check immutability, deterministic ties, and reduced intermediate CNF expansion. These checks do not simulate Pokémon GO. |
| `__tests__/pipeline.test.js`          | Exercises `transform()` end-to-end, including valid input, positive IV complements, unsupported Mega negation, and invalid syntax.                                                                                                                                                                                                         |
| `__tests__/searchRules.test.js`       | Checks conservative selector recognition, inclusive overlap and unsupported proof domains.                                                                                                                                                                                                                                                 |
| `__tests__/preOptimizeSearch.test.js` | Exercises the portable conversion corpus through production entry points, Lucky/Traded cleanup, exact fallback above 32 clauses, direct helpers, selector unions, complete/nested remainders, positive IV complements, all 18 fast-move types and per-run purity. Abstract domain assignments are not game simulation.                     |

The shared corpus uses `error` for common semantic errors and `pipelineError`
for iOS-specific expansion errors. Browser tests still verify exact output and
membership for those `pipelineError` cases; they must not treat them as web errors.

## Adding a new simplification rule

1. Create `src/core/search/simplify/myRule.js`, following the pattern of `removeDuplicateClauses.js` (recurse into children, flatten same-type chains with `flattenByType`, rebuild with `combineLeft`).
2. Import and call it in `simplify.js`.
