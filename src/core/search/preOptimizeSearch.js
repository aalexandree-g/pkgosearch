import { canonicalKey, combineLeft, flattenByType } from './astUtils'
import { countCNFConjuncts, toCNF } from './normalize'
import {
  areSelectorsDisjoint,
  classifySelector,
  getIVComplementTerms,
} from './searchRules'
import { simplify } from './simplify'

// Try a shorter form above 32 clauses; larger searches are still allowed.
const COMPACT_CNF_THRESHOLD = 32

function isTerm(node, value) {
  return node.type === 'TERM' && node.value === value
}

function isNotTraded(node) {
  return node.type === 'NOT' && isTerm(node.child, 'traded')
}

function rebuildIfChanged(node, originalParts, parts) {
  return parts.length === originalParts.length &&
    parts.every((part, index) => part === originalParts[index])
    ? node
    : combineLeft(parts, node.type)
}

/**
 * Removes redundant traded terms next to lucky and drops impossible
 * lucky&!traded alternatives. Throws if no possible alternative remains.
 */
function simplifyLuckyTraded(node) {
  function visit(current) {
    if (!current || current.type === 'TERM' || current.type === 'NOT') {
      return current
    }
    const originalParts = flattenByType(current, current.type)
    const processed = originalParts.map(visit)

    if (current.type === 'OR') {
      const alternatives = processed.filter((part) => part !== null)
      return alternatives.length
        ? rebuildIfChanged(current, originalParts, alternatives)
        : null
    }
    if (processed.some((part) => part === null)) return null

    const conjuncts = processed.flatMap((part) => flattenByType(part, 'AND'))
    const lucky = conjuncts.find((part) => isTerm(part, 'lucky'))
    const notTraded = conjuncts.find(isNotTraded)
    if (lucky && notTraded) return null
    const remaining = lucky
      ? conjuncts.filter((part) => !isTerm(part, 'traded'))
      : conjuncts
    return rebuildIfChanged(current, originalParts, remaining)
  }

  const optimized = visit(node)
  if (optimized === null) {
    throw new Error(
      'Impossible expression: "lucky" implies "traded", but "!traded" is also present, which is a contradiction.'
    )
  }
  return optimized
}

function complementSelector({ selector, descriptor }) {
  if (descriptor.dimension.startsWith('iv:')) {
    const stat = descriptor.dimension.slice(3)
    const terms = getIVComplementTerms(descriptor.intervals, stat).map(
      (value) => ({ type: 'TERM', value })
    )
    return terms.length ? combineLeft(terms, 'OR') : null
  }

  return combineLeft(
    flattenByType(selector, 'OR').map((child) => ({ type: 'NOT', child })),
    'AND'
  )
}

/**
 * Groups alternatives by a species, star, IV or move condition.
 * Returns null if a condition is missing or different groups could overlap.
 */
function groupByDisjointSelectors(branches, dimension) {
  const groupsByKey = new Map()
  const selectorsByBranch = new Map()

  for (const { branch, conjuncts, choices } of branches) {
    const index = choices.findIndex(
      (choice) => choice?.descriptor.dimension === dimension
    )
    if (index < 0) return null
    const choice = choices[index]
    if (!groupsByKey.has(choice.key)) {
      groupsByKey.set(choice.key, { ...choice, remainders: [] })
    }
    groupsByKey.get(choice.key).remainders.push(
      combineLeft(
        conjuncts.filter((_, conjunctIndex) => conjunctIndex !== index),
        'AND'
      )
    )
    selectorsByBranch.set(branch, choice.selector)
  }

  const groups = [...groupsByKey.values()]
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      if (!areSelectorsDisjoint(groups[i].descriptor, groups[j].descriptor))
        return null
    }
  }
  return { groups, selectorsByBranch }
}

/**
 * Simplifies known patterns and tries to shorten large OR expressions.
 * Call prepareForCNF first to convert supported IV negations and validate
 * operations that the game does not treat as ordinary Boolean complements.
 * Leaves expressions it cannot shorten for toCNF to expand.
 */
export function preOptimizeSearch(node) {
  const selectorCache = new WeakMap()
  const clauseCounts = new WeakMap()

  function getSelectorChoice(selector) {
    if (!selectorCache.has(selector)) {
      const descriptor = classifySelector(selector)
      selectorCache.set(
        selector,
        descriptor
          ? { selector, descriptor, key: canonicalKey(selector) }
          : null
      )
    }
    return selectorCache.get(selector)
  }

  /**
   * Finds possible selectors in an conjunction's AND clauses.
   * CNF exposes choices such as (132,1) after shared conditions were factored out.
   */
  function findBranchSelectors(branch) {
    const conjuncts = flattenByType(toCNF(branch), 'AND')
    return { branch, conjuncts, choices: conjuncts.map(getSelectorChoice) }
  }

  /**
   * Appends clauses that require the rest of an conjunction when its selector matches.
   * Standalone OR choices can pass without meeting those requirements.
   */
  function appendConditionalClauses(clauses, group, complement, standalone) {
    // Simplify the remaining input, not the clauses generated below.
    const remainder = simplifyAndCompactNode(
      simplify(combineLeft(group.remainders, 'OR'))
    )
    const remainderClauses = flattenByType(toCNF(remainder), 'AND')
    remainderClauses.forEach((clause) => {
      // A standalone choice such as shiny must still pass every clause.
      const restriction = combineLeft(
        [...standalone, ...(complement ? [complement] : []), clause],
        'OR'
      )
      clauses.push(...flattenByType(toCNF(restriction), 'AND'))
    })
  }

  /**
   * Builds the shorter expression from the selected non-overlapping conditions.
   * Combines their OR clause with each alternative's conditional requirements.
   */
  function buildCompactAlternatives(alternatives, partition, complements) {
    const standalone = alternatives.filter((part) => part.type !== 'AND')
    const gate = combineLeft(
      alternatives.map((part) => partition.selectorsByBranch.get(part) || part),
      'OR'
    )
    const clauses = [gate]
    partition.groups.forEach((group, index) => {
      appendConditionalClauses(clauses, group, complements[index], standalone)
    })
    return combineLeft(clauses, 'AND')
  }

  /**
   * Looks for non-overlapping conditions and checks the size of their complements.
   * Builds the shorter expression if suitable conditions exist; otherwise null.
   */
  function tryCompactAlternatives(current) {
    const alternatives = flattenByType(current, 'OR')
    const branches = alternatives
      .filter((part) => part.type === 'AND')
      .map(findBranchSelectors)
    if (!branches.length) return null

    const dimensions = new Set(
      branches[0].choices
        .filter((choice) => choice !== null)
        .map((choice) => choice.descriptor.dimension)
    )
    for (const dimension of dimensions) {
      const partition = groupByDisjointSelectors(branches, dimension)
      if (!partition) continue
      const complements = partition.groups.map(complementSelector)
      if (
        complements.some(
          (complement) =>
            complement &&
            countCNFConjuncts(complement, clauseCounts) > COMPACT_CNF_THRESHOLD
        )
      )
        continue

      return buildCompactAlternatives(alternatives, partition, complements)
    }
    return null
  }

  /**
   * Simplifies child expressions, then tries to shorten large OR expressions.
   */
  function simplifyAndCompactNode(current) {
    if (!current || current.type === 'TERM' || current.type === 'NOT')
      return current
    const originalParts = flattenByType(current, current.type)
    const parts = originalParts.map(simplifyAndCompactNode)
    const rebuilt = rebuildIfChanged(current, originalParts, parts)
    if (current.type === 'AND') return rebuilt

    const factored = simplify(rebuilt)
    if (factored.type !== 'OR') return simplifyAndCompactNode(factored)
    if (countCNFConjuncts(factored, clauseCounts) <= COMPACT_CNF_THRESHOLD)
      return factored

    return tryCompactAlternatives(factored) || factored
  }

  return simplifyAndCompactNode(simplify(simplifyLuckyTraded(node)))
}
