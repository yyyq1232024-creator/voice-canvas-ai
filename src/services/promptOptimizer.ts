const QWEN_API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY as string
 
// ─── system prompt：核心指令 ───────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a professional AI image prompt engineer.
The user will give you a Chinese voice command (casual spoken language).
Your job is to convert it into a high-quality English image generation prompt for Tongyi Wanxiang (通义万相).
 
Rules:
1. Output ONLY the English prompt. No explanations, no JSON, no extra text.
2. Always include: subject description, art style, lighting, mood, quality boosters.
3. Quality boosters to append: "highly detailed, 8K resolution, masterpiece, professional photography".
4. If the user mentions a style (e.g. 油画/赛博朋克/动漫), map it:
   - 油画 → oil painting style, rich texture, impasto brushwork
   - 水彩 → watercolor style, soft edges, translucent washes
   - 动漫/二次元 → anime style, cel shading, vibrant colors
   - 赛博朋克 → cyberpunk, neon lights, rain-slicked streets, dystopian city
   - 写实 → photorealistic, natural lighting, high detail
   - 素描 → pencil sketch, graphite, fine line work
5. Add negative elements hint as: NEGATIVE: <what to avoid>
 
Example:
User: "帮我画一只在森林里的橘色猫咪，动漫风格"
Output:
POSITIVE: An orange tabby cat sitting in a mystical forest, anime style, cel shading, vibrant green foliage, dappled sunlight, soft shadows, highly detailed, 8K resolution, masterpiece
NEGATIVE: blurry, deformed, ugly, extra limbs, watermark, text`
 
// ─── 主函数 ───────────────────────────────────────────────────────────────
export interface OptimizedPrompt {
  positive: string
  negative: string
  originalText: string
}
 
export async function optimizePrompt(
  chineseInstruction: string
): Promise<OptimizedPrompt> {
 
  // 调用通义千问（同一个 DashScope Key）
  const res = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen-turbo",   // 速度快、成本低，适合 prompt 转换
        input: {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: chineseInstruction }
          ]
        },
        parameters: {
          max_tokens: 300,
          temperature: 0.7,
          result_format: "message"
        }
      })
    }
  )
 
  if (!res.ok) {
    const err = await res.json()
    // 降级：直接把中文转成基础英文 prompt
    console.warn("LLM 优化失败，使用降级方案:", err)
    return fallbackPrompt(chineseInstruction)
  }
 
  const data = await res.json()
  const rawText: string = data.output?.choices?.[0]?.message?.content ?? ""
 
  return parsePromptOutput(rawText, chineseInstruction)
}
 
// ─── 解析 LLM 输出 ─────────────────────────────────────────────────────────
function parsePromptOutput(raw: string, original: string): OptimizedPrompt {
  const positiveMatch = raw.match(/POSITIVE:\s*(.+?)(?=NEGATIVE:|$)/si)
  const negativeMatch = raw.match(/NEGATIVE:\s*(.+?)$/si)
 
  const positive = positiveMatch?.[1]?.trim()
    ?? raw.trim()   // 如果没有标签就把整个输出当 positive
  const negative = negativeMatch?.[1]?.trim()
    ?? "blurry, deformed, ugly, bad anatomy, watermark, text, extra limbs"
 
  return { positive, negative, originalText: original }
}
 
// ─── 降级方案：无 LLM 时的简单映射 ──────────────────────────────────────────
function fallbackPrompt(text: string): OptimizedPrompt {
  const styleMap: Record<string, string> = {
    "油画": "oil painting style, rich brushwork",
    "水彩": "watercolor style, soft washes",
    "动漫": "anime style, cel shading",
    "二次元": "anime style, cel shading",
    "赛博朋克": "cyberpunk, neon lights, dystopian",
    "写实": "photorealistic, high detail",
    "素描": "pencil sketch, graphite drawing",
  }
 
  let styleTag = "digital art"
  for (const [cn, en] of Object.entries(styleMap)) {
    if (text.includes(cn)) { styleTag = en; break }
  }
 
  // 简单中英映射
  const translated = text
    .replace(/帮我画|画一个|画一只|画|请画/g, "")
    .replace(/猫/g, "cat").replace(/狗/g, "dog").replace(/森林/g, "forest")
    .replace(/城市/g, "city").replace(/山/g, "mountain").replace(/海/g, "ocean")
    .replace(/花/g, "flowers").replace(/人/g, "person").replace(/女孩/g, "girl")
    .replace(/男孩/g, "boy").replace(/夜晚/g, "night").replace(/白天/g, "daytime")
    .trim()
 
  return {
    positive: `${translated || "beautiful scene"}, ${styleTag}, highly detailed, 8K, masterpiece`,
    negative: "blurry, deformed, ugly, bad anatomy, watermark, text",
    originalText: text
  }
}
 