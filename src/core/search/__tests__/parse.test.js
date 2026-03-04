import { tokenize } from '../tokenize'
import { parseAndWithOrPriority } from '../parse'

describe('parseAndWithOrPriority', () => {
  test('parses (a&b),c correctly', () => {
    const ast = parseAndWithOrPriority(tokenize('(a&b),c'))
    expect(ast).toEqual({
      type: 'OR',
      left: {
        type: 'AND',
        left: { type: 'TERM', value: 'a' },
        right: { type: 'TERM', value: 'b' },
      },
      right: { type: 'TERM', value: 'c' },
    })
  })

  test('parses a,(b&c) correctly', () => {
    const ast = parseAndWithOrPriority(tokenize('a,(b&c)'))
    expect(ast).toEqual({
      type: 'OR',
      left: { type: 'TERM', value: 'a' },
      right: {
        type: 'AND',
        left: { type: 'TERM', value: 'b' },
        right: { type: 'TERM', value: 'c' },
      },
    })
  })

  test('parses !a as NOT(TERM)', () => {
    const ast = parseAndWithOrPriority(tokenize('!a'))
    expect(ast).toEqual({
      type: 'NOT',
      child: { type: 'TERM', value: 'a' },
    })
  })

  test('parses !!a as NOT(NOT(TERM))', () => {
    const ast = parseAndWithOrPriority(tokenize('!!a'))
    expect(ast).toEqual({
      type: 'NOT',
      child: {
        type: 'NOT',
        child: { type: 'TERM', value: 'a' },
      },
    })
  })

  test('parses !(a&b) as NOT(AND(...))', () => {
    const ast = parseAndWithOrPriority(tokenize('!(a&b)'))
    expect(ast).toEqual({
      type: 'NOT',
      child: {
        type: 'AND',
        left: { type: 'TERM', value: 'a' },
        right: { type: 'TERM', value: 'b' },
      },
    })
  })

  test('parses !a&b as AND(NOT(a), b)', () => {
    const ast = parseAndWithOrPriority(tokenize('!a&b'))
    expect(ast).toEqual({
      type: 'AND',
      left: {
        type: 'NOT',
        child: { type: 'TERM', value: 'a' },
      },
      right: { type: 'TERM', value: 'b' },
    })
  })

  test('parses a&!b as AND(a, NOT(b))', () => {
    const ast = parseAndWithOrPriority(tokenize('a&!b'))
    expect(ast).toEqual({
      type: 'AND',
      left: { type: 'TERM', value: 'a' },
      right: {
        type: 'NOT',
        child: { type: 'TERM', value: 'b' },
      },
    })
  })

  test('parses !(a,b) as NOT(OR(...))', () => {
    const ast = parseAndWithOrPriority(tokenize('!(a,b)'))
    expect(ast).toEqual({
      type: 'NOT',
      child: {
        type: 'OR',
        left: { type: 'TERM', value: 'a' },
        right: { type: 'TERM', value: 'b' },
      },
    })
  })

  test('parses !a,b as OR(NOT(a), b)', () => {
    const ast = parseAndWithOrPriority(tokenize('!a,b'))
    expect(ast).toEqual({
      type: 'OR',
      left: {
        type: 'NOT',
        child: { type: 'TERM', value: 'a' },
      },
      right: { type: 'TERM', value: 'b' },
    })
  })

  test('parses a,!b as OR(a, NOT(b))', () => {
    const ast = parseAndWithOrPriority(tokenize('a,!b'))
    expect(ast).toEqual({
      type: 'OR',
      left: { type: 'TERM', value: 'a' },
      right: {
        type: 'NOT',
        child: { type: 'TERM', value: 'b' },
      },
    })
  })

  test('throws on empty expression', () => {
    expect(() => parseAndWithOrPriority([])).toThrow('Empty expression')
  })

  test('throws on unmatched parentheses', () => {
    expect(() => parseAndWithOrPriority(tokenize('(a,b'))).toThrow(
      `Unmatched opening parenthesis: missing ')'`
    )
    expect(() => parseAndWithOrPriority(tokenize('a,b)'))).toThrow(
      `Unmatched closing parenthesis: missing '('`
    )
  })


  test('parses a&&b as AND(a, b)', () => {
    const ast = parseAndWithOrPriority(tokenize('a&&b'))
    expect(ast).toEqual({
      type: 'AND',
      left: { type: 'TERM', value: 'a' },
      right: { type: 'TERM', value: 'b' },
    })
  })
  test('parses a||b as OR(a, b)', () => {
    const ast = parseAndWithOrPriority(tokenize('a||b'.replace(/\|\|/g, ',')))
    expect(ast).toEqual({
      type: 'OR',
      left: { type: 'TERM', value: 'a' },
      right: { type: 'TERM', value: 'b' },
    })
  })

  test('parses a|b as OR(a, b)', () => {
    const ast = parseAndWithOrPriority(tokenize('a|b'.replace(/\|/g, ',')))
    expect(ast).toEqual({
      type: 'OR',
      left: { type: 'TERM', value: 'a' },
      right: { type: 'TERM', value: 'b' },
    })
  })

  test('throws on duplicated OR (a,,b)', () => {
    expect(() => parseAndWithOrPriority(tokenize('a,,b'))).toThrow(
      `Incomplete expression around ','`
    )
  })

  test('throws when AND is at the beginning (&a)', () => {
    expect(() => parseAndWithOrPriority(tokenize('&a'))).toThrow(
      `Incomplete expression around '&'`
    )
  })

  test('throws when AND is at the end (a&)', () => {
    expect(() => parseAndWithOrPriority(tokenize('a&'))).toThrow(
      `Incomplete expression around '&'`
    )
  })

  test('throws when OR is at the beginning (,a)', () => {
    expect(() => parseAndWithOrPriority(tokenize(',a'))).toThrow(
      `Incomplete expression around ','`
    )
  })

  test('throws when OR is at the end (a,)', () => {
    expect(() => parseAndWithOrPriority(tokenize('a,'))).toThrow(
      `Incomplete expression around ','`
    )
  })

  test('throws when ! is at the end (a,!)', () => {
    expect(() => parseAndWithOrPriority(tokenize('a,!'))).toThrow(
      `Empty expression after '!'`
    )
  })

  test('throws when ! is followed by an operator (!&a)', () => {
    expect(() => parseAndWithOrPriority(tokenize('!&a'))).toThrow(
      `Empty expression after '!'`
    )
  })

  test('throws when ! is followed by ")" (!))', () => {
    expect(() => parseAndWithOrPriority(tokenize('!'))).toThrow(
      `Empty expression after '!'`
    )
  })

  test('throws when ! is applied to an empty group (!())', () => {
    expect(() => parseAndWithOrPriority(tokenize('!()'))).toThrow(
      `Empty expression`
    )
  })

  test('throws when NOT is placed right after a term (a!b)', () => {
    expect(() => parseAndWithOrPriority(tokenize('a!b'))).toThrow(
      `Missing operator (& or ,) near: a ! b`
    )
  })
})
