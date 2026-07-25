import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * AES-256-GCM 对称加解密：用于加密存储用户的 LLM API Key。
 *
 * 密钥来源：环境变量 LLM_CONFIG_ENCRYPTION_KEY（任意字符串，经 SHA-256 派生为 32 字节）。
 * 注意：这个 key 是项目自己的加解密口令，不是 OpenAI key；OpenAI key 由用户填写、加密后入库。
 *
 * 密文格式：base64(iv | ciphertext | authTag)，自包含、无需额外存盐。
 */

const ALGO = 'aes-256-gcm';

function deriveKey(): Buffer {
  const raw = process.env.LLM_CONFIG_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'LLM_CONFIG_ENCRYPTION_KEY is not set. Please define it in .env (any random string).',
    );
  }
  return createHash('sha256').update(raw).digest(); // 32 bytes
}

/** 加密明文，返回自包含的 base64 字符串 */
export function encrypt(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(12); // GCM 推荐 12 字节
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString('base64');
}

/** 解密 encrypt() 产生的密文；失败抛错 */
export function decrypt(payload: string): string {
  const key = deriveKey();
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < 12 + 16) throw new Error('Invalid ciphertext');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(12, buf.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
