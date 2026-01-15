import { PrismaClient } from '@prisma/client';
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

      // ========================================
      // Step 1: Create OrderGroups from unique order group numbers
      // ========================================
      console.log('📦 Creating order groups...');
      
      // Group orders by orderGroupNumber to aggregate data
      const orderGroupsMap = new Map<string, {
        orders: OrderCsvRecord[];
        totalOrderAmount: number;
        totalPaymentAmount: number;
      }>();

      for (const record of records) {
        const orderGroupNumber = record['품목별 주문번호'];
        if (orderGroupNumber) {
          if (!orderGroupsMap.has(orderGroupNumber)) {
            orderGroupsMap.set(orderGroupNumber, {
              orders: [],
              totalOrderAmount: 0,
              totalPaymentAmount: 0,
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
            orderNumber: record.order_number || null,
            orderGroupNumber: record['품목별 주문번호'] || null,
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
    select: { id: true, productCode: true, productName: true }
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
  
  const banners = [
    // 1. MAIN_PRODUCTS Banner (1 banner)
    {
      type: 'MAIN_PRODUCTS',
      status: 'ACTIVE',
      productId: mainProductId,
      category: null,
      title: 'Main Product Featured Banner',
      badgeText: 'Special Offer',
      mainText: 'Discover our premium selection of fresh products',
      ctaButtonText: 'Shop Now',
      ctaButtonUrl: '/products',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=800&fit=crop',
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
      ctaButtonUrl: '/category/livestock',
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
      ctaButtonUrl: '/category/convenience-food',
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
      ctaButtonUrl: '/category/fisheries',
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
      ctaButtonUrl: '/category/side-dish',
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
      ctaButtonUrl: '/categories',
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
// FUNCTION 9: Seed Test User
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

// ========================================
// MAIN FUNCTION - Run seed functions sequentially
// ========================================
async function main() {
  console.log('🚀 Starting complete database seeding process...\n');
  // return Promise.resolve().then(() => {
  //   console.log('Promise resolved');
  // })
  
  // await seedUsers();           // Import users and clear all data
  await seedProducts();        // Import products from CSV
  // await seedOrders();          // Import orders from CSV
  // await seedPoints();          // Import points from CSV
  // await seedCategories();      // Seed categories and update products
  // await seedMemberships();     // Seed memberships only
  // await seedUserMemberships(); // Seed memberships and user memberships
  // await seedBanners();         // Seed all 5 types of banners      

  

  
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