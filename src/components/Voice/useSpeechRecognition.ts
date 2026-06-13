import { useEffect, useRef, useState, useCallback } from "react"

declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

export function useSpeechRecognition(
  onFinalResult: (text: string) => void
) {
  const [transcript, setTranscript]   = useState("")
  const [isListening, setIsListening] = useState(false)

  const recognitionRef      = useRef<any>(null)
  const isManuallyStopped   = useRef(false)
  const restartTimeout      = useRef<any>(null)
  // ✅ 用 ref 保存回调，避免旧闭包问题
  const onFinalResultRef    = useRef(onFinalResult)
  // ✅ 生成中时暂停自动重启
  const isProcessingRef     = useRef(false)

  // 每次 onFinalResult 变化时同步 ref
  useEffect(() => {
    onFinalResultRef.current = onFinalResult
  }, [onFinalResult])

  // 暴露给外部控制「是否生成中」
  const setProcessing = useCallback((v: boolean) => {
    isProcessingRef.current = v
  }, [])

  useEffect(() => {
    const SpeechRecognition =
      window.webkitSpeechRecognition || window.SpeechRecognition

    if (!SpeechRecognition) {
      console.warn("当前浏览器不支持 SpeechRecognition，请使用 Chrome")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang            = "zh-CN"
    recognition.continuous      = true
    recognition.interimResults  = false

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1]
      if (!result.isFinal) return

      const text = result[0].transcript.trim()
      setTranscript(text)

      if (text.includes("停止监听")) {
        isManuallyStopped.current = true
        recognition.stop()
        return
      }

      // ✅ 通过 ref 调用，永远拿到最新的回调
      onFinalResultRef.current(text)
    }

    recognition.onerror = (e: any) => {
      // network / no-speech 这类错误不需要处理，onend 会自动重启
      if (e.error === "not-allowed") {
        console.error("麦克风权限被拒绝")
        isManuallyStopped.current = true
      }
    }

    recognition.onend = () => {
      setIsListening(false)

      // 手动停止 或 正在生成中 → 不重启
      if (isManuallyStopped.current || isProcessingRef.current) return

      restartTimeout.current = setTimeout(() => {
        try { recognition.start() } catch {}
      }, 800)
    }

    recognitionRef.current = recognition

    const startHandler = () => {
      clearTimeout(restartTimeout.current)
      isManuallyStopped.current = false
      try { recognition.start() } catch {}
    }

    window.addEventListener("start-voice", startHandler)

    return () => {
      clearTimeout(restartTimeout.current)
      recognition.stop()
      window.removeEventListener("start-voice", startHandler)
    }
  }, []) // 只初始化一次

  return { transcript, isListening, setProcessing }
}