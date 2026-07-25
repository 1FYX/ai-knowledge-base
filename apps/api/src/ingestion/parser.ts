import { readFile } from 'fs/promises';

/**
 * 文件解析：把上传的原始文件（PDF/DOCX/TXT/MD）提取为纯文本。
 * 按 mime / 扩展名分发到不同解析器。
 *
 * 解析能力：
 * - PDF：pdf-parse（基于 pdf.js，提取纯文本）
 * - DOCX：mammoth（基于 OOXML，提取纯文本）
 * - TXT / MD：直接读取 UTF-8
 *
 * 不支持 scanned PDF（图片型 PDF 无文本层），会返回空文本。
 */

export interface ParseResult {
  text: string;
  pageCount: number | null;
}

export async function parseFile(
  filePath: string,
  mimeType: string,
  originalName: string,
): Promise<ParseResult> {
  const ext = originalName.toLowerCase().split('.').pop() || '';

  // PDF
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return parsePdf(filePath);
  }
  // DOCX
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    return parseDocx(filePath);
  }
  // 纯文本类
  if (
    mimeType.startsWith('text/') ||
    ['txt', 'md', 'markdown'].includes(ext)
  ) {
    const buf = await readFile(filePath, 'utf-8');
    return { text: buf, pageCount: null };
  }

  throw new Error(`不支持的文件类型：${mimeType || ext}`);
}

async function parsePdf(filePath: string): Promise<ParseResult> {
  // pdf-parse 用 export = 导出（CommonJS 风格），用 require 拿到函数本身
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse');
  const buf = await readFile(filePath);
  const data = await pdfParse(buf);
  return {
    text: data.text || '',
    pageCount: data.numpages ?? null,
  };
}

async function parseDocx(filePath: string): Promise<ParseResult> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ path: filePath });
  return { text: value || '', pageCount: null };
}
