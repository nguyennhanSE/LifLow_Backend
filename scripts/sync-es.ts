import { PrismaClient, CouponType, OrderSituation } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'es7';


// Initialize Prisma with PrismaPg adapter
const connectionString = 'postgresql://postgres:123456@postgres:5432/postgres?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const es = new Client({
  node: 'http://elasticsearch:9200',
});


async function checkIfDatabaseIsEmpty() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`Database has ${count} users, skipping seed`);
    process.exit(0);
  }
  else {
    console.log('Database is empty, proceeding with seed...');
    
  }
}

async function createIndex() {
  const exists = await es.indices.exists({ index: 'products' });
  if (!exists) {
    await es.indices.create({
      index: 'products',
      body: {
      mappings: {
        properties: {
          id:                  { type: 'keyword' },
          productCode:         { type: 'keyword' },
          productName:         { type: 'text', analyzer: 'standard' },
          englishProductName:  { type: 'text' },
          productSummaryDescription: { type: 'text' },
          productBriefDescription:   { type: 'text' },
          searchKeywordSetting:      { type: 'text' },
          brand:               { type: 'keyword' },
          manufacturer:        { type: 'keyword' },
          supplier:            { type: 'keyword' },
          displayStatus:       { type: 'keyword' },
          saleStatus:          { type: 'keyword' },
          salePrice:           { type: 'integer' },
          productPrice:        { type: 'integer' },
          consumerPrice:       { type: 'integer' },
          stockQuantity:       { type: 'integer' },
          productCategoryNumber: { type: 'integer' },
          productClientCategory: { type: 'integer' },
          createdAt:           { type: 'date' },
          updatedAt:           { type: 'date' },
        },
      },
    }
    });
    console.log('Index created');
  }
}

async function syncProducts() {
  const BATCH_SIZE = 500;
  let offset = 0;
  let total = 0;

  while (true) {
    const products = await prisma.product.findMany({
      take: BATCH_SIZE,
      skip: offset,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        productCode: true,
        productName: true,
        englishProductName: true,
        productSummaryDescription: true,
        productBriefDescription: true,
        searchKeywordSetting: true,
        brand: true,
        manufacturer: true,
        supplier: true,
        displayStatus: true,
        saleStatus: true,
        salePrice: true,
        productPrice: true,
        consumerPrice: true,
        stockQuantity: true,
        productCategoryNumber: true,
        productClientCategory: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (products.length === 0) break;

    // es7 bulk API
    const body = products.flatMap((product) => [
      { index: { _index: 'products', _id: product.id } },
      product,
    ]);

    const { body: result } = await es.bulk({ body });

    if (result.errors) {
      const failed = result.items.filter((i: any) => i.index?.error);
      console.error('Bulk errors:', failed);
    }

    total += products.length;
    offset += BATCH_SIZE;
    console.log(`Synced ${total} products...`);
  }

  console.log(`Done. Total: ${total} products`);
}

async function main() {
  try {
    // await checkIfDatabaseIsEmpty();
    await createIndex();
    await syncProducts();
  } finally {
    await prisma.$disconnect(); // fix: pg.end() → prisma.$disconnect()
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
