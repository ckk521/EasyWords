-- CreateTable
CREATE TABLE "words" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "word" TEXT NOT NULL,
    "phoneticUs" TEXT NOT NULL DEFAULT '',
    "phoneticUk" TEXT NOT NULL DEFAULT '',
    "chineseDefinition" TEXT NOT NULL,
    "englishDefinition" TEXT NOT NULL DEFAULT '',
    "partOfSpeech" TEXT,
    "audioUs" TEXT,
    "audioUk" TEXT,
    "antonyms" TEXT NOT NULL DEFAULT '[]',
    "sentences" TEXT NOT NULL DEFAULT '[]',
    "synonyms" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" DATETIME,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "words_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "wordIds" TEXT NOT NULL DEFAULT '[]',
    "type" TEXT NOT NULL DEFAULT 'news',
    "length" TEXT NOT NULL DEFAULT 'medium',
    "translations" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "articles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "userId" TEXT,
    "scene" TEXT NOT NULL,
    "topic" TEXT,
    "content" TEXT NOT NULL DEFAULT '[]',
    "wordIds" TEXT NOT NULL DEFAULT '[]',
    "words" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dialogues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "speak_scenarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "difficultyLevels" TEXT NOT NULL DEFAULT 'beginner,intermediate,advanced',
    "systemPrompts" TEXT NOT NULL DEFAULT '{}',
    "openingLines" TEXT NOT NULL DEFAULT '{}',
    "learningGoals" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "speak_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "scenarioId" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "mode" TEXT NOT NULL DEFAULT 'press-to-talk',
    "wordIds" TEXT DEFAULT '[]',
    "messages" TEXT NOT NULL DEFAULT '[]',
    "feedback" TEXT,
    "duration" INTEGER,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "speak_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickname" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME,
    "expiresAt" DATETIME,
    "expiryMode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loginFailCount" INTEGER NOT NULL DEFAULT 0,
    "loginLockedUntil" DATETIME
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "user_module_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "vocabulary" BOOLEAN NOT NULL DEFAULT true,
    "reading" BOOLEAN NOT NULL DEFAULT true,
    "dialogue" BOOLEAN NOT NULL DEFAULT true,
    "speak" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_module_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "login_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "words_userId_idx" ON "words"("userId");

-- CreateIndex
CREATE INDEX "words_word_idx" ON "words"("word");

-- CreateIndex
CREATE UNIQUE INDEX "words_word_userId_key" ON "words"("word", "userId");

-- CreateIndex
CREATE INDEX "articles_userId_idx" ON "articles"("userId");

-- CreateIndex
CREATE INDEX "dialogues_userId_idx" ON "dialogues"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "speak_scenarios_name_key" ON "speak_scenarios"("name");

-- CreateIndex
CREATE INDEX "speak_scenarios_sortOrder_idx" ON "speak_scenarios"("sortOrder");

-- CreateIndex
CREATE INDEX "speak_conversations_userId_idx" ON "speak_conversations"("userId");

-- CreateIndex
CREATE INDEX "speak_conversations_startedAt_idx" ON "speak_conversations"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_module_permissions_userId_key" ON "user_module_permissions"("userId");

-- CreateIndex
CREATE INDEX "login_logs_userId_idx" ON "login_logs"("userId");

-- CreateIndex
CREATE INDEX "login_logs_createdAt_idx" ON "login_logs"("createdAt");

-- CreateIndex
CREATE INDEX "user_activities_userId_idx" ON "user_activities"("userId");

-- CreateIndex
CREATE INDEX "user_activities_createdAt_idx" ON "user_activities"("createdAt");

-- CreateIndex
CREATE INDEX "user_activities_action_idx" ON "user_activities"("action");
