-- CreateTable
CREATE TABLE "words" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "phoneticUs" TEXT NOT NULL,
    "phoneticUk" TEXT NOT NULL,
    "chineseDefinition" TEXT NOT NULL,
    "englishDefinition" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "audioUs" TEXT,
    "audioUk" TEXT,
    "antonyms" TEXT NOT NULL DEFAULT '[]',
    "sentences" TEXT NOT NULL,
    "synonyms" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" DATETIME,
    "reviewCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "wordIds" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "length" TEXT NOT NULL,
    "translations" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "apiKey" TEXT,
    "baseURL" TEXT,
    "model" TEXT,
    "apiProvider" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "dialogues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scene" TEXT NOT NULL,
    "topic" TEXT,
    "content" TEXT NOT NULL,
    "wordIds" TEXT NOT NULL,
    "words" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "words_word_key" ON "words"("word");

