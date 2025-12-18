import "server-only";

/**
 * Centralized Lua scripts for atomic Redis operations.
 *
 * Lua scripts execute atomically on Redis, ensuring:
 * - No race conditions between check and update
 * - Multiple commands execute as a single unit
 * - Reduced network round-trips
 *
 * @module cache/scripts
 */

// -----------------------------------------------------------------------------
// Message Operations
// -----------------------------------------------------------------------------

/**
 * Append message to ZSET with automatic limit enforcement.
 *
 * KEYS[1]: messages key (ZSET)
 * ARGV[1]: message (JSON string)
 * ARGV[2]: score (timestamp)
 * ARGV[3]: limit (max messages to keep)
 *
 * @returns Current message count after append
 */
export const APPEND_MESSAGE_WITH_LIMIT = `
local key = KEYS[1]
local member = ARGV[1]
local score = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZADD', key, score, member)
local count = redis.call('ZCARD', key)

if count > limit then
  redis.call('ZREMRANGEBYRANK', key, 0, count - limit - 1)
end

return count
`;

/**
 * Delete messages in a score range.
 *
 * KEYS[1]: messages key (ZSET)
 * ARGV[1]: min score (timestamp)
 * ARGV[2]: max score (timestamp or '+inf')
 *
 * @returns Number of deleted messages
 */
export const DELETE_MESSAGES_IN_RANGE = `
local key = KEYS[1]
local minScore = ARGV[1]
local maxScore = ARGV[2]

return redis.call('ZREMRANGEBYSCORE', key, minScore, maxScore)
`;

// -----------------------------------------------------------------------------
// Chat Operations
// -----------------------------------------------------------------------------

/**
 * Atomic chat metadata update with version increment.
 *
 * KEYS[1]: metadata key (STRING)
 * KEYS[2]: user chats key (ZSET)
 * ARGV[1]: updates (JSON object with fields to merge)
 * ARGV[2]: now (ISO timestamp string)
 * ARGV[3]: chatId
 * ARGV[4]: userChatsScore
 *
 * @returns Updated metadata JSON or nil if not found
 */
export const ATOMIC_CHAT_UPDATE = `
local metaKey = KEYS[1]
local userChatsKey = KEYS[2]

local meta = redis.call('GET', metaKey)
if not meta then return nil end

local data = cjson.decode(meta)
local updates = cjson.decode(ARGV[1])

for k, v in pairs(updates) do
  data[k] = v
end

data.updatedAt = ARGV[2]
data.version = (data.version or 0) + 1

local newMeta = cjson.encode(data)
redis.call('SET', metaKey, newMeta)

local userChatItem = cjson.encode({
  chatId = ARGV[3],
  title = data.title,
  updatedAt = tonumber(ARGV[4])
})
redis.call('ZADD', userChatsKey, tonumber(ARGV[4]), userChatItem)

return newMeta
`;

/**
 * Atomic single message append with metadata update.
 *
 * KEYS[1]: metadata key (STRING)
 * KEYS[2]: messages key (ZSET)
 * KEYS[3]: user chats key (ZSET)
 * ARGV[1]: message (JSON string)
 * ARGV[2]: now (ISO timestamp string)
 * ARGV[3]: userChatsScore (timestamp ms)
 * ARGV[4]: chatId
 * ARGV[5]: msgScore (timestamp with role offset)
 * ARGV[6]: ttl (0 for authenticated, >0 for guest)
 *
 * @returns 1 on success, 0 if chat not found
 */
export const APPEND_MESSAGE_ATOMIC = `
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]

local meta = redis.call('GET', metaKey)
if not meta then return 0 end

redis.call('ZADD', msgsKey, tonumber(ARGV[5]), ARGV[1])

local data = cjson.decode(meta)
data.updatedAt = ARGV[2]
data.version = (data.version or 0) + 1
redis.call('SET', metaKey, cjson.encode(data))

local userChatItem = cjson.encode({
  chatId = ARGV[4],
  title = data.title,
  updatedAt = tonumber(ARGV[3])
})
redis.call('ZADD', userChatsKey, tonumber(ARGV[3]), userChatItem)

local ttl = tonumber(ARGV[6])
if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
  redis.call('EXPIRE', msgsKey, ttl)
  redis.call('EXPIRE', userChatsKey, ttl)
end

return 1
`;

/**
 * Atomic batch message append with metadata update.
 *
 * KEYS[1]: metadata key (STRING)
 * KEYS[2]: messages key (ZSET)
 * KEYS[3]: user chats key (ZSET)
 * ARGV[1]: now (ISO timestamp string)
 * ARGV[2]: userChatsScore (timestamp ms)
 * ARGV[3]: chatId
 * ARGV[4]: msgCount (number of messages)
 * ARGV[5]: ttl (0 for authenticated, >0 for guest)
 * ARGV[6+]: alternating score, message pairs (score1, msg1, score2, msg2, ...)
 *
 * @returns 1 on success, 0 if chat not found
 */
export const BATCH_APPEND_MESSAGES_ATOMIC = `
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]

local meta = redis.call('GET', metaKey)
if not meta then return 0 end

local msgCount = tonumber(ARGV[4])
for i = 6, 6 + (msgCount * 2) - 1, 2 do
  redis.call('ZADD', msgsKey, tonumber(ARGV[i]), ARGV[i + 1])
end

local data = cjson.decode(meta)
data.updatedAt = ARGV[1]
data.version = (data.version or 0) + 1
redis.call('SET', metaKey, cjson.encode(data))

local userChatItem = cjson.encode({
  chatId = ARGV[3],
  title = data.title,
  updatedAt = tonumber(ARGV[2])
})
redis.call('ZADD', userChatsKey, tonumber(ARGV[2]), userChatItem)

local ttl = tonumber(ARGV[5])
if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
  redis.call('EXPIRE', msgsKey, ttl)
  redis.call('EXPIRE', userChatsKey, ttl)
end

return 1
`;

/**
 * Delete all chats for a user atomically.
 *
 * KEYS[1]: user chats key (ZSET)
 * ARGV[1]: userId
 *
 * @returns Number of deleted chats
 */
export const DELETE_ALL_USER_CHATS = `
local userChatsKey = KEYS[1]
local userId = ARGV[1]

local items = redis.call('ZRANGE', userChatsKey, 0, -1)
local count = 0

for _, item in ipairs(items) do
  local data = cjson.decode(item)
  local chatId = data.chatId
  redis.call('DEL', 'chat:' .. chatId .. ':' .. userId .. ':meta')
  redis.call('DEL', 'chat:' .. chatId .. ':' .. userId .. ':msgs')
  count = count + 1
end

redis.call('DEL', userChatsKey)
return count
`;

// -----------------------------------------------------------------------------
// Document Operations
// -----------------------------------------------------------------------------

/**
 * Append a new version to document with limit enforcement.
 *
 * KEYS[1]: document key (STRING)
 * ARGV[1]: version (JSON string)
 * ARGV[2]: maxVersions (limit)
 *
 * @returns Number of versions after append
 */
export const APPEND_DOCUMENT_VERSION = `
local key = KEYS[1]
local version = cjson.decode(ARGV[1])
local maxVersions = tonumber(ARGV[2])

local doc = redis.call('GET', key)
if not doc then return 0 end

local data = cjson.decode(doc)
table.insert(data.versions, version)

local count = #data.versions
if count > maxVersions then
  local start = count - maxVersions + 1
  local newVersions = {}
  for i = start, count do
    table.insert(newVersions, data.versions[i])
  end
  data.versions = newVersions
end

redis.call('SET', key, cjson.encode(data))
return #data.versions
`;

/**
 * Delete document versions after a timestamp.
 *
 * KEYS[1]: document key (STRING)
 * ARGV[1]: timestamp (ISO string)
 *
 * @returns Number of remaining versions
 */
export const DELETE_DOCUMENT_VERSIONS_AFTER = `
local key = KEYS[1]
local timestamp = ARGV[1]

local doc = redis.call('GET', key)
if not doc then return 0 end

local data = cjson.decode(doc)
local newVersions = {}

for _, v in ipairs(data.versions) do
  if v.createdAt <= timestamp then
    table.insert(newVersions, v)
  end
end

data.versions = newVersions
redis.call('SET', key, cjson.encode(data))
return #newVersions
`;

// -----------------------------------------------------------------------------
// Export All Scripts
// -----------------------------------------------------------------------------

/**
 * All cache Lua scripts for easy access.
 */
export const CACHE_SCRIPTS = {
    // Message operations
    appendMessageWithLimit: APPEND_MESSAGE_WITH_LIMIT,
    deleteMessagesInRange: DELETE_MESSAGES_IN_RANGE,

    // Chat operations
    atomicChatUpdate: ATOMIC_CHAT_UPDATE,
    appendMessageAtomic: APPEND_MESSAGE_ATOMIC,
    batchAppendMessagesAtomic: BATCH_APPEND_MESSAGES_ATOMIC,
    deleteAllUserChats: DELETE_ALL_USER_CHATS,

    // Document operations
    appendDocumentVersion: APPEND_DOCUMENT_VERSION,
    deleteDocumentVersionsAfter: DELETE_DOCUMENT_VERSIONS_AFTER,
} as const;

export type CacheScriptName = keyof typeof CACHE_SCRIPTS;
