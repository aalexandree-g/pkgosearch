import { tokenize } from './tokenize'
import { parseAndWithOrPriority } from './parse'
import { normalize } from './normalize'
import { astToPokemon } from './serialize'
import { simplify } from './simplify'

export function transform(input) {
  const tokens = tokenize(input)
  const ast = parseAndWithOrPriority(tokens)
  const deduped = simplify(ast)
  const normalized = normalize(deduped)
  const normalizedDeduped = simplify(normalized)
  return astToPokemon(normalizedDeduped)
}
