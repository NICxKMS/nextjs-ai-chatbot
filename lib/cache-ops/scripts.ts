/**
 * Redis Lua Scripts for Atomic Cache Operations
 *
 * All scripts are designed for atomic execution to prevent race conditions.
 * Scripts use EVAL/EVALSHA for server-side execution.
 *
 * @module lib/cache-ops/scripts
 */

// ============================================================================
// CHAT OPERATIONS
// ============================================================================

/**
 * CREATE_CHAT_SCRIPT
 * Creates chat metadata + adds to user chat list atomically.
 *
 * KEYS: [metaKey, userChatsKey]
 * ARGV: [chatJSON, score(updatedAt), ttl]
 *
 * Returns: "OK" on success
 */
export const CREATE_CHAT_SCRIPT = `
-- Create chat metadata and add to user's chat list atomically
local metaKey = KEYS[1]
local userChatsKey = KEYS[2]
local chatJSON = ARGV[1]
local score = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

-- Parse chat to extract ID for user list
local chat = cjson.decode(chatJSON)
local chatId = chat.id

-- Set chat metadata
redis.call('SET', metaKey, chatJSON)
if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
end

-- Add to user's chat list (sorted by updatedAt timestamp)
redis.call('ZADD', userChatsKey, score, chatId)
if ttl > 0 then
  redis.call('EXPIRE', userChatsKey, ttl)
end

return "OK"
`;

/**
 * APPEND_MESSAGE_SCRIPT
 * Adds single message to chat ZSET + updates metadata version + updates user chat list position.
 *
 * KEYS: [metaKey, msgsKey, userChatsKey]
 * ARGV: [messageJSON, score, nowISO, ttl, chatId]
 *
 * Returns: New message count in ZSET
 */
export const APPEND_MESSAGE_SCRIPT = `
-- Append single message to chat and update metadata
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]
local messageJSON = ARGV[1]
local score = tonumber(ARGV[2])
local nowISO = ARGV[3]
local ttl = tonumber(ARGV[4])
local chatId = ARGV[5]

-- Get current metadata
local metaJSON = redis.call('GET', metaKey)
if not metaJSON then
  return redis.error_reply("CHAT_NOT_FOUND")
end

-- Update metadata version and updatedAt
local meta = cjson.decode(metaJSON)
meta.version = (meta.version or 0) + 1
meta.updatedAt = nowISO
redis.call('SET', metaKey, cjson.encode(meta))

-- Add message to sorted set (score = timestamp for ordering)
redis.call('ZADD', msgsKey, score, messageJSON)

-- Update chat position in user's chat list (move to top)
redis.call('ZADD', userChatsKey, score, chatId)

-- Apply TTL to all keys
if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
  redis.call('EXPIRE', msgsKey, ttl)
  redis.call('EXPIRE', userChatsKey, ttl)
end

return redis.call('ZCARD', msgsKey)
`;

/**
 * APPEND_MESSAGES_BULK_SCRIPT
 * Bulk add messages to chat ZSET.
 *
 * KEYS: [metaKey, msgsKey]
 * ARGV: [messagesJSON(array), scoresJSON(array), nowISO, ttl]
 *
 * Returns: New message count in ZSET
 */
export const APPEND_MESSAGES_BULK_SCRIPT = `
-- Bulk append messages to chat
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local messagesJSON = ARGV[1]
local scoresJSON = ARGV[2]
local nowISO = ARGV[3]
local ttl = tonumber(ARGV[4])

-- Get current metadata
local metaJSON = redis.call('GET', metaKey)
if not metaJSON then
  return redis.error_reply("CHAT_NOT_FOUND")
end

-- Parse messages and scores arrays
local messages = cjson.decode(messagesJSON)
local scores = cjson.decode(scoresJSON)

if #messages ~= #scores then
  return redis.error_reply("MESSAGES_SCORES_MISMATCH")
end

if #messages == 0 then
  return redis.call('ZCARD', msgsKey)
end

-- Update metadata version (increment once per operation, not per message)
local meta = cjson.decode(metaJSON)
meta.version = (meta.version or 0) + 1
meta.updatedAt = nowISO
redis.call('SET', metaKey, cjson.encode(meta))

-- Bulk ZADD with all messages
local zaddArgs = {}
for i, msg in ipairs(messages) do
  table.insert(zaddArgs, scores[i])
  -- If msg is already a string, use it; otherwise encode
  if type(msg) == "string" then
    table.insert(zaddArgs, msg)
  else
    table.insert(zaddArgs, cjson.encode(msg))
  end
end

redis.call('ZADD', msgsKey, unpack(zaddArgs))

-- Apply TTL
if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
  redis.call('EXPIRE', msgsKey, ttl)
end

return redis.call('ZCARD', msgsKey)
`;

/**
 * UPDATE_METADATA_SCRIPT
 * Atomic GET-modify-SET for chat metadata.
 *
 * KEYS: [metaKey]
 * ARGV: [updatesJSON, nowISO, ttl]
 *
 * Returns: Updated metadata JSON
 */
export const UPDATE_METADATA_SCRIPT = `
-- Atomic read-modify-write for chat metadata
local metaKey = KEYS[1]
local updatesJSON = ARGV[1]
local nowISO = ARGV[2]
local ttl = tonumber(ARGV[3])

-- Get current metadata
local metaJSON = redis.call('GET', metaKey)
if not metaJSON then
  return redis.error_reply("CHAT_NOT_FOUND")
end

local meta = cjson.decode(metaJSON)
local updates = cjson.decode(updatesJSON)

-- Apply updates (shallow merge)
for k, v in pairs(updates) do
  -- Prevent overwriting critical fields
  if k ~= "id" and k ~= "userId" and k ~= "createdAt" then
    meta[k] = v
  end
end

-- Always update version and updatedAt
meta.version = (meta.version or 0) + 1
meta.updatedAt = nowISO

-- Save updated metadata with TTL refresh
local updatedJSON = cjson.encode(meta)
if ttl > 0 then
  redis.call('SET', metaKey, updatedJSON, 'EX', ttl)
else
  redis.call('SET', metaKey, updatedJSON)
end

return updatedJSON
`;

/**
 * DELETE_CHAT_SCRIPT
 * Deletes chat (meta + msgs) and removes from user list.
 *
 * KEYS: [metaKey, msgsKey, userChatsKey]
 * ARGV: [chatId]
 *
 * Returns: Number of keys deleted
 */
export const DELETE_CHAT_SCRIPT = `
-- Delete chat and remove from user's list atomically
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]
local chatId = ARGV[1]

-- Delete chat metadata and messages
local deleted = redis.call('DEL', metaKey, msgsKey)

-- Remove from user's chat list
redis.call('ZREM', userChatsKey, chatId)

return deleted
`;

/**
 * DELETE_ALL_USER_CHATS_SCRIPT
 * Bulk delete all user's chats.
 *
 * KEYS: [userChatsKey]
 * ARGV: [keyPrefix, userId] - prefix for building chat keys (e.g., "chat:") and userId
 *
 * Returns: Number of chats deleted
 */
export const DELETE_ALL_USER_CHATS_SCRIPT = `
-- Delete all chats for a user
local userChatsKey = KEYS[1]
local keyPrefix = ARGV[1]
local userId = ARGV[2]

-- Get all chat IDs for this user
local chatIds = redis.call('ZRANGE', userChatsKey, 0, -1)

if #chatIds == 0 then
  return 0
end

-- Build list of all keys to delete
-- Key format: chat:{chatId}:{userId}:meta and chat:{chatId}:{userId}:msgs
local keysToDelete = {}
for _, chatId in ipairs(chatIds) do
  -- Add metadata key
  table.insert(keysToDelete, keyPrefix .. chatId .. ":" .. userId .. ":meta")
  -- Add messages key
  table.insert(keysToDelete, keyPrefix .. chatId .. ":" .. userId .. ":msgs")
end

-- Delete all chat keys
if #keysToDelete > 0 then
  redis.call('DEL', unpack(keysToDelete))
end

-- Delete the user's chat list
redis.call('DEL', userChatsKey)

return #chatIds
`;

/**
 * FORK_CHAT_SCRIPT
 * Branch conversation - copy messages up to timestamp.
 *
 * KEYS: [srcMetaKey, srcMsgsKey, dstMetaKey, dstMsgsKey]
 * ARGV: [newChatJSON, untilScore, ttl]
 *
 * Returns: Number of messages copied
 */
export const FORK_CHAT_SCRIPT = `
-- Fork a chat: copy messages up to a certain point
local srcMetaKey = KEYS[1]
local srcMsgsKey = KEYS[2]
local dstMetaKey = KEYS[3]
local dstMsgsKey = KEYS[4]
local newChatJSON = ARGV[1]
local untilScore = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

-- Verify source exists
if redis.call('EXISTS', srcMetaKey) == 0 then
  return redis.error_reply("SOURCE_CHAT_NOT_FOUND")
end

-- Get messages up to the specified score (timestamp)
local messages = redis.call('ZRANGEBYSCORE', srcMsgsKey, '-inf', untilScore, 'WITHSCORES')

-- Create new chat metadata
redis.call('SET', dstMetaKey, newChatJSON)

-- Copy messages to new chat if any exist
local msgCount = 0
if #messages > 0 then
  local zaddArgs = {}
  for i = 1, #messages, 2 do
    local msg = messages[i]
    local score = messages[i + 1]
    table.insert(zaddArgs, score)
    table.insert(zaddArgs, msg)
    msgCount = msgCount + 1
  end
  redis.call('ZADD', dstMsgsKey, unpack(zaddArgs))
end

-- Apply TTL
if ttl > 0 then
  redis.call('EXPIRE', dstMetaKey, ttl)
  if msgCount > 0 then
    redis.call('EXPIRE', dstMsgsKey, ttl)
  end
end

return msgCount
`;

// ============================================================================
// QUOTA OPERATIONS
// ============================================================================

/**
 * INCREMENT_QUOTA_SCRIPT
 * Atomic increment with limit check.
 *
 * KEYS: [quotaKey]
 * ARGV: [delta, ttl, limit]
 *
 * Returns: [accepted(0/1), currentCount, limit]
 */
export const INCREMENT_QUOTA_SCRIPT = `
-- Increment quota with limit check
local quotaKey = KEYS[1]
local delta = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- Get current count
local current = tonumber(redis.call('GET', quotaKey)) or 0

-- Check if increment would exceed limit
local newCount = current + delta
if newCount > limit then
  -- Rejected - would exceed limit
  return {0, current, limit}
end

-- Increment and set TTL
redis.call('INCRBY', quotaKey, delta)
if ttl > 0 then
  redis.call('EXPIRE', quotaKey, ttl)
end

return {1, newCount, limit}
`;

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

/**
 * APPEND_VERSION_SCRIPT
 * Append version to document ZSET with atomic metadata merge.
 *
 * KEYS: [metaKey, versionsKey]
 * ARGV: [metaJSON, versionJSON, score, ttl]
 *
 * If meta exists, merges only title and updatedAt to prevent race conditions.
 * If meta doesn't exist, creates new metadata.
 *
 * Returns: New version count
 */
export const APPEND_VERSION_SCRIPT = `
-- Append a new version to a document with atomic metadata merge
local metaKey = KEYS[1]
local versionsKey = KEYS[2]
local metaJSON = ARGV[1]
local versionJSON = ARGV[2]
local score = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

-- Check for existing metadata and merge atomically
local existingMeta = redis.call('GET', metaKey)
if existingMeta then
  -- Merge: preserve existing fields, update only title and updatedAt
  local existing = cjson.decode(existingMeta)
  local updates = cjson.decode(metaJSON)
  existing.title = updates.title
  existing.updatedAt = updates.updatedAt
  redis.call('SET', metaKey, cjson.encode(existing))
else
  -- No existing meta, create new
  redis.call('SET', metaKey, metaJSON)
end

-- Add version to sorted set
redis.call('ZADD', versionsKey, score, versionJSON)

-- Apply TTL
if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
  redis.call('EXPIRE', versionsKey, ttl)
end

return redis.call('ZCARD', versionsKey)
`;

/**
 * FORK_DOCUMENT_SCRIPT
 * Copy document versions up to timestamp.
 *
 * KEYS: [srcVersionsKey, dstVersionsKey]
 * ARGV: [fromScore, ttl]
 *
 * Returns: Number of versions copied
 */
export const FORK_DOCUMENT_SCRIPT = `
-- Fork a document: copy versions up to a certain point
local srcVersionsKey = KEYS[1]
local dstVersionsKey = KEYS[2]
local fromScore = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

-- Get versions up to the specified score
local versions = redis.call('ZRANGEBYSCORE', srcVersionsKey, '-inf', fromScore, 'WITHSCORES')

if #versions == 0 then
  return 0
end

-- Copy versions to new document
local zaddArgs = {}
local versionCount = 0
for i = 1, #versions, 2 do
  local version = versions[i]
  local score = versions[i + 1]
  table.insert(zaddArgs, score)
  table.insert(zaddArgs, version)
  versionCount = versionCount + 1
end

redis.call('ZADD', dstVersionsKey, unpack(zaddArgs))

-- Apply TTL
if ttl > 0 then
  redis.call('EXPIRE', dstVersionsKey, ttl)
end

return versionCount
`;

/**
 * PRUNE_VERSIONS_SCRIPT
 * Keep only last N versions.
 *
 * KEYS: [versionsKey]
 * ARGV: [keepCount]
 *
 * Returns: Number of versions removed
 */
export const PRUNE_VERSIONS_SCRIPT = `
-- Prune old versions, keeping only the last N
local versionsKey = KEYS[1]
local keepCount = tonumber(ARGV[1])

-- Get current count
local currentCount = redis.call('ZCARD', versionsKey)

if currentCount <= keepCount then
  return 0
end

-- Calculate how many to remove
local removeCount = currentCount - keepCount

-- Remove oldest versions (lowest scores)
-- ZREMRANGEBYRANK removes elements by rank (0-based index)
redis.call('ZREMRANGEBYRANK', versionsKey, 0, removeCount - 1)

return removeCount
`;

// ============================================================================
// SCRIPT METADATA (for SHA caching)
// ============================================================================

/**
 * All scripts with their names for SHA registration
 */
export const SCRIPTS = {
  CREATE_CHAT: CREATE_CHAT_SCRIPT,
  APPEND_MESSAGE: APPEND_MESSAGE_SCRIPT,
  APPEND_MESSAGES_BULK: APPEND_MESSAGES_BULK_SCRIPT,
  UPDATE_METADATA: UPDATE_METADATA_SCRIPT,
  DELETE_CHAT: DELETE_CHAT_SCRIPT,
  DELETE_ALL_USER_CHATS: DELETE_ALL_USER_CHATS_SCRIPT,
  FORK_CHAT: FORK_CHAT_SCRIPT,
  INCREMENT_QUOTA: INCREMENT_QUOTA_SCRIPT,
  APPEND_VERSION: APPEND_VERSION_SCRIPT,
  FORK_DOCUMENT: FORK_DOCUMENT_SCRIPT,
  PRUNE_VERSIONS: PRUNE_VERSIONS_SCRIPT,
} as const;

export type ScriptName = keyof typeof SCRIPTS;
