import { toCNF, normalize, prepareForCNF } from '../normalize'
import { transform } from '../index'
import { parseAndWithOrPriority } from '../parse'
import { tokenize } from '../tokenize'

const T = (value) => ({ type: 'TERM', value })
const N = (value) => ({ type: 'NOT', child: T(value) })
const AND = (left, right) => ({ type: 'AND', left, right })
const OR = (left, right) => ({ type: 'OR', left, right })
const parse = (input) => parseAndWithOrPriority(tokenize(input))

// ---------------------------------------------------------------------------

describe('toCNF', () => {
  test('returns TERM unchanged', () => {
    expect(toCNF(T('pikachu'))).toEqual(T('pikachu'))
  })

  test('returns NOT unchanged', () => {
    expect(toCNF(N('pikachu'))).toEqual(N('pikachu'))
  })

  test('keeps AND structure when children are already CNF', () => {
    const ast = AND(T('a'), OR(T('b'), T('c')))
    expect(toCNF(ast)).toEqual(AND(T('a'), OR(T('b'), T('c'))))
  })

  test('distributes OR over AND on the left: (a&b),c -> (a,c)&(b,c)', () => {
    expect(toCNF(OR(AND(T('a'), T('b')), T('c')))).toEqual(
      AND(OR(T('a'), T('c')), OR(T('b'), T('c')))
    )
  })

  test('distributes OR over AND on the right: a,(b&c) -> (a,b)&(a,c)', () => {
    expect(toCNF(OR(T('a'), AND(T('b'), T('c'))))).toEqual(
      AND(OR(T('a'), T('b')), OR(T('a'), T('c')))
    )
  })

  test('distributes recursively: (a&b),(c&d) -> (a,c)&(a,d)&(b,c)&(b,d)', () => {
    const ast = OR(AND(T('a'), T('b')), AND(T('c'), T('d')))
    expect(toCNF(ast)).toEqual(
      AND(
        AND(OR(T('a'), T('c')), OR(T('a'), T('d'))),
        AND(OR(T('b'), T('c')), OR(T('b'), T('d')))
      )
    )
  })
})

// ---------------------------------------------------------------------------

describe('prepareForCNF', () => {
  test('prepares negations without distributing alternatives', () => {
    const ast = OR(AND(T('a'), T('b')), AND(T('c'), T('d')))
    expect(prepareForCNF(ast)).toEqual(ast)
  })

  test('eliminates double negation before checking Mega filters', () => {
    expect(prepareForCNF(parse('!!mega1'))).toEqual(T('mega1'))
  })

  test.each(['!mega', '!mega-1', '!(mega1,shiny)'])(
    'rejects unsupported negation through both entry points: %s',
    (input) => {
      expect(() => normalize(parse(input))).toThrow('Forbidden filter')
      expect(() => transform(input)).toThrow('Forbidden filter')
    }
  )

  test('converts an IV complement inside a grouped negation', () => {
    expect(transform('!(1-attack&shiny)')).toBe('0attack,!shiny')
  })

  test.each([
    '!alola',
    '132&!alola',
    '!alola,132',
    '!!(132&!alola)',
    '!alola&((a&b),(c&d))',
    '!alolanickname',
  ])('retains native or unaffected region exclusions: %s', (input) => {
    expect(() => prepareForCNF(parse(input))).not.toThrow()
    expect(transform(input)).toContain('!alola')
  })

  test.each(['(!alola&shiny),132', '!(alola&shiny)', '!(galar,shiny)'])(
    'rejects regrouping unreliable region exclusions: %s',
    (input) => {
      expect(() => normalize(parse(input))).toThrow('Unsupported filter')
      expect(() => transform(input)).toThrow('Unsupported filter')
    }
  )
})

// ---------------------------------------------------------------------------

describe('normalize (NNF → filter validation → CNF)', () => {
  // ---------- NNF ----------

  test('returns TERM unchanged', () => {
    expect(normalize(T('a'))).toEqual(T('a'))
  })

  test('returns NOT(TERM) unchanged', () => {
    expect(normalize(N('a'))).toEqual(N('a'))
  })

  test('eliminates double negation: !!a -> a', () => {
    const ast = { type: 'NOT', child: { type: 'NOT', child: T('a') } }
    expect(normalize(ast)).toEqual(T('a'))
  })

  test('applies De Morgan on AND: !(a&b) -> !a,!b', () => {
    const ast = { type: 'NOT', child: AND(T('a'), T('b')) }
    expect(normalize(ast)).toEqual(OR(N('a'), N('b')))
  })

  test('applies De Morgan on OR: !(a,b) -> !a&!b', () => {
    const ast = { type: 'NOT', child: OR(T('a'), T('b')) }
    expect(normalize(ast)).toEqual(AND(N('a'), N('b')))
  })

  test('pushes NOT down through nested expression: !(a,(b&c)) -> !a&(!b,!c)', () => {
    const ast = { type: 'NOT', child: OR(T('a'), AND(T('b'), T('c'))) }
    expect(normalize(ast)).toEqual(AND(N('a'), OR(N('b'), N('c'))))
  })

  // ---------- NNF + CNF ----------

  test('applies CNF after NNF: a,(b&c) -> (a,b)&(a,c)', () => {
    expect(normalize(OR(T('a'), AND(T('b'), T('c'))))).toEqual(
      AND(OR(T('a'), T('b')), OR(T('a'), T('c')))
    )
  })

  test('NNF then CNF: !(a&b),c -> !a,!b,c (no AND to distribute after NNF)', () => {
    // !(a&b) -NNF-> OR(!a,!b), full tree: OR(OR(!a,!b), c) — no AND to distribute
    const ast = OR({ type: 'NOT', child: AND(T('a'), T('b')) }, T('c'))
    expect(normalize(ast)).toEqual(OR(OR(N('a'), N('b')), T('c')))
  })

  test('double negation does not produce duplicate after NNF: !!a,a -> a,a (no dedup)', () => {
    // normalize does not deduplicate — that is handled by simplify
    const ast = OR(
      { type: 'NOT', child: { type: 'NOT', child: T('a') } },
      T('a')
    )
    expect(normalize(ast)).toEqual(OR(T('a'), T('a')))
  })

  // ---------- Positive IV complements ----------

  test.each([
    ['!1attack', OR(T('0attack'), T('2-attack'))],
    ['!0attack', T('1-attack')],
    ['!4hp', T('-3hp')],
    ['!1-3attack', OR(T('0attack'), T('4attack'))],
    ['!-1attack', T('2-attack')],
    ['!1-defense', T('0defense')],
    ['!-2hp', T('3-hp')],
  ])('converts %s to positive IV terms', (input, expected) => {
    expect(normalize(parse(input))).toEqual(expected)
  })

  test('keeps the existing boundary for French IV aliases', () => {
    expect(() => normalize(N('1pv'))).toThrow('Forbidden filter: "!1pv".')
  })

  test('allows negated non-IV filter: !hp100', () => {
    expect(normalize(N('hp100'))).toEqual(N('hp100'))
  })

  test('converts IV negation exposed by De Morgan', () => {
    const ast = { type: 'NOT', child: AND(T('pikachu'), T('1attack')) }
    expect(normalize(ast)).toEqual(
      OR(N('pikachu'), OR(T('0attack'), T('2-attack')))
    )
  })

  test('removes an empty IV complement from an OR and rejects an impossible AND', () => {
    expect(normalize(parse('!0-attack,shiny'))).toEqual(T('shiny'))
    expect(() => normalize(parse('!0-attack&shiny'))).toThrow(
      'Impossible expression'
    )
  })

  test('validates unsupported filters before removing an impossible IV branch', () => {
    expect(() => normalize(parse('!0-attack&!mega1'))).toThrow(
      'Forbidden filter: "!mega1".'
    )
  })
})
