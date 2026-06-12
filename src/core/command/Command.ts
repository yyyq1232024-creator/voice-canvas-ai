export interface Command {
  id: string
  type: "draw" | "delete" | "clear" | "undo" | "redo"
  payload?: any
}