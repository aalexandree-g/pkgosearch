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
          Update - March 6th<li>added a description of the tool</li>
          <li>added a character counter for the result</li>
        </div>
        <div className="u-surface rules">
          <p>
            <strong>Pokémon GO's search bar is powerful...</strong>
            <br />
            ... but writing complex filters can quickly become a headache.
            <br />
            <br />
            <strong>PoGO Search Plus</strong> lets you build your search{' '}
            <strong>using parentheses</strong> to group conditions naturally,
            just like you'd think them. Paste your expression, and the tool
            instantly converts it into a format the game actually understands.
            <br />
            <br />
            <strong>Example</strong>: Want all your shiny Pikachu and all your
            XXL Pumpkaboo? Just type
            <br />
            <code>(pikachu&shiny),(pumpkaboo&xxl)</code>
            <br />
            and let the tool handle the rest.
            <br />
            <br />
            Refer{' '}
            <a
              href="https://leidwesen.github.io/SearchPhrases/"
              target="_blank"
              rel="noopener noreferrer"
            >
              this document
            </a>{' '}
            for everything to know about in-game searches.
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
