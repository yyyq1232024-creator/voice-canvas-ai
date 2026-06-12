import { useEffect, useRef } from "react"
import { Canvas } from "fabric"

let canvasInstance: Canvas | null = null

export const getCanvas = () => canvasInstance

export default function CanvasBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    canvasInstance = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
      selection: false
    })

    return () => {
      canvasInstance?.dispose()
      canvasInstance = null
    }
  }, [])

  return <canvas ref={canvasRef} />
}