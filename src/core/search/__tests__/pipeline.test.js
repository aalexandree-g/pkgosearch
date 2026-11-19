import { transform } from '../index'

describe('pipeline (tokenize → parse → simplify → normalize → simplify → serialize)', () => {
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

  // ---------- FORBIDDEN NEGATED IV FILTERS ----------

  test('throws on forbidden negated IV (!4hp)', () => {
    expect(() => transform('!4hp')).toThrow('Forbidden filter: "!4hp".')
  })

  test('throws on forbidden negated IV range (!0-3attack)', () => {
    expect(() => transform('!0-3attack')).toThrow(
      'Forbidden filter: "!0-3attack".'
    )
  })

  test('throws on forbidden negated IV with french alias (!2defense)', () => {
    expect(() => transform('!2defense')).toThrow(
      'Forbidden filter: "!2defense".'
    )
  })

  test('allows negated non-IV filter (!hp100)', () => {
    expect(transform('!hp100')).toBe('!hp100')
  })

  test('detects forbidden negated IV deep in tree', () => {
    expect(() => transform('a,!(b&0attack)')).toThrow(
      'Forbidden filter: "!0attack".'
    )
  })

  test('still rejects a forbidden filter shared by factored branches', () => {
    expect(() => transform('(!4attack&x),(!4attack&y)')).toThrow(
      'Forbidden filter: "!4attack".'
    )
  })

  test('preserves existing absorption before forbidden filter validation', () => {
    expect(transform('a,(a&!4attack)')).toBe('a')
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
