import Header from '../../components/header/Header'
import Footer from '../../components/footer/Footer'
import Dropdown from '../../components/dropdown/Dropdown'
import SearchInput from '../../components/search/SearchInput'
import ResultBox from '../../components/result/ResultBox'

import { useHomeLogic } from '../../hooks/useHomeLogic'
import { useAutoResizeTextarea } from '../../hooks/useAutoResizeTextarea'

const Home = () => {
  const { ref, onInput } = useAutoResizeTextarea()
  const homeLogic = useHomeLogic({ onResize: onInput })

  return (
    <>
      <div className="app">
        <Header />
        <form className="home" onSubmit={homeLogic.handleSubmit}>
          <Dropdown title="Update - March 11th, 2026">
            <li>
              rebranded to pkgosearch (
              <a
                href="https://pkgosearch.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                pkgosearch.com
              </a>
              )
            </li>
          </Dropdown>
          <Dropdown title={<strong>What is pkgosearch ?</strong>}>
            Pokémon GO's search bar is powerful but writing complex filters can
            quickly become a headache.
            <br />
            <br />
            <div className="rule">
              <h2 className="rule__title">Group conditions with parentheses</h2>
              <p className="rule__text">
                <strong>pkgosearch</strong> lets you build your search{' '}
                <strong>using parentheses</strong> to group conditions
                naturally, just like you'd think them. Paste your expression,
                and the tool instantly converts it into a format the game
                actually understands.{' '}
              </p>
            </div>
            <br />
            <div className="rule">
              <h2 className="rule__title">No more duplicate conditions</h2>
              <p className="rule__text">
                Beyond conversion, it also{' '}
                <strong>cleans up your expressions</strong> automatically :
                duplicate conditions, redundant terms, and unnecessary
                complexity are removed, so your final search string is always as
                short and efficient as possible.
              </p>
            </div>
            <br />
            <div className="rule">
              <h2 className="rule__title">Example</h2>
              <p className="rule__text">
                Want all your <strong>shiny Pikachu</strong> and all your{' '}
                <strong>XXL Pumpkaboo</strong> ? Just type
                <br />
                <code>(pikachu&shiny),(pumpkaboo&xxl)</code>
                <br />
                and let the tool handle the rest.
              </p>
            </div>
            <br />
            <br />
            For a full list of in-game search terms, check out{' '}
            <a
              href="https://leidwesen.github.io/SearchPhrases/"
              target="_blank"
              rel="noopener noreferrer"
            >
              this document
            </a>
            .
          </Dropdown>
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
      <Footer />
    </>
  )
}

export default Home
