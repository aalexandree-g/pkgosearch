const TextBlock = ({ title, children }) => {
  return (
    <div className="text-block">
      <h2 className="text-block__title">{title}</h2>
      <p className="text-block__text">{children}</p>
    </div>
  )
}

export default TextBlock
