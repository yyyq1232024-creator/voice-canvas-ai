import CanvasBoard from "./components/Canvas/CanvasBoard"
import VoiceController from "./components/Voice/VoiceController"
import "./style.css"

function App() {
  return (
    <div className="app">
      <div className="canvas-area">
        <CanvasBoard />
      </div>

      <div className="input-area">
        <VoiceController />
      </div>
    </div>
  )
}

export default App