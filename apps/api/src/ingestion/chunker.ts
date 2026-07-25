/**
 * 文本切片：按目标大小 + 重叠递归切分。
 *
 * 策略（兼顾简单与效果）：
 * 1. 优先按段落（\n\n）切，避免割裂语义
 * 2. 单段超长则按句子（。！？.!?）二次切分
 * 3. 句子仍超长则按字符硬切
 * 4. 合并相邻块直到接近 chunkSize，相邻块之间保留 overlap 重叠
 */

export interface Chunk {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
}

/** 将一段长文本切分为多个 Chunk */
export function splitText(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): Chunk[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  // 第一步：粗粒度切到段落 / 句子级
  const units: string[] = [];
  for (const para of clean.split(/\n\s*\n/)) {
    const p = para.trim();
    if (!p) continue;
    if (p.length <= chunkSize) {
      units.push(p);
      continue;
    }
    // 段落超长：按句子切分
    const sentences = p.split(/(?<=[。！？!?\.])\s*/);
    for (const s of sentences) {
      if (s.length <= chunkSize) {
        units.push(s);
      } else {
        // 句子仍超长：按字符硬切
        for (let i = 0; i < s.length; i += chunkSize) {
          units.push(s.slice(i, i + chunkSize));
        }
      }
    }
  }

  // 第二步：贪心合并 + overlap
  const chunks: Chunk[] = [];
  let buf = '';
  let idx = 0;
  for (const unit of units) {
    // 当前块还能塞下 unit → 合并
    if (buf.length + unit.length + 1 <= chunkSize) {
      buf = buf ? `${buf}\n${unit}` : unit;
      continue;
    }
    // 放不下：先把 buf 存为一块
    if (buf) {
      chunks.push({ content: buf, chunkIndex: idx++, pageNumber: null });
      // overlap：取 buf 末尾作为下一块的起点
      buf = chunkOverlap > 0 ? buf.slice(-chunkOverlap) : '';
    }
    buf = buf ? `${buf}\n${unit}` : unit;
    // unit 自身超长（> chunkSize）时直接成块
    if (buf.length >= chunkSize) {
      chunks.push({ content: buf, chunkIndex: idx++, pageNumber: null });
      buf = chunkOverlap > 0 ? buf.slice(-chunkOverlap) : '';
    }
  }
  if (buf) {
    chunks.push({ content: buf, chunkIndex: idx++, pageNumber: null });
  }
  return chunks;
}
