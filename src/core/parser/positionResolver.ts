export interface Position {
  left: number
  top: number
}

export function resolvePosition(
  text: string,
  canvasWidth: number,
  canvasHeight: number
): Position {
  const margin = 50

  if (text.includes("左上")) {
    return { left: margin, top: margin }
  }

  if (text.includes("右上")) {
    return { left: canvasWidth - margin, top: margin }
  }

  if (text.includes("左下")) {
    return { left: margin, top: canvasHeight - margin }
  }

  if (text.includes("右下")) {
    return { left: canvasWidth - margin, top: canvasHeight - margin }
  }

  if (text.includes("中间") || text.includes("中央")) {
    return { left: canvasWidth / 2, top: canvasHeight / 2 }
  }

  // 默认随机位置
  return {
    left: Math.random() * canvasWidth,
    top: Math.random() * canvasHeight,
  }
}