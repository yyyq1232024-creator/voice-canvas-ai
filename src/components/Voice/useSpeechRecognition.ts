import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

export function useSpeechRecognition(
  onFinalResult: (text: string) => void
) {
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef<any>(null)
  const isManuallyStopped = useRef(false)
  const restartTimeout = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition =
      window.webkitSpeechRecognition || window.SpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()

    recognition.lang = "zh-CN"
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
    }

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

      onFinalResult(text)
    }

    recognition.onerror = () => {
      // 不在 error 里重启
    }

    recognition.onend = () => {
      setIsListening(false)

      if (isManuallyStopped.current) return

      // ✅ 防止死循环重启
      restartTimeout.current = setTimeout(() => {
        try {
          recognition.start()
        } catch {}
      }, 1000)
    }

    recognitionRef.current = recognition

    const startHandler = () => {
      try {
        isManuallyStopped.current = false
        recognition.start()
      } catch {}
    }

    window.addEventListener("start-voice", startHandler)

    return () => {
      recognition.stop()
      window.removeEventListener("start-voice", startHandler)
      clearTimeout(restartTimeout.current)
    }
  }, [])   // ✅ 只初始化一次

  return {
    transcript,
    isListening,
  }
}