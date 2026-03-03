import { Link } from 'react-router-dom'
import Header from '../../components/header/Header'
import SearchInput from '../../components/search/SearchInput'
import ResultBox from '../../components/result/ResultBox'

import { useHomeLogic } from '../../hooks/useHomeLogic'
import { useAutoResizeTextarea } from '../../hooks/useAutoResizeTextarea'

const Home = () => {
  const { ref, onInput } = useAutoResizeTextarea()
  const homeLogic = useHomeLogic({ onResize: onInput })

  return (
    <div className="app">
      <Header />
      <form className="home" onSubmit={homeLogic.handleSubmit}>
        <div className="u-surface rules">
          <p>
            Click <Link to="/things-to-know">here</Link> for things to know.
          </p>
        </div>
        <SearchInput
          refEl={ref}
          hasSubmitted={homeLogic.hasSubmitted}
          isFocused={homeLogic.isFocused}
          value={homeLogic.value}
          onChange={homeLogic.handleChange}
          onInput={onInput}
          onFocus={homeLogic.handleFocus}
          onBlur={homeLogic.handleBlur}
          showReset={homeLogic.showReset}
          onReset={homeLogic.handleReset}
        />
        <ResultBox
          show={homeLogic.hasSubmitted}
          hasSubmitted={homeLogic.hasSubmitted}
          result={homeLogic.result}
          error={homeLogic.error}
        />
      </form>
    </div>
  )
}

export default Home
