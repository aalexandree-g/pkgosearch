import Rule from './rule/Rule'

const RulesAccordion = ({ title, rules }) => {
  return (
    <div className="u-surface rules">
      <div className="rules__header">
        <h1 className="rules__title">{title}</h1>
      </div>
      <div className="rules__content">
        {rules.map((rule, i) => (
          <Rule key={i} title={rule.title} content={rule.content} />
        ))}
      </div>
    </div>
  )
}

export default RulesAccordion
