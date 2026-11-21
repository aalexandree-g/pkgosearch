# pkgosearch

![Status](https://img.shields.io/badge/Project-In%20Progress-orange)

**pkgosearch** is a **React application** designed to transform searches written in natural language into optimized advanced **search queries for Pokémon GO**.

## Main Feature

In Pokémon GO, advanced searches **do not support parentheses**, which quickly makes complex queries difficult to write, read, and maintain.

pkgosearch addresses this limitation by providing :

- a more **natural and readable** search syntax, **with parentheses support**
- an auto-resizing input field to ensure **the full expression remains visible** while typing
- a structured JavaScript parsing engine (tree-based logic) to analyze expression logic
- automatic normalization and **transformation of the input expression**
- simplification of repeated conditions before expansion to reduce intermediate work
- translation into an equivalent **Pokémon GO–compatible query** (without parentheses)

## Search validation

Recognized English IV-tier negations are converted to positive complements:
`!1attack` becomes `0attack,2-attack`, `!0attack` becomes `1-attack`, and
`!4hp` becomes `-3hp`. The output does not rely on native IV negation, which
matched `1attack` in the operator's reported 0.437.0-A-64 (iOS) check and may
change in a later game version. These range forms were checked in a populated
Shadow search; the result does not establish how unrelated or niche range-like
filters behave. French IV aliases and Mega negations remain unsupported.
Double negation is removed first, so `!!1attack` remains `1attack`.

Validation runs before simplification, even when an unsupported term would
otherwise disappear. Ordinary negations such as `!cp666` and `!hp100` remain
supported. Native region exclusions such as `132&!alola` remain usable, but
grouped expressions requiring their redistribution or introduction are rejected
instead of assuming ordinary Boolean behavior.

The converter also uses the known fact that every Lucky Pokémon is Traded:
it removes impossible `lucky&!traded` alternatives and redundant `traded`
requirements alongside `lucky`. It does not assume Lucky and Shiny are separate.
If this cleanup proves the entire expression impossible, it reports an error
explaining the conflicting Lucky/Traded requirements. Useful OR alternatives
are still preserved; an impossible required AND condition is not dropped.

## Complex searches

The web converter has no fixed clause limit. It simplifies shared conditions
and verified facts, then tries compact conversion for costly expressions.
The internal threshold of 32 only triggers that attempt; it never rejects a
search.

Larger expressions can use compact conversion when their alternatives have
proved non-overlapping selectors: numeric species IDs/ranges, star buckets,
same-stat IV tiers/ranges, or recognized exact fast-move types such as
`@1fire`. All remaining requirements stay required, repeated selectors keep
their alternatives, and standalone choices such as `shiny` retain their free
pass. IV complements use positive tier/range terms, never native negated IV
filters.

Names, families, ordinary types, tags and unrelated flags do not establish
non-overlap. When compact conversion cannot help, the converter expands to
exact CNF instead. It never substitutes an approximate search. Very large
irreducible expressions can still consume substantial browser memory.

## Project Goals

This application addresses these challenges by focusing on the following goals :

- work around the limitations of Pokémon GO’s search engine
- simplify the creation of complex advanced search queries
- demonstrate a structured approach to parsing and text transformation in JavaScript

pkgosearch is also a personal project aimed at improving my React skills while exploring structured parsing and text transformation in JavaScript.

It is largely inspired by an existing project ([website](https://mongo.lebeg134.hu/) | [GitHub](https://github.com/Lebeg134/MonGoSearch)), with a focus on **enhancing UX and interface design**.
