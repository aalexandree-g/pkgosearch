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
