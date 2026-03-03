export const rulesContent = {
  title: 'Things to know',
  items: [
    {
      title: 'Nicknames',
      content: (
        <>
          <code>+{'{nickname}'}</code> fails for Ditto.
        </>
      ),
    },
    {
      title: 'IV ranges',
      content: (
        <>
          Negation <code>!</code> is ignored for IV ranges.
          <br />
          (e.g. <code>!1attack</code> = <code>1attack</code>)
        </>
      ),
    },
    {
      title: 'Regional forms',
      content: (
        <>
          Regional forms excluded by <code>!Alola</code>, <code>!Galar</code>,{' '}
          <code>!Hisui</code>, and <code>!Paldea</code> cannot be unexcluded.
          <br />
          (e.g. <code>(rattata&alola),(meowth&!alola)</code> won't show any
          Rattata)
          <br />
          <br />
          Paldean Tauros is not classified as 'Paldea'.
        </>
      ),
    },
    {
      title: 'Other tips and rules',
      content: (
        <>
          Refer to{' '}
          <a
            href="https://leidwesen.github.io/SearchPhrases/"
            target="_blank"
            rel="noopener noreferrer"
          >
            this document
          </a>{' '}
          for everything to know about in-game searches.
        </>
      ),
    },
  ],
}
