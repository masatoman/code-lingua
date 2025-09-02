import React, { useState } from 'react'
import PhraseList from './components/PhraseList.jsx'

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
      <PhraseList darkMode={darkMode} setDarkMode={setDarkMode} />
    </div>
  )
}

export default App
