import {
  Canvas,
  Circle,
  Rect,
  Triangle,
  Ellipse,
  Polygon,
  Line,
  Text
} from "fabric"

import { getCanvas } from "../../components/Canvas/CanvasBoard"
import type { Command } from "./Command"

export class CommandExecutor {

  async execute(command: Command) {
    const canvas = getCanvas()
    if (!canvas) return

    switch (command.type) {

      case "draw":
        this.drawShape(command.payload, canvas)
        break

      case "clear":
        canvas.clear()
        canvas.backgroundColor = "#ffffff"
        break
    }

    canvas.renderAll()
  }

  async undo() {
    const canvas = getCanvas()
    if (!canvas) return

    const objects = canvas.getObjects()
    const last = objects[objects.length - 1]

    if (last) {
      canvas.remove(last)
    }

    canvas.renderAll()
  }

  private drawShape(payload: any, canvas: Canvas) {
    const { shape, color, left, top } = payload

    const centerX = left ?? canvas.getWidth() / 2
    const centerY = top ?? canvas.getHeight() / 2

    const common = {
      fill: color,
      left: centerX,
      top: centerY,
      originX: "center" as const,
      originY: "center" as const,
      selectable: false
    }

    switch (shape) {

      case "circle":
        canvas.add(new Circle({
          radius: 40,
          ...common
        }))
        break

      case "rect":
        canvas.add(new Rect({
          width: 100,
          height: 70,
          ...common
        }))
        break

      case "triangle":
        canvas.add(new Triangle({
          width: 80,
          height: 80,
          ...common
        }))
        break

      case "ellipse":
        canvas.add(new Ellipse({
          rx: 60,
          ry: 40,
          ...common
        }))
        break

      case "line":
        canvas.add(new Line(
          [centerX - 60, centerY, centerX + 60, centerY],
          { stroke: color, strokeWidth: 3 }
        ))
        break

      case "star":
        canvas.add(new Polygon(
          this.createStar(5, 40, 20),
          common
        ))
        break

      case "text":
        canvas.add(new Text("AI绘图", {
          fontSize: 28,
          ...common
        }))
        break
    }
  }

  private createStar(spikes: number, outer: number, inner: number) {
    const points = []
    const step = Math.PI / spikes

    for (let i = 0; i < 2 * spikes; i++) {
      const radius = i % 2 === 0 ? outer : inner
      const angle = i * step
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      })
    }

    return points
  }
}