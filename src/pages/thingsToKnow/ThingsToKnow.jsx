import { useNavigate } from 'react-router-dom'
import Header from '../../components/header/Header'
import RulesAccordion from '../../components/rules/RulesAccordion'
import { rulesContent } from '../../data/RulesContent'

const ThingsToKnow = () => {
  const navigate = useNavigate()

  return (
    <div className="app">
      <Header />
      <div className="home">
        <RulesAccordion title={rulesContent.title} rules={rulesContent.items} />
        <button
          type="button"
          className="u-surface btn btn--submit"
          onClick={() => navigate('/')}
        >
          Back
        </button>
      </div>
    </div>
  )
}

export default ThingsToKnow
