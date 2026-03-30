import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <main>
        <h1>Aplicação React + TypeScript</h1>
        <p>Use este projeto para treinar componentes, estado e hooks.</p>
        <div className="card">
          <button type="button" onClick={() => setCount((count) => count + 1)}>
            Você clicou {count} vezes
          </button>
        </div>
      </main>
    </div>
  )
}

export default App
