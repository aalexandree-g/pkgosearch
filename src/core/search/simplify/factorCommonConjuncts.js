import { canonicalKey, combineLeft, flattenByType } from '../astUtils'

/**
 * Pulls shared conditions out of OR alternatives.
 * Example: (a&b),(a&c),(d&e) -> (a&(b,c)),(d&e).
 * canonicalKey matches conditions even when their terms appear in another order.
 */
export function factorCommonConjuncts(node) {
  // Nodes are not mutated, so their cached keys remain valid for this call.
  const keyCache = new WeakMap()

  function getConjunctKey(conjunct) {
    if (!keyCache.has(conjunct)) {
      keyCache.set(conjunct, canonicalKey(conjunct))
    }
    return keyCache.get(conjunct)
  }

  /**
   * Finds a condition shared by at least two alternatives.
   * Chooses the one used most often; ties keep input order.
   */
  function findSharedFactor(branches) {
    const factorsByKey = new Map()

    branches.forEach((branch, branchIndex) => {
      // simplify() already handles cases such as a,(a&b) -> a.
      if (branch.type !== 'AND') return

      const conjuncts = flattenByType(branch, 'AND')
      const conjunctsByKey = new Map()
      conjuncts.forEach((conjunct) => {
        const key = getConjunctKey(conjunct)
        if (!conjunctsByKey.has(key)) conjunctsByKey.set(key, [])
        conjunctsByKey.get(key).push(conjunct)
      })

      conjunctsByKey.forEach((matchingConjuncts, key) => {
        // Removing the shared condition must leave something in this alternative.
        if (matchingConjuncts.length === conjuncts.length) return
        if (!factorsByKey.has(key)) {
          factorsByKey.set(key, {
            factor: matchingConjuncts[0],
            branchIndices: [],
          })
        }
        factorsByKey.get(key).branchIndices.push(branchIndex)
      })
    })

    let selectedKey
    let selectedFactor
    factorsByKey.forEach((candidate, key) => {
      if (
        candidate.branchIndices.length >= 2 &&
        (!selectedFactor ||
          candidate.branchIndices.length > selectedFactor.branchIndices.length)
      ) {
        selectedFactor = candidate
        selectedKey = key
      }
    })
    return selectedFactor ? { ...selectedFactor, key: selectedKey } : null
  }

  /**
   * Combines alternatives that share the chosen condition.
   * Puts the result at their first position and leaves other alternatives in order.
   */
  function applySharedFactor(branches, selectedFactor) {
    const participantIndices = new Set(selectedFactor.branchIndices)
    const remainingAlternatives = selectedFactor.branchIndices.flatMap(
      (branchIndex) => {
        const remainingConjuncts = flattenByType(
          branches[branchIndex],
          'AND'
        ).filter((conjunct) => getConjunctKey(conjunct) !== selectedFactor.key)
        // Flatten the remainder if it is an OR; keep (x,y)&z together.
        return flattenByType(combineLeft(remainingConjuncts, 'AND'), 'OR')
      }
    )
    // The remaining alternatives may have another condition in common.
    const factoredAlternatives = factorBranches(remainingAlternatives)
    const factoredBranch = {
      type: 'AND',
      left: selectedFactor.factor,
      right: combineLeft(factoredAlternatives, 'OR'),
    }

    return branches.flatMap((branch, branchIndex) => {
      if (branchIndex === selectedFactor.branchIndices[0])
        return [factoredBranch]
      return participantIndices.has(branchIndex) ? [] : [branch]
    })
  }

  /**
   * Repeatedly pulls out shared conditions until there are none left to combine.
   * Keeps alternatives that do not share the chosen condition.
   */
  function factorBranches(initialBranches) {
    let branches = initialBranches

    // Each step removes repeated conditions, so the tree gets smaller.
    while (true) {
      if (branches.filter((branch) => branch.type === 'AND').length < 2) {
        return branches
      }

      const selectedFactor = findSharedFactor(branches)
      if (!selectedFactor) return branches
      branches = applySharedFactor(branches, selectedFactor)
    }
  }

  function visitNode(currentNode) {
    if (!currentNode || currentNode.type === 'TERM') return currentNode
    if (currentNode.type === 'NOT') {
      const child = visitNode(currentNode.child)
      return child === currentNode.child
        ? currentNode
        : { ...currentNode, child }
    }
    if (currentNode.type === 'AND') {
      const left = visitNode(currentNode.left)
      const right = visitNode(currentNode.right)
      return left === currentNode.left && right === currentNode.right
        ? currentNode
        : { ...currentNode, left, right }
    }
    if (currentNode.type === 'OR') {
      // Look at all OR alternatives together, not just the left or right subtree.
      const originalBranches = flattenByType(currentNode, 'OR')
      const processedBranches = originalBranches.map(visitNode)
      const factoredBranches = factorBranches(processedBranches)
      const unchanged =
        factoredBranches === processedBranches &&
        processedBranches.every(
          (branch, index) => branch === originalBranches[index]
        )
      return unchanged ? currentNode : combineLeft(factoredBranches, 'OR')
    }
    return currentNode
  }

  return visitNode(node)
}
