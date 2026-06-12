import type { Command } from "./Command"
import { CommandExecutor } from "./CommandExecutor"
import { CommandHistory } from "./CommandHistory"

export class CommandQueue {

  private queue: Command[] = []
  private executor = new CommandExecutor()
  private history = new CommandHistory()
  private isProcessing = false

  /**
   * ✅ 外部统一入口
   */
  enqueue(command: Command) {

    // 撤销
    if (command.type === "undo") {
      this.undo()
      return
    }

    // 重做
    if (command.type === "redo") {
      this.redo()
      return
    }

    // 普通命令进入队列
    this.queue.push(command)
    this.process()
  }

  /**
   * ✅ 撤销
   */
  async undo() {
    const lastCommand = this.history.undo()
    if (lastCommand) {
      await this.executor.undo()   // ✅ 不再传参数
    }
  }

  /**
   * ✅ 重做
   */
  async redo() {
    const command = this.history.redo()
    if (command) {
      await this.executor.execute(command)
    }
  }

  /**
   * ✅ 顺序执行队列
   */
  private async process() {

    if (this.isProcessing) return
    this.isProcessing = true

    while (this.queue.length > 0) {

      const cmd = this.queue.shift()

      if (cmd) {

        await this.executor.execute(cmd)

        // 只记录可回退命令
        if (cmd.type === "draw" || cmd.type === "clear") {
          this.history.push(cmd)
        }
      }
    }

    this.isProcessing = false
  }
}