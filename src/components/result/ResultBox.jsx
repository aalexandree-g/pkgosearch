const ResultBox = ({ show, hasSubmitted, result, error }) => {
  if (!show) return null

  const text = error || result || ''
  const isError = Boolean(error)

  // Inserts a zero-width space after each operator (& , ; :)
  // so long search strings can wrap naturally without cutting words
  const formattedText = text.replace(/[&,;:]/g, (char) => `${char}\u200B`)

  const handleCopy = async () => {
    if (!result || isError) return
    await navigator.clipboard.writeText(result)
  }

  return (
    <div className="result-box">
      <div
        className={[
          'u-surface',
          'result-box__content',
          hasSubmitted && 'is-active',
          isError && 'is-error',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="result-box__toolbar">
          <span
            className={['result-box__title', isError && 'is-error']
              .filter(Boolean)
              .join(' ')}
          >
            {isError ? 'Invalid syntax' : 'Advanced search for Pokémon GO'}
          </span>
        </div>

        {text ? (
          <pre className="result-box__text">{formattedText}</pre>
        ) : (
          <span className="result-box__placeholder">
            The result will appear here...
          </span>
        )}
      </div>

      {!isError && result && (
        <button
          type="button"
          className="u-surface btn btn--submit"
          onClick={handleCopy}
        >
          Copy to clipboard
        </button>
      )}
    </div>
  )
}

export default ResultBox
