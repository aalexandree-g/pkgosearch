const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__content">
        Feedback, ideas, or a kind word ?{' '}
        <a className="footer__link" href="mailto:ashitaway@gmail.com">
          Say hi
        </a>
        {' · '}
        <a
          className="footer__link"
          href="https://www.reddit.com/r/TheSilphRoad/comments/1rkm7at/i_made_a_tool_that_lets_you_use_parentheses_in/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Reddit
        </a>
        <br />
        <span className="footer__legal">
          © 2026 pkgosearch · not affiliated with Niantic or Nintendo
        </span>
      </div>
    </footer>
  )
}

export default Footer
