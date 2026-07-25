-- AlterTable
ALTER TABLE "users" ADD COLUMN     "llm_api_key" TEXT,
ADD COLUMN     "llm_base_url" TEXT,
ADD COLUMN     "llm_chat_model" TEXT,
ADD COLUMN     "llm_embedding_model" TEXT;
