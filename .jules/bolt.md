## 2024-05-22 - [Missing Foreign Key Indexes]
**Learning:** The `drizzle-orm` schema definitions for `Chat` and `Message_v2` tables lacked indexes on foreign keys (`userId`, `chatId`) and commonly sorted columns (`createdAt`). This leads to full table scans on frequently accessed paths like fetching chat history or message lists.
**Action:** Always verify if ORM schemas automatically create indexes for foreign keys. If not, explicitly define composite indexes for common access patterns (e.g., `WHERE foreign_key = ? ORDER BY created_at`).
