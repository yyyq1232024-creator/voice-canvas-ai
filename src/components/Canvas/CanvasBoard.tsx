import { useRef, useEffect, useCallback, useState } from "react"
 
interface Props {
  imageUrl?: string       // 来自通义万相的图片 URL
  width?: number
  height?: number
}
 
export default function CanvasBoard({ imageUrl, width = 1024, height = 1024 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(false)
 
  const drawImage = useCallback(async (url: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
 
    const ctx = canvas.getContext("2d")
    if (!ctx) return
 
    setLoading(true)
 
    try {
      // 通义万相返回的 URL 可能有 CORS 限制，通过后端代理转发更稳定
      // 如果直接能加载就直接用，否则走 /api/proxy-image
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = url
 
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error("图片加载失败，可能需要后端代理"))
      })
 
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    } catch (err) {
      console.error(err)
      // 降级：在 Canvas 上显示错误文字
      const ctx2 = canvas.getContext("2d")
      if (ctx2) {
        ctx2.fillStyle = "#1e293b"
        ctx2.fillRect(0, 0, canvas.width, canvas.height)
        ctx2.fillStyle = "#ef4444"
        ctx2.font = "20px sans-serif"
        ctx2.textAlign = "center"
        ctx2.fillText("图片加载失败 — 请检查网络或后端代理", canvas.width / 2, canvas.height / 2)
      }
    } finally {
      setLoading(false)
    }
  }, [])
 
  useEffect(() => {
    if (imageUrl) drawImage(imageUrl)
  }, [imageUrl, drawImage])
 
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: "1px solid #334155",
          borderRadius: 12,
          maxWidth: "100%",
          display: "block",
        }}
      />
      {loading && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.5)", borderRadius: 12, color: "#fff", fontSize: 16
        }}>
          加载图片中...
        </div>
      )}
    </div>
  )
}