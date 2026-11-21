import { transform } from '../index'

describe('transform search conversion', () => {
  // ---------- VALID CASES ----------

  test('converts a simple TERM', () => {
    expect(transform('a')).toBe('a')
  })

  test('converts simple AND chain (a&b&c)', () => {
    expect(transform('a&b&c')).toBe('a&b&c')
  })

  test('converts simple OR chain (a,b,c)', () => {
    expect(transform('a,b,c')).toBe('a,b,c')
  })

  test('converts (a&b),c correctly', () => {
    expect(transform('(a&b),c')).toBe('a,c&b,c')
  })

  test('converts a,(b&c) correctly', () => {
    expect(transform('a,(b&c)')).toBe('a,b&a,c')
  })

  test('converts (a&b),(c&d) correctly', () => {
    expect(transform('(a&b),(c&d)')).toBe('a,c&a,d&b,c&b,d')
  })

  test('handles extra outer parentheses', () => {
    expect(transform('(((a)))')).toBe('a')
  })

  // ---------- NOT OPERATOR ----------

  test('converts !a correctly', () => {
    expect(transform('!a')).toBe('!a')
  })

  test('converts !a&b correctly', () => {
    expect(transform('!a&b')).toBe('!a&b')
  })

  test('converts a,!b correctly', () => {
    expect(transform('a,!b')).toBe('a,!b')
  })

  test('converts !(a&b) using De Morgan', () => {
    // !(a&b) => !a | !b
    expect(transform('!(a&b)')).toBe('!a,!b')
  })

  test('converts !(a,b) using De Morgan', () => {
    // !(a|b) => !a & !b
    expect(transform('!(a,b)')).toBe('!a&!b')
  })

  // ---------- POSITIVE IV COMPLEMENTS ----------

  test.each([
    ['!1attack', '0attack,2-attack'],
    ['!0attack', '1-attack'],
    ['!4hp', '-3hp'],
    ['!1-3attack', '0attack,4attack'],
    ['!-1attack', '2-attack'],
    ['!2defense', '-1defense,3-defense'],
    ['!(1-attack&shiny)', '0attack,!shiny'],
  ])('converts %s to %s', (input, output) => {
    expect(transform(input)).toBe(output)
  })

  test('allows negated non-IV filter (!hp100)', () => {
    expect(transform('!hp100')).toBe('!hp100')
  })

  test('keeps unsupported French IV aliases on the existing error path', () => {
    expect(() => transform('!1-attaque')).toThrow('Forbidden filter')
  })

  test('reports an impossible IV complement', () => {
    expect(transform('!0-attack,shiny')).toBe('shiny')
    expect(() => transform('!0-attack&shiny')).toThrow('Impossible expression')
  })

  test('validates unsupported filters before absorption can hide them', () => {
    expect(() => transform('a,(a&!mega1)')).toThrow(
      'Forbidden filter: "!mega1".'
    )
  })

  // ---------- INVALID SYNTAX ----------

  test('throws on duplicated AND (a&&b)', () => {
    expect(() => transform('a&&b')).toThrow()
  })

  test('throws on duplicated OR (a,,b)', () => {
    expect(() => transform('a,,b')).toThrow()
  })

  test('throws on missing operator before "(" (a(b))', () => {
    expect(() => transform('a(b)')).toThrow()
  })

  test('throws on missing operator after ")" ((a)b)', () => {
    expect(() => transform('(a)b')).toThrow()
  })

  test('throws on empty parentheses ()', () => {
    expect(() => transform('()')).toThrow()
  })

  test('throws on NOT at end (a,!)', () => {
    expect(() => transform('a,!')).toThrow()
  })

  test('throws on unmatched opening parenthesis (a,(b)', () => {
    expect(() => transform('a,(b')).toThrow()
  })

  test('throws on unmatched closing parenthesis (a,b))', () => {
    expect(() => transform('a,b)')).toThrow()
  })
})
