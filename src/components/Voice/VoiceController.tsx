import type { CSSProperties } from "react"
import type { AppStatus } from "../../types/status"

interface Props {
  transcript:  string
  isListening: boolean
  status:      AppStatus
  audioLevel:  number   // 0 ~ 1，说话音量
  onStart:     () => void
}

export default function VoiceController({
  transcript,
  isListening,
  status,
  audioLevel,
  onStart,
}: Props) {

  const isProcessing = status === "generating"
  const isDisabled   = isProcessing

  // 把音量传给 CSS 变量，驱动麦克风的实时反应动画
  const micStyle: CSSProperties = {
    "--audio-level": audioLevel,
  } as CSSProperties

  return (
    <div className="voice-bar">

      {/* ── 玻璃球：3D 蓝黄渐变旋转球 ───────────────────────────── */}
      <div className={[
        "glass-orb",
        isListening  ? "listening"  : "",
        isProcessing ? "generating" : "",
      ].join(" ")} />

      {/* ── 中间输入条 ────────────────────────────────────────── */}
      <div className="voice-pill">
        <div className={[
          "voice-text",
          status === "error"      ? "voice-text--error"      : "",
          status === "generating" ? "voice-text--processing" : "",
        ].join(" ")}>
          {transcript}
        </div>
      </div>

      {/* ── 麦克风：独立圆形，说话时实时反应 ──────────────────── */}
      <div
        className={[
          "mic-circle",
          isListening ? "listening" : "",
          isDisabled  ? "disabled"  : "",
        ].join(" ")}
        style={micStyle}
        onClick={isDisabled ? undefined : onStart}
        title={isDisabled ? "生成中，请稍候" : "点击开始语音"}
      >
        {isListening && <div className="mic-ring" />}
        <div className="mic-icon-line" />
      </div>

    </div>
  )
}