import { canonicalKey, combineLeft, flattenByType } from '../astUtils'

/**
 * Factors structurally equivalent conjuncts from OR branches.
 * Example: (a&b),(a&c),(d&e) -> (a&(b,c)),(d&e).
 * Shared factors are matched with commutativity-aware canonical keys.
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
   * Finds the factor shared by the most eligible branches.
   * Ties keep the first factor encountered in branch order.
   */
  function findSharedFactor(branches) {
    const factorsByKey = new Map()

    branches.forEach((branch, branchIndex) => {
      // In simplify(), bare-factor absorption runs before this pass.
      if (branch.type !== 'AND') return

      const conjuncts = flattenByType(branch, 'AND')
      const conjunctsByKey = new Map()
      conjuncts.forEach((conjunct) => {
        const key = getConjunctKey(conjunct)
        if (!conjunctsByKey.has(key)) conjunctsByKey.set(key, [])
        conjunctsByKey.get(key).push(conjunct)
      })

      conjunctsByKey.forEach((matchingConjuncts, key) => {
        // A branch must retain at least one conjunct after factoring.
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
   * Replaces the participating branches once. Keeps unrelated branches in order.
   * Any new group will replace the first participating branch in the OR chain.
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
    // Remaining alternatives may themselves share a factor, so we recursively factor them.
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
   * Factors shared conjuncts among AND branches in an OR chain.
   * Repeats until no eligible shared factor remains; other branches are retained.
   */
  function factorBranches(initialBranches) {
    let branches = initialBranches

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
      // Examine the negated expression while keeping the node's NOT operator as-is.
      // Unless a child change occurs, the current node remains unchanged.
      const child = visitNode(currentNode.child)
      return child === currentNode.child
        ? currentNode
        : { ...currentNode, child }
    }
    if (currentNode.type === 'AND') {
      // Examine both operands while keeping the node's AND operator as-is.
      // Unless a child change occurs, the current node remains unchanged.
      const left = visitNode(currentNode.left)
      const right = visitNode(currentNode.right)
      return left === currentNode.left && right === currentNode.right
        ? currentNode
        : { ...currentNode, left, right }
    }
    if (currentNode.type === 'OR') {
      // Flatten this OR chain, then process its branches before factoring the chain.
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
