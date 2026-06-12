import { useCallback } from "react"
import { useSpeechRecognition } from "./useSpeechRecognition"
import { parseTextToCommands } from "../../core/parser/simpleParser"
import { globalQueue } from "../../core/command/globalQueue"

export default function VoiceController() {

  const handleVoiceCommand = useCallback((text: string) => {
    const commands = parseTextToCommands(text)
    commands.forEach((cmd) => globalQueue.enqueue(cmd))
  }, [])

  const { transcript, isListening } =
    useSpeechRecognition(handleVoiceCommand)

  const startVoice = () => {
    window.dispatchEvent(new Event("start-voice"))
  }

  return (
    <div className="voice-bar">

      <div className={`status-dot ${isListening ? "active" : ""}`} />

      <div className="voice-text">
        {transcript || "Say something..."}
      </div>

      <div className="mic-button" onClick={startVoice}>
        🎙
      </div>

    </div>
  )
}