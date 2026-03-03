/**
 * Creates a TERM node from a token.
 */
export function termNode(token) {
  return { type: 'TERM', value: token.value }
}

/**
 * Combines nodes into a left-associative binary tree.
 * Example: (A,B,C) -> OR(OR(A,B),C)
 */
export function combineLeft(nodes, opType) {
  if (!nodes.length) throw new Error('No node to combine')
  if (nodes.length === 1) return nodes[0]

  return nodes
    .slice(1)
    .reduce((acc, node) => ({ type: opType, left: acc, right: node }), nodes[0])
}

/**
 * Computes a canonical, order-independent string key for a node.
 * Children of AND/OR are sorted alphabetically so that (A&B) and (B&A) yield the same key.
 * Compound sub-expressions are wrapped in parentheses to avoid ambiguous keys.
 */
export function canonicalKey(node) {
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
 * Flattens a tree of the same operator into a list of nodes.
 * Example: OR(OR(A,B),C) -> (A,B,C)
 */
export function flattenByType(node, type, acc = []) {
  if (!node) return acc

  if (node.type === type) {
    flattenByType(node.left, type, acc)
    flattenByType(node.right, type, acc)
  } else {
    acc.push(node)
  }

  return acc
}
