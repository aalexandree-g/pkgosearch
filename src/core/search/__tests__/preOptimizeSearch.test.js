import { flattenByType } from '../astUtils'
import { transform } from '../index'
import { normalize, prepareForCNF, toCNF } from '../normalize'
import { preOptimizeSearch } from '../preOptimizeSearch'
import { parseAndWithOrPriority } from '../parse'
import { tokenize } from '../tokenize'
import cases from './searchConversion.cases.json'

const parse = (input) => parseAndWithOrPriority(tokenize(input))

function collectTerms(node, terms = new Set()) {
  if (node.type === 'TERM') terms.add(node.value)
  else if (node.type === 'NOT') collectTerms(node.child, terms)
  else {
    collectTerms(node.left, terms)
    collectTerms(node.right, terms)
  }
  return terms
}

function freezeTree(node) {
  Object.freeze(node)
  if (node.child) freezeTree(node.child)
  if (node.left) freezeTree(node.left)
  if (node.right) freezeTree(node.right)
}

// These are Boolean assignments, not a simulator of the game's search engine.
function evaluate(node, trueTerms, declaredTerms) {
  if (node.type === 'TERM') {
    if (!declaredTerms.has(node.value)) {
      throw new Error(
        `Missing test assignment for generated term: ${node.value}`
      )
    }
    return trueTerms.has(node.value)
  }
  if (node.type === 'NOT') {
    return !evaluate(node.child, trueTerms, declaredTerms)
  }
  if (node.type === 'AND') {
    return (
      evaluate(node.left, trueTerms, declaredTerms) &&
      evaluate(node.right, trueTerms, declaredTerms)
    )
  }
  if (node.type === 'OR') {
    return (
      evaluate(node.left, trueTerms, declaredTerms) ||
      evaluate(node.right, trueTerms, declaredTerms)
    )
  }
  throw new Error(`Unexpected AST node: ${node.type}`)
}

describe('safe conversion contracts shared with the pipeline backport', () => {
  test.each(cases)(
    '$id',
    ({
      input,
      error,
      members = [],
      maxOutputClauses,
      output: expectedOutput,
      outputTerms = [],
    }) => {
      if (error) {
        expect(() => transform(input)).toThrow(error)
        return
      }

      const original = parse(input)
      const declaredTerms = new Set([...collectTerms(original), ...outputTerms])
      // Check intended membership independently of the converted output.
      for (const member of members) {
        const trueTerms = new Set(member.trueTerms)
        for (const term of trueTerms) {
          if (!declaredTerms.has(term)) {
            throw new Error(
              `Unknown term in test example "${member.name}": ${term}`
            )
          }
        }
        expect({
          example: member.name,
          matches: evaluate(original, trueTerms, declaredTerms),
        }).toEqual({ example: member.name, matches: member.matches })
      }

      const output = transform(input)
      if (expectedOutput) expect(output).toBe(expectedOutput)
      expect(output.length).toBeGreaterThan(0)
      expect(output).not.toMatch(/[()]/)
      expect(output).not.toMatch(
        /!(?:[0-4](?:-[0-4]?)?|-[0-4])(?:attack|defense|hp)\b/
      )
      expect(output).not.toMatch(/!mega(?:\d|-\d)/)
      const converted = parse(output)
      if (maxOutputClauses) {
        expect(flattenByType(converted, 'AND').length).toBeLessThanOrEqual(
          maxOutputClauses
        )
      }

      for (const member of members) {
        const trueTerms = new Set(member.trueTerms)
        expect({
          example: member.name,
          matches: evaluate(converted, trueTerms, declaredTerms),
        }).toEqual({ example: member.name, matches: member.matches })
      }
    }
  )

  describe('verified Lucky/Traded cleanup', () => {
    test.each([
      ['lucky&traded', 'lucky'],
      ['traded&shiny&lucky', 'shiny&lucky'],
      ['(lucky&!traded),shiny', 'shiny'],
      ['(lucky&!traded),(traded&shiny)', 'traded&shiny'],
      ['lucky&(traded,(lucky&!traded))', 'lucky'],
      ['((lucky&!traded)&shiny),favorite', 'favorite'],
      ['!lucky&traded', '!lucky&traded'],
      ['lucky&shiny', 'lucky&shiny'],
      ['lucky,shiny', 'lucky,shiny'],
      ['lucky&(traded,shiny)', 'lucky&traded,shiny'],
      ['!(lucky&traded)', '!lucky,!traded'],
    ])('converts %s to %s', (input, output) => {
      expect(transform(input)).toBe(output)
    })

    test.each([
      'lucky&!traded',
      '(lucky&!traded)&shiny',
      '(lucky&!traded),(lucky&!traded&shiny)',
    ])('reports an impossible whole expression: %s', (input) => {
      const error =
        'Impossible expression: "lucky" implies "traded", but "!traded" is also present, which is a contradiction.'
      expect(() => transform(input)).toThrow(error)
      expect(() => preOptimizeSearch(prepareForCNF(parse(input)))).toThrow(
        error
      )
    })

    test('validates even an impossible alternative before removing it', () => {
      expect(() => transform('lucky&!traded&!mega1')).toThrow(
        'Forbidden filter'
      )
    })

    test('does not mutate prepared input or retain per-run contradiction state', () => {
      const ast = prepareForCNF(parse('(lucky&!traded),shiny'))
      freezeTree(ast)
      expect(preOptimizeSearch(ast)).toEqual({ type: 'TERM', value: 'shiny' })
      expect(preOptimizeSearch(ast)).toEqual({ type: 'TERM', value: 'shiny' })
      expect(() =>
        preOptimizeSearch(prepareForCNF(parse('lucky&!traded')))
      ).toThrow('Impossible expression')
      const other = prepareForCNF(parse('favorite'))
      expect(preOptimizeSearch(other)).toBe(other)
    })
  })

  test.each(cases.filter(({ error }) => error === 'Forbidden filter'))(
    'direct normalize agrees on $id',
    ({ input, error }) => {
      expect(() => normalize(parse(input))).toThrow(error)
    }
  )

  test('direct distribution accepts an exact 64-clause expansion', () => {
    const input = '(a&b),(c&d),(e&f),(g&h),(i&j),(k&l)'
    expect(flattenByType(toCNF(parse(input)), 'AND')).toHaveLength(64)
  })

  test('direct normalize expands exactly; transform also offers compact conversion', () => {
    const { input } = cases.find(
      ({ id }) => id === 'six-separate-dex-selectors'
    )
    expect(flattenByType(normalize(parse(input)), 'AND')).toHaveLength(64)
    expect(flattenByType(parse(transform(input)), 'AND').length).toBeLessThan(
      64
    )
  })

  test('factoring avoids unnecessary exact expansion', () => {
    const input = '(a&b),(a&c),(a&d),(a&e),(a&f),(a&g)'
    expect(flattenByType(parse(transform(input)), 'AND')).toHaveLength(2)
  })

  test('already-flat searches may contain more than 32 clauses', () => {
    const input = Array.from({ length: 40 }, (_, index) => `term${index}`).join(
      '&'
    )
    expect(transform(input)).toBe(input)
    expect(flattenByType(toCNF(parse(input)), 'AND')).toHaveLength(40)
  })

  test.each(['!cp666', '!hp100', '!hp50-100', '132&!alola'])(
    'preserves existing native search %s',
    (input) => {
      expect(transform(input)).toBe(input)
    }
  )

  test.each(['!1-attaque', '!-1pv'])(
    'retains French IV validation for open ranges: %s',
    (input) => {
      expect(() => transform(input)).toThrow('Forbidden filter')
    }
  )
})

// Selector memberships below are explicit abstract domain assignments.
// Neither these helpers nor the Boolean evaluator emulate the game engine.
function* domainAssignments(selectors, flags) {
  for (const selector of selectors) {
    for (let mask = 0; mask < 2 ** flags.length; mask++) {
      yield [...selector, ...flags.filter((_, index) => mask & (1 << index))]
    }
  }
}

function expectEquivalent(input, assignments, introducedTerms = []) {
  const original = parse(input)
  const converted = parse(transform(input))
  const declaredTerms = new Set([...collectTerms(original), ...introducedTerms])
  for (const term of collectTerms(converted)) {
    expect({ term, declared: declaredTerms.has(term) }).toEqual({
      term,
      declared: true,
    })
  }
  for (const assignment of assignments) {
    const trueTerms = new Set(assignment)
    expect(evaluate(converted, trueTerms, declaredTerms)).toBe(
      evaluate(original, trueTerms, declaredTerms)
    )
  }
  return converted
}

describe('partitioned conversion edges', () => {
  test('retains all traits when shared factoring hides species selectors', () => {
    const { input } = cases.find(
      ({ id }) => id === 'all-requirements-remain-required'
    )
    expectEquivalent(
      input,
      domainAssignments(
        [['132'], ['1'], ['6'], ['15'], ['7'], ['133'], []],
        ['lucky', 'favorite', 'shadow', 'costume', 'purified']
      )
    )
  })

  test('complements OR-valued dex selectors without losing requirements', () => {
    const input = '((1,3)&a&b&c),((2,4)&d&e&f),((5,6)&g&h&i)'
    const converted = expectEquivalent(
      input,
      domainAssignments(
        [['1'], ['2'], ['3'], ['4'], ['5'], ['6'], []],
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
      )
    )
    expect(flattenByType(converted, 'AND').length).toBeLessThanOrEqual(32)
  })

  test('complements IV ranges with compact positive ranges', () => {
    const input = '(0-1attack&a&b&c),(2attack&d&e&f),(3-4attack&g&h&i)'
    const tiers = [
      ['0-1attack', '-1attack', '-2attack'],
      ['0-1attack', '-1attack', '-2attack'],
      ['2attack', '2-attack', '-2attack'],
      ['3-4attack', '2-attack', '3-attack'],
      ['3-4attack', '2-attack', '3-attack'],
    ]
    const converted = expectEquivalent(
      input,
      domainAssignments(tiers, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']),
      ['2-attack', '-1attack', '3-attack', '-2attack']
    )
    expect([...collectTerms(converted)]).not.toContain('0-0attack')
    expect(flattenByType(converted, 'AND').length).toBeLessThanOrEqual(32)
  })

  test('compacts nested remainders', () => {
    const input =
      '(132&((0*&a&b&c&d),(1*&e&f&g&h),(2*&i&j&k&l))),(1&shadow),(6&costume)'
    const converted = expectEquivalent(input, [
      ['132', '0*', 'a', 'b', 'c', 'd'],
      ['132', '0*', 'a', 'b', 'c'],
      ['132', '1*', 'e', 'f', 'g', 'h'],
      ['132', '2*', 'i', 'j', 'k', 'l'],
      ['132', '3*', 'a', 'b', 'c', 'd'],
      ['1', 'shadow'],
      ['6', 'costume'],
      ['shadow', 'costume'],
    ])
    expect(flattenByType(converted, 'AND').length).toBeLessThanOrEqual(32)
  })

  test('uses the second condition to separate all 18 fast-move types', () => {
    const types = [
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
    const input = types.map((type) => `(!${type}&@1${type})`).join(',')
    const assignments = types.flatMap((type, index) => [
      [`@1${type}`],
      [`@1${type}`, type],
      [`@1${type}`, types[(index + 1) % types.length]],
      [`@1${type}`, ...types],
    ])
    const converted = expectEquivalent(input, assignments)
    expect(flattenByType(converted, 'AND')).toHaveLength(19)
  })

  test('avoids costly complements when another dimension is available', () => {
    const firstDex = Array.from({ length: 33 }, (_, index) => index + 1)
    const secondDex = firstDex.map((dex) => dex + 100)
    const input =
      `((${firstDex.join(',')})&@1normal&a&b&c&d&e&f),` +
      `((${secondDex.join(',')})&@1fire&g&h&i&j&k&l)`
    const converted = expectEquivalent(input, [
      ['1', '@1normal', 'a', 'b', 'c', 'd', 'e', 'f'],
      ['1', '@1normal', 'a', 'b', 'c', 'd', 'e'],
      ['1', '@1fire', 'g', 'h', 'i', 'j', 'k', 'l'],
      ['101', '@1fire', 'g', 'h', 'i', 'j', 'k', 'l'],
    ])
    expect(flattenByType(converted, 'AND').length).toBeLessThanOrEqual(32)
  })

  test('allows a compact conjunction above 32 clauses and an empty IV complement', () => {
    const flags = Array.from({ length: 40 }, (_, index) => `flag${index}`)
    const input = `shiny,(0-4attack&${flags.join('&')})`
    const converted = expectEquivalent(input, [
      ['0-4attack', ...flags],
      ['0-4attack', ...flags.slice(1)],
      ['0-4attack', ...flags.slice(0, -1)],
      ['0-4attack', 'shiny'],
    ])
    expect(flattenByType(converted, 'AND').length).toBeGreaterThan(32)
    expect(() => toCNF(converted)).not.toThrow()
  })

  test('expands an opaque remainder exactly after extracting its shared selector', () => {
    const input = '(132&a&b),(132&c&d),(132&e&f),(132&g&h),(132&i&j),(132&k&l)'
    const converted = expectEquivalent(input, [
      ['132', 'a', 'b'],
      ['132', 'a'],
      ['132', 'a', 'c', 'd'],
      ['a', 'b'],
    ])
    expect(flattenByType(converted, 'AND')).toHaveLength(65)
  })

  test('expands exactly when every available selector complement is costly', () => {
    const firstDex = Array.from({ length: 33 }, (_, index) => index + 1)
    const secondDex = firstDex.map((dex) => dex + 100)
    const input =
      `((${firstDex.join(',')})&a&b&c&d&e&f),` +
      `((${secondDex.join(',')})&g&h&i&j&k&l)`
    const converted = expectEquivalent(input, [
      ['1', 'a', 'b', 'c', 'd', 'e', 'f'],
      ['1', 'a', 'b', 'c', 'd', 'e'],
      ['101', 'g', 'h', 'i', 'j', 'k', 'l'],
      ['a', 'b', 'c', 'd', 'e', 'f'],
    ])
    expect(flattenByType(converted, 'AND')).toHaveLength(49)
  })

  test('exact fallback preserves overlapping opaque gates across all assignments', () => {
    const { input } = cases.find(
      ({ id }) => id === 'unknown-separators-do-not-justify-a-rewrite'
    )
    expectEquivalent(
      input,
      domainAssignments(
        [[]],
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']
      )
    )
  })

  test('does not mutate compacted input or retain per-run partition state', () => {
    const { input } = cases.find(
      ({ id }) => id === 'six-separate-dex-selectors'
    )
    const ast = prepareForCNF(parse(input))
    const snapshot = JSON.stringify(ast)
    freezeTree(ast)
    const first = preOptimizeSearch(ast)
    expect(preOptimizeSearch(ast)).toEqual(first)
    expect(JSON.stringify(ast)).toBe(snapshot)
    expect(
      flattenByType(
        parse(transform('(a&b),(c&d),(e&f),(g&h),(i&j),(k&l)')),
        'AND'
      )
    ).toHaveLength(64)
    expect(preOptimizeSearch(ast)).toEqual(first)
  })
})
