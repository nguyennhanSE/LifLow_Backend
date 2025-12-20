-- Test query to see what Prisma would generate
-- Simulating: offset=10, limit=10, q='md' (case insensitive search in name or email)
SELECT * FROM users 
WHERE (LOWER(name) LIKE '%md%' OR LOWER(email) LIKE '%md%')
ORDER BY created_at ASC
OFFSET 10 LIMIT 10;

-- Also check total count
SELECT COUNT(*) FROM users 
WHERE (LOWER(name) LIKE '%md%' OR LOWER(email) LIKE '%md%');

-- Check which page the MD3 user appears on
SELECT *, 
  ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num 
FROM users 
WHERE (LOWER(name) LIKE '%md%' OR LOWER(email) LIKE '%md%')
ORDER BY created_at ASC;
