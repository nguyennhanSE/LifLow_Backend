# scripts/seed-if-empty.sh
#!/bin/sh

# echo "Checking database..."

# COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')

# if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
#   echo "Empty database, running seed..."
#   npx prisma migrate deploy
# else
#   echo "Database has $COUNT users, skipping seed"
# fi


tsx /app/scripts/sync-es.ts