export interface ArtStyle {
  theme: string
  background: string
  primaryColor: string
  secondaryColor: string
  elements: string[]
}

function fallbackStyle(style: ArtStyle): ArtStyle {

  const elements = [...(style.elements || [])]

  if (style.theme.includes("猫") && !elements.includes("cat")) {
    elements.push("cat")
  }

  if (style.theme.includes("森林") && !elements.includes("forest")) {
    elements.push("forest")
  }

  if (style.theme.includes("城市") && !elements.includes("city")) {
    elements.push("city")
  }

  if (style.theme.includes("赛博") && !elements.includes("neon")) {
    elements.push("neon")
  }

  return {
    ...style,
    elements
  }
}

export function generateArtOnCanvas(
  canvas: HTMLCanvasElement,
  style: ArtStyle
) {

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height

  ctx.clearRect(0, 0, W, H)

  // ✅ 背景
  ctx.fillStyle = style.background || "#1e293b"
  ctx.fillRect(0, 0, W, H)

  // ✅ 主元素
  if (style.elements.includes("cat")) {
    ctx.strokeStyle = style.primaryColor || "#facc15"
    ctx.lineWidth = 4

    ctx.beginPath()
    ctx.arc(W/2, H/2, 60, 0, Math.PI*2)
    ctx.stroke()
  }

  if (style.elements.includes("city")) {
    ctx.fillStyle = style.primaryColor || "#3b82f6"

    for (let i = 0; i < 8; i++) {
      ctx.fillRect(
        Math.random()*W,
        H/2,
        30 + Math.random()*40,
        150 + Math.random()*80
      )
    }
  }

  if (style.elements.includes("neon")) {
    ctx.strokeStyle = style.secondaryColor || "#a855f7"
    ctx.lineWidth = 2

    for (let i = 0; i < 10; i++) {
      ctx.beginPath()
      ctx.moveTo(Math.random()*W, Math.random()*H)
      ctx.lineTo(Math.random()*W, Math.random()*H)
      ctx.stroke()
    }

    if (style.elements.includes("forest")) {
  ctx.fillStyle = "#14532d"
  ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = "#166534"
    ctx.fillRect(Math.random()*W, H/2, 20, 200)
  }
}
  }
}