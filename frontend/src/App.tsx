import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-slate-800">
      <div className="max-w-3xl text-center px-4">
        <h1 className="text-6xl font-bold text-primary mb-6 drop-shadow-md">
          🛋️ FurniShop
        </h1>
        <p className="text-xl text-slate-600 mb-8 leading-relaxed">
          Nền tảng thương mại điện tử chuyên đồ nội thất. <br/>
          Tích hợp công nghệ AI (Visual Search & Auto-Description).
        </p>
        
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 transition-all hover:shadow-xl">
          <p className="text-lg font-medium mb-4">
            Test Tailwind CSS & React State
          </p>
          <button
            onClick={() => setCount((count) => count + 1)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors active:scale-95"
          >
            Đã click {count} lần
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
