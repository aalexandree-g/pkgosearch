import { useState } from 'react'
import { transform } from '../core/search'

export function useHomeLogic({ onResize } = {}) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => setIsFocused(false)

  const handleChange = (nextValue) => {
    setValue(nextValue)
    setResult('')
    setError(null)
  }

  const handleReset = () => {
    setValue('')
    setResult('')
    setError(null)
    setHasSubmitted(false)
    setIsFocused(false)
    requestAnimationFrame(() => onResize?.())
  }

  const MAX_LENGTH = 100000

  const handleSubmit = (e) => {
    e.preventDefault()

    let output = ''
    let errorValue = null

    try {
      output = transform(value)

      if (output.length > MAX_LENGTH) {
        throw new Error(
          `Result too long (${output.length} characters). Limit : ${MAX_LENGTH}.`
        )
      }
    } catch (err) {
      errorValue = err.message
    }

    setResult(output)
    setError(errorValue)
    setHasSubmitted(true)
  }

  const showReset = hasSubmitted || value.length > 0

  return {
    value,
    result,
    error,
    hasSubmitted,
    isFocused,
    handleFocus,
    handleBlur,
    handleChange,
    handleReset,
    handleSubmit,
    showReset,
  }
}
