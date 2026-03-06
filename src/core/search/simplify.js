import { removeDuplicateClauses } from './simplify/removeDuplicateClauses'
import { absorb } from './simplify/absorb'

export function simplify(node) {
  let n = node
  n = removeDuplicateClauses(n)
  n = absorb(n)
  return n
}
