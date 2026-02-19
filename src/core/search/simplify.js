import { flattenByType, combineLeft } from './astUtils'

/**
 * Removes duplicate TERM and NOT(TERM) nodes from a flat list (stable: keeps first).
 */
function removeDuplicateNodes(nodes) {
  const seen = new Set()

  return nodes.filter((node) => {
    if (node.type === 'TERM') {
      const key = `TERM:${node.value}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }

    if (node.type === 'NOT' && node.child?.type === 'TERM') {
      const key = `NOT:${node.child.value}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }

    return true
  })
}

/**
 * Removes duplicate TERM and NOT(TERM) nodes inside AND / OR chains (recursively).
 * *
 * Rules:
 * - A & A -> A
 * - A | A -> A
 */
function removeDuplicateTerms(node) {
  if (!node || node.type === 'TERM') return node

  if (node.type === 'NOT') {
    return { type: 'NOT', child: removeDuplicateTerms(node.child) }
  }

  const left = removeDuplicateTerms(node.left)
  const right = removeDuplicateTerms(node.right)

  if (node.type === 'AND' || node.type === 'OR') {
    const flat = flattenByType({ type: node.type, left, right }, node.type)
    const uniqueNodes = removeDuplicateNodes(flat)

    if (uniqueNodes.length === 0) {
      throw new Error('Empty expression after duplicate removal')
    }
    if (uniqueNodes.length === 1) return uniqueNodes[0]

    return combineLeft(uniqueNodes, node.type)
  }

  return { ...node, left, right }
}

export function simplify(node) {
  const noDuplicates = removeDuplicateTerms(node)
  return noDuplicates
}
