import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const Dropdown = ({ title, children }) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="u-surface dropdown">
      <div className="u-surface__header" onClick={() => setOpen(!open)}>
        <div className="u-surface__title">{title}</div>
        <button className="u-surface__button" type="button">
          {open ? <ChevronUp /> : <ChevronDown />}
        </button>
      </div>
      {open && <div className="u-surface__content">{children}</div>}
    </div>
  )
}

export default Dropdown
