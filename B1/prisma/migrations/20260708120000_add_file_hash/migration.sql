-- AlterTable
ALTER TABLE "File" ADD COLUMN "hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "File_hash_key" ON "File"("hash");
