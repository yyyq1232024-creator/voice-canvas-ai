import { useRef, useState, useCallback } from "react"
import { useSpeechRecognition } from "./components/Voice/useSpeechRecognition"
import { useAudioLevel } from "./components/Voice/useAudioLevel"
import VoiceController from "./components/Voice/VoiceController"
import type { AppStatus } from "./types/status"
import "./style.css"

// ─── 常量 ──────────────────────────────────────────────────────────────────
const GEO_PATTERN = /^画(一个)?(圆形|正方形|方形|三角形|三角)$/

const STATUS_TEXT: Record<AppStatus, string> = {
  idle:       "Describe your image...",
  listening:  "Listening...",
  generating: "AI is creating...",
  done:       "",
  error:      "",
}

// ─── 后端调用 ──────────────────────────────────────────────────────────────
async function callGenerate(prompt: string) {
  const res = await fetch("http://localhost:3001/generate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ prompt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `请求失败 ${res.status}`)
  }
  return res.json() as Promise<{ imageUrl: string; optimizedPrompt: string }>
}

// ─── Canvas 绘制 ───────────────────────────────────────────────────────────
async function drawImageToCanvas(canvas: HTMLCanvasElement, imageUrl: string) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const proxied = `http://localhost:3001/proxy-image?url=${encodeURIComponent(imageUrl)}`
  const img     = new Image()
  img.crossOrigin = "anonymous"

  await new Promise<void>((resolve, reject) => {
    img.onload  = () => resolve()
    img.onerror = () => reject(new Error("图片加载失败"))
    img.src     = proxied
  })

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
}

function drawGeometry(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle   = "#f5f4f1"
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = "#1d1d1f"
  ctx.lineWidth   = 4

  if (text.includes("圆")) {
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (text.includes("正方形") || text.includes("方形")) {
    ctx.strokeRect(W / 2 - 80, H / 2 - 80, 160, 160)
  }
  if (text.includes("三角")) {
    ctx.beginPath()
    ctx.moveTo(W / 2, H / 2 - 100)
    ctx.lineTo(W / 2 - 100, H / 2 + 100)
    ctx.lineTo(W / 2 + 100, H / 2 + 100)
    ctx.closePath()
    ctx.stroke()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus]                   = useState<AppStatus>("idle")
  const [errorMsg, setErrorMsg]               = useState("")
  const [optimizedPrompt, setOptimizedPrompt] = useState("")
  const [hasImage, setHasImage]               = useState(false)

  // ─── 核心管道 ─────────────────────────────────────────────────────────────
  const handleVoiceCommand = useCallback(async (text: string) => {
    if (!text.trim()) return

    setErrorMsg("")
    setOptimizedPrompt("")

    // 纯几何：本地绘制，不走 AI
    if (GEO_PATTERN.test(text.trim())) {
      if (canvasRef.current) drawGeometry(canvasRef.current, text)
      setHasImage(true)
      setStatus("done")
      return
    }

    try {
      setStatus("generating")
      setProcessing(true)   // 暂停语音自动重启

      const { imageUrl, optimizedPrompt: prompt } = await callGenerate(text)
      setOptimizedPrompt(prompt)

      if (canvasRef.current) await drawImageToCanvas(canvasRef.current, imageUrl)
      setHasImage(true)

      setStatus("done")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "未知错误")
      setStatus("error")
    } finally {
      setProcessing(false)  // 恢复语音监听
    }
  }, [])

  const { transcript, isListening, setProcessing } =
    useSpeechRecognition(handleVoiceCommand)

  // 实时音量（只在监听时采集）
  const audioLevel = useAudioLevel(isListening)

  const startVoice = useCallback(() => {
    setStatus("listening")
    window.dispatchEvent(new Event("start-voice"))
  }, [])

  // ─── 显示文字 ─────────────────────────────────────────────────────────────
  const displayText = (() => {
    if (status === "error")      return errorMsg
    if (status === "generating") return STATUS_TEXT.generating
    if (isListening)             return transcript || STATUS_TEXT.listening
    if (transcript)              return transcript
    return STATUS_TEXT.idle
  })()

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      <div className="canvas-area">
        <canvas
          ref={canvasRef}
          width={1024}
          height={1024}
          className={`art-canvas ${hasImage ? "show" : ""}`}
        />

        {!hasImage && status !== "generating" && (
          <div className="canvas-placeholder">
            <div className="placeholder-icon" />
            <p>说出你想要的画面</p>
          </div>
        )}

        {status === "generating" && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p>AI is creating...</p>
          </div>
        )}
      </div>

      {/* 优化后的 prompt 预览（上线可删） */}
      {optimizedPrompt && status === "done" && (
        <div className="prompt-preview">
          <span className="prompt-preview__label">Prompt</span>
          <span className="prompt-preview__text">{optimizedPrompt}</span>
        </div>
      )}

      <div className="input-area">
        <VoiceController
          transcript={displayText}
          isListening={isListening}
          status={status}
          audioLevel={audioLevel}
          onStart={startVoice}
        />
      </div>

    </div>
  )
}

export default App