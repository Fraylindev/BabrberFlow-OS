CREATE TABLE "EmailChannelControl" (
  "id" TEXT NOT NULL,
  "paused" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailChannelControl_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailChannelControl_channel_check" CHECK ("id" = 'EMAIL')
);
INSERT INTO "EmailChannelControl" ("id") VALUES ('EMAIL');
