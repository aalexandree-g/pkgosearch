const Rule = ({ title, children }) => {
  return (
    <div className="rule">
      <h2 className="rule__title">{title}</h2>
      <p className="rule__text">{children}</p>
    </div>
  )
}

export default Rule
