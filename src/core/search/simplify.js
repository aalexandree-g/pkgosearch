import { removeDuplicateClauses } from './simplify/removeDuplicateClauses'
import { absorb } from './simplify/absorb'
import { factorCommonConjuncts } from './simplify/factorCommonConjuncts'

/**
 * Runs deduplication and absorption before factoring.
 * transform() calls these passes before and after normalization.
 */
export function simplify(node) {
  let simplified = node
  simplified = removeDuplicateClauses(simplified)
  simplified = absorb(simplified)
  simplified = factorCommonConjuncts(simplified)
  return simplified
}
