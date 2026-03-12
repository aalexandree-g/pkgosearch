const SearchInput = ({
  refEl,
  hasSubmitted,
  isFocused,
  value,
  onChange,
  onInput,
  onFocus,
  onBlur,
  showReset,
  onReset,
}) => {
  return (
    <div className="search-input">
      <div className="result-box__toolbar">
        <span className="result-box__title">
          You can use negation ( ! ) and parentheses.
        </span>
      </div>
      <textarea
        ref={refEl}
        className={[
          'u-surface',
          'search-input__content',
          hasSubmitted && !isFocused && 'is-submitted',
        ]
          .filter(Boolean)
          .join(' ')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onInput={onInput}
        onFocus={onFocus}
        onBlur={onBlur}
        spellCheck="false"
        placeholder={`Enter your search. Example: (pikachu&shiny),4*`}
      />

      <div className="search-input__actions">
        {showReset && (
          <button
            type="button"
            className="u-surface btn btn--reset"
            onClick={onReset}
          >
            reset
          </button>
        )}

        <button className="u-surface btn btn--submit" type="submit">
          convert
        </button>
      </div>
    </div>
  )
}

export default SearchInput
