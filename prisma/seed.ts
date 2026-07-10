import { PrismaClient, CouponType, OrderSituation } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env' });
const NODE_ENV = process.env.NODE_ENV || 'development';
console.log('NODE_ENV', NODE_ENV);
const envFile = NODE_ENV === 'production' ? '.env.prod' : '.env.dev';

const result = dotenv.config({ path: envFile, override: true });

if (result.error) {
  console.error(`❌ Error loading .env file from ${envFile}:`, result.error);
  throw result.error;
}

console.log(`✅ Loaded ${Object.keys(result.parsed || {}).length} environment variables from ${envFile}`);

// Initialize Prisma with PrismaPg adapter
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ========================================
// SEED DATA
// ========================================

const USERS_DATA = [
  {
    id: 'user001',
    name: '김민준',
    membershipLevel: 'LV1. 씨앗',
    age: 28,
    email: 'minjun.kim@example.com',
    phoneNumber: '010-1234-5678',
    totalUsedPoints: 5000,
    availablePoints: 3000,
    registrationDate: '2023-01-15',
    totalPurchaseAmount: 150000,
  },
  {
    id: 'user002',
    name: '이서연',
    membershipLevel: 'LV2. 새싹',
    age: 32,
    email: 'seoyeon.lee@example.com',
    phoneNumber: '010-2345-6789',
    totalUsedPoints: 12000,
    availablePoints: 8000,
    registrationDate: '2022-08-20',
    totalPurchaseAmount: 320000,
  },
  {
    id: 'user003',
    name: '박지호',
    membershipLevel: 'LV3. 열매',
    age: 45,
    email: 'jiho.park@example.com',
    phoneNumber: '010-3456-7890',
    totalUsedPoints: 30000,
    availablePoints: 15000,
    registrationDate: '2021-03-10',
    totalPurchaseAmount: 580000,
  },
  {
    id: 'user004',
    name: '최수아',
    membershipLevel: 'LV4. 나무',
    age: 38,
    email: 'sua.choi@example.com',
    phoneNumber: '010-4567-8901',
    totalUsedPoints: 50000,
    availablePoints: 25000,
    registrationDate: '2020-11-05',
    totalPurchaseAmount: 920000,
  },
  {
    id: 'user005',
    name: '정도윤',
    membershipLevel: 'LV5. 정원',
    age: 52,
    email: 'doyun.jung@example.com',
    phoneNumber: '010-5678-9012',
    totalUsedPoints: 100000,
    availablePoints: 60000,
    registrationDate: '2019-06-22',
    totalPurchaseAmount: 2100000,
  },
  {
    id: 'user006',
    name: '윤하은',
    membershipLevel: 'LV1. 씨앗',
    age: 24,
    email: 'haeun.yoon@example.com',
    phoneNumber: '010-6789-0123',
    totalUsedPoints: 0,
    availablePoints: 1000,
    registrationDate: '2024-01-03',
    totalPurchaseAmount: 45000,
  },
  {
    id: 'user007',
    name: '강태양',
    membershipLevel: 'LV2. 새싹',
    age: 29,
    email: 'taeyang.kang@example.com',
    phoneNumber: '010-7890-1234',
    totalUsedPoints: 18000,
    availablePoints: 9000,
    registrationDate: '2022-05-18',
    totalPurchaseAmount: 280000,
  },
  {
    id: 'user008',
    name: '임채원',
    membershipLevel: 'LV3. 열매',
    age: 41,
    email: 'chaewon.lim@example.com',
    phoneNumber: '010-8901-2345',
    totalUsedPoints: 40000,
    availablePoints: 20000,
    registrationDate: '2021-09-14',
    totalPurchaseAmount: 650000,
  },
  {
    id: 'user009',
    name: '오소율',
    membershipLevel: 'LV1. 씨앗',
    age: 35,
    email: 'soyul.oh@example.com',
    phoneNumber: '010-9012-3456',
    totalUsedPoints: 2000,
    availablePoints: 500,
    registrationDate: '2023-07-29',
    totalPurchaseAmount: 75000,
  },
  {
    id: 'user010',
    name: '신예준',
    membershipLevel: 'LV4. 나무',
    age: 47,
    email: 'yejun.shin@example.com',
    phoneNumber: '010-0123-4567',
    totalUsedPoints: 65000,
    availablePoints: 30000,
    registrationDate: '2020-04-11',
    totalPurchaseAmount: 1100000,
  },
];

const PRODUCTS_DATA = [
  {
    productCode: 'P00000AA',
    ownProductCode: 'OWN-001',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [5],
    productCategoryNumber: 5,
    productName: 'Eonyang Hanwoo Bulgogi 500g',
    englishProductName: 'Eonyang Hanwoo Bulgogi 500g',
    productNameForManagement: 'EonyangBulgogi_500g',
    productSummaryDescription: 'Traditional Hanwoo bulgogi representing the Eonyang region of Gyeongsangnam-do',
    productBriefDescription: 'Eonyang bulgogi featuring a harmonious blend of tender Hanwoo beef and sweet seasoning',
    searchKeywordSetting: 'bulgogi,hanwoo,eonyang,beef',
    taxClassification: 'Taxable',
    consumerPrice: 45000,
    supplyPrice: 30000,
    productPrice: 45000,
    salePrice: 38000,
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    rewardPoints: 380,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Eonyang Livestock',
    brand: 'Reflow',
    origin: 1,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Frozen Storage',
    additionalItem04Origin: 'Domestic (Eonyang, Gyeongnam)',
  },
  {
    productCode: 'P00000BB',
    ownProductCode: 'OWN-002',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [5],
    productCategoryNumber: 5,
    productName: 'Hanwoo Shabu-Shabu 300g',
    englishProductName: 'Hanwoo Shabu-Shabu 300g',
    productNameForManagement: 'HanwooShabuShabu_300g',
    productSummaryDescription: 'Freshly and thinly sliced Hanwoo beef for Shabu-Shabu',
    productBriefDescription: 'Tender and fresh Grade 1 Hanwoo beef for Shabu-Shabu',
    searchKeywordSetting: 'shabu-shabu,hanwoo,beef,slices',
    taxClassification: 'Taxable',
    consumerPrice: 38000,
    supplyPrice: 25000,
    productPrice: 38000,
    salePrice: 32000,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    rewardPoints: 320,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Hanwoo Farm',
    brand: 'Reflow',
    origin: 1,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Frozen Storage',
    additionalItem04Origin: 'Domestic (Grade 1 Hanwoo)',
  },
  {
    productCode: 'P00000CC',
    ownProductCode: 'OWN-003',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [5],
    productCategoryNumber: 5,
    productName: 'LA Galbi 1kg',
    englishProductName: 'LA Galbi (Short Ribs) 1kg',
    productNameForManagement: 'LAGalbi_1kg',
    productSummaryDescription: 'Premium LA Galbi infused with sweet marinade',
    productBriefDescription: 'LA Galbi for direct grilling, a premium product enhanced with a special signature sauce',
    searchKeywordSetting: 'LA galbi,galbi,beef,grill',
    taxClassification: 'Taxable',
    consumerPrice: 65000,
    supplyPrice: 45000,
    productPrice: 65000,
    salePrice: 55000,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    rewardPoints: 550,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Premium Meat',
    brand: 'Reflow',
    origin: 2,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1558030006-450675393462?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Frozen Storage',
    additionalItem04Origin: 'USA',
  },
  {
    productCode: 'P00000DD',
    ownProductCode: 'OWN-004',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [5],
    productCategoryNumber: 5,
    productName: 'Jeju Black Pork Bulgogi 500g',
    englishProductName: 'Jeju Black Pork Bulgogi 500g',
    productNameForManagement: 'JejuBlackPorkBulgogi_500g',
    productSummaryDescription: 'Special bulgogi made with pristine Jeju island black pork',
    productBriefDescription: 'Enjoy the uniquely savory and deep flavor of Jeju black pork',
    searchKeywordSetting: 'black pork,jeju,pork,bulgogi',
    taxClassification: 'Taxable',
    consumerPrice: 35000,
    supplyPrice: 22000,
    productPrice: 35000,
    salePrice: 28000,
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    rewardPoints: 280,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Jeju Black Pork Farm',
    brand: 'Reflow',
    origin: 3,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Frozen Storage',
    additionalItem04Origin: 'Domestic (Jeju)',
  },
  {
    productCode: 'P00000EE',
    ownProductCode: 'OWN-005',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [6],
    productCategoryNumber: 6,
    productName: 'Galbitang (Short Rib Soup) 2 Servings',
    englishProductName: 'Galbitang (Short Rib Soup) 2 servings',
    productNameForManagement: 'Galbitang_2servings',
    productSummaryDescription: 'Premium Galbitang with a rich and clean broth',
    productBriefDescription: 'Deep and rich short rib soup carefully simmered for a long time',
    searchKeywordSetting: 'galbitang,soup,beef ribs,broth',
    taxClassification: 'Taxable',
    consumerPrice: 28000,
    supplyPrice: 18000,
    productPrice: 28000,
    salePrice: 24000,
    minOrderQuantity: 1,
    maxOrderQuantity: 20,
    rewardPoints: 240,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Reflow Kitchen',
    brand: 'Reflow',
    origin: 1,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Frozen Storage',
    additionalItem04Origin: 'Domestic',
  },
  {
    productCode: 'P00000FF',
    ownProductCode: 'OWN-006',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [6],
    productCategoryNumber: 6,
    productName: 'Yukgaejang (Spicy Beef Soup) 2 Servings',
    englishProductName: 'Yukgaejang (Spicy Beef Soup) 2 servings',
    productNameForManagement: 'Yukgaejang_2servings',
    productSummaryDescription: 'Authentic Yukgaejang with a spicy and refreshing broth',
    productBriefDescription: 'Spicy beef soup packed full of bracken fern and bean sprouts',
    searchKeywordSetting: 'yukgaejang,spicy soup,beef,soup',
    taxClassification: 'Taxable',
    consumerPrice: 24000,
    supplyPrice: 15000,
    productPrice: 24000,
    salePrice: 19000,
    minOrderQuantity: 1,
    maxOrderQuantity: 20,
    rewardPoints: 190,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Reflow Kitchen',
    brand: 'Reflow',
    origin: 1,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Frozen Storage',
    additionalItem04Origin: 'Domestic',
  },
  {
    productCode: 'P00000GG',
    ownProductCode: 'OWN-007',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [8],
    productCategoryNumber: 8,
    productName: 'Yeonpyeong Island Ganjang Gejang (500g)',
    englishProductName: 'Yeonpyeong Island Ganjang Gejang 500g',
    productNameForManagement: 'YeonpyeongIslandGanjangGejang_500g',
    productSummaryDescription: 'Premium soy sauce marinated crab made with fresh blue crabs from Yeonpyeong Island',
    productBriefDescription: 'The ultimate rice thief (#1), Yeonpyeong Island Ganjang Gejang with a deep and rich flavor',
    searchKeywordSetting: 'marinated crab,ganjang gejang,blue crab,yeonpyeong island',
    taxClassification: 'Tax-exempt',
    consumerPrice: 55000,
    supplyPrice: 38000,
    productPrice: 55000,
    salePrice: 48000,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    rewardPoints: 480,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Yeonpyeong Fisheries',
    brand: 'Reflow',
    origin: 4,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Refrigerated Storage',
    additionalItem04Origin: 'Domestic (Yeonpyeong Island)',
  },
  {
    productCode: 'P00000HH',
    ownProductCode: 'OWN-008',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [7],
    productCategoryNumber: 7,
    productName: 'Yangnyeom Gejang (500g)',
    englishProductName: 'Yangnyeom Gejang (Spicy Marinated Crab) 500g',
    productNameForManagement: 'YangnyeomGejang_500g',
    productSummaryDescription: 'Spicy marinated crab tossed in a sweet and spicy sauce',
    productBriefDescription: 'A true rice thief, Yangnyeom Gejang featuring fresh blue crab with a special seasoning',
    searchKeywordSetting: 'yangnyeom gejang,marinated crab,blue crab,side dish',
    taxClassification: 'Tax-exempt',
    consumerPrice: 48000,
    supplyPrice: 32000,
    productPrice: 48000,
    salePrice: 42000,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    rewardPoints: 420,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Fisheries Delicacy',
    brand: 'Reflow',
    origin: 4,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Refrigerated Storage',
    additionalItem04Origin: 'Domestic',
  },
  {
    productCode: 'P00000II',
    ownProductCode: 'OWN-009',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [6],
    productCategoryNumber: 6,
    productName: 'Mul Naengmyeon Set (2 Servings)',
    englishProductName: 'Mul Naengmyeon Set 2 servings',
    productNameForManagement: 'MulNaengmyeonSet_2servings',
    productSummaryDescription: 'A refreshing and crisp summer delicacy, Mul Naengmyeon',
    productBriefDescription: 'Authentic Pyongyang-style cold noodle soup with a rich broth and chewy noodles',
    searchKeywordSetting: 'naengmyeon,mul naengmyeon,summer,noodle dish',
    taxClassification: 'Taxable',
    consumerPrice: 22000,
    supplyPrice: 14000,
    productPrice: 22000,
    salePrice: 18000,
    minOrderQuantity: 1,
    maxOrderQuantity: 20,
    rewardPoints: 180,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Reflow Kitchen',
    brand: 'Reflow',
    origin: 1,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Frozen Storage',
    additionalItem04Origin: 'Domestic',
  },
  {
    productCode: 'P00000JJ',
    ownProductCode: 'OWN-010',
    displayStatus: 'Y',
    saleStatus: 'In Stock',
    productClientCategory: [5],
    productCategoryNumber: 5,
    productName: 'Hanwoo Tteokgalbi 400g',
    englishProductName: 'Hanwoo Tteokgalbi (Korean Grilled Beef Patty) 400g',
    productNameForManagement: 'HanwooTteokgalbi_400g',
    productSummaryDescription: 'Tender and savory Hanwoo Tteokgalbi',
    productBriefDescription: 'Chewy and rich traditional tteokgalbi made with Hanwoo rib meat',
    searchKeywordSetting: 'tteokgalbi,hanwoo,ribs,grill',
    taxClassification: 'Taxable',
    consumerPrice: 42000,
    supplyPrice: 28000,
    productPrice: 42000,
    salePrice: 36000,
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    rewardPoints: 360,
    rewardPointsClassification: 'Standard Accrual',
    manufacturer: 'Reflow Co., Ltd.',
    supplier: 'Hanwoo Farm',
    brand: 'Reflow',
    origin: 1,
    deliveryMethod: 'Courier',
    domesticOverseasDelivery: 'Domestic Shipping',
    deliveryFeeClassification: 'Conditional Free Shipping',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: 'Frozen Storage',
    additionalItem04Origin: 'Domestic (Hanwoo)',
  },
];

// ========================================
// FUNCTION 1: Seed Users
// ========================================
async function seedUsers() {
  console.log('\n🌱 [1/9] Seeding users...');

  // ── Clear dependent tables in FK order ──────────────────────────────────
  await prisma.refreshTokenUsed.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.productInquiryAnswers.deleteMany({});
  await prisma.productInquiries.deleteMany({});
  await prisma.productReviews.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.couponHistory.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.point.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.orderGroup.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.userShippingAddress.deleteMany({});
  await prisma.userMembership.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.productDiscount.deleteMany({});
  await prisma.productSpecialOffer.deleteMany({});
  await prisma.banner.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  console.log('  ✅ Cleared all existing data');

  // ── Regular users ────────────────────────────────────────────────────────
  for (const u of USERS_DATA) {
    await prisma.user.create({ data: u });
  }
  console.log(`  ✅ Created ${USERS_DATA.length} regular users`);

  // ── Admin user ───────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('123456', 10);
  const registrationDate = new Date().toISOString().split('T')[0];

  const existingAdmin = await prisma.user.findUnique({ where: { id: 'liflowadmin' } });
  if (existingAdmin) {
    await prisma.user.update({
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
  } else {
    await prisma.user.create({
      data: {
        id: 'liflowadmin',
        password: hashedPassword,
        name: 'LiflowAdmin',
        email: 'thegarden4991@naver.com',
        registrationDate,
        membershipLevel: 'LV1. 씨앗',
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
  }
  console.log('  ✅ Admin user ready (liflowadmin / 123456)');

  // ── Test user ────────────────────────────────────────────────────────────
  const existingTest = await prisma.user.findUnique({ where: { id: 'testuser' } });
  if (!existingTest) {
    await prisma.user.create({
      data: {
        id: 'testuser',
        password: hashedPassword,
        name: 'Test User',
        email: 'user@example.com',
        registrationDate,
        membershipLevel: 'LV1. 씨앗',
        totalUsedPoints: 0,
        availablePoints: 0,
        totalPurchaseAmount: 0,
      },
    });
  }
  console.log('  ✅ Test user ready (testuser / 123456)');
}

// ========================================
// FUNCTION 2: Seed Roles & assign to users
// ========================================
async function seedRoles() {
  console.log('\n🌱 [2/9] Seeding roles...');

  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN', description: 'Administrator role with full access' },
  });
  const userRole = await prisma.role.create({
    data: { name: 'USER', description: 'Regular user role' },
  });

  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const user of allUsers) {
    const roleToAssign = user.id === 'liflowadmin' ? adminRole : userRole;
    await prisma.userRole.create({
      data: { userId: user.id, roleId: roleToAssign.id },
    });
  }
  console.log(`  ✅ Roles created and assigned to ${allUsers.length} users`);
}

// ========================================
// FUNCTION 3: Seed Memberships
// ========================================
async function seedMemberships() {
  console.log('\n🌱 [3/9] Seeding memberships...');

  const memberships = [
    { name: 'LV1. 씨앗', description: null, minPrice: 0 },
    { name: 'LV2. 새싹', description: null, minPrice: 150000 },
    { name: 'LV3. 열매', description: null, minPrice: 300000 },
    { name: 'LV4. 나무', description: null, minPrice: 500000 },
    { name: 'LV5. 정원', description: null, minPrice: 1000000 },
  ];

  for (const m of memberships) {
    await prisma.membership.upsert({
      where: { name: m.name },
      update: { minPrice: m.minPrice },
      create: m,
    });
    console.log(`  ✓ ${m.name} (₩${m.minPrice.toLocaleString()})`);
  }
  console.log('  ✅ 5 memberships seeded');
}

// ========================================
// FUNCTION 4: Seed User Memberships
// ========================================
async function seedUserMemberships() {
  console.log('\n🌱 [4/9] Seeding user memberships...');

  const allMemberships = await prisma.membership.findMany();
  const membershipMap = new Map(allMemberships.map(m => [m.name!, m]));

  const usersWithLevel = await prisma.user.findMany({
    where: { membershipLevel: { not: null } },
    select: { id: true, membershipLevel: true },
  });

  let created = 0;
  for (const user of usersWithLevel) {
    const membership = membershipMap.get(user.membershipLevel!);
    if (!membership?.name) continue;

    const existing = await prisma.userMembership.findUnique({ where: { userId: user.id } });
    if (existing) continue;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    await prisma.userMembership.create({
      data: {
        userId: user.id,
        membershipId: membership.id,
        membershipName: membership.name,
        membershipDescription: membership.description || '',
        status: 'normal',
        startDate,
        endDate,
      },
    });
    created++;
  }
  console.log(`  ✅ ${created} user memberships created`);
}

// ========================================
// FUNCTION 5: Seed Categories
// ========================================
async function seedCategories() {
  console.log('\n🌱 [5/9] Seeding categories...');

  const categories = [
    { productCategoryNumber: 5, name: 'LIVESTOCK', description: '라이브스톡 (축산물)' },
    { productCategoryNumber: 6, name: 'CONVENIENCE_FOOD', description: '편의점 음식 (간편식)' },
    { productCategoryNumber: 7, name: 'FISHERIES', description: '수산물' },
    { productCategoryNumber: 8, name: 'SIDE_DISH', description: '사이드 요리 (반찬)' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name as any },
      update: {},
      create: {
        productCategoryNumber: c.productCategoryNumber,
        name: c.name as any,
        description: c.description,
      },
    });
    console.log(`  ✓ ${c.name}`);
  }
  console.log('  ✅ 4 categories seeded');
}

// ========================================
// FUNCTION 6: Seed Products
// ========================================
async function seedProducts() {
  console.log('\n🌱 [6/9] Seeding products...');

  for (const p of PRODUCTS_DATA) {
    await prisma.product.create({ data: p as any });
    console.log(`  ✓ ${p.productName}`);
  }
  console.log(`  ✅ ${PRODUCTS_DATA.length} products seeded`);
}

// ========================================
// FUNCTION 7: Seed Banners
// ========================================
async function seedBanners() {
  console.log('\n🌱 [7/9] Seeding banners...');

  const categories = await prisma.category.findMany({ select: { productCategoryNumber: true, name: true } });
  const categoryMap = new Map(categories.map(c => [c.name, c.productCategoryNumber]));

  const firstProduct = await prisma.product.findFirst({ where: { displayStatus: 'Y' }, select: { id: true } });

  const banners = [
    {
      type: 'MAIN_PRODUCTS',
      status: 'ACTIVE',
      productId: firstProduct?.id ?? null,
      category: null,
      title: '쭈왕산가든이 처음이라면 주저 말고 담아가세요 👍🏻',
      badgeText: '신규회원 전용',
      mainText: 'Discover our premium selection of fresh products',
      ctaButtonText: '구매하러 가기',
      ctaButtonUrl: '/products',
      imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=800&fit=crop',
      displayOrder: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'CATEGORY',
      status: 'ACTIVE',
      productId: null,
      category: 'LIVESTOCK',
      title: 'Premium Livestock Products',
      badgeText: 'Fresh Daily',
      mainText: 'High-quality meat products delivered fresh',
      ctaButtonText: 'Browse Livestock',
      ctaButtonUrl: `/market?category=${categoryMap.get('LIVESTOCK') ?? ''}`,
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
      ctaButtonUrl: `/market?category=${categoryMap.get('CONVENIENCE_FOOD') ?? ''}`,
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
      ctaButtonUrl: `/market?category=${categoryMap.get('FISHERIES') ?? ''}`,
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
      ctaButtonUrl: `/market?category=${categoryMap.get('SIDE_DISH') ?? ''}`,
      imageUrl: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&h=800&fit=crop',
      displayOrder: 5,
      startDate: new Date(),
      endDate: null,
    },
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
      displayOrder: 0,
      startDate: new Date(),
      endDate: null,
    },
    {
      type: 'SPECIAL_PRICE',
      status: 'ACTIVE',
      productId: null,
      category: null,
      title: "This Week's Special Deals",
      badgeText: '50% OFF',
      mainText: 'Limited time offers on selected products',
      ctaButtonText: 'View Deals',
      ctaButtonUrl: '/special-deals',
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=800&fit=crop',
      displayOrder: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'FOOTER',
      status: 'ACTIVE',
      productId: null,
      category: null,
      title: '고객센터',
      badgeText: 'Support',
      mainText: 'Questions about orders, delivery, or products',
      ctaButtonText: 'Contact Us',
      ctaButtonUrl: '/support',
      imageUrl: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=800&h=800&fit=crop',
      displayOrder: 1,
      startDate: new Date(),
      endDate: null,
    },
    {
      type: 'FOOTER',
      status: 'ACTIVE',
      productId: null,
      category: null,
      title: '배송 안내',
      badgeText: 'Delivery',
      mainText: 'Fresh products delivered with reliable cold-chain service',
      ctaButtonText: 'Delivery Guide',
      ctaButtonUrl: '/delivery-guide',
      imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=800&fit=crop',
      displayOrder: 2,
      startDate: new Date(),
      endDate: null,
    },
    {
      type: 'FOOTER',
      status: 'ACTIVE',
      productId: null,
      category: null,
      title: '멤버십 혜택',
      badgeText: 'Membership',
      mainText: 'Enjoy points, coupons, and member-only benefits',
      ctaButtonText: 'View Benefits',
      ctaButtonUrl: '/membership',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=800&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=800&fit=crop',
      displayOrder: 3,
      startDate: new Date(),
      endDate: null,
    },
  ];

  let created = 0;
  for (const banner of banners) {
    try {
      await prisma.banner.create({ data: banner as any });
      created++;
      console.log(`  ✓ [${banner.type}] ${banner.title}`);
    } catch (err) {
      console.error(`  ❌ Failed to create banner: ${banner.title}`, err);
    }
  }
  console.log(`  ✅ ${created}/${banners.length} banners seeded`);
}

// ========================================
// FUNCTION 8: Seed Recipes
// ========================================
async function seedRecipes() {
  console.log('\n🌱 [8/9] Seeding recipes...');

  const admin = await prisma.user.findUnique({ where: { id: 'liflowadmin' } });
  if (!admin) {
    console.warn('  ⚠️  liflowadmin not found — skipping recipes');
    return;
  }

  const recipes = [
    {
      title: '언양불고기 만들기',
      category: 'RECIPE',
      thumbnailUrl: ['https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=600&fit=crop'],
      content: '언양불고기는 경상남도 언양 지역의 대표적인 전통 요리입니다. 부드러운 고기와 달콤한 양념이 어우러진 이 요리는 가족 모임이나 손님 접대에 완벽한 메뉴입니다.\n\n**재료**: 한우 불고기용 고기 500g, 양파 1개, 대파 2대, 당근 1개, 팽이버섯 1팩\n\n**양념**: 간장 3큰술, 설탕 2큰술, 다진 마늘 1큰술, 생강즙, 참기름, 후추\n\n1. 양념 재료를 모두 섞어 고기에 버무려 30분 이상 재웁니다.\n2. 팬에 기름을 두르고 고기를 볶다가 야채를 넣고 함께 볶아 완성합니다.',
      ingredients: ['한우 불고기용 고기', '양파', '대파', '당근', '팽이버섯', '간장', '설탕', '마늘', '생강', '참기름'],
      dateOfWriting: new Date('2024-01-15'),
    },
    {
      title: 'LA갈비 구이 완벽 가이드',
      category: 'RECIPE',
      thumbnailUrl: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop'],
      content: 'LA갈비는 한국의 대표적인 고기 요리 중 하나입니다. 달콤하고 짭조름한 양념이 고기와 완벽하게 어우러집니다.\n\n**재료**: LA갈비 1kg, 양파 1개, 대파 2대, 마늘 5쪽\n\n**양념**: 간장 5큰술, 설탕 3큰술, 배즙 2큰술, 참기름, 깨소금\n\n1. 갈비는 찬물에 담가 핏물을 제거합니다.\n2. 양념에 버무려 최소 2시간 이상 재웁니다.\n3. 그릴이나 팬에 중불로 천천히 구워 완성합니다.',
      ingredients: ['LA갈비', '양파', '대파', '마늘', '간장', '설탕', '배', '참기름', '깨소금'],
      dateOfWriting: new Date('2024-02-01'),
    },
    {
      title: '갈비탕 끓이는 법',
      category: 'RECIPE',
      thumbnailUrl: ['https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=600&fit=crop'],
      content: '갈비탕은 한국의 대표적인 국물 요리입니다. 부드러운 갈비와 깔끔한 국물이 일품입니다.\n\n**재료**: 소갈비 1kg, 무 300g, 대파 2대, 마늘 5쪽, 생강 1쪽\n\n1. 갈비는 찬물에 담가 핏물을 제거합니다.\n2. 첫 물은 버리고 깨끗한 물로 다시 끓입니다.\n3. 무를 넣고 푹 끓인 뒤 간을 맞춰 완성합니다.',
      ingredients: ['소갈비', '무', '대파', '마늘', '생강', '간장', '후추'],
      dateOfWriting: new Date('2024-02-15'),
    },
    {
      title: '양념게장 레시피',
      category: 'RECIPE',
      thumbnailUrl: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop'],
      content: '양념게장은 꽃게를 양념에 재워 만드는 발효식품입니다. 매콤하고 짭조름한 맛이 특징인 밥도둑입니다.\n\n**재료**: 꽃게 5마리, 고춧가루 1컵, 간장 1/2컵, 다진 마늘, 생강즙, 설탕, 참기름\n\n1. 게는 깨끗이 씻어 등딱지를 벗기고 내장을 제거합니다.\n2. 양념에 버무려 냉장고에서 2~3일 숙성시킵니다.',
      ingredients: ['꽃게', '고춧가루', '간장', '마늘', '생강', '설탕', '맛술', '참기름'],
      dateOfWriting: new Date('2024-03-01'),
    },
    {
      title: '냉면 만드는 법',
      category: 'RECIPE',
      thumbnailUrl: ['https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&h=600&fit=crop'],
      content: '냉면은 여름철 대표 음식입니다. 시원하고 깔끔한 육수와 쫄깃한 면발이 일품입니다.\n\n**재료**: 냉면 사리 4인분, 소고기 200g, 오이 1개, 배 1/2개, 계란 2개\n\n1. 육수 재료를 넣고 끓여 냉장 보관합니다.\n2. 면을 삶아 찬물에 헹군 뒤 그릇에 담고 육수를 부어 완성합니다.',
      ingredients: ['냉면 사리', '소고기', '오이', '배', '계란', '무', '간장', '식초'],
      dateOfWriting: new Date('2024-03-10'),
    },
  ];

  let created = 0;
  for (const r of recipes) {
    try {
      await prisma.recipe.create({
        data: {
          title: r.title,
          authorId: 'liflowadmin',
          authorName: admin.name || 'LiflowAdmin',
          category: r.category as any,
          dateOfWriting: r.dateOfWriting,
          views: 0,
          status: 'approved',
          thumbnailUrl: r.thumbnailUrl,
          content: r.content,
          ingredients: r.ingredients,
          isActive: true,
        },
      });
      created++;
      console.log(`  ✓ ${r.title}`);
    } catch (err) {
      console.error(`  ❌ Failed to create recipe: ${r.title}`, err);
    }
  }
  console.log(`  ✅ ${created}/${recipes.length} recipes seeded`);
}

// ========================================
// FUNCTION 9: Seed Coupons
// ========================================
async function seedCoupons() {
  console.log('\n🌱 [9/9] Seeding coupons...');

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const coupons = [
    {
      name: '생일 혜택 (전 등급 공통)',
      code: 'BIRTHDAY',
      type: CouponType.AMOUNT,
      discountRate: null,
      discountAmount: 10000,
      minPurchaseAmount: 30000,
      maxDiscountAmount: null,
      startDate: null,
      endDate: null,
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
      startDate: firstOfMonth,
      endDate: lastOfMonth,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      autoIssueDayOfMonth: null,
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
      startDate: firstOfMonth,
      endDate: lastOfMonth,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      autoIssueDayOfMonth: null,
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
      startDate: firstOfMonth,
      endDate: lastOfMonth,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      autoIssueDayOfMonth: null,
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
      startDate: firstOfMonth,
      endDate: lastOfMonth,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      autoIssueDayOfMonth: null,
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
      startDate: firstOfMonth,
      endDate: lastOfMonth,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: true,
      autoIssueDayOfMonth: null,
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
      startDate: null,
      endDate: null,
      imageUrl: null,
      isPermanent: true,
      isActive: true,
      isAutoIssue: false,
      autoIssueDayOfMonth: null,
      targetGrades: ['LV5. 정원'],
    },
  ];

  for (const coupon of coupons) {
    // remove null fields for update to satisfy Prisma UpdateInput types
    const updateData: any = Object.fromEntries(
      Object.entries(coupon).filter(([, v]) => v !== null)
    );

    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: updateData,
      create: updateData,
    });
    console.log(`  ✓ ${coupon.name} (${coupon.code})`);
  }
  console.log(`  ✅ ${coupons.length} coupons seeded`);
}

// ========================================
// UTILITY: Update admin password
// ========================================
async function updateAdminPassword() {
  const admin = await prisma.user.findUnique({ where: { id: 'liflowadmin' } });
  if (admin) {
    await prisma.user.update({
      where: { id: 'liflowadmin' },
      data: { password: await bcrypt.hash('123456', 10) },
    });
    console.log('✅ Admin password updated');
  }
}

// ========================================
// MAIN
// ========================================
async function main() {
  console.log('🚀 Starting complete database seeding...\n');

  await seedUsers();
  await seedRoles();
  await seedMemberships();
  await seedUserMemberships();
  await seedCategories();
  await seedProducts();
  await seedBanners();
  await seedRecipes();
  await seedCoupons();

  // Uncomment to only reset admin password without re-seeding everything:
  // await updateAdminPassword();

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
