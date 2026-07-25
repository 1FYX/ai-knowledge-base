import { Logger } from '@nestjs/common';

const logger = new Logger('LlmError');

/**
 * 把 LLM 调用错误翻译成对用户友好的中文消息。
 * 统一在 LlmService / IngestionService / ChatService / SearchService 出口调用。
 *
 * 设计原则：
 * - 永远不让 OpenAI SDK 的原始英文/技术串直接暴露给用户
 * - 区分鉴权、网络、模型、限流等常见类型，给出可操作的修正建议
 * - 未知错误兜底为"AI 服务暂不可用"，并记录完整 error 供排查
 */
export function describeLlmError(err: unknown): string {
  // OpenAI SDK 错误对象通常有 status / error.code / error.message
  const anyErr = err as any;
  const status = anyErr?.status ?? anyErr?.response?.status;
  const apiMessage: string = anyErr?.error?.message ?? anyErr?.message ?? '';
  const apiCode: string = anyErr?.error?.code ?? anyErr?.code ?? '';

  // 1. 鉴权失败
  if (status === 401 || /auth/i.test(apiMessage) || apiCode === 'invalid_api_key') {
    return 'AI 服务鉴权失败：API Key 无效或已过期，请在设置页检查。';
  }

  // 2. 端点/模型不存在（DeepSeek 无 embedding 接口就是这种）
  if (status === 404) {
    // 区分 embedding 还是 chat（调用方可在 message 里带提示）
    if (/embedding/i.test(apiMessage) || anyErr?._op === 'embedding') {
      return '当前 AI 服务不支持 Embedding 接口（如 DeepSeek 仅有 Chat 能力）。请在设置页更换为支持 embedding 的模型，如 OpenAI 的 text-embedding-3-small。';
    }
    return 'AI 服务接口未找到（404）：请检查设置页的 Base URL 是否正确（OpenAI 兼容端点需以 /v1 结尾），以及模型名是否在该服务下存在。';
  }

  // 3. 模型不存在 / 参数错
  if (status === 400 || /model_not_found|does not exist/i.test(apiMessage)) {
    return `模型不可用：${anyErr?._modelHint || '请检查设置页配置的模型名是否正确'}。`;
  }

  // 4. 限流
  if (status === 429) {
    return 'AI 服务请求过于频繁或额度不足（429），请稍后再试或检查账户余额。';
  }

  // 5. 服务端错误
  if (status >= 500) {
    return `AI 服务暂时不可用（${status}），请稍后重试。`;
  }

  // 6. 网络错误（fetch failed / ENOTFOUND / timeout）
  if (anyErr?.code === 'ENOTFOUND' || anyErr?.code === 'ECONNREFUSED') {
    return '无法连接 AI 服务：请检查网络或设置页的 Base URL 是否可达。';
  }
  if (anyErr?.name === 'APIConnectionError' || /fetch failed|network/i.test(apiMessage)) {
    return '连接 AI 服务失败：网络异常或 Base URL 不可达。';
  }
  if (anyErr?.name === 'APITimeoutError' || /timeout/i.test(apiMessage)) {
    return 'AI 服务响应超时，请稍后重试。';
  }

  // 7. 兜底
  logger.error(`未分类的 LLM 错误：${JSON.stringify({ status, apiMessage, apiCode, name: anyErr?.name })}`);
  return 'AI 服务调用失败，请稍后重试或在设置页检查配置。';
}
