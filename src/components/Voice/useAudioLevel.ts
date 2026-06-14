// src/components/Voice/useAudioLevel.ts
// 实时检测麦克风音量，用于驱动说话动画

import { useEffect, useRef, useState } from "react"

export function useAudioLevel(enabled: boolean): number {
  const [level, setLevel] = useState(0) // 0 ~ 1

  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!enabled) {
      setLevel(0)
      return
    }

    let analyser: AnalyserNode
    let dataArray: Uint8Array<ArrayBuffer>
    let cancelled = false

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream
        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx

        const source = audioCtx.createMediaStreamSource(stream)
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.6
        source.connect(analyser)

        // 用类型断言绕开 TS lib 里 Uint8Array<ArrayBuffer> 与
        // Uint8Array<ArrayBufferLike> 的严格不兼容问题
        dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>

        const tick = () => {
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
          const avg = sum / dataArray.length

          // 归一化到 0~1，80 是大致的"正常说话"音量上限
          const normalized = Math.min(avg / 80, 1)
          setLevel(normalized)

          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(err => {
        console.warn("无法获取麦克风音量:", err)
      })

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close().catch(() => {})
      streamRef.current = null
      audioCtxRef.current = null
    }
  }, [enabled])

  return level
}