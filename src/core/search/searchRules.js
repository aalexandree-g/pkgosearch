import { flattenByType } from './astUtils'

const IV_FILTER =
  /^([0-4](?:-[0-4]?)?|-[0-4])(attack|defense|hp|attaque|défense|pv)$/
const MEGA_FILTER = /^mega(?:\d+(?:-\d*)?|-\d+)?$/
const REGION_FILTER =
  /^(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|hisui|paldea)$/
const IV_STATS = ['attack', 'defense', 'hp']
const MOVE_TYPES = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
]

export function isRegionTerm(value) {
  return REGION_FILTER.test(value.trim().toLowerCase())
}

/**
 * Checks ! on individual terms; call prepareForCNF first.
 * Rejects negated IV/Mega filters and OR expansion involving region exclusions.
 */
export function assertSupportedNegations(node) {
  if (!node || node.type === 'TERM') {
    return { hasAnd: false, hasNegatedRegion: false }
  }
  if (node.type === 'NOT') {
    if (node.child.type !== 'TERM') {
      throw new Error('Prepare negations before validating search filters.')
    }
    const term = node.child.value.trim().toLowerCase()
    if (IV_FILTER.test(term) || MEGA_FILTER.test(term)) {
      throw new Error(`Forbidden filter: "!${node.child.value}".`)
    }
    return { hasAnd: false, hasNegatedRegion: isRegionTerm(term) }
  }

  const left = assertSupportedNegations(node.left)
  const right = assertSupportedNegations(node.right)
  const hasAnd = node.type === 'AND' || left.hasAnd || right.hasAnd
  const hasNegatedRegion = left.hasNegatedRegion || right.hasNegatedRegion
  if (node.type === 'OR' && hasAnd && hasNegatedRegion) {
    throw new Error(
      'Unsupported filter operation: distributing a negated region. Simplify the input.'
    )
  }
  return { hasAnd, hasNegatedRegion }
}

function readInterval(value, minimum, maximum) {
  const match = /^(?:(\d+)(?:-(\d*))?|-(\d+))$/.exec(value)
  if (!match) return null
  if (
    match
      .slice(1)
      .some(
        (bound) =>
          bound !== undefined &&
          bound !== '' &&
          !Number.isSafeInteger(Number(bound))
      )
  )
    return null

  const lower = match[1] === undefined ? minimum : Number(match[1])
  let upper = lower
  if (match[3] !== undefined) upper = Number(match[3])
  else if (match[2] !== undefined) {
    // In the game, N-0 means N or higher, just like N-.
    upper =
      match[2] === '' || Number(match[2]) === 0 ? maximum : Number(match[2])
  }
  if (lower < minimum || upper > maximum || lower > upper) return null
  return [lower, upper]
}

function readIVFilter(value) {
  const match = IV_FILTER.exec(value.trim().toLowerCase())
  if (!match) return null
  const interval = readInterval(match[1], 0, 4)
  return interval ? { stat: match[2], interval } : null
}

export function getIVComplementTermsForFilter(value) {
  const iv = readIVFilter(value)
  if (!iv || !IV_STATS.includes(iv.stat)) return null
  return getIVComplementTerms([iv.interval], iv.stat)
}

export function getIVComplementTerms(intervals, stat) {
  const remaining = [0, 1, 2, 3, 4].filter(
    (tier) =>
      !intervals.some(([lower, upper]) => lower <= tier && tier <= upper)
  )
  const ranges = []

  remaining.forEach((tier) => {
    const lastRange = ranges[ranges.length - 1]
    if (lastRange && lastRange[1] === tier - 1) lastRange[1] = tier
    else ranges.push([tier, tier])
  })

  return ranges.map(([lower, upper]) => {
    if (lower === upper) return `${lower}${stat}`
    if (lower === 0) return `-${upper}${stat}`
    if (upper === 4) return `${lower}-${stat}`
    return `${lower}-${upper}${stat}`
  })
}

function classifyTerm(node) {
  if (node.type !== 'TERM') return null
  const value = node.value.trim().toLowerCase()
  const dex = readInterval(value, 1, Infinity)
  if (dex) return { dimension: 'dex', intervals: [dex] }

  const star = /^([0-4])\*$/.exec(value)
  if (star) {
    const bucket = Number(star[1])
    return { dimension: 'stars', intervals: [[bucket, bucket]] }
  }

  const iv = readIVFilter(value)
  if (iv && IV_STATS.includes(iv.stat)) {
    return { dimension: `iv:${iv.stat}`, intervals: [iv.interval] }
  }

  const moveType = value.startsWith('@1')
    ? MOVE_TYPES.indexOf(value.slice(2))
    : -1
  return moveType < 0
    ? null
    : { dimension: 'fast-move-type', intervals: [[moveType, moveType]] }
}

/**
 * Recognizes species IDs, stars, IV tiers and fast-move types, including OR
 * lists of the same kind. Names, flags, ordinary types and other move slots
 * cannot tell us whether two alternatives could match the same Pokemon.
 */
export function classifySelector(node) {
  const parts = flattenByType(node, 'OR').map(classifyTerm)
  if (!parts.length || parts.some((part) => !part)) return null
  const dimension = parts[0].dimension
  if (parts.some((part) => part.dimension !== dimension)) return null
  return { dimension, intervals: parts.flatMap((part) => part.intervals) }
}

export function areSelectorsDisjoint(left, right) {
  if (!left || !right || left.dimension !== right.dimension) return false
  return left.intervals.every(([leftMin, leftMax]) =>
    right.intervals.every(
      ([rightMin, rightMax]) => leftMax < rightMin || rightMax < leftMin
    )
  )
}
