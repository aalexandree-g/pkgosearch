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
- translation into an equivalent **Pokémon GO–compatible query** (without parentheses)

## Project Goals

This application addresses these challenges by focusing on the following goals :

- work around the limitations of Pokémon GO’s search engine
- simplify the creation of complex advanced search queries
- demonstrate a structured approach to parsing and text transformation in JavaScript

pkgosearch is also a personal project aimed at improving my React skills while exploring structured parsing and text transformation in JavaScript.

It is largely inspired by an existing project ([website](https://mongo.lebeg134.hu/) | [GitHub](https://github.com/Lebeg134/MonGoSearch)), with a focus on **enhancing UX and interface design**.
