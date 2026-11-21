import { combineLeft } from './astUtils'
import {
  assertSupportedNegations,
  getIVComplementTermsForFilter,
  isRegionTerm,
} from './searchRules'

/**
 * Counts required clauses without constructing a Cartesian product.
 */
export function countCNFConjuncts(node, counts = new WeakMap()) {
  if (!node || node.type === 'TERM' || node.type === 'NOT') return 1
  if (counts.has(node)) return counts.get(node)

  const left = countCNFConjuncts(node.left, counts)
  const right = countCNFConjuncts(node.right, counts)
  const count = node.type === 'AND' ? left + right : left * right
  counts.set(node, count)
  return count
}

/**
 * Converts an expression tree to CNF (Conjunctive Normal Form),
 * by distributing OR over AND. Negations must be prepared first.
 *
 * Rules:
 * - AND(A, B) stays AND once children are normalized
 * - OR(AND(A, B), C) -> AND(OR(A, C), OR(B, C))
 * - OR(A, AND(B, C)) -> AND(OR(A, B), OR(A, C))
 */
export function toCNF(node) {
  function convert(current) {
    if (!current || current.type === 'TERM' || current.type === 'NOT')
      return current

    const left = convert(current.left)
    const right = convert(current.right)

    // AND nodes are already CNF-friendly once children are CNF.
    if (current.type === 'AND') {
      return { type: 'AND', left, right }
    }

    if (left?.type === 'AND') {
      return {
        type: 'AND',
        left: convert({ type: 'OR', left: left.left, right }),
        right: convert({ type: 'OR', left: left.right, right }),
      }
    }

    if (right?.type === 'AND') {
      return {
        type: 'AND',
        left: convert({ type: 'OR', left, right: right.left }),
        right: convert({ type: 'OR', left, right: right.right }),
      }
    }

    return { type: 'OR', left, right }
  }

  return convert(node)
}

/**
 * Pushes NOT down to terms and converts supported IV negations to positive terms.
 *
 * Rules:
 * - !!A -> A
 * - !(A & B) -> (!A) | (!B)
 * - !(A | B) -> (!A) & (!B)
 */
function rewriteNegations(node, negated, groupedNegation) {
  if (!node) return node

  if (node.type === 'TERM') {
    if (negated && groupedNegation && isRegionTerm(node.value)) {
      throw new Error(
        'Unsupported filter operation: introducing a negated region from a group. Simplify the input.'
      )
    }
    if (negated) {
      const complement = getIVComplementTermsForFilter(node.value)
      if (complement) {
        const terms = complement.map((value) => ({ type: 'TERM', value }))
        return terms.length ? combineLeft(terms, 'OR') : null
      }
    }
    return negated ? { type: 'NOT', child: node } : node
  }

  if (node.type === 'NOT') {
    return rewriteNegations(node.child, !negated, groupedNegation)
  }

  if (node.type === 'AND' || node.type === 'OR') {
    const op = negated ? (node.type === 'AND' ? 'OR' : 'AND') : node.type

    return {
      type: op,
      left: rewriteNegations(node.left, negated, groupedNegation || negated),
      right: rewriteNegations(node.right, negated, groupedNegation || negated),
    }
  }

  return node
}

function simplifyFalseTerms(node) {
  if (!node || node.type === 'TERM' || node.type === 'NOT') return node

  const left = simplifyFalseTerms(node.left)
  const right = simplifyFalseTerms(node.right)

  if (node.type === 'AND' && (!left || !right)) return null
  if (node.type === 'OR') {
    if (!left) return right
    if (!right) return left
  }
  return { type: node.type, left, right }
}

/**
 * Prepares leaf negations and validates before simplifying false branches.
 * Call before simplification so absorption cannot hide unsupported filters.
 */
export function prepareForCNF(node) {
  const nnf = rewriteNegations(node, false, false)
  assertSupportedNegations(nnf)
  const prepared = simplifyFalseTerms(nnf)
  if (!prepared) {
    throw new Error(
      'Impossible expression: an IV filter complement contains no tiers.'
    )
  }
  return prepared
}

/**
 * Prepares and validates negations, then builds exact CNF without a fixed cap.
 * Factoring and partition selection belong to the transform() call chain.
 */
export function normalize(node) {
  return toCNF(prepareForCNF(node))
}
