import { removeDuplicateClauses } from '../simplify/removeDuplicateClauses'
import { absorb } from '../simplify/absorb'

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
