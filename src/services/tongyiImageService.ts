const API_BASE = "https://dashscope.aliyuncs.com/api/v1"
const API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY as string
 
export interface GenerateImageOptions {
  prompt: string          // 英文 prompt（经过 LLM 优化后传入）
  negativePrompt?: string // 负面提示词
  size?: "1024*1024" | "720*1280" | "1280*720"
  n?: 1 | 2 | 3 | 4      // 生成数量
}
 
export interface GenerateImageResult {
  imageUrl: string
  taskId: string
}
 
// ─── 第一步：提交异步任务 ──────────────────────────────────────────────────
async function submitTask(options: GenerateImageOptions): Promise<string> {
  const res = await fetch(`${API_BASE}/services/aigc/text2image/image-synthesis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      "X-DashScope-Async": "enable",    // ⚠️ 必须启用异步，否则超时
    },
    body: JSON.stringify({
      model: "wanx-v1",
      input: {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt ?? "blurry, deformed, ugly, bad anatomy, watermark, text",
      },
      parameters: {
        style: "<auto>",
        size: options.size ?? "1024*1024",
        n: options.n ?? 1,
        seed: Math.floor(Math.random() * 9999999),
      }
    })
  })
 
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`提交任务失败: ${err.message ?? res.statusText}`)
  }
 
  const data = await res.json()
  const taskId = data.output?.task_id
 
  if (!taskId) throw new Error("未获取到 task_id，请检查 API Key 和 请求格式")
 
  return taskId
}
 
// ─── 第二步：轮询任务结果 ──────────────────────────────────────────────────
async function pollTaskResult(
  taskId: string,
  onProgress?: (status: string) => void
): Promise<string> {
  const MAX_ATTEMPTS = 30   // 最多轮询 30 次
  const INTERVAL_MS = 2000  // 每 2 秒查一次
 
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await sleep(INTERVAL_MS)
 
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    })
 
    if (!res.ok) continue
 
    const data = await res.json()
    const status = data.output?.task_status
 
    onProgress?.(status)
 
    if (status === "SUCCEEDED") {
      const imageUrl = data.output?.results?.[0]?.url
      if (!imageUrl) throw new Error("任务成功但未返回图片 URL")
      return imageUrl
    }
 
    if (status === "FAILED") {
      throw new Error(`任务失败: ${data.output?.message ?? "未知错误"}`)
    }
 
    // PENDING / RUNNING 继续轮询
  }
 
  throw new Error("生成超时，请重试")
}
 
// ─── 主函数：提交 + 轮询 ──────────────────────────────────────────────────
export async function generateImageFromPrompt(
  options: GenerateImageOptions,
  onProgress?: (status: string) => void
): Promise<GenerateImageResult> {
  onProgress?.("提交任务中...")
  const taskId = await submitTask(options)
 
  onProgress?.("生成中...")
  const imageUrl = await pollTaskResult(taskId, onProgress)
 
  return { imageUrl, taskId }
}
 
// ─── 工具 ──────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
 