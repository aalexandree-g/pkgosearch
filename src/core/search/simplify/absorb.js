import { flattenByType, combineLeft, canonicalKey } from '../astUtils'

/**
 * Returns the set of canonical keys of a node's conjuncts (AND-flattened).
 * A non-AND node is treated as a singleton conjunct.
 *
 * Used in OR context: if conjuncts(X) ⊂ conjuncts(Y), then X absorbs Y.
 * Example: conjunctKeys(A)     = { 'a' }
 *          conjunctKeys(A & B) = { 'a', 'b' }
 */
function conjunctKeys(node) {
  const flat = node.type === 'AND' ? flattenByType(node, 'AND') : [node]
  return new Set(flat.map(canonicalKey))
}

/**
 * Returns the set of canonical keys of a node's disjuncts (OR-flattened).
 * A non-OR node is treated as a singleton disjunct.
 *
 * Used in AND context: if disjuncts(X) ⊂ disjuncts(Y), then X absorbs Y.
 * Example: disjunctKeys(A)     = { 'a' }
 *          disjunctKeys(A | B) = { 'a', 'b' }
 */
function disjunctKeys(node) {
  const flat = node.type === 'OR' ? flattenByType(node, 'OR') : [node]
  return new Set(flat.map(canonicalKey))
}

/**
 * Returns true if setA is a strict subset of setB (setA ⊂ setB).
 * Strict means setA is smaller: equal sets are handled by removeDuplicateClauses.
 */
function isStrictSubset(setA, setB) {
  if (setA.size >= setB.size) return false
  for (const item of setA) {
    if (!setB.has(item)) return false
  }
  return true
}

/**
 * Filters a flat list of nodes by removing any node Y that is absorbed by another node X,
 * i.e. getKeys(X) ⊂ getKeys(Y). The simpler node (smaller key set) survives.
 */
function absorbNodes(nodes, getKeys) {
  const keySets = nodes.map(getKeys)
  return nodes.filter((_, i) => {
    for (let j = 0; j < nodes.length; j++) {
      if (j === i) continue
      if (isStrictSubset(keySets[j], keySets[i])) return false
    }
    return true
  })
}

/**
 * Applies the absorption law recursively to an AST.
 *
 * Rules:
 * - A | (A & B)       -> A        [A absorbs A & B in an OR chain]
 * - A & (A | B)       -> A        [A absorbs A | B in an AND chain]
 * - (A & B) | (A & B & C) -> (A & B) [general case: smaller conjunct-set absorbs larger]
 * - (A | B) & (A | B | C) -> (A | B) [general case: smaller disjunct-set absorbs larger]
 *
 * In an OR chain:  node X absorbs node Y if conjuncts(X) ⊂ conjuncts(Y).
 * In an AND chain: node X absorbs node Y if disjuncts(X) ⊂ disjuncts(Y).
 */
export function absorb(node) {
  if (!node || node.type === 'TERM') return node

  if (node.type === 'NOT') {
    return { type: 'NOT', child: absorb(node.child) }
  }

  const left = absorb(node.left)
  const right = absorb(node.right)

  if (node.type === 'OR') {
    const flat = flattenByType({ type: 'OR', left, right }, 'OR')
    const result = absorbNodes(flat, conjunctKeys)
    if (result.length === 0) throw new Error('Empty expression after absorption')
    if (result.length === 1) return result[0]
    return combineLeft(result, 'OR')
  }

  if (node.type === 'AND') {
    const flat = flattenByType({ type: 'AND', left, right }, 'AND')
    const result = absorbNodes(flat, disjunctKeys)
    if (result.length === 0) throw new Error('Empty expression after absorption')
    if (result.length === 1) return result[0]
    return combineLeft(result, 'AND')
  }

  return { ...node, left, right }
}
