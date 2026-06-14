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
    saleStatus: '판매중',
    productClientCategory: [1],
    productCategoryNumber: 1,
    productName: '언양 한우 불고기 500g',
    englishProductName: 'Eonyang Hanwoo Bulgogi 500g',
    productNameForManagement: '언양불고기_500g',
    productSummaryDescription: '경상남도 언양 지역 대표 전통 한우 불고기',
    productBriefDescription: '부드러운 한우와 달콤한 양념이 어우러진 언양 불고기',
    searchKeywordSetting: '불고기,한우,언양,소고기',
    taxClassification: '과세',
    consumerPrice: 45000,
    supplyPrice: 30000,
    productPrice: 45000,
    salePrice: 38000,
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    rewardPoints: 380,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '언양축산',
    brand: '리플로우',
    origin: 1,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉동보관',
    additionalItem04Origin: '국내산(경남 언양)',
  },
  {
    productCode: 'P00000BB',
    ownProductCode: 'OWN-002',
    displayStatus: 'Y',
    saleStatus: '판매중',
    productClientCategory: [1],
    productCategoryNumber: 1,
    productName: '한우 샤브샤브용 300g',
    englishProductName: 'Hanwoo Shabu-Shabu 300g',
    productNameForManagement: '한우샤브샤브_300g',
    productSummaryDescription: '신선한 한우 샤브샤브용 얇은 슬라이스',
    productBriefDescription: '부드럽고 신선한 1등급 한우 샤브샤브용',
    searchKeywordSetting: '샤브샤브,한우,소고기,슬라이스',
    taxClassification: '과세',
    consumerPrice: 38000,
    supplyPrice: 25000,
    productPrice: 38000,
    salePrice: 32000,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    rewardPoints: 320,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '한우농장',
    brand: '리플로우',
    origin: 1,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉동보관',
    additionalItem04Origin: '국내산(한우 1등급)',
  },
  {
    productCode: 'P00000CC',
    ownProductCode: 'OWN-003',
    displayStatus: 'Y',
    saleStatus: '판매중',
    productClientCategory: [1],
    productCategoryNumber: 1,
    productName: 'LA갈비 1kg',
    englishProductName: 'LA Galbi (Short Ribs) 1kg',
    productNameForManagement: 'LA갈비_1kg',
    productSummaryDescription: '달콤한 양념이 배어든 프리미엄 LA갈비',
    productBriefDescription: '직화구이용 LA갈비, 특제 양념으로 맛을 더한 프리미엄 제품',
    searchKeywordSetting: 'LA갈비,갈비,소고기,구이',
    taxClassification: '과세',
    consumerPrice: 65000,
    supplyPrice: 45000,
    productPrice: 65000,
    salePrice: 55000,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    rewardPoints: 550,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '프리미엄미트',
    brand: '리플로우',
    origin: 2,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1558030006-450675393462?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉동보관',
    additionalItem04Origin: '미국산',
  },
  {
    productCode: 'P00000DD',
    ownProductCode: 'OWN-004',
    displayStatus: 'Y',
    saleStatus: '판매중',
    productClientCategory: [1],
    productCategoryNumber: 1,
    productName: '제주 흑돼지 불고기 500g',
    englishProductName: 'Jeju Black Pork Bulgogi 500g',
    productNameForManagement: '제주흑돼지불고기_500g',
    productSummaryDescription: '제주도 청정 흑돼지로 만든 특제 불고기',
    productBriefDescription: '제주 흑돼지 특유의 고소하고 깊은 맛을 즐기세요',
    searchKeywordSetting: '흑돼지,제주,돼지고기,불고기',
    taxClassification: '과세',
    consumerPrice: 35000,
    supplyPrice: 22000,
    productPrice: 35000,
    salePrice: 28000,
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    rewardPoints: 280,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '제주흑돼지농장',
    brand: '리플로우',
    origin: 3,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉동보관',
    additionalItem04Origin: '국내산(제주)',
  },
  {
    productCode: 'P00000EE',
    ownProductCode: 'OWN-005',
    displayStatus: 'Y',
    saleStatus: '판매중',
    productClientCategory: [2],
    productCategoryNumber: 2,
    productName: '갈비탕 (2인분)',
    englishProductName: 'Galbitang (Short Rib Soup) 2 servings',
    productNameForManagement: '갈비탕_2인분',
    productSummaryDescription: '진하고 깔끔한 국물의 프리미엄 갈비탕',
    productBriefDescription: '오랜 시간 정성껏 끓인 깊고 진한 갈비탕',
    searchKeywordSetting: '갈비탕,국물,소갈비,탕',
    taxClassification: '과세',
    consumerPrice: 28000,
    supplyPrice: 18000,
    productPrice: 28000,
    salePrice: 24000,
    minOrderQuantity: 1,
    maxOrderQuantity: 20,
    rewardPoints: 240,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '리플로우주방',
    brand: '리플로우',
    origin: 1,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉동보관',
    additionalItem04Origin: '국내산',
  },
  {
    productCode: 'P00000FF',
    ownProductCode: 'OWN-006',
    displayStatus: 'Y',
    saleStatus: '판매중',
    productClientCategory: [2],
    productCategoryNumber: 2,
    productName: '육개장 (2인분)',
    englishProductName: 'Yukgaejang (Spicy Beef Soup) 2 servings',
    productNameForManagement: '육개장_2인분',
    productSummaryDescription: '매콤하고 시원한 국물의 정통 육개장',
    productBriefDescription: '고사리, 콩나물이 가득 들어간 얼큰한 육개장',
    searchKeywordSetting: '육개장,매운국,소고기,탕',
    taxClassification: '과세',
    consumerPrice: 24000,
    supplyPrice: 15000,
    productPrice: 24000,
    salePrice: 19000,
    minOrderQuantity: 1,
    maxOrderQuantity: 20,
    rewardPoints: 190,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '리플로우주방',
    brand: '리플로우',
    origin: 1,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉동보관',
    additionalItem04Origin: '국내산',
  },
  {
    productCode: 'P00000GG',
    ownProductCode: 'OWN-007',
    displayStatus: 'Y',
    saleStatus: '판매중',
    productClientCategory: [4],
    productCategoryNumber: 4,
    productName: '연평도 간장게장 (500g)',
    englishProductName: 'Yeonpyeong Island Ganjang Gejang 500g',
    productNameForManagement: '연평도간장게장_500g',
    productSummaryDescription: '연평도 신선한 꽃게로 만든 프리미엄 간장게장',
    productBriefDescription: '밥도둑 No.1 연평도 간장게장, 깊고 진한 맛',
    searchKeywordSetting: '게장,간장게장,꽃게,연평도',
    taxClassification: '면세',
    consumerPrice: 55000,
    supplyPrice: 38000,
    productPrice: 55000,
    salePrice: 48000,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    rewardPoints: 480,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '연평도수산',
    brand: '리플로우',
    origin: 4,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉장보관',
    additionalItem04Origin: '국내산(연평도)',
  },
  {
    productCode: 'P00000HH',
    ownProductCode: 'OWN-008',
    displayStatus: 'Y',
    saleStatus: '판매중',
    productClientCategory: [3],
    productCategoryNumber: 3,
    productName: '양념게장 (500g)',
    englishProductName: 'Yangnyeom Gejang (Spicy Marinated Crab) 500g',
    productNameForManagement: '양념게장_500g',
    productSummaryDescription: '매콤달콤한 양념으로 버무린 양념게장',
    productBriefDescription: '신선한 꽃게에 특제 양념을 더한 밥도둑 양념게장',
    searchKeywordSetting: '양념게장,게장,꽃게,반찬',
    taxClassification: '면세',
    consumerPrice: 48000,
    supplyPrice: 32000,
    productPrice: 48000,
    salePrice: 42000,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    rewardPoints: 420,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '수산진미',
    brand: '리플로우',
    origin: 4,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉장보관',
    additionalItem04Origin: '국내산',
  },
  {
    productCode: 'P00000II',
    ownProductCode: 'OWN-009',
    displayStatus: 'Y',
    saleStatus: '판매중',
    productClientCategory: [2],
    productCategoryNumber: 2,
    productName: '물냉면 세트 (2인분)',
    englishProductName: 'Mul Naengmyeon Set 2 servings',
    productNameForManagement: '물냉면세트_2인분',
    productSummaryDescription: '시원하고 깔끔한 여름 별미 물냉면',
    productBriefDescription: '진한 육수와 쫄깃한 면발의 정통 평양식 물냉면',
    searchKeywordSetting: '냉면,물냉면,여름,면요리',
    taxClassification: '과세',
    consumerPrice: 22000,
    supplyPrice: 14000,
    productPrice: 22000,
    salePrice: 18000,
    minOrderQuantity: 1,
    maxOrderQuantity: 20,
    rewardPoints: 180,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '리플로우주방',
    brand: '리플로우',
    origin: 1,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉동보관',
    additionalItem04Origin: '국내산',
  },
  {
    productCode: 'P00000JJ',
    ownProductCode: 'OWN-010',
    displayStatus: 'Y',
    saleStatus: '판매중',
    productClientCategory: [1],
    productCategoryNumber: 1,
    productName: '한우 떡갈비 400g',
    englishProductName: 'Hanwoo Tteokgalbi (Korean Grilled Beef Patty) 400g',
    productNameForManagement: '한우떡갈비_400g',
    productSummaryDescription: '부드럽고 고소한 한우 떡갈비',
    productBriefDescription: '한우 갈비살로 만든 쫄깃하고 고소한 전통 떡갈비',
    searchKeywordSetting: '떡갈비,한우,갈비,구이',
    taxClassification: '과세',
    consumerPrice: 42000,
    supplyPrice: 28000,
    productPrice: 42000,
    salePrice: 36000,
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    rewardPoints: 360,
    rewardPointsClassification: '기본적립',
    manufacturer: '(주)리플로우',
    supplier: '한우농장',
    brand: '리플로우',
    origin: 1,
    deliveryMethod: '택배',
    domesticOverseasDelivery: '국내배송',
    deliveryFeeClassification: '조건부무료',
    deliveryFeeInput: '50000',
    imageRegistrationThumbnail: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop',
    imageRegistrationList: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&h=600&fit=crop',
    imageRegistrationDetail: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1200&h=900&fit=crop',
    additionalItem03StorageMethod: '냉동보관',
    additionalItem04Origin: '국내산(한우)',
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
    { name: 'LIVESTOCK', description: '라이브스톡 (축산물)' },
    { name: 'SIDE_DISH', description: '사이드 요리 (반찬)' },
    { name: 'CONVENIENCE_FOOD', description: '편의점 음식 (간편식)' },
    { name: 'FISHERIES', description: '수산물' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name as any },
      update: {},
      create: { name: c.name as any, description: c.description },
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