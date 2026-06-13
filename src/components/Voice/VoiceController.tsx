import type { AppStatus } from "../../types/status"

interface Props {
  transcript:  string
  isListening: boolean
  status:      AppStatus
  onStart:     () => void
}

export default function VoiceController({
  transcript,
  isListening,
  status,
  onStart,
}: Props) {

  const isProcessing = status === "generating"
  const isDisabled   = isProcessing

  return (
    <div className="voice-bar">

      {/* 状态球 */}
      <div className={[
        "status-dot",
        isListening  ? "active"   : "",
        isProcessing ? "pulsing"  : "",
      ].join(" ")} />

      {/* 文字区域 */}
      <div className={[
        "voice-text",
        status === "error"      ? "voice-text--error"      : "",
        status === "generating" ? "voice-text--processing" : "",
      ].join(" ")}>
        {transcript}
      </div>

      {/* 麦克风按钮 */}
      <div
        className={[
          "mic-button",
          isListening ? "listening" : "",
          isDisabled  ? "disabled"  : "",
        ].join(" ")}
        onClick={isDisabled ? undefined : onStart}
        title={isDisabled ? "生成中，请稍候" : "点击开始语音"}
      >
        <div className="mic-icon-line" />
      </div>

    </div>
  )
}