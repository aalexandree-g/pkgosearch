import { removeDuplicateClauses } from './simplify/removeDuplicateClauses'

export function simplify(node) {
  let n = node
  n = removeDuplicateClauses(n)
  return n
}
