const TOKEN_MAP = {
  '&': 'AND',
  '|': 'OR',
  ',': 'OR',
  ':': 'OR',
  ';': 'OR',
  '!': 'NOT',
  '(': 'LPAREN',
  ')': 'RPAREN',
}

export function tokenize(input = '') {
  // deduplicate js-like consecutive operators (&&, ||)
  input = input.replace(/&+/g, '&');
  input = input.replace(/\|+/g, '|');
  const tokens = []
  let current = ''
  let i = 0

  // put a 'TERM' into 'tokens'
  const flush = () => {
    const token = current.trim().toLowerCase()
    current = ''
    if (!token) return
    tokens.push({ type: 'TERM', value: token })
  }

  // put a separator into 'tokens'
  for (const char of input) {
    const type = TOKEN_MAP[char]
    if (type) {
      flush()
      tokens.push({ type, raw: char })
    } else {
      current += char
    }
  }

  flush()
  return tokens
}

export { TOKEN_MAP }
