import { flattenByType, combineLeft } from '../astUtils'

/**
 * Computes a canonical, order-independent string key for a node.
 * Children of AND/OR are sorted alphabetically, so (A&B) and (B&A) yield the same key.
 */
function canonicalKey(node) {
  if (!node) return ''
  if (node.type === 'TERM') return node.value
  if (node.type === 'NOT') return `!(${canonicalKey(node.child)})`

  if (node.type === 'AND' || node.type === 'OR') {
    const op = node.type === 'AND' ? '&' : ','
    const flat = flattenByType(node, node.type)
    const keys = flat
      .map((n) => {
        const k = canonicalKey(n)
        return n.type === 'AND' || n.type === 'OR' ? `(${k})` : k
      })
      .sort()
    return keys.join(op)
  }

  return ''
}

/**
 * Removes nodes with duplicate canonical keys from a flat list (stable: keeps first).
 */
function removeDuplicateNodes(nodes) {
  const seen = new Set()
  return nodes.filter((node) => {
    const key = canonicalKey(node)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Removes duplicate sub-expressions inside AND / OR chains (recursively).
 * Two sub-expressions are considered duplicates if they have the same canonical key,
 * i.e. they are structurally equivalent up to commutativity of AND/OR.
 *
 * Rules:
 * - (A&B) , (B&A) -> (A&B)
 * - (A,B) & (B,A) -> (A,B)
 */
export function removeDuplicateClauses(node) {
  if (!node || node.type === 'TERM') return node

  if (node.type === 'NOT') {
    return { type: 'NOT', child: removeDuplicateClauses(node.child) }
  }

  const left = removeDuplicateClauses(node.left)
  const right = removeDuplicateClauses(node.right)

  if (node.type === 'AND' || node.type === 'OR') {
    const flat = flattenByType({ type: node.type, left, right }, node.type)
    const uniqueNodes = removeDuplicateNodes(flat)

    if (uniqueNodes.length === 0) {
      throw new Error('Empty expression after duplicate clause removal')
    }
    if (uniqueNodes.length === 1) return uniqueNodes[0]

    return combineLeft(uniqueNodes, node.type)
  }

  return { ...node, left, right }
}
