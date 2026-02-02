export const rulesContent = {
  title: 'Things to know',
  items: [
    {
      title: 'IV ranges',
      content: (
        <>
          Negation <code>!</code> is ignored in-game for IV ranges.
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
          Rattata
          <br />
          and <code>(rattata&kanto),(meowth&!kanto)</code> won't show any
          Meowth)
        </>
      ),
    },
  ],
}
