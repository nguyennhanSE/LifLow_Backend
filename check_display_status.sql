-- Check displayStatus values in products table
SELECT 
  id,
  product_name,
  display_status,
  LENGTH(display_status) as length,
  CASE 
    WHEN display_status IS NULL THEN 'NULL'
    WHEN display_status = 'Y' THEN 'EXACT_Y'
    WHEN display_status = 'N' THEN 'EXACT_N'
    ELSE 'OTHER: ' || display_status
  END as status_check
FROM products
ORDER BY product_name
LIMIT 20;

-- Count by displayStatus
SELECT 
  display_status,
  COUNT(*) as count,
  LENGTH(display_status) as length
FROM products
GROUP BY display_status, LENGTH(display_status);

