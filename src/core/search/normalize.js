/**
 * Converts an expression tree to CNF (Conjunctive Normal Form),
 * by distributing OR over AND.
 *
 * Rules:
 * - AND(A, B) stays AND once children are normalized
 * - OR(AND(A, B), C) -> AND(OR(A, C), OR(B, C))
 * - OR(A, AND(B, C)) -> AND(OR(A, B), OR(A, C))
 */
export function toCNF(node) {
  if (!node || node.type === 'TERM' || node.type === 'NOT') return node

  const left = toCNF(node.left)
  const right = toCNF(node.right)

  // AND nodes are already CNF-friendly once children are CNF
  if (node.type === 'AND') {
    return { type: 'AND', left, right }
  }

  // OR: distribute over AND on the left
  // (A & B) | C  ->  (A | C) & (B | C)
  if (left?.type === 'AND') {
    return {
      type: 'AND',
      left: toCNF({ type: 'OR', left: left.left, right }),
      right: toCNF({ type: 'OR', left: left.right, right }),
    }
  }

  // OR: distribute over AND on the right
  // A | (B & C)  ->  (A | B) & (A | C)
  if (right?.type === 'AND') {
    return {
      type: 'AND',
      left: toCNF({ type: 'OR', left, right: right.left }),
      right: toCNF({ type: 'OR', left, right: right.right }),
    }
  }

  // default OR: no distribution needed
  return { type: 'OR', left, right }
}

/**
 * Pushes NOT down to TERM nodes (Negation Normal Form).
 *
 * Rules:
 * - !!A -> A
 * - !(A & B) -> (!A) | (!B)
 * - !(A | B) -> (!A) & (!B)
 */
function normalizeNegations(node) {
  return rewriteNegations(node, false)
}

function rewriteNegations(node, negated) {
  if (!node) return node

  if (node.type === 'TERM') {
    return negated ? { type: 'NOT', child: node } : node
  }

  if (node.type === 'NOT') {
    return rewriteNegations(node.child, !negated)
  }

  if (node.type === 'AND' || node.type === 'OR') {
    const op = negated ? (node.type === 'AND' ? 'OR' : 'AND') : node.type

    return {
      type: op,
      left: rewriteNegations(node.left, negated),
      right: rewriteNegations(node.right, negated),
    }
  }

  return node
}

// Reject negated IV filters
// Examples rejected: !4pv, !0attack, !2-4defense
// Examples allowed: !pv100
const FORBIDDEN_NEGATED_IV_REGEX =
  /^([0-4]|[0-4]-[0-4])(attack|defense|hp|attaque|défense|pv)$/

function assertNoForbiddenIVTerms(node) {
  if (!node) return

  // Detect NOT(TERM(...))
  if (node.type === 'NOT' && node.child?.type === 'TERM') {
    const term = String(node.child.value).trim().toLowerCase()

    if (FORBIDDEN_NEGATED_IV_REGEX.test(term)) {
      throw new Error(`Forbidden filter: "!${node.child.value}".`)
    }

    return
  }

  assertNoForbiddenIVTerms(node.left)
  assertNoForbiddenIVTerms(node.right)
}

/**
 * Normalizes an AST using a list of passes.
 * Current pipeline: CNF -> dedupe
 */
  export function toNNF(node) {
    return normalizeNegations(node)
  }

  import { removeDuplicateClauses } from './simplify/removeDuplicateClauses.js'
  export function dedupeAst(node) {
    return removeDuplicateClauses(node)
  }

  export function normalize(node) {
  const nnf = normalizeNegations(node)

  // throws if forbidden terms are found
  assertNoForbiddenIVTerms(nnf)

  return toCNF(nnf)
}
