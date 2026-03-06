import { toCNF, normalize } from '../normalize'

const T = (value) => ({ type: 'TERM', value })
const N = (value) => ({ type: 'NOT', child: T(value) })
const AND = (left, right) => ({ type: 'AND', left, right })
const OR = (left, right) => ({ type: 'OR', left, right })

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

describe('normalize (NNF → IV validation → CNF)', () => {
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

  // ---------- Forbidden negated IV filters ----------

  test('throws on !4hp', () => {
    expect(() => normalize(N('4hp'))).toThrow('Forbidden filter: "!4hp".')
  })

  test('throws on !0-3attack (IV range)', () => {
    expect(() => normalize(N('0-3attack'))).toThrow(
      'Forbidden filter: "!0-3attack".'
    )
  })

  test('throws on !2defense', () => {
    expect(() => normalize(N('2defense'))).toThrow(
      'Forbidden filter: "!2defense".'
    )
  })

  test('throws on !1pv (french alias)', () => {
    expect(() => normalize(N('1pv'))).toThrow('Forbidden filter: "!1pv".')
  })

  test('allows negated non-IV filter: !hp100', () => {
    expect(normalize(N('hp100'))).toEqual(N('hp100'))
  })

  test('detects forbidden IV term deep in tree', () => {
    expect(() => normalize(AND(T('pikachu'), N('0attack')))).toThrow(
      'Forbidden filter: "!0attack".'
    )
  })

  test('detects forbidden IV term revealed by De Morgan: !(pikachu & 1attack)', () => {
    // NNF turns !(pikachu & 1attack) into !pikachu | !1attack — then !1attack is caught
    const ast = { type: 'NOT', child: AND(T('pikachu'), T('1attack')) }
    expect(() => normalize(ast)).toThrow('Forbidden filter: "!1attack".')
  })
})
