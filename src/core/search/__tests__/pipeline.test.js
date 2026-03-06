import { tokenize } from '../tokenize'
import { parseAndWithOrPriority } from '../parse'
import { normalize } from '../normalize'
import { astToPokemon } from '../serialize'
import { simplify } from '../simplify'

function compileToPokemon(input) {
  const tokens = tokenize(input)
  const ast = parseAndWithOrPriority(tokens)
  const normalized = normalize(ast)
  const simplified = simplify(normalized)
  return astToPokemon(simplified)
}

describe('pipeline (tokenize → parse → normalize → serialize)', () => {
  // ---------- VALID CASES ----------

  test('converts a simple TERM', () => {
    expect(compileToPokemon('a')).toBe('a')
  })

  test('converts simple AND chain (a&b&c)', () => {
    expect(compileToPokemon('a&b&c')).toBe('a&b&c')
  })

  test('converts simple OR chain (a,b,c)', () => {
    expect(compileToPokemon('a,b,c')).toBe('a,b,c')
  })

  test('converts (a&b),c correctly', () => {
    expect(compileToPokemon('(a&b),c')).toBe('a,c&b,c')
  })

  test('converts a,(b&c) correctly', () => {
    expect(compileToPokemon('a,(b&c)')).toBe('a,b&a,c')
  })

  test('converts (a&b),(c&d) correctly', () => {
    expect(compileToPokemon('(a&b),(c&d)')).toBe('a,c&a,d&b,c&b,d')
  })

  test('handles extra outer parentheses', () => {
    expect(compileToPokemon('(((a)))')).toBe('a')
  })

  // ---------- NOT OPERATOR ----------

  test('converts !a correctly', () => {
    expect(compileToPokemon('!a')).toBe('!a')
  })

  test('converts !a&b correctly', () => {
    expect(compileToPokemon('!a&b')).toBe('!a&b')
  })

  test('converts a,!b correctly', () => {
    expect(compileToPokemon('a,!b')).toBe('a,!b')
  })

  test('converts !(a&b) using De Morgan', () => {
    // !(a&b) => !a | !b
    expect(compileToPokemon('!(a&b)')).toBe('!a,!b')
  })

  test('converts !(a,b) using De Morgan', () => {
    // !(a|b) => !a & !b
    expect(compileToPokemon('!(a,b)')).toBe('!a&!b')
  })

  // ---------- FORBIDDEN NEGATED IV FILTERS ----------

  test('throws on forbidden negated IV (!4hp)', () => {
    expect(() => compileToPokemon('!4hp')).toThrow('Forbidden filter: "!4hp".')
  })

  test('throws on forbidden negated IV range (!0-3attack)', () => {
    expect(() => compileToPokemon('!0-3attack')).toThrow(
      'Forbidden filter: "!0-3attack".'
    )
  })

  test('throws on forbidden negated IV with french alias (!2defense)', () => {
    expect(() => compileToPokemon('!2defense')).toThrow(
      'Forbidden filter: "!2defense".'
    )
  })

  test('allows negated non-IV filter (!hp100)', () => {
    expect(compileToPokemon('!hp100')).toBe('!hp100')
  })

  test('detects forbidden negated IV deep in tree', () => {
    expect(() => compileToPokemon('a,!(b&0attack)')).toThrow(
      'Forbidden filter: "!0attack".'
    )
  })

  // ---------- INVALID SYNTAX ----------

  test('throws on duplicated AND (a&&b)', () => {
    expect(() => compileToPokemon('a&&b')).toThrow()
  })

  test('throws on duplicated OR (a,,b)', () => {
    expect(() => compileToPokemon('a,,b')).toThrow()
  })

  test('throws on missing operator before "(" (a(b))', () => {
    expect(() => compileToPokemon('a(b)')).toThrow()
  })

  test('throws on missing operator after ")" ((a)b)', () => {
    expect(() => compileToPokemon('(a)b')).toThrow()
  })

  test('throws on empty parentheses ()', () => {
    expect(() => compileToPokemon('()')).toThrow()
  })

  test('throws on NOT at end (a,!)', () => {
    expect(() => compileToPokemon('a,!')).toThrow()
  })

  test('throws on unmatched opening parenthesis (a,(b)', () => {
    expect(() => compileToPokemon('a,(b')).toThrow()
  })

  test('throws on unmatched closing parenthesis (a,b))', () => {
    expect(() => compileToPokemon('a,b)')).toThrow()
  })
})
