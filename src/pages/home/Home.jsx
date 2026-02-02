import Header from '../../components/header/Header'
import { rulesContent } from '../../data/RulesContent'
import RulesAccordion from '../../components/rules/RulesAccordion'
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
      <div className="alternative-version">ALTERNATIVE VERSION</div>
      <form className="home__form" onSubmit={homeLogic.handleSubmit}>
        <RulesAccordion
          isOpen={homeLogic.isRulesOpen}
          onToggle={homeLogic.toggleRules}
          title={rulesContent.title}
          rules={rulesContent.items}
        />
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
