import express from "express"
import cors from "cors"
import dotenv from "dotenv"
 
dotenv.config()
 
const app = express()
app.use(cors())
app.use(express.json())
 
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY
const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1"
 
// 调试：确认 Key 是否正确读取（启动时打印一次，正常运行后可删除）
console.log("DASHSCOPE_API_KEY 长度:", DASHSCOPE_API_KEY?.length ?? "undefined")
console.log("DASHSCOPE_API_KEY 前缀:", DASHSCOPE_API_KEY?.slice(0, 10) ?? "undefined")
 
// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────
 
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Step 1：用通义千问把中文口语转成英文画图 prompt
// ─────────────────────────────────────────────────────────────────────────────
 
async function optimizePrompt(chineseText) {
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/text-generation/generation`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-turbo",
      input: {
        messages: [
          {
            role: "system",
            content: `You are a professional AI image prompt engineer.
Convert the user's Chinese voice command into a high-quality English prompt for Tongyi Wanxiang (通义万相).
 
Output format (strictly follow this, no extra text):
POSITIVE: <detailed English prompt with style, lighting, mood, quality boosters>
NEGATIVE: <things to avoid>
 
Style mapping:
- 油画 → oil painting style, rich impasto brushwork, textured canvas
- 水彩 → watercolor style, soft translucent washes, wet-on-wet technique  
- 动漫/二次元 → anime style, cel shading, vibrant colors, clean lines
- 赛博朋克/霓虹 → cyberpunk, neon lights, rain-slicked streets, dystopian city at night
- 写实/照片 → photorealistic, natural lighting, Canon EOS R5, 85mm lens
- 素描 → pencil sketch, graphite, fine cross-hatching, white paper
 
Always append to POSITIVE: "highly detailed, 8K resolution, masterpiece, professional"
Always use for NEGATIVE: "blurry, deformed, ugly, bad anatomy, extra limbs, watermark, text, signature, low quality"
 
Example:
User: 帮我画一只在森林里的橘色猫咪，动漫风格
POSITIVE: An orange tabby cat sitting in a mystical forest, anime style, cel shading, vibrant green foliage, dappled sunlight filtering through leaves, soft shadows, highly detailed, 8K resolution, masterpiece, professional
NEGATIVE: blurry, deformed, ugly, bad anatomy, extra limbs, watermark, text, signature, low quality`
          },
          {
            role: "user",
            content: chineseText
          }
        ]
      },
      parameters: {
        result_format: "message",
        max_tokens: 300,
        temperature: 0.7,
      }
    })
  })
 
  if (!res.ok) {
    throw new Error(`通义千问调用失败: ${res.status} ${res.statusText}`)
  }
 
  const data = await res.json()
  const raw = data.output?.choices?.[0]?.message?.content ?? ""
 
  // 解析 POSITIVE / NEGATIVE
  const positiveMatch = raw.match(/POSITIVE:\s*(.+?)(?=NEGATIVE:|$)/si)
  const negativeMatch = raw.match(/NEGATIVE:\s*(.+?)$/si)
 
  const positive = positiveMatch?.[1]?.trim() ?? raw.trim()
  const negative = negativeMatch?.[1]?.trim() ?? "blurry, deformed, ugly, bad anatomy, watermark, text, low quality"
 
  return { positive, negative }
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Step 2：提交通义万相异步任务
// ─────────────────────────────────────────────────────────────────────────────
 
async function submitWanxiangTask(positivePrompt, negativePrompt, size = "1024*1024") {
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",   // 必须开启异步
    },
    body: JSON.stringify({
      model: "wanx-v1",
      input: {
        prompt: positivePrompt,
        negative_prompt: negativePrompt,
      },
      parameters: {
        style: "<auto>",
        size,
        n: 1,
        seed: Math.floor(Math.random() * 9999999),
      }
    })
  })
 
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`提交万相任务失败: ${err.message ?? res.statusText}`)
  }
 
  const data = await res.json()
  const taskId = data.output?.task_id
 
  if (!taskId) {
    throw new Error("未获取到 task_id，请检查 API Key 是否有通义万相权限")
  }
 
  return taskId
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Step 3：轮询任务结果
// ─────────────────────────────────────────────────────────────────────────────
 
async function pollTaskResult(taskId) {
  const MAX_ATTEMPTS = 30    // 最多等 60 秒
  const INTERVAL_MS  = 2000  // 每 2 秒查一次
 
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await sleep(INTERVAL_MS)
 
    const res = await fetch(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: { "Authorization": `Bearer ${DASHSCOPE_API_KEY}` }
    })
 
    if (!res.ok) continue
 
    const data = await res.json()
    const status = data.output?.task_status
 
    if (status === "SUCCEEDED") {
      const imageUrl = data.output?.results?.[0]?.url
      if (!imageUrl) throw new Error("任务成功但未返回图片 URL")
      return imageUrl
    }
 
    if (status === "FAILED") {
      throw new Error(`万相任务失败: ${data.output?.message ?? "未知原因"}`)
    }
 
    // PENDING / RUNNING → 继续等待
    console.log(`[万相] 轮询第 ${i + 1} 次，状态: ${status}`)
  }
 
  throw new Error("生成超时（超过 60 秒），请重试")
}
 
// ─────────────────────────────────────────────────────────────────────────────
// 路由 1：/generate — 主入口（原有路由升级，前端路径不变）
// ─────────────────────────────────────────────────────────────────────────────
 
app.post("/generate", async (req, res) => {
  const { prompt } = req.body
 
  if (!prompt?.trim()) {
    return res.status(400).json({ error: "prompt 不能为空" })
  }
 
  if (!DASHSCOPE_API_KEY) {
    return res.status(500).json({ error: "服务器未配置 DASHSCOPE_API_KEY" })
  }
 
  try {
    // Step 1: LLM 优化提示词
    console.log(`[generate] 原始指令: ${prompt}`)
    const { positive, negative } = await optimizePrompt(prompt)
    console.log(`[generate] 优化后 prompt: ${positive}`)
 
    // Step 2: 提交画图任务
    const taskId = await submitWanxiangTask(positive, negative)
    console.log(`[generate] 任务 ID: ${taskId}`)
 
    // Step 3: 轮询结果
    const imageUrl = await pollTaskResult(taskId)
    console.log(`[generate] 生成完成: ${imageUrl}`)
 
    res.json({
      imageUrl,           // 通义万相返回的图片 URL
      optimizedPrompt: positive,   // 方便前端展示调试信息
      taskId,
    })
 
  } catch (err) {
    console.error("[generate] 错误:", err.message)
    res.status(500).json({ error: err.message ?? "生成失败" })
  }
})
 
// ─────────────────────────────────────────────────────────────────────────────
// 路由 2：/proxy-image — 图片代理（解决前端 CORS 加载问题）
// ─────────────────────────────────────────────────────────────────────────────
 
app.get("/proxy-image", async (req, res) => {
  const { url } = req.query
 
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "缺少 url 参数" })
  }
 
  // 只代理阿里云域名，防止被滥用
  const isAliyun = url.includes("aliyuncs.com") || url.includes("tongyi.aliyun.com")
  if (!isAliyun) {
    return res.status(403).json({ error: "只允许代理阿里云域名" })
  }
 
  try {
    const upstream = await fetch(url)
 
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "图片请求失败" })
    }
 
    const contentType = upstream.headers.get("content-type") ?? "image/png"
    res.setHeader("Content-Type", contentType)
    res.setHeader("Cache-Control", "public, max-age=86400")
    res.setHeader("Access-Control-Allow-Origin", "*")
 
    // Node 18+ 内置 fetch 的 body 是 Web Stream，不支持 .pipe()，用 arrayBuffer 转发
    const buffer = await upstream.arrayBuffer()
    res.end(Buffer.from(buffer))
 
  } catch (err) {
    console.error("[proxy-image] 错误:", err.message)
    res.status(500).json({ error: "代理失败" })
  }
})
 
// ─────────────────────────────────────────────────────────────────────────────
// 启动
// ─────────────────────────────────────────────────────────────────────────────
 
app.listen(3001, () => {
  console.log("Server running on http://localhost:3001")
})
 