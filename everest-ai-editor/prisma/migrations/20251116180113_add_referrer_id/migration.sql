-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phoneNumber" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "hasSubscription" BOOLEAN NOT NULL DEFAULT false,
    "tokensType1" INTEGER NOT NULL DEFAULT 10,
    "tokensType2" INTEGER NOT NULL DEFAULT 100,
    "tokensType3" INTEGER NOT NULL DEFAULT 0,
    "usedTokensType1" INTEGER NOT NULL DEFAULT 0,
    "usedTokensType2" INTEGER NOT NULL DEFAULT 0,
    "usedTokensType3" INTEGER NOT NULL DEFAULT 0,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT,
    "referrerId" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    CONSTRAINT "User_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "email", "emailVerified", "firstName", "hasSubscription", "id", "ipAddress", "lastName", "password", "phoneNumber", "referralCode", "role", "telegramId", "telegramUsername", "tokensType1", "tokensType2", "tokensType3", "updatedAt", "usedTokensType1", "usedTokensType2", "usedTokensType3", "username") SELECT "avatarUrl", "createdAt", "email", "emailVerified", "firstName", "hasSubscription", "id", "ipAddress", "lastName", "password", "phoneNumber", "referralCode", "role", "telegramId", "telegramUsername", "tokensType1", "tokensType2", "tokensType3", "updatedAt", "usedTokensType1", "usedTokensType2", "usedTokensType3", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
