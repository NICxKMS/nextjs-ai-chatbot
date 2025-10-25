-- Increase password field length to accommodate PBKDF2 hashes (salt:hash format)
ALTER TABLE "User" ALTER COLUMN "password" TYPE varchar(256);

