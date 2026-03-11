import { useState } from 'react'
import Header from '../../components/header/Header'
import Rule from '../../components/rules/rule/Rule'
import SearchInput from '../../components/search/SearchInput'
import ResultBox from '../../components/result/ResultBox'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { useHomeLogic } from '../../hooks/useHomeLogic'
import { useAutoResizeTextarea } from '../../hooks/useAutoResizeTextarea'

const Home = () => {
  const { ref, onInput } = useAutoResizeTextarea()
  const homeLogic = useHomeLogic({ onResize: onInput })
  const [open, setOpen] = useState(false)
  const [openUpdate, setOpenUpdate] = useState(false)

  return (
    <div className="app">
      <Header />
      <form className="home" onSubmit={homeLogic.handleSubmit}>
        <div className="u-surface rules">
          <div
            className="u-surface__header"
            onClick={() => setOpenUpdate(!openUpdate)}
          >
            <div className="u-surface__title">Update - March 11th, 2026</div>
            <button className="u-surface__button" type="button">
              {openUpdate ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
          {openUpdate && (
            <div className="u-surface__content">
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
            </div>
          )}
        </div>
        <div className="u-surface rules">
          <div className="u-surface__header" onClick={() => setOpen(!open)}>
            <div className="u-surface__title">
              <strong>What is pkgosearch ?</strong>
            </div>
            <button className="u-surface__button" type="button">
              {open ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
          {open && (
            <div className="u-surface__content">
              Pokémon GO's search bar is powerful but writing complex filters
              can quickly become a headache.
              <br />
              <br />
              <Rule title="Group conditions with parentheses">
                <strong>pkgosearch</strong> lets you build your search{' '}
                <strong>using parentheses</strong> to group conditions
                naturally, just like you'd think them. Paste your expression,
                and the tool instantly converts it into a format the game
                actually understands.{' '}
              </Rule>
              <br />
              <Rule title="No more duplicate conditions">
                Beyond conversion, it also{' '}
                <strong>cleans up your expressions</strong> automatically :
                duplicate conditions, redundant terms, and unnecessary
                complexity are removed, so your final search string is always as
                short and efficient as possible.
              </Rule>
              <br />
              <Rule title="Example">
                Want all your <strong>shiny Pikachu</strong> and all your{' '}
                <strong>XXL Pumpkaboo</strong> ? Just type
                <br />
                <code>(pikachu&shiny),(pumpkaboo&xxl)</code>
                <br />
                and let the tool handle the rest.
              </Rule>
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
            </div>
          )}
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
