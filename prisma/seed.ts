import { CategoriesController } from './../src/modules/categories/categories.controller';
import { catchError } from 'rxjs';
import { PrismaClient, CouponType, OrderSituation } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

// Load environment variables
const NODE_ENV = process.env.NODE_ENV || 'production';
console.log('NODE_ENV', NODE_ENV);
const envFileName = NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
const envFilePath = path.resolve(__dirname, '..', envFileName);
const result = dotenv.config({ path: envFilePath });

if (result.error) {
  console.error(`❌ Error loading .env file from ${envFilePath}:`, result.error);
  throw result.error;
}

console.log(`✅ Loaded ${Object.keys(result.parsed || {}).length} environment variables from ${envFileName}`);

// Initialize Prisma with PrismaPg adapter (same as PrismaService)
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Type definition for CSV user record (Korean headers)
interface UserCsvRecord {
  '아이디': string;
  '이름'?: string;
  '회원등급'?: string;
  '나이'?: string;
  '이메일'?: string;
  '휴대폰번호'?: string;
  '총 사용 적립금'?: string;
  '사용가능 적립금'?: string;
  '회원 가입일'?: string;
  '휴면처리일'?: string;
  '탈퇴일'?: string;
  '탈퇴구분'?: string;
  '탈퇴사유'?: string;
}

// Type definition for Product CSV record (English headers)
interface ProductCsvRecord {
  product_code?: string;
  own_product_code?: string;
  display_status?: string;
  sale_status?: string;
  product_client_category?: string;
  product_category_new_product_area?: string;
  product_category_recommended_product_area?: string;
  product_name?: string;
  english_product_name?: string;
  product_name_for_management?: string;
  supplier_product_name?: string;
  model_name?: string;
  product_summary_description?: string;
  product_brief_description?: string;
  search_keyword_setting?: string;
  tax_classification?: string;
  consumer_price?: string;
  supply_price?: string;
  product_price?: string;
  sale_price?: string;
  use_sale_price_alternative_text?: string;
  sale_price_alternative_text?: string;
  order_quantity_limit_criteria?: string;
  min_order_quantity?: string;
  max_order_quantity?: string;
  reward_points?: string;
  reward_points_classification?: string;
  common_event_info?: string;
  adult_verification?: string;
  option_usage?: string;
  item_composition_method?: string;
  option_display_method?: string;
  option_set_name?: string;
  option_input?: string;
  option_style?: string;
  button_image_setting?: string;
  color_setting?: string;
  required_or_not?: string;
  out_of_stock_display_text?: string;
  additional_input_option?: string;
  additional_input_option_name?: string;
  additional_input_option_required_or_not?: string;
  input_character_count?: string;
  image_registration_detail?: string;
  image_registration_list?: string;
  image_registration_small_list?: string;
  image_registration_thumbnail?: string;
  manufacturer?: string;
  supplier?: string;
  brand?: string;
  trend?: string;
  own_classification_code?: string;
  manufacturing_date?: string;
  release_date?: string;
  validity_period_usage?: string;
  validity_period?: string;
  origin?: string;
  product_volume?: string;
  volume_weight?: string;
  product_payment_guide?: string;
  product_delivery_guide?: string;
  exchange_return_guide?: string;
  service_inquiry_guide?: string;
  delivery_info?: string;
  delivery_method?: string;
  domestic_overseas_delivery?: string;
  delivery_area?: string;
  delivery_fee_prepayment_setting?: string;
  delivery_period?: string;
  delivery_fee_classification?: string;
  delivery_fee_input?: string;
  product_classification_customs?: string;
  product_material?: string;
  english_product_material_customs?: string;
  fabric_customs?: string;
  '검색엔진최적화(SEO) 검색엔진 노출 설정'?: string;
  '검색엔진최적화(SEO) Title'?: string;
  '검색엔진최적화(SEO) Author'?: string;
  '검색엔진최적화(SEO) Description'?: string;
  '검색엔진최적화(SEO) Keywords'?: string;
  '검색엔진최적화(SEO) 상품 이미지 Alt 텍스트'?: string;
  individual_payment_method_setting?: string;
  product_delivery_type_code?: string;
  store_pickup_setting?: string;
  product_total_weight?: string;
  hs_code?: string;
  additional_item_01_today_departure_delivery_usage?: string;
  additional_item_02_today_departure_delivery_time?: string;
  additional_item_03_storage_method?: string;
  additional_item_04_origin?: string;
  additional_item_05_event?: string;
  additional_item_06_parcel_delivery?: string;
}

// Type definition for Order CSV record (Mixed English/Korean headers)
interface OrderCsvRecord {
  order_number?: string;
  '품목별 주문번호'?: string;  // order group number
  total_order_amount?: string;
  total_payment_amount?: string;
  product_id?: string;
  product_name?: string;
  '주문상품명(옵션포함)'?: string;  // product name with options
  quantity?: string;
  recipient?: string;
  recipient_address_full?: string;
  recipient_postal_code?: string;
  recipient_mobile_phone?: string;
  recipient_phone_number?: string;
  delivery_message?: string;
  sale_price?: string;
  payment_type?: string;
  payment_method?: string;
  order_date?: string;
  orderer_name?: string;
  orderer_mobile_phone?: string;
  orderer_id?: string;
  desired_delivery_date?: string;
  membership_level_at_order_time?: string;
}

// Type definition for Point CSV record (English headers)
interface PointCsvRecord {
  date?: string;
  user_id?: string;
  membership_level?: string;
  content?: string;
  order_number?: string;
  points_type?: string;
  available_points_increase?: string;
  available_points_deduction?: string;
  available_points_balance?: string;
}

// ========================================
// FUNCTION 1: Seed Users (Clear all data + Import users from CSV)
// ========================================
async function seedUsers() {
  console.log('🌱 Starting seed...');

  // ========================================
  // STEP 0: Clear all existing data
  // ========================================
  console.log('🗑️  Clearing all existing data...');
  
  try {
    // Delete in order to respect foreign key constraints
    // Child tables first, parent tables last
    await prisma.refreshTokenUsed.deleteMany({});
    console.log('✅ Cleared refresh_token_used');

    await prisma.session.deleteMany({});
    console.log('✅ Cleared sessions');

    await prisma.productInquiryAnswers.deleteMany({});
    console.log('✅ Cleared product_inquiry_answers');

    await prisma.productInquiries.deleteMany({});
    console.log('✅ Cleared product_inquiries');

    await prisma.productReviews.deleteMany({});
    console.log('✅ Cleared product_reviews');

    await prisma.cartItem.deleteMany({});
    console.log('✅ Cleared cart_items');

    await prisma.cart.deleteMany({});
    console.log('✅ Cleared carts');

    await prisma.couponHistory.deleteMany({});
    console.log('✅ Cleared coupon_histories');

    await prisma.payment.deleteMany({});
    console.log('✅ Cleared payments');

    await prisma.point.deleteMany({});
    console.log('✅ Cleared points');

    await prisma.order.deleteMany({});
    console.log('✅ Cleared orders');

    await prisma.orderGroup.deleteMany({});
    console.log('✅ Cleared order_groups');

    await prisma.recipe.deleteMany({});
    console.log('✅ Cleared recipes');

    await prisma.userShippingAddress.deleteMany({});
    console.log('✅ Cleared user_shipping_addresses');

    await prisma.userMembership.deleteMany({});
    console.log('✅ Cleared user_memberships');

    await prisma.userRole.deleteMany({});
    console.log('✅ Cleared user_roles');

    await prisma.productDiscount.deleteMany({});
    console.log('✅ Cleared product_discounts');

    await prisma.productSpecialOffer.deleteMany({});
    console.log('✅ Cleared product_special_offers');

    await prisma.banner.deleteMany({});
    console.log('✅ Cleared banners');

    await prisma.product.deleteMany({});
    console.log('✅ Cleared products');

    await prisma.category.deleteMany({});
    console.log('✅ Cleared categories');

    await prisma.coupon.deleteMany({});
    console.log('✅ Cleared coupons');

    await prisma.membership.deleteMany({});
    console.log('✅ Cleared memberships');

    await prisma.user.deleteMany({});
    console.log('✅ Cleared users');

    await prisma.role.deleteMany({});
    console.log('✅ Cleared roles');

    console.log('✨ All data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }

  // ========================================
  // STEP 1: Import users from CSV (Batch Insert)
  // ========================================
  const csvPath = '/Users/nhannguyen/Documents/users.csv';
  
  if (fs.existsSync(csvPath)) {
    console.log('📥 Importing users from CSV...');
    try {
      // Read CSV and remove BOM
      let csvContent = fs.readFileSync(csvPath, 'utf-8');
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      
      const records: UserCsvRecord[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      console.log(`📊 Found ${records.length} users in CSV`);

      // Prepare data for batch insert
      const usersToInsert: any[] = [];
      let skippedCount = 0;

      for (const record of records) {
        const userId = record['아이디'];
        
        // Skip records without id
        if (!userId || userId.trim() === '') {
          skippedCount++;
          continue;
        }

        usersToInsert.push({
          id: userId,
          name: record['이름'] || null,
          membershipLevel: record['회원등급'] || null,
          age: record['나이'] ? parseInt(record['나이']) : null,
          email: record['이메일'] || null,
          phoneNumber: record['휴대폰번호'] || null,
          totalUsedPoints: record['총 사용 적립금'] ? parseInt(record['총 사용 적립금']) : 0,
          availablePoints: record['사용가능 적립금'] ? parseInt(record['사용가능 적립금']) : 0,
          registrationDate: record['회원 가입일'] || null,
          dormancyDate: record['휴면처리일'] || null,
          withdrawalDate: record['탈퇴일'] || null,
          withdrawalType: record['탈퇴구분'] || null,
          reasonForWithdrawal: record['탈퇴사유'] || null,
          totalPurchaseAmount: 0,
        });
      }

      console.log(`✅ Prepared ${usersToInsert.length} users (skipped ${skippedCount})`);
      
      // Batch insert in chunks to avoid memory issues
      const BATCH_SIZE = 1000;
      let insertedCount = 0;
      
      for (let i = 0; i < usersToInsert.length; i += BATCH_SIZE) {
        const batch = usersToInsert.slice(i, i + BATCH_SIZE);
        await prisma.user.createMany({
          data: batch,
          skipDuplicates: true,
        });
        insertedCount += batch.length;
        console.log(`📝 Inserted ${insertedCount}/${usersToInsert.length} users...`);
      }
      
      console.log(`✅ Successfully imported ${insertedCount} users from CSV`);
      
    } catch (error) {
      console.error('❌ Error importing CSV:', error);
      console.log('⚠️  Continuing with seed process...');
    }
  } else {
    console.log('⚠️  CSV file not found at', csvPath);
    console.log('⚠️  Skipping user import from CSV');
  }

  // ========================================
  // STEP 2: Create roles
  // ========================================
  console.log('📝 Creating roles...');
  
  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'Administrator role with full access',
    },
  });
  console.log(`✅ Admin role created: ${adminRole.id}`);

  const userRole = await prisma.role.create({
    data: {
      name: 'USER',
      description: 'Regular user role',
    },
  });
  console.log(`✅ User role created: ${userRole.id}`);

  // ========================================
  // STEP 3: Create liflowadmin user
  // ========================================
  console.log('👤 Creating liflowadmin user...');
  
  const hashedPassword = await bcrypt.hash('123456', 10);
  const registrationDate = new Date().toISOString().split('T')[0];

  // Check if liflowadmin already exists (from CSV)
  const existingAdmin = await prisma.user.findUnique({
    where: { id: 'liflowadmin' },
  });

  let liflowAdmin;
  if (existingAdmin) {
    // Update existing user
    liflowAdmin = await prisma.user.update({
      where: { id: 'liflowadmin' },
      data: {
        password: hashedPassword,
        name: 'LiflowAdmin',
        email: 'thegarden4991@naver.com',
        dashboardAccess: true,
        memberAccess: true,
        productAccess: true,
        orderAccess: true,
        recipeAccess: true,
        bannerAccess: true,
      },
    });
    console.log(`✅ Liflowadmin user updated: ${liflowAdmin.id}`);
  } else {
    // Create new user
    liflowAdmin = await prisma.user.create({
      data: {
        id: 'liflowadmin',
        password: hashedPassword,
        name: 'LiflowAdmin',
        email: 'thegarden4991@naver.com',
        registrationDate: registrationDate,
        totalUsedPoints: 0,
        availablePoints: 0,
        totalPurchaseAmount: 0,
        dashboardAccess: true,
        memberAccess: true,
        productAccess: true,
        orderAccess: true,
        recipeAccess: true,
        bannerAccess: true,
      },
    });
    console.log(`✅ Liflowadmin user created: ${liflowAdmin.id}`);
  }

  // ========================================
  // STEP 4: Create userRole for all users
  // ========================================
  console.log('👥 Getting all users...');
  const allUsers = await prisma.user.findMany({
    select: { id: true },
  });
  console.log(`📊 Found ${allUsers.length} users`);

  console.log('🔗 Creating user roles...');
  
  for (const user of allUsers) {
    const roleToAssign = user.id === 'liflowadmin' ? adminRole : userRole;
    
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: roleToAssign.id,
      },
    });
    console.log(`✅ Assigned ${roleToAssign.name} role to user: ${user.id}`);
  }

  console.log('✨ Seed completed successfully!');
}




// ========================================
// Helper: Initialize S3 Client
// ========================================
function getS3Client(): S3Client {
  const region = process.env.AWS_REGION || 'ap-northeast-2';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  const credentials = (accessKeyId && secretAccessKey)
    ? { accessKeyId, secretAccessKey }
    : defaultProvider();

  return new S3Client({ region, credentials });
}

// Flag to track if permission error has been logged (to avoid spam)
let s3PermissionErrorLogged = false;
// Flags for debug logging (to avoid spam)
let s3DebugPrefixLogged = false;
let s3SampleKeysLogged = false;

// ========================================
// Helper: Get random image from S3 folder
// ========================================
async function getRandomImageFromFolder(s3Client: S3Client, bucket: string, folderPath: string): Promise<string | null> {
  try {
    // Map folder name if it exists in mapping (for cases where S3 folder name differs)
    const actualFolderPath = folderNameMapping[folderPath] || folderPath;
    const prefix = actualFolderPath.endsWith('/') ? actualFolderPath : `${actualFolderPath}/`;
    
    // Debug: log prefix để kiểm tra
    if (!s3DebugPrefixLogged) {
      console.log(`🔍 Debug: Searching with prefix: "${prefix}"`);
      s3DebugPrefixLogged = true;
    }
    
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });
    
    const response = await s3Client.send(command);
    const keys = (response.Contents || [])
      .map(obj => obj.Key)
      .filter((key): key is string => !!key);
    
    // Debug: log keys đầu tiên để xem format thực tế
    if (keys.length > 0 && !s3SampleKeysLogged) {
      console.log(`🔍 Debug: Sample keys from S3 (first 3):`, keys.slice(0, 3));
      s3SampleKeysLogged = true;
    }
    
    // Lọc ra các file ảnh (không phân biệt hoa thường)
    // Hỗ trợ cả .JPG, .jpg, .JPEG, .jpeg, etc.
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const imageKeys = keys.filter(key => {
      // Convert key về lowercase để so sánh không phân biệt hoa thường
      const lowerKey = key.toLowerCase();
      // Check xem key có kết thúc bằng một trong các extension không
      return imageExtensions.some(ext => lowerKey.endsWith(ext));
    });
    
    if (imageKeys.length === 0) {
      // Debug: log một vài keys đầu tiên để xem format
      if (keys.length > 0) {
        console.warn(`⚠️  No images found in folder: ${folderPath}`);
        console.warn(`   Found ${keys.length} objects, first few keys:`, keys.slice(0, 3));
      } else {
        // Thử lại với prefix không có trailing slash
        if (prefix.endsWith('/')) {
          const altPrefix = prefix.slice(0, -1);
          const altCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: altPrefix,
          });
          const altResponse = await s3Client.send(altCommand);
          const altKeys = (altResponse.Contents || [])
            .map(obj => obj.Key)
            .filter((key): key is string => !!key);
          
          if (altKeys.length > 0) {
            console.warn(`⚠️  No images found in folder: ${folderPath} (tried with trailing slash, found ${altKeys.length} objects without slash)`);
            console.warn(`   Sample keys:`, altKeys.slice(0, 3));
          } else {
            console.warn(`⚠️  No images found in folder: ${folderPath} (no objects in folder, tried both with and without trailing slash)`);
          }
        } else {
          console.warn(`⚠️  No images found in folder: ${folderPath} (no objects in folder)`);
        }
      }
      return null;
    }
    
    // Chọn random một ảnh
    const randomIndex = Math.floor(Math.random() * imageKeys.length);
    const randomKey = imageKeys[randomIndex];
    
    // Trả về public URL
    const region = process.env.AWS_REGION || 'ap-northeast-2';
    return `https://${bucket}.s3.${region}.amazonaws.com/${randomKey}`;
  } catch (error: any) {
    // Handle permission errors gracefully
    if (error?.Code === 'AccessDenied' || error?.name === 'AccessDenied') {
      // Only log once to avoid spam
      if (!s3PermissionErrorLogged) {
        console.warn(`⚠️  S3 ListBucket permission denied. Skipping image updates. Add s3:ListBucket permission to IAM user or skip image updates.`);
        s3PermissionErrorLogged = true;
      }
      return null;
    }
    // For other errors, log a brief message without full stack trace
    console.warn(`⚠️  Failed to get random image from folder: ${folderPath} - ${error?.message || error?.Code || 'Unknown error'}`);
    return null;
  }
}

// ========================================
// Mapping: Folder name in code -> Actual folder name in S3
// ========================================
const folderNameMapping: { [key: string]: string } = {
  'seed/24. 곱창류 5종': 'seed/24. 곰탕류 5종', // Tên trong S3 khác với mapping
};

// ========================================
// Mapping: Product number -> Folder name
// ========================================
function getFolderForProduct(productNumber: number): string | null {
  const mapping: { [key: number]: string } = {
    // 1. 언양불고기
    56: 'seed/1. 언양불고기',
    102: 'seed/1. 언양불고기',
    119: 'seed/1. 언양불고기',
    120: 'seed/1. 언양불고기',
    121: 'seed/1. 언양불고기',
    256: 'seed/1. 언양불고기',
    // 2. 한우샤브샤브
    252: 'seed/2. 한우샤브샤브',
    // 3. LA갈비
    39: 'seed/3. LA갈비',
    43: 'seed/3. LA갈비',
    45: 'seed/3. LA갈비',
    260: 'seed/3. LA갈비',
    // 4. 제주흑돼지 불고기
    272: 'seed/4. 제주흑돼지 불고기',
    // 5. 돼지막창류
    38: 'seed/5. 돼지막창류',
    // 6. 한우떡갈비
    109: 'seed/6. 한우떡갈비',
    271: 'seed/6. 한우떡갈비',
    // 7. 연평도 게장
    268: 'seed/7. 연평도 게장',
    // 8. 새우장
    267: 'seed/8. 새우장',
    // 9. 꼬막장
    266: 'seed/9. 꼬막장',
    // 10. 한우불고기 전골, 실속형
    258: 'seed/10. 한우불고기 전골, 실속형',
    278: 'seed/10. 한우불고기 전골, 실속형',
    // 11. 한돈 돼지갈비, 실속형
    24: 'seed/11. 한돈 돼지갈비, 실속형',
    // 12. 한우곱창류
    32: 'seed/12. 한우곱창류',
    275: 'seed/12. 한우곱창류',
    // 13. 양념게장
    33: 'seed/13. 양념게장',
    // 14. 갈비탕
    46: 'seed/14. 갈비탕',
    255: 'seed/14. 갈비탕',
    277: 'seed/14. 갈비탕',
    // 15. 육개장
    276: 'seed/15. 육개장',
    // 16. 너티버티
    172: 'seed/16. 너티버티',
    // 18. 냉면
    270: 'seed/18. 냉면',
    // 19. 1등급 암소한우 등심
    88: 'seed/19. 1등급 암소한우 등심',
    143: 'seed/19. 1등급 암소한우 등심',
    // 20. 왕구이
    95: 'seed/20. 왕구이',
    // 21. 수산
    115: 'seed/21. 수산',
    133: 'seed/21. 수산',
    249: 'seed/21. 수산',
    // 22. 무항생제 한돈
    158: 'seed/22. 무항생제 한돈',
    262: 'seed/22. 무항생제 한돈',
    // 24. 곰탕류 5종 (tên trong S3)
    257: 'seed/24. 곰탕류 5종',
    // 27. 생고기
    261: 'seed/27. 생고기',
    // 31. 수제 안창 토시 양념
    6: 'seed/31. 수제 안창 토시 양념',
    14: 'seed/31. 수제 안창 토시 양념',
  };
  
  return mapping[productNumber] || null;
}

// ========================================
// FUNCTION 2: Seed Products (Import products from CSV)
// ========================================
async function seedProducts() {
  console.log('🌱 Starting seed...');
  await prisma.product.deleteMany({});
  
  // ========================================
  // STEP 1: Import products from CSV
  // ========================================
  const productsCsvPath = '/Users/nhannguyen/Documents/products_test_1.csv';
  
  if (fs.existsSync(productsCsvPath)) {
    console.log('📥 Importing products from CSV...');
    try {
      // Read CSV and remove BOM if present
      let csvContent = fs.readFileSync(productsCsvPath, 'utf-8');
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      
      const records: ProductCsvRecord[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      console.log(`📊 Found ${records.length} products in CSV`);

      // Prepare data for batch insert
      const productsToInsert: any[] = [];
      let skippedCount = 0;

      for (const record of records) {
        try {
          // Parse product_client_category as array of integers (e.g., "55|56|91" -> [55, 56, 91])
          const productClientCategory = record.product_client_category
            ? record.product_client_category.split('|').map((v: string) => parseInt(v.trim())).filter((v: number) => !isNaN(v))
            : [];

          // Use first category as productCategoryNumber (required field)
          const productCategoryNumber = productClientCategory.length > 0 ? productClientCategory[0] : 1;

          productsToInsert.push({
            productCode: record.product_code || null,
            ownProductCode: record.own_product_code || null,
            displayStatus: record.display_status || 'ACTIVE',
            saleStatus: record.sale_status || null,
            productCategoryNumber: productCategoryNumber,
            productClientCategory: productClientCategory,
            productCategoryNewProductArea: record.product_category_new_product_area || null,
            productCategoryRecommendedProductArea: record.product_category_recommended_product_area || null,
            productName: record.product_name || null,
            englishProductName: record.english_product_name || null,
            productNameForManagement: record.product_name_for_management || null,
            supplierProductName: record.supplier_product_name || null,
            modelName: record.model_name || null,
            productSummaryDescription: record.product_summary_description || null,
            productBriefDescription: record.product_brief_description || null,
            searchKeywordSetting: record.search_keyword_setting || null,
            taxClassification: record.tax_classification || null,
            consumerPrice: record.consumer_price ? parseInt(record.consumer_price) : null,
            supplyPrice: record.supply_price ? parseInt(record.supply_price) : null,
            productPrice: record.product_price ? parseInt(record.product_price) : null,
            salePrice: record.sale_price ? parseInt(record.sale_price) : null,
            useSalePriceAlternativeText: record.use_sale_price_alternative_text || null,
            salePriceAlternativeText: record.sale_price_alternative_text || null,
            orderQuantityLimitCriteria: record.order_quantity_limit_criteria || null,
            minOrderQuantity: record.min_order_quantity ? parseInt(record.min_order_quantity) : null,
            maxOrderQuantity: record.max_order_quantity ? parseInt(record.max_order_quantity) : null,
            rewardPoints: record.reward_points ? parseInt(record.reward_points) : null,
            rewardPointsClassification: record.reward_points_classification || null,
            commonEventInfo: record.common_event_info || null,
            adultVerification: record.adult_verification || null,
            optionUsage: record.option_usage || null,
            itemCompositionMethod: record.item_composition_method || null,
            optionDisplayMethod: record.option_display_method || null,
            optionSetName: record.option_set_name || null,
            optionInput: record.option_input || null,
            optionStyle: record.option_style || null,
            buttonImageSetting: record.button_image_setting || null,
            colorSetting: record.color_setting || null,
            requiredOrNot: record.required_or_not || null,
            outOfStockDisplayText: record.out_of_stock_display_text || null,
            additionalInputOption: record.additional_input_option || null,
            additionalInputOptionName: record.additional_input_option_name || null,
            additionalInputOptionRequiredOrNot: record.additional_input_option_required_or_not || null,
            inputCharacterCount: record.input_character_count || null,
            imageRegistrationDetail: record.image_registration_detail || null,
            imageRegistrationList: record.image_registration_list || null,
            imageRegistrationSmallList: record.image_registration_small_list || null,
            imageRegistrationThumbnail: record.image_registration_thumbnail || null,
            manufacturer: record.manufacturer || null,
            supplier: record.supplier || null,
            brand: record.brand || null,
            trend: record.trend || null,
            ownClassificationCode: record.own_classification_code || null,
            manufacturingDate: record.manufacturing_date || null,
            releaseDate: record.release_date || null,
            validityPeriodUsage: record.validity_period_usage || null,
            validityPeriod: record.validity_period || null,
            origin: record.origin ? parseInt(record.origin) : null,
            productVolume: record.product_volume || null,
            volumeWeight: record.volume_weight || null,
            productPaymentGuide: record.product_payment_guide || null,
            productDeliveryGuide: record.product_delivery_guide || null,
            exchangeReturnGuide: record.exchange_return_guide || null,
            serviceInquiryGuide: record.service_inquiry_guide || null,
            deliveryInfo: record.delivery_info || null,
            deliveryMethod: record.delivery_method || null,
            domesticOverseasDelivery: record.domestic_overseas_delivery || null,
            deliveryArea: record.delivery_area || null,
            deliveryFeePrepaymentSetting: record.delivery_fee_prepayment_setting || null,
            deliveryPeriod: record.delivery_period || null,
            deliveryFeeClassification: record.delivery_fee_classification || null,
            deliveryFeeInput: record.delivery_fee_input || null,
            productClassificationCustoms: record.product_classification_customs || null,
            productMaterial: record.product_material || null,
            englishProductMaterialCustoms: record.english_product_material_customs || null,
            fabricCustoms: record.fabric_customs || null,
            seoSearchEngineExposureSetting: record['검색엔진최적화(SEO) 검색엔진 노출 설정'] || null,
            seoTitle: record['검색엔진최적화(SEO) Title'] || null,
            seoAuthor: record['검색엔진최적화(SEO) Author'] || null,
            seoDescription: record['검색엔진최적화(SEO) Description'] || null,
            seoKeywords: record['검색엔진최적화(SEO) Keywords'] || null,
            seoProductImageAltText: record['검색엔진최적화(SEO) 상품 이미지 Alt 텍스트'] || null,
            individualPaymentMethodSetting: record.individual_payment_method_setting || null,
            productDeliveryTypeCode: record.product_delivery_type_code || null,
            storePickupSetting: record.store_pickup_setting || null,
            productTotalWeight: record.product_total_weight ? parseFloat(record.product_total_weight) : null,
            hsCode: record.hs_code ? BigInt(record.hs_code) : null,
            additionalItem01TodayDepartureDeliveryUsage: record.additional_item_01_today_departure_delivery_usage || null,
            additionalItem02TodayDepartureDeliveryTime: record.additional_item_02_today_departure_delivery_time || null,
            additionalItem03StorageMethod: record.additional_item_03_storage_method || null,
            additionalItem04Origin: record.additional_item_04_origin || null,
            additionalItem05Event: record.additional_item_05_event || null,
            additionalItem06ParcelDelivery: record.additional_item_06_parcel_delivery || null,
          });
        } catch (error) {
          skippedCount++;
          console.error(`⚠️  Error parsing product record:`, error instanceof Error ? error.message : String(error));
        }
      }

      console.log(`✅ Prepared ${productsToInsert.length} products (skipped ${skippedCount})`);
      
      // ========================================
      // STEP 2: Insert all products first (without updating images)
      // ========================================
      console.log('📝 Inserting all products...');
      
      // Insert products one by one to maintain index mapping
      let insertedCount = 0;
      const insertedProductIds: string[] = [];
      
      for (let i = 0; i < productsToInsert.length; i++) {
        const productData = productsToInsert[i];
        
        try {
          // Insert product
          const product = await prisma.product.create({
            data: productData,
          });
          
          insertedProductIds.push(product.id);
          insertedCount++;
          
          if (insertedCount % 50 === 0) {
            console.log(`📝 Inserted ${insertedCount}/${productsToInsert.length} products...`);
          }
        } catch (error) {
          console.error(`⚠️  Error inserting product ${i}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      console.log(`✅ Successfully imported ${insertedCount} products from CSV`);
      
      // ========================================
      // STEP 3: Update images for products based on getFolderForProduct mapping
      // ========================================
      console.log('🖼️  Updating product images from S3...');
      
      // Initialize S3 client
      const s3Client = getS3Client();
      const bucket = process.env.AWS_S3_BUCKET || '';
      
      // Check S3 permissions early by testing with a dummy folder
      let canAccessS3 = false;
      if (bucket) {
        try {
          // Test S3 access with a non-existent folder to check permissions
          const testCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: 'seed/_permission_test_',
            MaxKeys: 1,
          });
          await s3Client.send(testCommand);
          canAccessS3 = true;
          
          // List all folders in S3 to help debug mapping issues
          try {
            const listFoldersCommand = new ListObjectsV2Command({
              Bucket: bucket,
              Prefix: 'seed/',
              Delimiter: '/',
            });
            const foldersResponse = await s3Client.send(listFoldersCommand);
            const folders = (foldersResponse.CommonPrefixes || [])
              .map(prefix => prefix.Prefix)
              .filter((prefix): prefix is string => !!prefix)
              .map(prefix => prefix.replace('seed/', '').replace('/', ''));
            
            if (folders.length > 0) {
              console.log(`📁 Found ${folders.length} folders in S3:`);
              folders.slice(0, 20).forEach(folder => console.log(`   - ${folder}`));
              if (folders.length > 20) {
                console.log(`   ... and ${folders.length - 20} more folders`);
              }
              
              // Get unique folder paths from mapping
              const mappingFolders = new Set<string>();
              for (let num = 0; num < 300; num++) {
                const folder = getFolderForProduct(num);
                if (folder) {
                  const folderName = folder.replace('seed/', '');
                  mappingFolders.add(folderName);
                }
              }
              
              // Create reverse mapping from S3 folder names to mapping folder names
              // This helps handle encoding issues
              const s3ToMappingMap: { [key: string]: string } = {};
              for (const s3Folder of folders) {
                // Try to find matching folder in mapping (normalize for comparison)
                const normalizedS3 = s3Folder.trim().normalize('NFC');
                let found = false;
                for (const mappingFolder of mappingFolders) {
                  const normalizedMapping = mappingFolder.trim().normalize('NFC');
                  if (normalizedS3 === normalizedMapping) {
                    s3ToMappingMap[`seed/${mappingFolder}`] = `seed/${s3Folder}`;
                    found = true;
                    break;
                  }
                }
                // If not found, try fuzzy matching (remove spaces, compare)
                if (!found) {
                  const s3NoSpaces = normalizedS3.replace(/\s+/g, '');
                  for (const mappingFolder of mappingFolders) {
                    const mappingNoSpaces = mappingFolder.trim().normalize('NFC').replace(/\s+/g, '');
                    if (s3NoSpaces === mappingNoSpaces) {
                      s3ToMappingMap[`seed/${mappingFolder}`] = `seed/${s3Folder}`;
                      break;
                    }
                  }
                }
              }
              
              // Add reverse mappings to folderNameMapping
              Object.assign(folderNameMapping, s3ToMappingMap);
              
              // Log mappings created
              if (Object.keys(s3ToMappingMap).length > 0) {
                console.log(`🔗 Created ${Object.keys(s3ToMappingMap).length} folder name mappings`);
              }
              
              // Find folders in mapping but not in S3 (after reverse mapping)
              const missingFolders = Array.from(mappingFolders).filter(f => {
                const normalizedF = f.normalize('NFC');
                return !folders.some(s3f => s3f.normalize('NFC') === normalizedF);
              });
              if (missingFolders.length > 0) {
                console.warn(`⚠️  ${missingFolders.length} folders in mapping but not found in S3:`);
                missingFolders.slice(0, 10).forEach(folder => console.warn(`   - ${folder}`));
                if (missingFolders.length > 10) {
                  console.warn(`   ... and ${missingFolders.length - 10} more`);
                }
              }
            }
          } catch (listError) {
            // Ignore errors when listing folders, not critical
          }
        } catch (error: any) {
          if (error?.Code === 'AccessDenied' || error?.name === 'AccessDenied') {
            console.warn('⚠️  S3 ListBucket permission denied. Skipping all image updates.');
            console.warn('   To enable image updates, add s3:ListBucket permission to your IAM user.');
            canAccessS3 = false;
          } else {
            // Other errors might be okay (e.g., bucket doesn't exist, network issues)
            // We'll try anyway and handle errors per-folder
            canAccessS3 = true;
          }
        }
      } else {
        console.warn('⚠️  AWS_S3_BUCKET not configured, skipping image updates');
      }
      
      // Update images for each product based on productNumber (index)
      let updatedImageCount = 0;
      
      if (bucket && canAccessS3) {
        for (let i = 0; i < insertedProductIds.length; i++) {
          const productId = insertedProductIds[i];
          const productNumber = i; // productNumber is 0-based index
          
          try {
            const folderPath = getFolderForProduct(productNumber);
            if (folderPath) {
              try {
                // Get random images for all 4 image fields
                const [thumbnail, list, smallList, detail] = await Promise.all([
                  getRandomImageFromFolder(s3Client, bucket, folderPath),
                  getRandomImageFromFolder(s3Client, bucket, folderPath),
                  getRandomImageFromFolder(s3Client, bucket, folderPath),
                  getRandomImageFromFolder(s3Client, bucket, folderPath),
                ]);
                
                // Only update fields that have valid images
                const updateData: {
                  imageRegistrationThumbnail?: string;
                  imageRegistrationList?: string;
                  imageRegistrationSmallList?: string;
                  imageRegistrationDetail?: string;
                } = {};
                if (thumbnail) updateData.imageRegistrationThumbnail = thumbnail;
                if (list) updateData.imageRegistrationList = list;
                if (smallList) updateData.imageRegistrationSmallList = smallList;
                if (detail) updateData.imageRegistrationDetail = detail;
                
                // Update product with images if we got at least one
                if (Object.keys(updateData).length > 0) {
                  await prisma.product.update({
                    where: { id: productId },
                    data: updateData,
                  });
                  
                  updatedImageCount++;
                  if (updatedImageCount % 50 === 0) {
                    console.log(`🖼️  Updated images for ${updatedImageCount} products...`);
                  }
                }
              } catch (error) {
                // Error already handled in getRandomImageFromFolder
              }
            }
          } catch (error) {
            console.error(`⚠️  Error updating images for product ${productNumber}:`, error instanceof Error ? error.message : String(error));
          }
        }
        
        console.log(`✅ Updated images for ${updatedImageCount} products from S3`);
      }
      
    } catch (error) {
      console.error('❌ Error importing products CSV:', error);
    }
  } else {
    console.log('⚠️  Products CSV file not found at', productsCsvPath);
  }

  console.log('✨ Seed completed successfully!');
}

// ========================================
// FUNCTION 3: Seed Orders (Import orders from CSV)
// ========================================
async function seedOrders() {
  // ========================================
  // Import orders from CSV
  // ========================================
  await prisma.order.deleteMany();
  await prisma.orderGroup.deleteMany();
  const ordersCsvPath = '/Users/nhannguyen/Documents/orders_test_1.csv';
  
  if (fs.existsSync(ordersCsvPath)) {
    console.log('📥 Importing orders from CSV...');
    try {
      // Read CSV and remove BOM if present
      let csvContent = fs.readFileSync(ordersCsvPath, 'utf-8');
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      
      const records: OrderCsvRecord[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      console.log(`📊 Found ${records.length} orders in CSV`);

      // Get all existing product IDs to validate foreign keys
      const existingProducts = await prisma.product.findMany({
        select: { id: true }
      });
      const existingProductIds = new Set(existingProducts.map(p => p.id));
      console.log(`📦 Found ${existingProductIds.size} products in database`);

      // Get all existing user IDs to validate foreign keys
      const existingUsers = await prisma.user.findMany({
        select: { id: true }
      });
      const existingUserIds = new Set(existingUsers.map(u => u.id));
      console.log(`👥 Found ${existingUserIds.size} users in database`);

      // ========================================
      // Step 1: Create OrderGroups from unique order group numbers
      // ========================================
      console.log('📦 Creating order groups...');
      
      // Group orders by orderGroupNumber to aggregate data
      // Note: First column is orderGroupNumber, second column is orderNumber
      const orderGroupsMap = new Map<string, {
        orders: OrderCsvRecord[];
        totalOrderAmount: number;
        totalPaymentAmount: number;
        ordererId: string | null;
      }>();

      for (const record of records) {
        // First column is orderGroupNumber (was order_number)
        const orderGroupNumber = record.order_number;
        if (orderGroupNumber) {
          if (!orderGroupsMap.has(orderGroupNumber)) {
            orderGroupsMap.set(orderGroupNumber, {
              orders: [],
              totalOrderAmount: 0,
              totalPaymentAmount: 0,
              ordererId: null,
            });
          }
          
          const group = orderGroupsMap.get(orderGroupNumber)!;
          group.orders.push(record);
          
          // Aggregate amounts
          if (record.total_order_amount) {
            group.totalOrderAmount += parseInt(record.total_order_amount);
          }
          if (record.total_payment_amount) {
            group.totalPaymentAmount += parseInt(record.total_payment_amount);
          }
          
          // Set ordererId from the first order in the group (or use the one from record)
          if (!group.ordererId && record.orderer_id) {
            // Validate ordererId - set to null if not exists in DB
            const ordererId = existingUserIds.has(record.orderer_id) ? record.orderer_id : null;
            group.ordererId = ordererId;
          }
        }
      }

      console.log(`📋 Found ${orderGroupsMap.size} unique order groups`);

      // Create OrderGroup records
      const orderGroupsToCreate = Array.from(orderGroupsMap.entries()).map(([orderGroupNumber, data]) => ({
        orderGroupNumber: orderGroupNumber,
        orderGroupName: `Order Group ${orderGroupNumber}`,
        originalAmount: data.totalOrderAmount,
        discountAmount: 0,
        finalAmount: data.totalPaymentAmount,
        pointsUsed: 0,
        cartItemIds: [],
        deliveryFee: 0,
        ordererId: data.ordererId,
      }));

      // Insert OrderGroups in batches
      const ORDER_GROUP_BATCH_SIZE = 100;
      let createdOrderGroups = 0;
      
      for (let i = 0; i < orderGroupsToCreate.length; i += ORDER_GROUP_BATCH_SIZE) {
        const batch = orderGroupsToCreate.slice(i, i + ORDER_GROUP_BATCH_SIZE);
        await prisma.orderGroup.createMany({
          data: batch,
          skipDuplicates: true,
        });
        createdOrderGroups += batch.length;
        console.log(`📝 Created ${createdOrderGroups}/${orderGroupsToCreate.length} order groups...`);
      }

      console.log(`✅ Successfully created ${createdOrderGroups} order groups`);

      // ========================================
      // Step 2: Create Orders
      // ========================================
      console.log('📦 Creating orders...');
      
      const ordersToInsert: any[] = [];
      let skippedCount = 0;
      let invalidProductIdCount = 0;

      for (const record of records) {
        try {
          // Validate productId - set to null if not exists in DB
          let productId = record.product_id || null;
          if (productId && !existingProductIds.has(productId)) {
            productId = null;
            invalidProductIdCount++;
          }

          ordersToInsert.push({
            // First column is orderGroupNumber, second column is orderNumber
            orderGroupNumber: record.order_number || null,
            orderNumber: record['품목별 주문번호'] || null,
            totalOrderAmount: record.total_order_amount ? parseInt(record.total_order_amount) : null,
            totalPaymentAmount: record.total_payment_amount ? parseInt(record.total_payment_amount) : null,
            productId: productId,
            productName: record.product_name || '',
            productNameWithOptions: record['주문상품명(옵션포함)'] || '',
            quantity: record.quantity ? parseInt(record.quantity) : null,
            recipient: record.recipient || '',
            recipientAddressFull: record.recipient_address_full || '',
            recipientPostalCode: record.recipient_postal_code ? parseInt(record.recipient_postal_code) : null,
            recipientMobilePhone: record.recipient_mobile_phone || '',
            recipientPhoneNumber: record.recipient_phone_number || '',
            deliveryMessage: record.delivery_message || '',
            salePrice: record.sale_price ? parseInt(record.sale_price) : null,
            paymentType: record.payment_type || '',
            paymentMethod: record.payment_method || '',
            orderDate: record.order_date || '',
            ordererName: record.orderer_name || '',
            ordererMobilePhone: record.orderer_mobile_phone || '',
            ordererId: record.orderer_id || null,
            desiredDeliveryDate: record.desired_delivery_date || '',
            membershipLevelAtOrderTime: record.membership_level_at_order_time || '',
          });
        } catch (error) {
          skippedCount++;
          console.error(`⚠️  Error parsing order record:`, error instanceof Error ? error.message : String(error));
        }
      }

      console.log(`✅ Prepared ${ordersToInsert.length} orders (skipped ${skippedCount}, ${invalidProductIdCount} orders with invalid productId set to null)`);
      
      // Batch insert orders in chunks
      const ORDER_BATCH_SIZE = 500;
      let insertedCount = 0;
      
      for (let i = 0; i < ordersToInsert.length; i += ORDER_BATCH_SIZE) {
        const batch = ordersToInsert.slice(i, i + ORDER_BATCH_SIZE);
        await prisma.order.createMany({
          data: batch,
          skipDuplicates: true,
        });
        insertedCount += batch.length;
        console.log(`📝 Inserted ${insertedCount}/${ordersToInsert.length} orders...`);
      }
      
      console.log(`✅ Successfully imported ${insertedCount} orders from CSV`);
      
    } catch (error) {
      console.error('❌ Error importing orders CSV:', error);
    }
  } else {
    console.log('⚠️  Orders CSV file not found at', ordersCsvPath);
  }

  console.log('✨ Seed completed successfully!');
}

// ========================================
// FUNCTION 4: Seed Points (Import points from CSV)
// ========================================
async function seedPoints() {
  // ========================================
  // Import points from CSV
  // ========================================
  const pointsCsvPath = '/Users/nhannguyen/Documents/points_test_1.csv';
  
  if (fs.existsSync(pointsCsvPath)) {
    console.log('📥 Importing points from CSV...');
    try {
      // Read CSV and remove BOM if present
      let csvContent = fs.readFileSync(pointsCsvPath, 'utf-8');
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      
      const records: PointCsvRecord[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      console.log(`📊 Found ${records.length} points in CSV`);

      // Get all existing user IDs to validate foreign keys
      const existingUsers = await prisma.user.findMany({
        select: { id: true }
      });
      const existingUserIds = new Set(existingUsers.map(u => u.id));
      console.log(`👥 Found ${existingUserIds.size} users in database`);

      // Get all existing order group numbers to validate foreign keys
      const existingOrderGroups = await prisma.orderGroup.findMany({
        select: { orderGroupNumber: true }
      });
      const orderGroupNumberArray: string[] = existingOrderGroups
        .map(og => og.orderGroupNumber)
        .filter((num): num is string => typeof num === 'string');
      const existingOrderGroupNumbers = new Set<string>(orderGroupNumberArray);
      console.log(`📦 Found ${existingOrderGroupNumbers.size} order groups in database`);

      // Prepare data for batch insert
      const pointsToInsert: any[] = [];
      let skippedCount = 0;
      let invalidUserIdCount = 0;
      let invalidOrderGroupCount = 0;

      for (const record of records) {
        try {
          // Validate userId - set to null if not exists in DB
          let userId = record.user_id || null;
          if (userId && !existingUserIds.has(userId)) {
            userId = null;
            invalidUserIdCount++;
          }

          // Validate orderGroupNumber - set to null if not exists in DB
          let orderGroupNumber = record.order_number || null;
          if (orderGroupNumber && !existingOrderGroupNumbers.has(orderGroupNumber)) {
            orderGroupNumber = null;
            invalidOrderGroupCount++;
          }

          pointsToInsert.push({
            date: record.date || null,
            userId: userId,
            membershipLevel: record.membership_level || null,
            content: record.content || null,
            orderGroupNumber: orderGroupNumber,
            pointsType: record.points_type || null,
            availablePointsIncrease: record.available_points_increase ? parseInt(record.available_points_increase) : null,
            availablePointsDeduction: record.available_points_deduction ? parseInt(record.available_points_deduction) : null,
            availablePointsBalance: record.available_points_balance ? parseInt(record.available_points_balance) : null,
          });
        } catch (error) {
          skippedCount++;
          console.error(`⚠️  Error parsing point record:`, error instanceof Error ? error.message : String(error));
        }
      }

      console.log(`✅ Prepared ${pointsToInsert.length} points (skipped ${skippedCount}, ${invalidUserIdCount} points with invalid userId set to null, ${invalidOrderGroupCount} points with invalid orderGroupNumber set to null)`);
      
      // Batch insert in chunks
      const BATCH_SIZE = 500;
      let insertedCount = 0;
      
      for (let i = 0; i < pointsToInsert.length; i += BATCH_SIZE) {
        const batch = pointsToInsert.slice(i, i + BATCH_SIZE);
        await prisma.point.createMany({
          data: batch,
          skipDuplicates: true,
        });
        insertedCount += batch.length;
        console.log(`📝 Inserted ${insertedCount}/${pointsToInsert.length} points...`);
      }
      
      console.log(`✅ Successfully imported ${insertedCount} points from CSV`);
      
    } catch (error) {
      console.error('❌ Error importing points CSV:', error);
    }
  } else {
    console.log('⚠️  Points CSV file not found at', pointsCsvPath);
  }

  console.log('✨ Seed completed successfully!');
}

// ========================================
// FUNCTION 5: Seed Categories and Update Product Categories
// ========================================
async function seedCategories() {
  console.log('🌱 Starting seed...');

  // Seed Categories
  console.log('📂 Seeding categories...');
  
  const categories = [
    { name: 'LIVESTOCK', description: '라이브스톡 (축산물)' },
    { name: 'SIDE_DISH', description: '사이드 요리 (반찬)' },
    { name: 'CONVENIENCE_FOOD', description: '편의점 음식 (간편식)' },
    { name: 'FISHERIES', description: '수산물' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name as any },
      update: {},
      create: {
        name: category.name as any,
        description: category.description,
      },
    });
  }

  console.log('✅ Successfully seeded 4 categories');

  // Get category numbers
  const livestockCategory = await prisma.category.findUnique({ where: { name: 'LIVESTOCK' } });
  const sideDishCategory = await prisma.category.findUnique({ where: { name: 'SIDE_DISH' } });
  const convenienceFoodCategory = await prisma.category.findUnique({ where: { name: 'CONVENIENCE_FOOD' } });
  const fisheriesCategory = await prisma.category.findUnique({ where: { name: 'FISHERIES' } });

  if (!livestockCategory || !sideDishCategory || !convenienceFoodCategory || !fisheriesCategory) {
    throw new Error('Categories not found');
  }

  console.log('📦 Updating product categories...');
  
  // Clear all existing product categories first
  console.log('🗑️  Clearing all existing product categories...');
  await prisma.product.updateMany({
    data: { productCategoryNumber: null }
  });
  console.log('✅ Cleared all product categories');
  
  // Get all products to find their IDs by row number
  // Note: Assuming row number is based on creation order (createdAt)
  const allProducts = await prisma.product.findMany({
    select: { id: true, productCode: true, productName: true, productCategoryNumber: true }
  });

  console.log(`  Found ${allProducts.length} products in database`);

  // Product category mapping by row index (1-based)
  const productCategoryMap: { [key: number]: number } = {
    // LIVESTOCK (축산)
    56: livestockCategory.productCategoryNumber,
    102: livestockCategory.productCategoryNumber,
    119: livestockCategory.productCategoryNumber,
    120: livestockCategory.productCategoryNumber,
    121: livestockCategory.productCategoryNumber,
    256: livestockCategory.productCategoryNumber,
    252: livestockCategory.productCategoryNumber,
    39: livestockCategory.productCategoryNumber,
    43: livestockCategory.productCategoryNumber,
    45: livestockCategory.productCategoryNumber,
    260: livestockCategory.productCategoryNumber,
    272: livestockCategory.productCategoryNumber,
    38: livestockCategory.productCategoryNumber,
    109: livestockCategory.productCategoryNumber,
    271: livestockCategory.productCategoryNumber,
    24: livestockCategory.productCategoryNumber,
    32: livestockCategory.productCategoryNumber,
    275: livestockCategory.productCategoryNumber,
    257: livestockCategory.productCategoryNumber,
    88: livestockCategory.productCategoryNumber,
    143: livestockCategory.productCategoryNumber,
    95: livestockCategory.productCategoryNumber,
    158: livestockCategory.productCategoryNumber,
    262: livestockCategory.productCategoryNumber,
    261: livestockCategory.productCategoryNumber,
    6: livestockCategory.productCategoryNumber,
    14: livestockCategory.productCategoryNumber,
    
    // CONVENIENCE_FOOD (간편식)
    258: convenienceFoodCategory.productCategoryNumber,
    278: convenienceFoodCategory.productCategoryNumber,
    46: convenienceFoodCategory.productCategoryNumber,
    255: convenienceFoodCategory.productCategoryNumber,
    277: convenienceFoodCategory.productCategoryNumber,
    276: convenienceFoodCategory.productCategoryNumber,
    270: convenienceFoodCategory.productCategoryNumber,
    
    // FISHERIES (수산)
    268: fisheriesCategory.productCategoryNumber,
    115: fisheriesCategory.productCategoryNumber,
    133: fisheriesCategory.productCategoryNumber,
    249: fisheriesCategory.productCategoryNumber,
    
    // SIDE_DISH (반찬)
    267: sideDishCategory.productCategoryNumber,
    266: sideDishCategory.productCategoryNumber,
    33: sideDishCategory.productCategoryNumber,
  };

  let updatedCount = 0;
  
  for (const [rowIndex, categoryNumber] of Object.entries(productCategoryMap)) {
    const productIndex = parseInt(rowIndex) - 1; // Convert to 0-based index
    
    if (productIndex >= 0 && productIndex < allProducts.length) {
      const product = allProducts[productIndex];
      
      await prisma.product.update({
        where: { id: product.id },
        data: { productCategoryNumber: categoryNumber },
      });
      
      updatedCount++;
      console.log(`  ✓ Updated product ${rowIndex}: ${product.productName || product.productCode}`);
    } else {
      console.log(`  ⚠️  Product at row ${rowIndex} not found`);
    }
  }

  console.log(`✅ Successfully updated ${updatedCount} products with categories`);
  console.log('✨ Seed completed successfully!');
}

// ========================================
// FUNCTION 6: Seed Memberships
// ========================================
async function seedMemberships(){
  console.log('🌱 Starting seed...');
  
  // Seed Memberships
  console.log('🎖️  Seeding memberships...');
  
  const memberships = [
    { name: 'LV1. 씨앗', description: null, minPrice: 0 },
    { name: 'LV2. 새싹', description: null, minPrice: 150000 },
    { name: 'LV3. 열매', description: null, minPrice: 300000 },
    { name: 'LV4. 나무', description: null, minPrice: 500000 },
    { name: 'LV5. 정원', description: null, minPrice: 1000000 },
  ];

  for (const membership of memberships) {
    await prisma.membership.upsert({
      where: { name: membership.name },
      update: {
        minPrice: membership.minPrice,
      },
      create: {
        name: membership.name,
        description: membership.description,
        minPrice: membership.minPrice,
      },
    });
    console.log(`  ✓ Created/Updated membership: ${membership.name} (₩${membership.minPrice.toLocaleString()})`);
  }

  console.log('✅ Successfully seeded 5 memberships');
  console.log('✨ Seed completed successfully!');
}

// ========================================
// FUNCTION 7: Seed Memberships and User Memberships
// ========================================
async function seedUserMemberships() {
  console.log('🌱 Starting seed...');
  
  // Seed Memberships
  console.log('🎖️  Seeding memberships...');
  
  const memberships = [
    { name: 'LV1. 씨앗', description: null, minPrice: 0 },
    { name: 'LV2. 새싹', description: null, minPrice: 150000 },
    { name: 'LV3. 열매', description: null, minPrice: 300000 },
    { name: 'LV4. 나무', description: null, minPrice: 500000 },
    { name: 'LV5. 정원', description: null, minPrice: 1000000 },
  ];

  for (const membership of memberships) {
    await prisma.membership.upsert({
      where: { name: membership.name },
      update: {
        minPrice: membership.minPrice,
        description: membership.description,
      },
      create: {
        name: membership.name,
        description: membership.description,
        minPrice: membership.minPrice,
      },
    });
    console.log(`  ✓ Created/Updated membership: ${membership.name} (₩${membership.minPrice.toLocaleString()})`);
  }

  console.log('✅ Successfully seeded memberships');

  // Seed User Memberships
  console.log('🔗 Seeding user memberships...');
  
  // Get all users with membershipLevel
  const usersWithMembership = await prisma.user.findMany({
    where: {
      membershipLevel: {
        not: null,
      },
    },
    select: {
      id: true,
      membershipLevel: true,
    },
  });

  console.log(`📊 Found ${usersWithMembership.length} users with membership level`);

  // Get all memberships to create a map
  const allMemberships = await prisma.membership.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      basePeriod: true,
    },
  });

  const membershipMap = new Map(allMemberships.map(m => [m.name, m]));
  console.log(`📊 Found ${allMemberships.length} memberships in database`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const user of usersWithMembership) {
    if (!user.membershipLevel) {
      skippedCount++;
      continue;
    }

    // Find membership by name matching user's membershipLevel
    const membership = membershipMap.get(user.membershipLevel);
    
    if (!membership) {
      console.log(`⚠️  Membership not found for level: ${user.membershipLevel} (user: ${user.id})`);
      skippedCount++;
      continue;
    }

    // Ensure membership name is not null
    if (!membership.name) {
      console.log(`⚠️  Membership name is null for membership ID: ${membership.id} (user: ${user.id})`);
      skippedCount++;
      continue;
    }

    // Check if user_membership already exists
    const existingUserMembership = await prisma.userMembership.findUnique({
      where: { userId: user.id },
    });

    if (existingUserMembership) {
      console.log(`  ⏭️  User membership already exists for user: ${user.id}`);
      skippedCount++;
      continue;
    }

    // Calculate dates based on basePeriod or default to 1 year
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + (membership.basePeriod ? Math.floor(membership.basePeriod / 365) : 1));

    try {
      await prisma.userMembership.create({
        data: {
          userId: user.id,
          membershipId: membership.id,
          membershipName: membership.name,
          membershipDescription: membership.description || '',
          status: 'normal',
          startDate: startDate,
          endDate: endDate,
        },
      });
      createdCount++;
      console.log(`  ✓ Created user membership for user: ${user.id} -> ${membership.name}`);
    } catch (error) {
      console.error(`  ❌ Error creating user membership for user ${user.id}:`, error);
      skippedCount++;
    }
  }

  console.log(`✅ Successfully created ${createdCount} user memberships (skipped ${skippedCount})`);
  console.log('✨ Seed completed successfully!');
}

// ========================================
// FUNCTION 8: Seed Banners (All 5 types with proper distribution)
// ========================================
async function seedBanners() {
  // drop all banners
  const categories = await prisma.category.findMany({
    select: {
      productCategoryNumber: true,
      name: true,
    },
  });
  const categoryMap = new Map(categories.map(c => [c.name, c.productCategoryNumber]));
  console.log(`📊 Found ${categories.length} categories in database`);

  await prisma.banner.deleteMany();
  console.log('🌱 Starting banner seed...');
  
  // Seed Banners
  console.log('🎨 Seeding banners...');
  
  // Check if the specified product exists
  const product = await prisma.product.findFirst({
    where: { displayStatus: 'Y' },
    select: { id: true },
  });

  const mainProductId = product ? product.id : null;
  
  const tempProduct = await prisma.product.findFirst({
    where: { productCode: 'P00000CJ' },
    select: { id: true },
  });
  const tempProductId = tempProduct ? tempProduct.id : null;

  const banners = [
    // 1. MAIN_PRODUCTS Banner (1 banner)
    {
      type: 'MAIN_PRODUCTS',
      status: 'ACTIVE',
      productId: tempProductId,
      category: null,
      title: '쭈왕산가든이 처음이라면 주저 말고 담아가세요 👍🏻',
      badgeText: '신규회원 전용',
      mainText: 'Discover our premium selection of fresh products',
      ctaButtonText: '구매하러 가기',
      ctaButtonUrl: '/products',
      imageUrl: 'https://liflow-bucket.s3.ap-northeast-2.amazonaws.com/Section.jpg',
      mobileImageUrl: 'https://liflow-bucket.s3.ap-northeast-2.amazonaws.com/seed/10. 한우불고기 전골, 실속형/AAA01642.JPG',
      displayOrder: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    
    // 2. CATEGORY Banners (5 banners - 4 with CategoryType + 1 null)
    {
      type: 'CATEGORY',
      status: 'ACTIVE',
      productId: null,
      category: 'LIVESTOCK',
      title: 'Premium Livestock Products',
      badgeText: 'Fresh Daily',
      mainText: 'High-quality meat products delivered fresh',
      ctaButtonText: 'Browse Livestock',
      ctaButtonUrl: '/market?page=1&limit=24&displayStatus=Y&sortBy=createdAt&sortOrder=desc' + '&category=' + (categoryMap.get('LIVESTOCK') ?? ''),
      imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=800&fit=crop',
      displayOrder: 2,
      startDate: new Date(),
      endDate: null,
    },
    {
      type: 'CATEGORY',
      status: 'ACTIVE',
      productId: null,
      category: 'CONVENIENCE_FOOD',
      title: 'Convenient Ready-to-Eat Meals',
      badgeText: 'Quick & Easy',
      mainText: 'Delicious meals ready in minutes',
      ctaButtonText: 'View Convenience Food',
      ctaButtonUrl: '/market?page=1&limit=24&displayStatus=Y&sortBy=createdAt&sortOrder=desc' + '&category=' + (categoryMap.get('CONVENIENCE_FOOD') ?? ''),
      imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=800&fit=crop',
      displayOrder: 3,
      startDate: new Date(),
      endDate: null,
    },
    {
      type: 'CATEGORY',
      status: 'ACTIVE',
      productId: null,
      category: 'FISHERIES',
      title: 'Fresh Seafood Selection',
      badgeText: 'Ocean Fresh',
      mainText: 'Premium seafood from trusted suppliers',
      ctaButtonText: 'Explore Seafood',
      ctaButtonUrl: '/market?page=1&limit=24&displayStatus=Y&sortBy=createdAt&sortOrder=desc' + '&category=' + (categoryMap.get('FISHERIES') ?? ''),
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop',
      displayOrder: 4,
      startDate: new Date(),
      endDate: null,
    },
    {
      type: 'CATEGORY',
      status: 'ACTIVE',
      productId: null,
      category: 'SIDE_DISH',
      title: 'Delicious Side Dishes',
      badgeText: 'Homemade Style',
      mainText: 'Traditional Korean side dishes',
      ctaButtonText: 'View Side Dishes',
      ctaButtonUrl: '/market?page=1&limit=24&displayStatus=Y&sortBy=createdAt&sortOrder=desc' + '&category=' + (categoryMap.get('SIDE_DISH') ?? ''),
      imageUrl: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&h=800&fit=crop',
      displayOrder: 5,
      startDate: new Date(),
      endDate: null,
    },
    {
      type: 'CATEGORY',
      status: 'ACTIVE',
      productId: null,
      category: null, // NULL category banner
      title: 'All Categories',
      badgeText: 'Explore All',
      mainText: 'Browse our complete collection',
      ctaButtonText: 'See All',
      ctaButtonUrl: '/market?page=1&limit=24&displayStatus=Y&sortBy=createdAt&sortOrder=desc',
      imageUrl: 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=800&h=800&fit=crop',
      displayOrder: 6,
      startDate: new Date(),
      endDate: null,
    },
    
    // 3. FOOTER Banners (3 banners)
    {
      type: 'FOOTER',
      status: 'ACTIVE',
      productId: null,
      category: null,
      title: 'Join Our Newsletter',
      badgeText: 'Subscribe',
      mainText: 'Get exclusive deals and updates',
      ctaButtonText: 'Subscribe Now',
      ctaButtonUrl: '/newsletter',
      imageUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=1200&h=400&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800&h=400&fit=crop',
      displayOrder: 7,
      startDate: new Date(),
      endDate: null,
    },
    {
      type: 'FOOTER',
      status: 'ACTIVE',
      productId: null,
      category: null,
      title: 'Download Our App',
      badgeText: 'Get Mobile App',
      mainText: 'Shop easier with our mobile application',
      ctaButtonText: 'Download Now',
      ctaButtonUrl: '/app-download',
      imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&h=400&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=400&fit=crop',
      displayOrder: 8,
      startDate: new Date(),
      endDate: null,
    },
    {
      type: 'FOOTER',
      status: 'ACTIVE',
      productId: null,
      category: null,
      title: 'Customer Support',
      badgeText: '24/7 Support',
      mainText: 'We are here to help you anytime',
      ctaButtonText: 'Contact Us',
      ctaButtonUrl: '/contact',
      imageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&h=400&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=400&fit=crop',
      displayOrder: 9,
      startDate: new Date(),
      endDate: null,
    },
    
    // 4. CONTENT_HERO Banner (1 banner)
    {
      type: 'CONTENT_HERO',
      status: 'ACTIVE',
      productId: null,
      category: null,
      title: 'Welcome to Liflow',
      badgeText: 'New Experience',
      mainText: 'Your trusted source for fresh, quality products',
      ctaButtonText: 'Start Shopping',
      ctaButtonUrl: '/shop',
      imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1920&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=1000&fit=crop',
      displayOrder: 0, // Hero usually comes first
      startDate: new Date(),
      endDate: null,
    },
    
    // 5. SPECIAL_PRICE Banner (1 banner)
    {
      type: 'SPECIAL_PRICE',
      status: 'ACTIVE',
      productId: null,
      category: null,
      title: 'This Week\'s Special Deals',
      badgeText: '50% OFF',
      mainText: 'Limited time offers on selected products',
      ctaButtonText: 'View Deals',
      ctaButtonUrl: '/special-deals',
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=800&fit=crop',
      displayOrder: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  ];
  
  let createdCount = 0;
  
  for (const banner of banners) {
    try {
      await prisma.banner.create({
        data: banner as any,
      });
      createdCount++;
      console.log(`  ✓ Created ${banner.type} banner: ${banner.title}`);
    } catch (error) {
      console.error(`  ❌ Error creating banner ${banner.title}:`, error);
    }
  }
  
  console.log(`✅ Successfully created ${createdCount}/${banners.length} banners`);
  console.log('✨ Banner seed completed successfully!');
}

// ========================================
// FUNCTION 9: Seed Recipes
// ========================================
async function seedRecipes() {
  console.log('🌱 Starting recipe seed...');
  
  // Check if liflowadmin user exists
  const liflowAdmin = await prisma.user.findUnique({
    where: { id: 'liflowadmin' },
  });

  if (!liflowAdmin) {
    console.warn('⚠️  liflowadmin user not found. Please run seedUsers() first.');
    return;
  }

  const authorId = 'liflowadmin';
  const authorName = liflowAdmin.name || 'LiflowAdmin';

  // Clear existing recipes
  // await prisma.recipe.deleteMany({});
  // console.log('🗑️  Cleared existing recipes');

  const recipes = [
    {
      title: '언양불고기 만들기',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=600&fit=crop',
      content: `언양불고기는 경상남도 언양 지역의 대표적인 전통 요리입니다. 부드러운 고기와 달콤한 양념이 어우러진 이 요리는 가족 모임이나 손님 접대에 완벽한 메뉴입니다.

**재료 준비**
- 한우 불고기용 고기 500g
- 양파 1개
- 대파 2대
- 당근 1개
- 팽이버섯 1팩

**양념 재료**
- 간장 3큰술
- 설탕 2큰술
- 다진 마늘 1큰술
- 생강즙 1작은술
- 참기름 1큰술
- 후추 약간

**만드는 방법**
1. 고기는 얇게 썰어 준비합니다.
2. 양념 재료를 모두 섞어 고기에 버무려 30분 이상 재웁니다.
3. 팬에 기름을 두르고 고기를 볶습니다.
4. 야채를 넣고 함께 볶아 완성합니다.

**팁**
- 고기를 미리 재워두면 더욱 부드럽고 맛있습니다.
- 불을 너무 세게 하지 않아야 고기가 질기지 않습니다.`,
      ingredients: ['한우 불고기용 고기', '양파', '대파', '당근', '팽이버섯', '간장', '설탕', '마늘', '생강', '참기름'],
      dateOfWriting: new Date('2024-01-15'),
    },
    {
      title: '한우샤브샤브 레시피',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop',
      content: `한우샤브샤브는 고급스러운 한우를 부드럽게 데쳐 먹는 요리입니다. 신선한 고기의 원래 맛을 즐길 수 있는 건강한 요리입니다.

**재료**
- 한우 샤브샤브용 고기 300g
- 배추, 상추 등 쌈채소
- 당면 100g
- 표고버섯 5개
- 팽이버섯 1팩

**양념장**
- 간장 2큰술
- 식초 1큰술
- 설탕 1작은술
- 다진 파 1큰술
- 깨소금 약간

**만드는 방법**
1. 물을 끓여 육수를 만듭니다.
2. 고기를 얇게 썰어 준비합니다.
3. 끓는 물에 고기를 살짝 데칩니다.
4. 쌈채소와 함께 양념장에 찍어 먹습니다.

**추천**
- 고기는 너무 오래 데치지 않아야 부드러운 식감을 유지할 수 있습니다.`,
      ingredients: ['한우 샤브샤브용 고기', '배추', '상추', '당면', '표고버섯', '팽이버섯', '간장', '식초'],
      dateOfWriting: new Date('2024-01-20'),
    },
    {
      title: 'LA갈비 구이 완벽 가이드',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
      content: `LA갈비는 한국의 대표적인 고기 요리 중 하나입니다. 달콤하고 짭조름한 양념이 고기와 완벽하게 어우러지는 이 요리는 모든 연령대가 좋아하는 메뉴입니다.

**재료**
- LA갈비 1kg
- 양파 1개
- 대파 2대
- 마늘 5쪽

**양념**
- 간장 5큰술
- 설탕 3큰술
- 다진 마늘 2큰술
- 생강즙 1큰술
- 배즙 2큰술
- 참기름 1큰술
- 깨소금 1큰술

**만드는 방법**
1. 갈비는 찬물에 담가 핏물을 제거합니다.
2. 양념 재료를 모두 섞어 갈비에 버무립니다.
3. 최소 2시간 이상 재웁니다.
4. 그릴이나 팬에 구워 완성합니다.

**비법**
- 배즙을 넣으면 고기가 더욱 부드러워집니다.
- 중불에서 천천히 구워야 속까지 잘 익습니다.`,
      ingredients: ['LA갈비', '양파', '대파', '마늘', '간장', '설탕', '생강', '배', '참기름', '깨소금'],
      dateOfWriting: new Date('2024-02-01'),
    },
    {
      title: '제주흑돼지 불고기 특별 레시피',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=600&fit=crop',
      content: `제주흑돼지는 제주도의 특별한 재료로, 고소하고 깊은 맛이 특징입니다. 이 특별한 재료로 만드는 불고기는 그 맛이 일품입니다.

**재료**
- 제주흑돼지 불고기용 고기 500g
- 양파 1개
- 표고버섯 5개
- 당근 1개

**양념**
- 간장 4큰술
- 설탕 2큰술
- 다진 마늘 1큰술
- 생강즙 1작은술
- 맛술 2큰술
- 참기름 1큰술

**만드는 방법**
1. 고기는 적당한 크기로 썰어 준비합니다.
2. 양념을 만들어 고기에 버무립니다.
3. 1시간 이상 재웁니다.
4. 팬에 볶아 완성합니다.

**특징**
- 제주흑돼지는 일반 돼지고기보다 고소하고 깊은 맛이 있습니다.
- 적당한 지방 함량으로 부드러운 식감을 제공합니다.`,
      ingredients: ['제주흑돼지 불고기용 고기', '양파', '표고버섯', '당근', '간장', '설탕', '마늘', '생강', '맛술', '참기름'],
      dateOfWriting: new Date('2024-02-10'),
    },
    {
      title: '갈비탕 끓이는 법',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=600&fit=crop',
      content: `갈비탕은 한국의 대표적인 국물 요리입니다. 부드러운 갈비와 깔끔한 국물이 일품인 이 요리는 건강에도 좋아 많은 사람들이 즐겨 먹습니다.

**재료**
- 소갈비 1kg
- 무 300g
- 대파 2대
- 마늘 5쪽
- 생강 1쪽

**양념**
- 간장 3큰술
- 다진 마늘 1큰술
- 후추 약간

**만드는 방법**
1. 갈비는 찬물에 담가 핏물을 제거합니다.
2. 냄비에 갈비와 물을 넣고 끓입니다.
3. 첫 물은 버리고 깨끗한 물로 다시 끓입니다.
4. 무를 넣고 푹 끓입니다.
5. 양념을 넣고 간을 맞춥니다.
6. 대파를 넣고 마무리합니다.

**팁**
- 첫 물을 버리면 깔끔한 국물이 됩니다.
- 오래 끓일수록 부드러운 갈비를 즐길 수 있습니다.`,
      ingredients: ['소갈비', '무', '대파', '마늘', '생강', '간장', '후추'],
      dateOfWriting: new Date('2024-02-15'),
    },
    {
      title: '연평도 게장 담그기',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop',
      content: `연평도 게장은 신선한 꽃게로 만드는 전통 발효식품입니다. 깊은 맛과 풍부한 영양이 특징인 이 요리는 밥도둑으로 유명합니다.

**재료**
- 꽃게 5마리
- 고춧가루 1컵
- 간장 1/2컵
- 다진 마늘 3큰술
- 생강즙 2큰술
- 설탕 2큰술
- 맛술 2큰술

**만드는 방법**
1. 꽃게는 깨끗이 씻어 준비합니다.
2. 게의 등딱지를 벗기고 내장을 제거합니다.
3. 양념 재료를 모두 섞어 게장 양념을 만듭니다.
4. 게를 양념에 버무려 밀폐 용기에 담습니다.
5. 냉장고에서 3-5일 숙성시킵니다.

**주의사항**
- 신선한 게를 사용해야 안전합니다.
- 냉장 보관이 필수입니다.
- 숙성 기간 동안 주기적으로 뒤집어 줍니다.`,
      ingredients: ['꽃게', '고춧가루', '간장', '마늘', '생강', '설탕', '맛술'],
      dateOfWriting: new Date('2024-02-20'),
    },
    {
      title: '육개장 끓이기',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=600&fit=crop',
      content: `육개장은 매콤하고 시원한 국물 요리로, 특히 여름철에 인기 있는 메뉴입니다. 고기와 야채가 풍부하게 들어가 영양도 좋습니다.

**재료**
- 소고기 200g
- 고사리 100g
- 콩나물 200g
- 대파 2대
- 마늘 3쪽
- 고춧가루 2큰술

**양념**
- 간장 2큰술
- 다진 마늘 1큰술
- 참기름 1큰술
- 후추 약간

**만드는 방법**
1. 소고기는 채 썰어 준비합니다.
2. 고사리는 미리 불려 준비합니다.
3. 냄비에 기름을 두르고 고기를 볶습니다.
4. 고춧가루를 넣고 볶아 색을 냅니다.
5. 물을 넣고 끓입니다.
6. 고사리와 콩나물을 넣고 끓입니다.
7. 양념을 넣고 간을 맞춥니다.
8. 대파를 넣고 마무리합니다.

**추천**
- 고춧가루를 먼저 볶으면 더 진한 색과 맛이 납니다.`,
      ingredients: ['소고기', '고사리', '콩나물', '대파', '마늘', '고춧가루', '간장', '참기름'],
      dateOfWriting: new Date('2024-03-01'),
    },
    {
      title: '냉면 만드는 법',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&h=600&fit=crop',
      content: `냉면은 여름철 대표적인 음식입니다. 시원하고 깔끔한 맛이 특징인 이 요리는 더위를 식혀주는 완벽한 메뉴입니다.

**재료**
- 냉면 사리 4인분
- 소고기 200g
- 오이 1개
- 배 1/2개
- 계란 2개
- 무 100g

**육수**
- 소고기 500g
- 무 200g
- 양파 1개
- 대파 1대
- 마늘 5쪽
- 생강 1쪽

**양념**
- 설탕 2큰술
- 식초 3큰술
- 간장 1큰술
- 소금 약간

**만드는 방법**
1. 육수 재료를 넣고 끓여 육수를 만듭니다.
2. 육수를 식혀 냉장고에 넣어 차갑게 만듭니다.
3. 냉면 사리를 삶아 찬물에 헹굽니다.
4. 오이, 배, 무를 채 썹니다.
5. 계란은 삶아 반으로 자릅니다.
6. 그릇에 면을 담고 육수를 부어줍니다.
7. 고명을 올리고 양념을 넣어 완성합니다.

**비법**
- 육수는 미리 만들어 차갑게 보관하면 더욱 맛있습니다.`,
      ingredients: ['냉면 사리', '소고기', '오이', '배', '계란', '무', '양파', '대파', '마늘', '생강', '설탕', '식초', '간장'],
      dateOfWriting: new Date('2024-03-10'),
    },
    {
      title: '한우떡갈비 구이',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
      content: `한우떡갈비는 고급 한우로 만드는 떡갈비입니다. 부드럽고 고소한 맛이 일품인 이 요리는 특별한 날에 완벽한 메뉴입니다.

**재료**
- 한우 갈비살 500g
- 양파 1/2개
- 대파 1대
- 마늘 3쪽
- 생강 1쪽

**양념**
- 간장 3큰술
- 설탕 2큰술
- 다진 마늘 1큰술
- 생강즙 1작은술
- 참기름 1큰술
- 깨소금 1큰술
- 후추 약간

**만드는 방법**
1. 한우 갈비살은 다져서 준비합니다.
2. 양파, 대파, 마늘, 생강을 다져 넣습니다.
3. 양념을 넣고 잘 버무립니다.
4. 떡갈비 모양으로 만들어 준비합니다.
5. 그릴이나 팬에 구워 완성합니다.

**추천**
- 손으로 직접 버무리면 더욱 쫄깃한 식감을 얻을 수 있습니다.
- 중불에서 천천히 구워야 속까지 잘 익습니다.`,
      ingredients: ['한우 갈비살', '양파', '대파', '마늘', '생강', '간장', '설탕', '참기름', '깨소금'],
      dateOfWriting: new Date('2024-03-15'),
    },
    {
      title: '양념게장 레시피',
      category: 'RECIPE',
      thumbnailUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop',
      content: `양념게장은 꽃게를 양념에 재워 만드는 발효식품입니다. 매콤하고 짭조름한 맛이 특징인 이 요리는 밥과 함께 먹으면 일품입니다.

**재료**
- 꽃게 5마리
- 고춧가루 1컵
- 간장 1/2컵
- 다진 마늘 4큰술
- 생강즙 2큰술
- 설탕 3큰술
- 맛술 2큰술
- 참기름 1큰술

**만드는 방법**
1. 꽃게는 깨끗이 씻어 준비합니다.
2. 게의 등딱지를 벗기고 내장을 제거합니다.
3. 게를 적당한 크기로 자릅니다.
4. 양념 재료를 모두 섞어 양념장을 만듭니다.
5. 게를 양념에 버무려 밀폐 용기에 담습니다.
6. 냉장고에서 2-3일 숙성시킵니다.

**팁**
- 신선한 게를 사용하는 것이 가장 중요합니다.
- 숙성 기간 동안 주기적으로 뒤집어 주면 고르게 양념이 배어듭니다.
- 냉장 보관하여 신선도를 유지합니다.`,
      ingredients: ['꽃게', '고춧가루', '간장', '마늘', '생강', '설탕', '맛술', '참기름'],
      dateOfWriting: new Date('2024-03-20'),
    },
  ];

  let createdCount = 0;

  for (const recipe of recipes) {
    try {
      await prisma.recipe.create({
        data: {
          title: recipe.title,
          authorId: authorId,
          authorName: authorName,
          category: recipe.category as any,
          dateOfWriting: recipe.dateOfWriting,
          views: 0,
          status: 'active',
          thumbnailUrl: [],
          content: recipe.content,
          ingredients: recipe.ingredients,
          isActive: true,
        },
      });
      createdCount++;
      console.log(`  ✓ Created recipe: ${recipe.title}`);
    } catch (error) {
      console.error(`  ❌ Error creating recipe ${recipe.title}:`, error);
    }
  }

  console.log(`✅ Successfully created ${createdCount}/${recipes.length} recipes`);
  console.log('✨ Recipe seed completed successfully!');
}

// ========================================
// FUNCTION 10: Seed Test User
// ========================================
async function seedTestUser() {
  console.log('🌱 Starting test user seed...');
  
  const email = 'user@example.com';
  const password = '123456';
  const userId = 'testuser';
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  const registrationDate = new Date().toISOString().split('T')[0];
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  let testUser;
  if (existingUser) {
    // Update existing user
    testUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        name: 'Test User',
        email: email,
        membershipLevel: 'LV1. 씨앗',
        totalUsedPoints: 0,
        availablePoints: 0,
        totalPurchaseAmount: 0,
      },
    });
    console.log(`✅ Test user updated: ${testUser.id}`);
  } else {
    // Create new user
    testUser = await prisma.user.create({
      data: {
        id: userId,
        password: hashedPassword,
        name: 'Test User',
        email: email,
        registrationDate: registrationDate,
        membershipLevel: 'LV1. 씨앗',
        totalUsedPoints: 0,
        availablePoints: 0,
        totalPurchaseAmount: 0,
      },
    });
    console.log(`✅ Test user created: ${testUser.id}`);
  }
  
  // Get USER role
  const userRole = await prisma.role.findFirst({
    where: { name: 'USER' },
  });
  
  if (!userRole) {
    throw new Error('USER role not found. Please run seedUsers() first.');
  }
  
  // Check if userRole already exists
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: testUser.id,
      roleId: userRole.id,
    },
  });
  
  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: testUser.id,
        roleId: userRole.id,
      },
    });
    console.log(`✅ Assigned USER role to test user: ${testUser.id}`);
  } else {
    console.log(`⏭️  User role already exists for test user: ${testUser.id}`);
  }
  
  // Get LV1. 씨앗 membership
  const membership = await prisma.membership.findFirst({
    where: { name: 'LV1. 씨앗' },
  });
  
  if (!membership) {
    throw new Error('LV1. 씨앗 membership not found. Please run seedMemberships() first.');
  }
  
  // Check if userMembership already exists
  const existingUserMembership = await prisma.userMembership.findUnique({
    where: { userId: testUser.id },
  });
  
  if (!existingUserMembership) {
    // Calculate dates based on basePeriod or default to 1 year
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + (membership.basePeriod ? Math.floor(membership.basePeriod / 365) : 1));
    
    await prisma.userMembership.create({
      data: {
        userId: testUser.id,
        membershipId: membership.id,
        membershipName: membership.name || '',
        membershipDescription: membership.description || '',
        status: 'normal',
        startDate: startDate,
        endDate: endDate,
      },
    });
    console.log(`✅ Created user membership for test user: ${testUser.id} -> ${membership.name}`);
  } else {
    console.log(`⏭️  User membership already exists for test user: ${testUser.id}`);
  }
  
  console.log('✨ Test user seed completed successfully!');
}

async function seedCoupons() {
  console.log('🌱 Starting coupon seed...');

  await prisma.coupon.deleteMany();
  // return;
  const now = new Date();
  const oneMonthLater = new Date(now);
  oneMonthLater.setMonth(now.getMonth() + 1);
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(now.getMonth() + 3);
  
  const coupons = [
    // PERCENT type coupons
    {
      name: '생일 혜택 (전 등급 공통)',
      code: 'BIRTHDAY',
      type: CouponType.AMOUNT,
      discountRate: null,
      discountAmount: 10000,
      minPurchaseAmount: 30000,
      maxDiscountAmount: null,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: false,
      autoIssueDayOfMonth: null,
      targetGrades: ['LV1. 씨앗', 'LV2. 새싹', 'LV3. 열매', 'LV4. 나무', 'LV5. 정원'],
    },
    {
      name: '무료 배송 쿠폰 혜택',
      code: 'FREE_SHIPPING',
      type: CouponType.FREE_SHIPPING,
      discountRate: null,
      discountAmount: null,
      minPurchaseAmount: 0,
      maxDiscountAmount: null,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      targetGrades: [],
    },
    {
      name: '구매 지원 할인 쿠폰',
      code: 'SHOPPING_SUPPORT_LV2',
      type: CouponType.PERCENT,
      discountRate: 10,
      discountAmount: null,
      minPurchaseAmount: null,
      maxDiscountAmount: 10000,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      targetGrades: ['LV2. 새싹'],
    },
    {
      name: '구매 지원 할인 쿠폰',
      code: 'SHOPPING_SUPPORT_LV3',
      type: CouponType.PERCENT,
      discountRate: 10,
      discountAmount: null,
      minPurchaseAmount: null,
      maxDiscountAmount: 20000,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      targetGrades: ['LV3. 열매'],
    },
    {
      name: '구매 지원 할인 쿠폰',
      code: 'SHOPPING_SUPPORT_LV4',
      type: CouponType.PERCENT,
      discountRate: 15,
      discountAmount: null,
      minPurchaseAmount: null,
      maxDiscountAmount: 30000,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      targetGrades: ['LV4. 나무'],
    },
    {
      name: '구매 지원 할인 쿠폰',
      code: 'SHOPPING_SUPPORT_LV5',
      type: CouponType.PERCENT,
      discountRate: 20,
      discountAmount: null,
      minPurchaseAmount: null,
      maxDiscountAmount: 50000,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      targetGrades: ['LV5. 정원'],
    },
    {
      name: '스페셜 혜택',
      code: 'SPECIAL_BENEFIT',
      type: CouponType.AMOUNT,
      discountRate: null,
      discountAmount: 10000,
      minPurchaseAmount: 30000,
      maxDiscountAmount: null,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: false,
      autoIssueDayOfMonth: null,
      targetGrades: ['LV5. 정원'],
    }
    // {
    //   name: 'Shopping Support Discount Coupons',
    //   code: 'SHOPPING_SUPPORT',
    //   type: CouponType.AMOUNT,
    //   discountRate: null,
    //   discountAmount: 10000,
    //   minPurchaseAmount: 30000,
    //   maxDiscountAmount: null,
    //   imageUrl: null,
    //   startDate: now,
    //   endDate: threeMonthsLater,
    //   isActive: true,
    //   isAutoIssue: false,
    //   autoIssueDayOfMonth: null,
    //   targetGrades: ['LV3. 열매', 'LV4. 나무', 'LV5. 정원'],
    // },
    // AMOUNT type coupons
    // {
    //   name: '5,000원 할인 쿠폰',
    //   code: 'AMOUNT5000',
    //   type: CouponType.AMOUNT,
    //   discountRate: null,
    //   discountAmount: 5000,
    //   minPurchaseAmount: 30000,
    //   maxDiscountAmount: null,
    //   imageUrl: null,
    //   startDate: now,
    //   endDate: oneMonthLater,
    //   isActive: true,
    //   isAutoIssue: false,
    //   autoIssueDayOfMonth: null,
    //   targetGrades: [],
    // },
    // {
    //   name: '10,000원 할인 쿠폰',
    //   code: 'AMOUNT10000',
    //   type: CouponType.AMOUNT,
    //   discountRate: null,
    //   discountAmount: 10000,
    //   minPurchaseAmount: 50000,
    //   maxDiscountAmount: null,
    //   imageUrl: null,
    //   startDate: now,
    //   endDate: threeMonthsLater,
    //   isActive: true,
    //   isAutoIssue: false,
    //   autoIssueDayOfMonth: null,
    //   targetGrades: ['LV2. 새싹', 'LV3. 열매', 'LV4. 나무', 'LV5. 정원'],
    // },
    // {
    //   name: '20,000원 할인 쿠폰',
    //   code: 'AMOUNT20000',
    //   type: CouponType.AMOUNT,
    //   discountRate: null,
    //   discountAmount: 20000,
    //   minPurchaseAmount: 100000,
    //   maxDiscountAmount: null,
    //   imageUrl: null,
    //   startDate: now,
    //   endDate: threeMonthsLater,
    //   isActive: true,
    //   isAutoIssue: false,
    //   autoIssueDayOfMonth: null,
    //   targetGrades: ['LV3. 열매', 'LV4. 나무', 'LV5. 정원'],
    // },
    // {
    //   name: '30,000원 할인 쿠폰',
    //   code: 'AMOUNT30000',
    //   type: CouponType.AMOUNT,
    //   discountRate: null,
    //   discountAmount: 30000,
    //   minPurchaseAmount: 150000,
    //   maxDiscountAmount: null,
    //   imageUrl: null,
    //   startDate: now,
    //   endDate: threeMonthsLater,
    //   isActive: true,
    //   isAutoIssue: false,
    //   autoIssueDayOfMonth: null,
    //   targetGrades: ['LV4. 나무', 'LV5. 정원'],
    // },
  ];
  
  try {
    for (const coupon of coupons) {
      const data = {
        name: coupon.name,
        code: coupon.code,
        type: coupon.type,
        discountRate: coupon.discountRate ?? null,
        discountAmount: coupon.discountAmount ?? null,
        minPurchaseAmount: coupon.minPurchaseAmount ?? 0,
        maxDiscountAmount: coupon.maxDiscountAmount ?? null,
        imageUrl: coupon.imageUrl ?? null,
        isActive: coupon.isActive ?? true,
        isAutoIssue: coupon.isAutoIssue ?? false,
        isPermanent: coupon.isPermanent ?? false,
        autoIssueDayOfMonth: coupon.autoIssueDayOfMonth ?? null,
        targetGrades: coupon.targetGrades ?? [],
      };
      await prisma.coupon.upsert({
        where: { code: coupon.code },
        update: data,
        create: data,
      });
      console.log(`✅ Created/Updated coupon: ${coupon.name} (${coupon.code})`);
    }
    
    console.log(`✅ Successfully seeded ${coupons.length} coupons`);
  } catch (error) {
    console.error('❌ Error seeding coupons:', error);
    throw error;
  }
}


// ========================================
// MAIN FUNCTION - Run seed functions sequentially
// ========================================

async function updateAdmin () {
  const admin = await prisma.user.findUnique({
    where: {
      id: 'liflowadmin',
    },
  });
  if (admin) {
    await prisma.user.update({
      where: { id: 'liflowadmin' },
      data: { membershipLevel: 'LV1. 씨앗' },
    });
  }
}

async function updateBanner() {
  const mainProductBanner = await prisma.banner.findFirst({
    where: {
      type: 'MAIN_PRODUCTS',
    },
  });
  if (mainProductBanner) {
    await prisma.banner.update({
      where: { id: mainProductBanner.id },
      data: { mobileImageUrl: 'https://liflow-bucket.s3.ap-northeast-2.amazonaws.com/Section.jpg' },
    });
  }
}

// async function updateOrderGroup () {
//   const orderGroups = await prisma.orderGroup.findMany({
//     where: {
//       situation: OrderSituation.ORDER_IN_PREPARE,
//     },
//   });
//   for (const orderGroup of orderGroups) {
//     await prisma.orderGroup.update({
//       where: { orderGroupNumber: orderGroup.orderGroupNumber },
//       data: { situation: OrderSituation.ORDER_PAYMENT_COMPLETED },
//     });
//   }
// }
async function main() {
  // console.log('🚀 Starting complete database seeding process...\n');
  // return Promise.resolve().then(() => {
  //   console.log('Promise resolved');
  // })
  
  // await seedUsers();           // Import users and clear all data
  // await seedProducts();        // Import products from CSV
  // await seedOrders();          // Import orders from CSV
  // await seedPoints();          // Import points from CSV
  // await seedCategories();      // Seed categories and update products
  // await seedMemberships();     // Seed memberships only
  // await seedUserMemberships(); // Seed memberships and user memberships
  // await seedBanners();         // Seed all 5 types of banners      
  // await seedRecipes();          // Seed recipes from CSV
  await seedCoupons();          // Seed coupons from CSV
  // await updateAdmin();          // Update admin membership level
  // await updateBanner();          // Update banner
  // await updateOrderGroup();          // Update order group
  
  
  console.log('\n✨ All seed functions completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });