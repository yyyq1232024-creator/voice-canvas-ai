import type { Command } from "./Command"

export class CommandHistory {

  private undoStack: Command[] = []
  private redoStack: Command[] = []

  push(command: Command) {
    this.undoStack.push(command)
    this.redoStack = []
  }

  undo(): Command | null {
    const command = this.undoStack.pop()
    if (!command) return null

    this.redoStack.push(command)
    return command
  }

  redo(): Command | null {
    const command = this.redoStack.pop()
    if (!command) return null

    this.undoStack.push(command)
    return command
  }
}