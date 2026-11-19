import { canonicalKey, flattenByType } from '../astUtils'
import { transform } from '../index'
import { normalize, toCNF } from '../normalize'
import { parseAndWithOrPriority } from '../parse'
import { simplify } from '../simplify'
import { removeDuplicateClauses } from '../simplify/removeDuplicateClauses'
import { absorb } from '../simplify/absorb'
import { factorCommonConjuncts } from '../simplify/factorCommonConjuncts'
import { tokenize } from '../tokenize'

const T = (value) => ({ type: 'TERM', value })
const N = (value) => ({ type: 'NOT', child: T(value) })
const AND = (left, right) => ({ type: 'AND', left, right })
const OR = (left, right) => ({ type: 'OR', left, right })

// ---------------------------------------------------------------------------

describe('removeDuplicateClauses', () => {
  test('returns TERM unchanged', () => {
    expect(removeDuplicateClauses(T('a'))).toEqual(T('a'))
  })

  test('returns NOT(TERM) unchanged', () => {
    expect(removeDuplicateClauses(N('a'))).toEqual(N('a'))
  })

  test('removes duplicate TERM in OR chain: a,a -> a', () => {
    expect(removeDuplicateClauses(OR(T('a'), T('a')))).toEqual(T('a'))
  })

  test('removes duplicate TERM in AND chain: a&a -> a', () => {
    expect(removeDuplicateClauses(AND(T('a'), T('a')))).toEqual(T('a'))
  })

  test('removes duplicate NOT(TERM) in OR chain: !a,!a -> !a', () => {
    expect(removeDuplicateClauses(OR(N('a'), N('a')))).toEqual(N('a'))
  })

  test('keeps TERM and NOT(TERM) as distinct nodes: !a,a stays unchanged', () => {
    expect(removeDuplicateClauses(OR(N('a'), T('a')))).toEqual(OR(N('a'), T('a')))
  })

  test('keeps first occurrence when duplicates exist: a,b,a -> a,b', () => {
    const input = OR(OR(T('a'), T('b')), T('a'))
    expect(removeDuplicateClauses(input)).toEqual(OR(T('a'), T('b')))
  })

  test('removes commutativity duplicate in OR: (a&b),(b&a) -> (a&b)', () => {
    const input = OR(AND(T('a'), T('b')), AND(T('b'), T('a')))
    expect(removeDuplicateClauses(input)).toEqual(AND(T('a'), T('b')))
  })

  test('removes commutativity duplicate in AND: (a,b)&(b,a) -> (a,b)', () => {
    const input = AND(OR(T('a'), T('b')), OR(T('b'), T('a')))
    expect(removeDuplicateClauses(input)).toEqual(OR(T('a'), T('b')))
  })

  test('removes commutativity duplicate in longer OR chain: (a&b),(c&d),(b&a) -> (a&b),(c&d)', () => {
    const input = OR(OR(AND(T('a'), T('b')), AND(T('c'), T('d'))), AND(T('b'), T('a')))
    expect(removeDuplicateClauses(input)).toEqual(OR(AND(T('a'), T('b')), AND(T('c'), T('d'))))
  })

  test('does not remove distinct complex sub-expressions: (a&b),(a&c) stays unchanged', () => {
    const input = OR(AND(T('a'), T('b')), AND(T('a'), T('c')))
    expect(removeDuplicateClauses(input)).toEqual(OR(AND(T('a'), T('b')), AND(T('a'), T('c'))))
  })

  test('recurses into NOT children', () => {
    // NOT(a,a) -> NOT(a)
    const input = { type: 'NOT', child: OR(T('a'), T('a')) }
    expect(removeDuplicateClauses(input)).toEqual(N('a'))
  })
})

// ---------------------------------------------------------------------------

describe('absorb', () => {
  test('returns TERM unchanged', () => {
    expect(absorb(T('a'))).toEqual(T('a'))
  })

  test('returns NOT(TERM) unchanged', () => {
    expect(absorb(N('a'))).toEqual(N('a'))
  })

  test('A | (A & B) -> A  [TERM absorbs AND clause in OR chain]', () => {
    expect(absorb(OR(T('a'), AND(T('a'), T('b'))))).toEqual(T('a'))
  })

  test('A & (A | B) -> A  [TERM absorbs OR clause in AND chain]', () => {
    expect(absorb(AND(T('a'), OR(T('a'), T('b'))))).toEqual(T('a'))
  })

  test('(A & B) | A -> A  [order reversed: A still absorbs A & B]', () => {
    expect(absorb(OR(AND(T('a'), T('b')), T('a')))).toEqual(T('a'))
  })

  test('(A | B) & A -> A  [order reversed: A still absorbs A | B]', () => {
    expect(absorb(AND(OR(T('a'), T('b')), T('a')))).toEqual(T('a'))
  })

  test('(A & B) | (A & B & C) -> (A & B)  [general OR absorption]', () => {
    const input = OR(AND(T('a'), T('b')), AND(AND(T('a'), T('b')), T('c')))
    expect(absorb(input)).toEqual(AND(T('a'), T('b')))
  })

  test('(A | B) & (A | B | C) -> (A | B)  [general AND absorption]', () => {
    const input = AND(OR(T('a'), T('b')), OR(OR(T('a'), T('b')), T('c')))
    expect(absorb(input)).toEqual(OR(T('a'), T('b')))
  })

  test('absorbs multiple candidates in one pass: a,(a&b),(a&c) -> a', () => {
    const input = OR(OR(T('a'), AND(T('a'), T('b'))), AND(T('a'), T('c')))
    expect(absorb(input)).toEqual(T('a'))
  })

  test('does not absorb when no subset relationship exists: a,(b&c) stays unchanged', () => {
    const input = OR(T('a'), AND(T('b'), T('c')))
    expect(absorb(input)).toEqual(OR(T('a'), AND(T('b'), T('c'))))
  })

  test('does not absorb equal sets — strict subset required: (a&b),(a&b) stays unchanged', () => {
    // Equal conjunct sets are not absorbed (strict subset only); removeDuplicateClauses handles this case
    const input = OR(AND(T('a'), T('b')), AND(T('a'), T('b')))
    expect(absorb(input)).toEqual(OR(AND(T('a'), T('b')), AND(T('a'), T('b'))))
  })

  test('recurses into NOT children: NOT(a,(a&b)) -> NOT(a)', () => {
    const input = { type: 'NOT', child: OR(T('a'), AND(T('a'), T('b'))) }
    expect(absorb(input)).toEqual(N('a'))
  })

  test('recurses into nested structures before absorbing', () => {
    // Outer OR: (a | (a & b)) | c -> a | c, not a full absorption at outer level
    const input = OR(OR(T('a'), AND(T('a'), T('b'))), T('c'))
    expect(absorb(input)).toEqual(OR(T('a'), T('c')))
  })
})

// ---------------------------------------------------------------------------

describe('factorCommonConjuncts', () => {
  const parse = (input) => parseAndWithOrPriority(tokenize(input))

  // Evaluate the AST as Boolean algebra; this does not simulate the game.
  function evaluate(node, assignment) {
    if (node.type === 'TERM') return assignment[node.value]
    if (node.type === 'NOT') return !evaluate(node.child, assignment)
    if (node.type === 'AND') {
      return evaluate(node.left, assignment) && evaluate(node.right, assignment)
    }
    return evaluate(node.left, assignment) || evaluate(node.right, assignment)
  }

  function collectTerms(node, result = new Set()) {
    if (node.type === 'TERM') result.add(node.value)
    else if (node.type === 'NOT') collectTerms(node.child, result)
    else {
      collectTerms(node.left, result)
      collectTerms(node.right, result)
    }
    return [...result]
  }

  /**
   * Compares the ASTs for every Boolean assignment of the input terms.
   * The small test expressions keep the exhaustive truth table bounded.
   */
  function expectEquivalent(original, result) {
    const termNames = collectTerms(original)
    for (let mask = 0; mask < 2 ** termNames.length; mask++) {
      const assignment = Object.fromEntries(
        termNames.map((name, index) => [name, Boolean(mask & (1 << index))])
      )
      expect(evaluate(result, assignment)).toBe(evaluate(original, assignment))
    }
  }

  function freezeTree(node) {
    if (node.child) freezeTree(node.child)
    if (node.left) freezeTree(node.left)
    if (node.right) freezeTree(node.right)
    return Object.freeze(node)
  }

  // ---------- Shared factors and remaining branches ----------
  test.each([
    ['(a&b),(a&c)', 'a&(b,c)'],
    ['(a&b),(a&c),(d&e)', '(a&(b,c)),(d&e)'],
    ['((p,q)&x),((q,p)&y)', '(p,q)&(x,y)'],
    ['(a&(x,y)),(a&z)', 'a&(x,y,z)'],
    ['d&((a&b),(a&c))', 'd&(a&(b,c))'],
    // Chained and overlapping groups must not duplicate or lose branches.
    ['(a&b&x),(a&b&y),(a&z)', 'a&((b&(x,y)),z)'],
    ['(x&p),(x&q),(y&p),(y&q)', '(x,y)&(p,q)'],
    // Negations and prefixed terms exercise the same structural rewrite.
    ['(!a&b),(!a&c)', '!a&(b,c)'],
    ['(!(a,b)&x),(!(b,a)&y)', '!(a,b)&(x,y)'],
    ['!((a&b),(a&c))', '!(a&(b,c))'],
    [
      '(+pikachu&@thunderbolt),(+eevee&@thunderbolt)',
      '@thunderbolt&(+pikachu,+eevee)',
    ],
    ['(+pikachu&#test),(+eevee&#test)', '#test&(+pikachu,+eevee)'],
  ])('factors %s', (input, expected) => {
    // Freezing detects mutation; canonical keys compare structure without order.
    const original = freezeTree(parse(input))
    const result = factorCommonConjuncts(original)

    expect(canonicalKey(result)).toBe(canonicalKey(parse(expected)))
    expectEquivalent(original, result)
    // The public transform must also serialize to an equivalent expression.
    expectEquivalent(original, parse(transform(input)))
    expect(canonicalKey(factorCommonConjuncts(result))).toBe(
      canonicalKey(result)
    )
  })

  // ---------- No-op, eligibility, and deterministic selection ----------
  test('preserves no-match trees and does not mutate them', () => {
    const original = freezeTree(parse('(a&b),(c&d)'))
    expect(factorCommonConjuncts(original)).toBe(original)
  })

  test('retains a branch when removing its repeated factor would leave it empty', () => {
    const original = freezeTree(parse('(a&a),(a&b),(a&c)'))
    const result = factorCommonConjuncts(original)
    expectEquivalent(original, result)
    expect(canonicalKey(result)).toBe(canonicalKey(parse('(a&a),(a&(b,c))')))
  })

  test('uses the earliest candidate when participant counts tie', () => {
    const original = parse('(a&b),(a&c),(b&d)')
    const result = factorCommonConjuncts(original)
    expect(result).toEqual(parse('(a&(b,c)),(b&d)'))
    expectEquivalent(original, result)
  })

  // ---------- Intermediate CNF expansion ----------
  test('reduces intermediate expansion before normalization', () => {
    const original = parse('(s&a),(s&b),(s&c),(s&d),(s&e),(s&f)')
    const direct = toCNF(original)
    const optimized = normalize(simplify(original))
    const baseline = absorb(removeDuplicateClauses(direct))

    // Direct CNF builds 64 clauses before simplification; factoring builds 2.
    // Both paths ultimately represent the same expression with 2 clauses.
    expect(flattenByType(direct, 'AND')).toHaveLength(64)
    expect(flattenByType(optimized, 'AND')).toHaveLength(2)
    expect(flattenByType(baseline, 'AND')).toHaveLength(2)
    expectEquivalent(original, optimized)
    expectEquivalent(
      baseline,
      parse(transform('(s&a),(s&b),(s&c),(s&d),(s&e),(s&f)'))
    )
  })
})
