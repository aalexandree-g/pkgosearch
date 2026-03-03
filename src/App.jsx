import { Routes, Route } from 'react-router-dom'
import Home from './pages/home/Home'
import ThingsToKnow from './pages/thingsToKnow/ThingsToKnow'

const App = () => {
  return (
    <Routes>
      <Route path="/things-to-know" element={<ThingsToKnow />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}

export default App
