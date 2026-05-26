-- =========================================================================
-- ZapFunil CRM - Supabase/PostgreSQL Database Schema Migration
-- =========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create helper function for automatically updating "updatedAt" timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create "Role" Table
CREATE TABLE "Role" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) UNIQUE NOT NULL,
    "permissions" JSONB
);

-- Seed Initial Roles
INSERT INTO "Role" ("name", "permissions") VALUES
('ADMIN', '{"all": true}'::jsonb),
('SUPERVISOR', '{"all": false, "read": true, "write": true, "delete": false}'::jsonb),
('ATTENDANT', '{"all": false, "read": true, "write": true, "delete": false}'::jsonb)
ON CONFLICT ("name") DO NOTHING;

-- 4. Create "User" Table
CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "roleId" UUID NOT NULL REFERENCES "Role"("id") ON DELETE RESTRICT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Create "Session" Table (WhatsApp API Session)
CREATE TABLE "Session" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "phoneNumber" VARCHAR(50),
    "status" VARCHAR(50) DEFAULT 'OFFLINE' NOT NULL, -- ONLINE, OFFLINE, CONNECTING, QR_PENDING
    "wahaSessionName" VARCHAR(255) UNIQUE NOT NULL,
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Create "Funnel" Table
CREATE TABLE "Funnel" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Create "FunnelStage" Table
CREATE TABLE "FunnelStage" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "funnelId" UUID NOT NULL REFERENCES "Funnel"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL
);

-- 8. Create "Contact" Table
CREATE TABLE "Contact" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) UNIQUE NOT NULL,
    "company" VARCHAR(255),
    "email" VARCHAR(255),
    "city" VARCHAR(255),
    "state" VARCHAR(255),
    "notes" TEXT,
    "origin" VARCHAR(255),
    "status" VARCHAR(50) DEFAULT 'LEAD' NOT NULL, -- LEAD, frio, morno, quente, fechado, etc.
    "customFields" JSONB,
    "funnelStageId" UUID REFERENCES "FunnelStage"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Create "Conversation" Table
CREATE TABLE "Conversation" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "contactId" UUID NOT NULL REFERENCES "Contact"("id") ON DELETE CASCADE,
    "sessionId" UUID NOT NULL REFERENCES "Session"("id") ON DELETE CASCADE,
    "unreadCount" INTEGER DEFAULT 0 NOT NULL,
    "lastMessage" TEXT,
    "lastActivity" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. Create "Message" Table
CREATE TABLE "Message" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "conversationId" UUID NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
    "type" VARCHAR(50) DEFAULT 'TEXT' NOT NULL, -- TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT
    "content" TEXT,
    "hasMedia" BOOLEAN DEFAULT FALSE NOT NULL,
    "mediaUrl" TEXT,
    "isFromMe" BOOLEAN DEFAULT FALSE NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" VARCHAR(50) DEFAULT 'SENT' NOT NULL -- SENT, DELIVERED, READ
);

-- 11. Create "CustomField" Table (Definition for flexible contact properties)
CREATE TABLE "CustomField" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL, -- text, number, select, date
    "options" JSONB, -- Array of options if type is 'select'
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 12. Create "Tag" Table
CREATE TABLE "Tag" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) UNIQUE NOT NULL,
    "color" VARCHAR(50) NOT NULL
);

-- 13. Create "ContactTag" Join Table (N:M relation)
CREATE TABLE "ContactTag" (
    "contactId" UUID NOT NULL REFERENCES "Contact"("id") ON DELETE CASCADE,
    "tagId" UUID NOT NULL REFERENCES "Tag"("id") ON DELETE CASCADE,
    PRIMARY KEY ("contactId", "tagId")
);

-- 14. Create "Task" Table
CREATE TABLE "Task" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(50) DEFAULT 'PENDING' NOT NULL, -- PENDING, COMPLETED, etc.
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "contactId" UUID REFERENCES "Contact"("id") ON DELETE SET NULL
);

-- 15. Create "Note" Table
CREATE TABLE "Note" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "content" TEXT NOT NULL,
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "contactId" UUID NOT NULL REFERENCES "Contact"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 16. Create "AudioTranscription" Table (1:1 with Message)
CREATE TABLE "AudioTranscription" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "messageId" UUID UNIQUE NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 17. Create "MessageTemplate" Table (Additional frontend template helper)
CREATE TABLE "MessageTemplate" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL, -- TEXT, IMAGE, VIDEO, PDF, AUDIO
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 18. Create "ScheduledMessage" Table (Additional messaging schedule)
CREATE TABLE "ScheduledMessage" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "contactId" UUID NOT NULL REFERENCES "Contact"("id") ON DELETE CASCADE,
    "type" VARCHAR(50) NOT NULL, -- TEXT, IMAGE, VIDEO, PDF, AUDIO, POLL, CHOICE
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "pollOptions" JSONB,
    "scheduledFor" TIMESTAMP WITH TIME ZONE NOT NULL,
    "recurrence" VARCHAR(50) DEFAULT 'NONE' NOT NULL, -- NONE, DAILY, WEEKLY, MONTHLY
    "status" VARCHAR(50) DEFAULT 'PENDING' NOT NULL, -- PENDING, SENT, FAILED
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- 19. Configure Triggers for Automatically Updating "updatedAt"
-- =========================================================================

CREATE TRIGGER update_user_updated_at 
    BEFORE UPDATE ON "User" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_updated_at 
    BEFORE UPDATE ON "Session" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_updated_at 
    BEFORE UPDATE ON "Contact" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customfield_updated_at 
    BEFORE UPDATE ON "CustomField" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messagetemplate_updated_at 
    BEFORE UPDATE ON "MessageTemplate" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduledmessage_updated_at 
    BEFORE UPDATE ON "ScheduledMessage" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 20. Indexes for Performance Optimization
-- =========================================================================

CREATE INDEX idx_user_email ON "User"("email");
CREATE INDEX idx_user_roleid ON "User"("roleId");
CREATE INDEX idx_session_userid ON "Session"("userId");
CREATE INDEX idx_session_wahasessionname ON "Session"("wahaSessionName");
CREATE INDEX idx_contact_phone ON "Contact"("phone");
CREATE INDEX idx_contact_funnelstageid ON "Contact"("funnelStageId");
CREATE INDEX idx_funnelstage_funnelid ON "FunnelStage"("funnelId");
CREATE INDEX idx_conversation_contactid ON "Conversation"("contactId");
CREATE INDEX idx_conversation_sessionid ON "Conversation"("sessionId");
CREATE INDEX idx_conversation_lastactivity ON "Conversation"("lastActivity" DESC);
CREATE INDEX idx_message_conversationid ON "Message"("conversationId");
CREATE INDEX idx_message_timestamp ON "Message"("timestamp" DESC);
CREATE INDEX idx_task_userid ON "Task"("userId");
CREATE INDEX idx_task_contactid ON "Task"("contactId");
CREATE INDEX idx_note_contactid ON "Note"("contactId");
CREATE INDEX idx_scheduledmessage_scheduledfor ON "ScheduledMessage"("scheduledFor");
CREATE INDEX idx_scheduledmessage_status ON "ScheduledMessage"("status");

-- =========================================================================
-- 21. Row Level Security (RLS) Configuration for "CustomField"
-- =========================================================================
-- Como a aplicação utiliza a API do Supabase de forma anônima e possui controle de
-- autenticação próprio, desativamos o RLS ou habilitamos acesso público total.
ALTER TABLE "CustomField" DISABLE ROW LEVEL SECURITY;

