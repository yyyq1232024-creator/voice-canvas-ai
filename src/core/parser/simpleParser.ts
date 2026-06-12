import { v4 as uuid } from "uuid"
import type { Command } from "../command/Command"
import { resolvePosition } from "./positionResolver"

export function parseTextToCommands(text: string): Command[] {
  if (!text) return []

  const commands: Command[] = []

  // ✅ 支持连续语句
  const segments = text.split(/然后|再|接着/)

  for (const segment of segments) {

    const trimmed = segment.trim()
    if (!trimmed) continue

    // ======================
    // 撤销
    // ======================
    if (trimmed.includes("撤销")) {
      commands.push({
        id: uuid(),
        type: "undo"
      })
      continue
    }

    // ======================
    // 重做
    // ======================
    if (trimmed.includes("重做")) {
      commands.push({
        id: uuid(),
        type: "redo"
      })
      continue
    }

    // ======================
    // 清空
    // ======================
    if (trimmed.includes("清空")) {
      commands.push({
        id: uuid(),
        type: "clear"
      })
      continue
    }

    // ======================
    // 绘图
    // ======================
    if (trimmed.includes("画")) {

      let shape = ""
      let color = "black"

      // ✅ 必须严格匹配，防止圆形匹配到矩形

      if (trimmed.includes("圆形") || trimmed.includes("圆")) {
        shape = "circle"
      }
      else if (trimmed.includes("矩形") || trimmed.includes("长方形")) {
        shape = "rect"
      }
      else if (trimmed.includes("三角形") || trimmed.includes("三角")) {
        shape = "triangle"
      }
      else if (trimmed.includes("椭圆")) {
        shape = "ellipse"
      }
      else if (trimmed.includes("星")) {
        shape = "star"
      }
      else if (trimmed.includes("线")) {
        shape = "line"
      }
      else if (trimmed.includes("字") || trimmed.includes("文字")) {
        shape = "text"
      }

      if (!shape) continue

      // ✅ 颜色识别

      if (trimmed.includes("红")) color = "red"
      else if (trimmed.includes("蓝")) color = "blue"
      else if (trimmed.includes("绿")) color = "green"
      else if (trimmed.includes("黄")) color = "yellow"
      else if (trimmed.includes("黑")) color = "black"
      else if (trimmed.includes("紫")) color = "purple"
      else if (trimmed.includes("橙")) color = "orange"
      else if (trimmed.includes("白")) color = "white"

      // ✅ 位置解析
      const position = resolvePosition(trimmed, 800, 600)

      commands.push({
        id: uuid(),
        type: "draw",
        payload: {
          shape,
          color,
          left: position.left,
          top: position.top
        }
      })
    }
  }

  return commands
}