// Import PrismaClient from generated location
import { PrismaClient, CouponType,OrderSituation, BannerType, BannerStatus, CategoryType, RecipeCategory } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { config } from '../src/libs/config';
import { ECategoryType } from 'src/modules/categories/enums/category.enum';

// ========================================
// Database Connection Setup
// ========================================

function buildPostgresUrl() {
  const user = encodeURIComponent(String(config.DATABASE_USERNAME));
  const pass = encodeURIComponent(String(config.DATABASE_PASSWORD));
  const host = config.DATABASE_HOST;
  const schema = encodeURIComponent(String(config.DATABASE_SCHEMA || 'public'));
  const dbname = config.DATABASE_NAME;
  const port = Number(config.DATABASE_PORT ?? 5432);

  return `postgresql://${user}:${pass}@${host}:${port}/${dbname}?schema=${schema}`;
}

function ensureSchemaInConnectionString(connectionString: string, schema?: string) {
  if (!schema) return connectionString;
  try {
    const url = new URL(connectionString);
    if (!url.searchParams.get('schema')) {
      url.searchParams.set('schema', schema);
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

function getConnectionString() {
  const raw = String(config.DATABASE_URL || '').trim() || buildPostgresUrl();
  return ensureSchemaInConnectionString(raw, config.DATABASE_SCHEMA);
}

const connectionString = getConnectionString();
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ========================================
// Type Definitions
// ========================================

interface RolePermissions {
  dashboardAccess: boolean;
  memberAccess: boolean;
  productAccess: boolean;
  orderAccess: boolean;
  recipeAccess: boolean;
  bannerAccess: boolean;
}

interface UserEntity {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  age: number;
  password: string;
  totalUsedPoints: number;
  availablePoints: number;
  registrationDate: string;
  permissions: RolePermissions;
  totalPurchaseAmount?: number;
}

interface RoleEntity {
  name: string;
  description: string;
}

interface MembershipEntity {
  name: string;
  description: string;
  minPrice: number;
}

// ========================================
// Permission Configurations
// ========================================

const ROLE_PERMISSIONS_MAP: Record<string, RolePermissions> = {
  ADMIN: {
    dashboardAccess: true,
    memberAccess: true,
    productAccess: true,
    orderAccess: true,
    recipeAccess: true,
    bannerAccess: true,
  },
  GENERAL_MANAGER: {
    dashboardAccess: true,
    memberAccess: true,
    productAccess: true,
    orderAccess: true,
    recipeAccess: true,
    bannerAccess: true,
  },
  MANAGER: {
    dashboardAccess: true,
    memberAccess: true,
    productAccess: true,
    orderAccess: true,
    recipeAccess: true,
    bannerAccess: true,
  },
  MD: {
    dashboardAccess: true,
    memberAccess: true,
    productAccess: true,
    orderAccess: true,
    recipeAccess: true,
    bannerAccess: true,
  },
  CS_MANAGER: {
    dashboardAccess: true,
    memberAccess: true,
    productAccess: true,
    orderAccess: true,
    recipeAccess: true,
    bannerAccess: false,
  },
  USER: {
    dashboardAccess: true,
    memberAccess: false,
    productAccess: true,
    orderAccess: true,
    recipeAccess: true,
    bannerAccess: false,
  },
};

function getPermissionsForRole(roleName: string): RolePermissions {
  return ROLE_PERMISSIONS_MAP[roleName] || {
    dashboardAccess: false,
    memberAccess: false,
    productAccess: false,
    orderAccess: false,
    recipeAccess: false,
    bannerAccess: false,
  };
}

// ========================================
// Seed Data Definitions
// ========================================

const ROLES: RoleEntity[] = [
  { name: 'ADMIN', description: 'Administrator with full system access' },
  { name: 'GENERAL_MANAGER', description: 'General Manager (총괄 담당자) - oversees all operations' },
  { name: 'MANAGER', description: 'Manager (담당자) - manages specific areas' },
  { name: 'MD', description: 'MD - specialized management role' },
  { name: 'CS_MANAGER', description: 'CS Manager (CS 담당자) - customer service management' },
  { name: 'USER', description: 'Basic user role' },
];

const MEMBERSHIPS: MembershipEntity[] = [
  { 
    name: 'VVIP', 
    description: 'Very Very Important Person - Ultimate premium membership with exclusive privileges',
    minPrice: 1000000
  },
  { 
    name: 'VIP', 
    description: 'Very Important Person - Premium membership with special privileges',
    minPrice: 500000
  },
  { 
    name: 'GOLD', 
    description: 'Gold membership - Enhanced benefits and rewards',
    minPrice: 300000
  },
  { 
    name: 'SILVER', 
    description: 'Silver membership - Standard benefits package',
    minPrice: 150000
  },
  { 
    name: 'GENERAL', 
    description: 'General membership - Entry level membership for users with less than 150000',
    minPrice: 0
  },
];

const PRODUCTS = [
  {
    productCode: 'PROD001',
    ownProductCode: 'OWN001',
    displayStatus: 'ACTIVE',
    saleStatus: 'AVAILABLE',
    productName: 'Premium Organic Olive Oil',
    englishProductName: 'Premium Organic Olive Oil',
    productCategoryNumber: 'CAT001',
    taxClassification: 'TAXABLE',
    consumerPrice: 35000,
    supplyPrice: 25000,
    productPrice: 30000,
    salePrice: 28000,
    minOrderQuantity: 1,
    maxOrderQuantity: 100,
    rewardPoints: 280,
    rewardPointsClassification: 'PERCENTAGE',
    optionUsage: 'NO',
    adultVerification: 'NO',
    manufacturer: 'Organic Foods Co.',
    origin: 1,
    deliveryMethod: 'PARCEL',
    domesticOverseasDelivery: 'DOMESTIC',
  },
  {
    productCode: 'PROD002',
    ownProductCode: 'OWN002',
    displayStatus: 'ACTIVE',
    saleStatus: 'AVAILABLE',
    productName: 'Artisan Whole Grain Bread',
    englishProductName: 'Artisan Whole Grain Bread',
    productCategoryNumber: 'CAT002',
    taxClassification: 'TAXABLE',
    consumerPrice: 8000,
    supplyPrice: 5000,
    productPrice: 7000,
    salePrice: 6500,
    minOrderQuantity: 1,
    maxOrderQuantity: 50,
    rewardPoints: 65,
    rewardPointsClassification: 'PERCENTAGE',
    optionUsage: 'NO',
    adultVerification: 'NO',
    manufacturer: 'Artisan Bakery',
    origin: 2,
    deliveryMethod: 'PARCEL',
    domesticOverseasDelivery: 'DOMESTIC',
  },
  {
    productCode: 'PROD003',
    ownProductCode: 'OWN003',
    displayStatus: 'ACTIVE',
    saleStatus: 'AVAILABLE',
    productName: 'Wild Caught Salmon Fillet',
    englishProductName: 'Wild Caught Salmon Fillet',
    productCategoryNumber: 'CAT003',
    taxClassification: 'TAXABLE',
    consumerPrice: 45000,
    supplyPrice: 35000,
    productPrice: 42000,
    salePrice: 40000,
    minOrderQuantity: 1,
    maxOrderQuantity: 20,
    rewardPoints: 400,
    rewardPointsClassification: 'PERCENTAGE',
    optionUsage: 'NO',
    adultVerification: 'NO',
    manufacturer: 'Ocean Fresh Co.',
    origin: 3,
    deliveryMethod: 'COLD_CHAIN',
    domesticOverseasDelivery: 'DOMESTIC',
  },
  {
    productCode: 'PROD004',
    ownProductCode: 'OWN004',
    displayStatus: 'ACTIVE',
    saleStatus: 'AVAILABLE',
    productName: 'Premium Wagyu Beef Set',
    englishProductName: 'Premium Wagyu Beef Set',
    productCategoryNumber: 'CAT003',
    taxClassification: 'TAXABLE',
    consumerPrice: 120000,
    supplyPrice: 90000,
    productPrice: 110000,
    salePrice: 105000,
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    rewardPoints: 1050,
    rewardPointsClassification: 'PERCENTAGE',
    optionUsage: 'YES',
    adultVerification: 'NO',
    manufacturer: 'Premium Meats Ltd.',
    origin: 4,
    deliveryMethod: 'COLD_CHAIN',
    domesticOverseasDelivery: 'DOMESTIC',
  },
  {
    productCode: 'PROD005',
    ownProductCode: 'OWN005',
    displayStatus: 'ACTIVE',
    saleStatus: 'AVAILABLE',
    productName: 'Organic Vegetable Box (Large)',
    englishProductName: 'Organic Vegetable Box (Large)',
    productCategoryNumber: 'CAT004',
    taxClassification: 'TAXABLE',
    consumerPrice: 55000,
    supplyPrice: 40000,
    productPrice: 50000,
    salePrice: 48000,
    minOrderQuantity: 1,
    maxOrderQuantity: 30,
    rewardPoints: 480,
    rewardPointsClassification: 'PERCENTAGE',
    optionUsage: 'NO',
    adultVerification: 'NO',
    manufacturer: 'Farm Fresh Organics',
    origin: 1,
    deliveryMethod: 'COLD_CHAIN',
    domesticOverseasDelivery: 'DOMESTIC',
  },
];

// ========================================
// Helper Functions
// ========================================

function generateRandomDate(daysBack: number): Date {
  return new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
}

function generateRandomDateString(daysBack: number): string {
  return generateRandomDate(daysBack).toISOString().split('T')[0];
}

// ========================================
// User Entity Builder
// ========================================

class UserEntityBuilder {
  private user: Partial<UserEntity> = {};

  setId(id: string): this {
    this.user.id = id;
    return this;
  }

  setName(name: string): this {
    this.user.name = name;
    return this;
  }

  setEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  setPhoneNumber(phoneNumber: string): this {
    this.user.phoneNumber = phoneNumber;
    return this;
  }

  setAge(age: number): this {
    this.user.age = age;
    return this;
  }

  async setPassword(password: string): Promise<this> {
    this.user.password = await bcrypt.hash(password, 10);
    return this;
  }

  setRandomPoints(): this {
    this.user.totalUsedPoints = Math.floor(Math.random() * 50000);
    this.user.availablePoints = Math.floor(Math.random() * 20000);
    return this;
  }

  setRegistrationDate(date: string): this {
    this.user.registrationDate = date;
    return this;
  }

  setPermissions(permissions: RolePermissions): this {
    this.user.permissions = permissions;
    return this;
  }

  setTotalPurchaseAmount(amount: number): this {
    this.user.totalPurchaseAmount = amount;
    return this;
  }

  build(): UserEntity {
    if (!this.user.id || !this.user.name || !this.user.email || 
        !this.user.phoneNumber || !this.user.password || !this.user.permissions) {
      throw new Error('Missing required user fields');
    }
    return this.user as UserEntity;
  }
}

// ========================================
// Database Reset
// ========================================

async function resetAllData() {
  console.log('🗑️  Resetting all data...');

  const deleteOperations: Array<() => Promise<unknown>> = [
    () => prisma.refreshTokenUsed.deleteMany(),
    () => prisma.session.deleteMany(),
    () => prisma.couponHistory.deleteMany(),
    () => prisma.coupon.deleteMany(),
    () => prisma.banner.deleteMany(),
    () => prisma.userRole.deleteMany(),
    () => prisma.userMembership.deleteMany(),
    () => prisma.order.deleteMany(),
    () => prisma.point.deleteMany(),
    () => prisma.recipe.deleteMany(),
    () => prisma.user.deleteMany(),
    () => prisma.role.deleteMany(),
    () => prisma.membership.deleteMany(),
    () => prisma.category.deleteMany(),
    () => prisma.product.deleteMany(),
  ];

  for (const operation of deleteOperations) {
    try {
      await operation();
    } catch (error: any) {
      if (error?.code !== 'P2021') {
        throw error;
      }
    }
  }

  console.log('✅ All data reset successfully\n');
}

// ========================================
// Seed Functions
// ========================================

async function seedRoles() {
  console.log('👥 Creating roles...');

  const createdRoles: Array<{ id: string; name: string; description: string | null }> = [];
  for (const role of ROLES) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
    createdRoles.push(createdRole);
    console.log(`   ✓ ${role.name}`);
  }

  console.log(`✅ Created ${createdRoles.length} roles\n`);
  return createdRoles;
}

async function seedMemberships() {
  console.log('💎 Creating memberships...');

  const createdMemberships: Array<{ id: string; name: string; description: string | null; minPrice: number }> = [];
  for (const membership of MEMBERSHIPS) {
    const createdMembership = await prisma.membership.upsert({
      where: { name: membership.name },
      update: { 
        description: membership.description,
        minPrice: membership.minPrice
      },
      create: membership,
    });
    createdMemberships.push(createdMembership);
    console.log(`   ✓ ${membership.name} (₩${membership.minPrice.toLocaleString()})`);
  }

  console.log(`✅ Created ${createdMemberships.length} memberships\n`);
  return createdMemberships;
}

async function seedUsers() {
  console.log('👤 Creating users...');

  const users: Array<{ id: string; name: string; email: string; phoneNumber: string; availablePoints: number; roleName: string; totalPurchaseAmount: number }> = [];
  const roleConfigs = [
    { roleName: 'ADMIN', count: 2 },
    { roleName: 'GENERAL_MANAGER', count: 2 },
    { roleName: 'MANAGER', count: 3 },
    { roleName: 'MD', count: 2 },
    { roleName: 'CS_MANAGER', count: 3 },
    { roleName: 'USER', count: 10 },
  ];

  let userIndex = 0;
  for (const { roleName, count } of roleConfigs) {
    for (let i = 0; i < count; i++) {
      const userId = `user${userIndex.toString().padStart(3, '0')}`;
      const name = `${roleName}${i + 1}`;
      const email = `${name.toLowerCase()}@example.com`;
      const phoneNumber = `010-${(1000 + userIndex).toString().padStart(4, '0')}-${(5000 + userIndex).toString().padStart(4, '0')}`;

      const permissions = getPermissionsForRole(roleName);
      
      // MANAGER2 gets limited permissions
      if (roleName === 'MANAGER' && i === 1) {
        permissions.productAccess = false;
        permissions.bannerAccess = false;
      }

      // Generate purchase amount based on role
      const totalPurchaseAmount = roleName === 'USER' 
        ? Math.floor(Math.random() * 2000000) // 0 - 2M for regular users
        : Math.floor(Math.random() * 500000); // 0 - 500K for staff

      const builder = new UserEntityBuilder();
      await builder.setPassword('password123');
      const userEntity = builder
        .setId(userId)
        .setName(name)
        .setEmail(email)
        .setPhoneNumber(phoneNumber)
        .setAge(20 + Math.floor(Math.random() * 50))
        .setRandomPoints()
        .setRegistrationDate(generateRandomDateString(730)) // Random date within 2 years
        .setPermissions(permissions)
        .setTotalPurchaseAmount(totalPurchaseAmount)
        .build();

      const user = await prisma.user.upsert({
        where: { id: userId },
        update: {
          name: userEntity.name,
          email: userEntity.email,
          password: userEntity.password,
          phoneNumber: userEntity.phoneNumber,
          age: userEntity.age,
          totalUsedPoints: userEntity.totalUsedPoints,
          availablePoints: userEntity.availablePoints,
          registrationDate: userEntity.registrationDate,
          totalPurchaseAmount: userEntity.totalPurchaseAmount || 0,
          dashboardAccess: userEntity.permissions.dashboardAccess,
          memberAccess: userEntity.permissions.memberAccess,
          productAccess: userEntity.permissions.productAccess,
          orderAccess: userEntity.permissions.orderAccess,
          recipeAccess: userEntity.permissions.recipeAccess,
          bannerAccess: userEntity.permissions.bannerAccess,
        },
        create: {
          id: userEntity.id,
          name: userEntity.name,
          email: userEntity.email,
          password: userEntity.password,
          phoneNumber: userEntity.phoneNumber,
          age: userEntity.age,
          totalUsedPoints: userEntity.totalUsedPoints,
          availablePoints: userEntity.availablePoints,
          registrationDate: userEntity.registrationDate,
          totalPurchaseAmount: userEntity.totalPurchaseAmount || 0,
          dashboardAccess: userEntity.permissions.dashboardAccess,
          memberAccess: userEntity.permissions.memberAccess,
          productAccess: userEntity.permissions.productAccess,
          orderAccess: userEntity.permissions.orderAccess,
          recipeAccess: userEntity.permissions.recipeAccess,
          bannerAccess: userEntity.permissions.bannerAccess,
        },
      });

      users.push({ ...user, roleName, totalPurchaseAmount });
      console.log(`   ✓ ${name} (${email})`);
      userIndex++;
    }
  }

  console.log(`✅ Created ${users.length} users\n`);
  return users;
}

async function assignRolesToUsers(
  users: Array<{ id: string; name: string; roleName: string }>,
  roles: Array<{ id: string; name: string }>,
) {
  console.log('🔗 Assigning roles to users...');

  const roleMap = new Map(roles.map(role => [role.name, role.id]));
  const userRoles = users
    .map(user => {
      const roleId = roleMap.get(user.roleName);
      return roleId ? { userId: user.id, roleId } : null;
    })
    .filter(Boolean) as Array<{ userId: string; roleId: string }>;

  if (userRoles.length > 0) {
    await prisma.userRole.createMany({
      data: userRoles,
      skipDuplicates: true,
    });
  }

  console.log(`✅ Assigned ${userRoles.length} user-role relationships\n`);
}

async function assignMembershipsToUsers(
  users: Array<{ id: string; name: string; totalPurchaseAmount: number }>,
  memberships: Array<{ id: string; name: string; description: string | null; minPrice: number }>,
) {
  console.log('💎 Assigning memberships to users...');

  // Sort memberships by minPrice descending for proper level determination
  const sortedMemberships = [...memberships].sort((a, b) => b.minPrice - a.minPrice);

  let assignedCount = 0;
  const membershipStats: Record<string, number> = {};

  // Process each user individually to ensure one-to-one relationship
  for (const user of users) {
    // Determine membership based on total purchase amount
    const appropriateMembership = sortedMemberships.find(
      m => user.totalPurchaseAmount >= m.minPrice
    ) || sortedMemberships[sortedMemberships.length - 1]; // Default to lowest tier

    const startDate = generateRandomDate(730); // Random within last 2 years
    const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year validity

    // Determine status: 80% normal, 10% expired, 10% suspended
    const rand = Math.random();
    const status = rand < 0.8 ? 'normal' : rand < 0.9 ? 'expired' : 'suspended';

    // Use upsert to ensure each user has exactly one membership
    await prisma.userMembership.upsert({
      where: { userId: user.id },
      update: {
        membershipId: appropriateMembership.id,
        membershipName: appropriateMembership.name,
        membershipDescription: appropriateMembership.description || '',
        status,
        startDate,
        endDate,
        updatedByAdmin: false,
      },
      create: {
        userId: user.id,
        membershipId: appropriateMembership.id,
        membershipName: appropriateMembership.name,
        membershipDescription: appropriateMembership.description || '',
        status,
        startDate,
        endDate,
        updatedByAdmin: false,
      },
    });

    // Track statistics
    const membershipName = appropriateMembership.name;
    membershipStats[membershipName] = (membershipStats[membershipName] || 0) + 1;
    assignedCount++;
  }

  // Display statistics
  console.log(`   ✓ Assigned ${assignedCount} user-membership relationships`);
  console.log('   📊 Membership distribution:');
  for (const [membershipName, count] of Object.entries(membershipStats)) {
    console.log(`      • ${membershipName}: ${count} users`);
  }

  console.log(`✅ All users have been assigned memberships (one per user)\n`);
}

async function seedCategories() {
  console.log('📂 Creating categories...');

  const categoriesData = [
    {
      productCategoryNumber: 'CAT001',
      name: CategoryType.LIVESTOCK,
      description: 'Livestock products - Fresh premium meats and livestock products',
    },
    {
      productCategoryNumber: 'CAT002',
      name: CategoryType.CONVENIENCE_FOOD,
      description: 'Convenience food - Quick and ready-to-eat meals for busy lifestyles',
    },
    {
      productCategoryNumber: 'CAT003',
      name: CategoryType.FISHERIES,
      description: 'Fisheries - Fresh seafood and premium fish products',
    },
    {
      productCategoryNumber: 'CAT004',
      name: CategoryType.SIDE_DISH,
      description: 'Side dish - Premium oils, condiments, and side dish ingredients',
    },
  ];

  const createdCategories: Array<{ productCategoryNumber: string }> = [];
  for (const category of categoriesData) {
    const createdCategory = await prisma.category.upsert({
      where: { productCategoryNumber: category.productCategoryNumber },
      update: {
        name: category.name,
        description: category.description,
      },
      create: {
        productCategoryNumber: category.productCategoryNumber,
        name: category.name,
        description: category.description,
      },
    });
    createdCategories.push({ productCategoryNumber: createdCategory.productCategoryNumber });
    console.log(`   ✓ ${category.name} (${category.productCategoryNumber}) - ${category.description}`);
  }

  console.log(`✅ Created ${createdCategories.length} categories\n`);
  return createdCategories;
}

// Note: Product categories are managed directly through the Product model's productCategoryNumber field
function seedProductCategories(
  products: Array<{ id: string; productCode: string | null; productName: string | null; salePrice: number | null; productCategoryNumber: string | null }>,
) {
  console.log('🔗 Product-category relationships are managed through Product.productCategoryNumber\n');
  return [];
}

async function seedProducts() {
  console.log('📦 Creating products...');

  const createdProducts: Array<{ id: string; productCode: string | null; productName: string | null; salePrice: number | null; productCategoryNumber: string | null }> = [];
  for (const product of PRODUCTS) {
    const createdProduct = await prisma.product.create({
      data: product,
      select: {
        id: true,
        productCode: true,
        productName: true,
        salePrice: true,
        productCategoryNumber: true,
      },
    });
    createdProducts.push(createdProduct);
    console.log(`   ✓ ${product.productName} (₩${product.salePrice?.toLocaleString()})`);
  }

  console.log(`✅ Created ${createdProducts.length} products\n`);
  return createdProducts;
}

async function seedOrders(
  users: Array<{ id: string; name: string; phoneNumber: string }>,
  products: Array<{ id: string; productCode: string | null; productName: string | null; salePrice: number | null }>,
) {
  console.log('🛒 Creating orders...');

  const regularUsers = users.filter(u => u.name.startsWith('USER'));
  const orders: Array<{ id: string; orderNumber: string }> = [];

  // Possible order situations
  const orderSituations = [
    OrderSituation.ORDER_NEW,
    OrderSituation.ORDER_PAYMENT_PENDING,
    OrderSituation.ORDER_PAYMENT_COMPLETED,
    OrderSituation.ORDER_IN_PREPARE,
    OrderSituation.ORDER_BEING_SHIPPED,
    OrderSituation.ORDER_SHIPPED,
    OrderSituation.ORDER_CANCELLED,
    OrderSituation.ORDER_RETURNED,
  ];

  // Korean courier companies
  const courierCompanies = [
    'CJ대한통운',
    '한진택배',
    '롯데택배',
    '우체국택배',
    '로젠택배',
    'CU편의점택배',
    'GS Postbox 택배',
    '대신택배',
  ];

  for (let i = 0; i < 25; i++) {
    const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];

    const userMembership = await prisma.userMembership.findFirst({
      where: { userId: user.id },
    });

    // Randomly select order situation and courier company
    const situation = orderSituations[Math.floor(Math.random() * orderSituations.length)];
    const courierCompany = courierCompanies[Math.floor(Math.random() * courierCompanies.length)];

    // Each order has exactly 1 product
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const salePrice = product.salePrice ?? 0;
    const totalOrderAmount = salePrice * quantity;

    // Create order with direct product relation
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD${(i + 1).toString().padStart(6, '0')}`,
        itemWiseOrderNumber: `ITEM${(i + 1).toString().padStart(6, '0')}-01`,
        totalOrderAmount,
        totalPaymentAmount: totalOrderAmount, // Assuming no discount for now
        productId: product.id, // Required field: 상품번호 (Product ID) - direct relation to Product
        productName: product.productName || '',
        productNameWithOptions: product.productName || '',
        quantity,
        salePrice,
        // Common order fields
        recipient: user.name,
        recipientAddressFull: `Seoul, Gangnam-gu, Teheran-ro ${100 + i}`,
        recipientPostalCode: 10000 + Math.floor(Math.random() * 90000),
        recipientMobilePhone: user.phoneNumber,
        recipientPhoneNumber: user.phoneNumber,
        deliveryMessage: i % 3 === 0 ? 'Please leave at the door' : '',
        paymentType: 'ONLINE',
        paymentMethod: ['CARD', 'BANK_TRANSFER', 'KAKAO_PAY'][Math.floor(Math.random() * 3)],
        orderDate: generateRandomDateString(180),
        ordererName: user.name,
        ordererMobilePhone: user.phoneNumber,
        ordererId: user.id,
        desiredDeliveryDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        membershipLevelAtOrderTime: userMembership?.membershipName || 'GENERAL',
        situation,
        courierCompany,
      },
    });

    orders.push(order);
    console.log(`   ✓ ${order.orderNumber} - Product: ${product.productName} - Total: ₩${totalOrderAmount.toLocaleString()}`);
  }

  console.log(`✅ Created ${orders.length} orders\n`);
  return orders;
}

async function seedPoints(
  users: Array<{ id: string; availablePoints: number }>,
  orders: Array<{ id: string; orderNumber: string }>,
) {
  console.log('💰 Creating point records (1-to-1 with users)...');

  const points: Array<{ id: string }> = [];
  
  // Create one point record per user (1-to-1 relationship)
  for (const user of users) {
    const order = orders[Math.floor(Math.random() * orders.length)];
    const isEarned = Math.random() > 0.33; // ~67% earned, ~33% used

    const increase = isEarned ? Math.floor(Math.random() * 5000) : 0;
    const deduction = !isEarned ? Math.floor(Math.random() * 3000) : 0;
    const balance = (user.availablePoints || 0) + increase - deduction;

    const userMembership = await prisma.userMembership.findFirst({
      where: { userId: user.id },
    });

    const point = await prisma.point.create({
      data: {
        date: generateRandomDateString(180),
        userId: user.id,
        membershipLevel: userMembership?.membershipName || 'GENERAL',
        content: isEarned ? `Order reward points` : `Points redemption`,
        orderNumber: order.orderNumber,
        pointsType: isEarned ? 'EARNED' : 'USED',
        availablePointsIncrease: increase,
        availablePointsDeduction: deduction,
        availablePointsBalance: balance,
      },
    });

    points.push(point);
  }

  console.log(`✅ Created ${points.length} point records (one per user)\n`);
  return points;
}

// RecipeCategory is now an enum, not a model, so we don't need to seed it
// The enum values are: RECIPE, REVIEWS, DAILY_LIFE

async function seedRecipes(
  users: Array<{ id: string; name: string }>,
) {
  console.log('📖 Creating recipes...');

  const recipes: Array<{ id: string; title: string }> = [];
  const recipeData = [
    {
      title: 'Classic Korean Kimchi Fried Rice',
      category: RecipeCategory.RECIPE,
      content: 'A delicious and easy kimchi fried rice recipe with bacon and vegetables.',
      ingredients: ['Rice', 'Kimchi', 'Bacon', 'Green onion', 'Sesame oil', 'Soy sauce', 'Egg'],
    },
    {
      title: 'Homemade Italian Pasta Carbonara',
      category: RecipeCategory.RECIPE,
      content: 'Authentic Italian carbonara with eggs, pecorino cheese, and guanciale.',
      ingredients: ['Spaghetti', 'Eggs', 'Pecorino cheese', 'Guanciale', 'Black pepper'],
    },
    {
      title: 'Healthy Buddha Bowl',
      category: RecipeCategory.RECIPE,
      content: 'A nutritious bowl packed with quinoa, roasted vegetables, and tahini dressing.',
      ingredients: ['Quinoa', 'Sweet potato', 'Chickpeas', 'Kale', 'Avocado', 'Tahini', 'Lemon'],
    },
    {
      title: 'Spicy Thai Green Curry',
      category: RecipeCategory.RECIPE,
      content: 'Aromatic Thai green curry with chicken and vegetables in coconut milk.',
      ingredients: ['Chicken', 'Green curry paste', 'Coconut milk', 'Thai basil', 'Bamboo shoots', 'Fish sauce'],
    },
    {
      title: 'Japanese Ramen Bowl',
      category: RecipeCategory.RECIPE,
      content: 'Rich and flavorful ramen with pork belly, soft-boiled egg, and noodles.',
      ingredients: ['Ramen noodles', 'Pork belly', 'Egg', 'Green onion', 'Nori', 'Miso paste', 'Chicken broth'],
    },
    {
      title: 'Mediterranean Grilled Chicken',
      category: RecipeCategory.RECIPE,
      content: 'Grilled chicken marinated in herbs and lemon, served with Greek salad.',
      ingredients: ['Chicken breast', 'Olive oil', 'Lemon', 'Oregano', 'Garlic', 'Tomatoes', 'Cucumber', 'Feta cheese'],
    },
    {
      title: 'Vegan Lentil Soup',
      category: RecipeCategory.DAILY_LIFE,
      content: 'Hearty and nutritious lentil soup with vegetables and aromatic spices.',
      ingredients: ['Red lentils', 'Carrots', 'Celery', 'Onion', 'Garlic', 'Cumin', 'Vegetable broth'],
    },
    {
      title: 'Classic French Croissant',
      category: RecipeCategory.REVIEWS,
      content: 'Buttery, flaky croissants made from scratch with laminated dough.',
      ingredients: ['Flour', 'Butter', 'Milk', 'Sugar', 'Salt', 'Yeast'],
    },
  ];

  const regularUsers = users.filter(u => u.name.startsWith('USER'));

  for (let i = 0; i < recipeData.length; i++) {
    const data = recipeData[i];
    const author = regularUsers[Math.floor(Math.random() * regularUsers.length)];

    const recipe = await prisma.recipe.create({
      data: {
        title: data.title,
        authorId: author.id,
        authorName: author.name,
        category: data.category,
        dateOfWriting: generateRandomDate(365),
        views: Math.floor(Math.random() * 5000),
        status: 'active',
        content: data.content,
        ingredients: data.ingredients,
        thumbnailUrl: `https://example.com/thumbnails/recipe-${i + 1}.jpg`,
        isActive: true,
      },
    });

    recipes.push(recipe);
    console.log(`   ✓ ${data.title} (${data.category})`);
  }

  console.log(`✅ Created ${recipes.length} recipes\n`);
  return recipes;
}

async function seedCoupons() {
  console.log('🎟️  Creating coupons...');

  const coupons: Array<{ id: string; name: string; code: string }> = [];
  const couponsData = [
    {
      name: 'VIP Welcome Coupon',
      code: 'VIP-WELCOME-2025',
      type: CouponType.PERCENT,
      discountRate: 20,
      minPurchaseAmount: 100000,
      maxDiscountAmount: 50000,
      isAutoIssue: true,
      autoIssueDayOfMonth: new Date('2025-01-01'),
      targetGrades: ['VIP'],
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
    {
      name: 'VVIP Exclusive Discount',
      code: 'VVIP-EXCLUSIVE-2025',
      type: CouponType.AMOUNT,
      discountAmount: 100000,
      minPurchaseAmount: 500000,
      isAutoIssue: true,
      autoIssueDayOfMonth: new Date('2025-01-01'),
      targetGrades: ['VVIP'],
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
    {
      name: 'Premium Member Monthly Bonus',
      code: 'PREMIUM-MONTHLY-2025',
      type: CouponType.PERCENT,
      discountRate: 15,
      minPurchaseAmount: 200000,
      maxDiscountAmount: 30000,
      isAutoIssue: true,
      autoIssueDayOfMonth: new Date('2025-01-15'),
      targetGrades: ['VIP', 'VVIP'],
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
    {
      name: 'New Year Special',
      code: 'NEWYEAR-2025',
      type: CouponType.AMOUNT,
      discountAmount: 50000,
      minPurchaseAmount: 300000,
      isAutoIssue: false,
      autoIssueDayOfMonth: new Date('2025-01-01'),
      targetGrades: ['GOLD', 'SILVER'],
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
    },
  ];

  for (const data of couponsData) {
    const coupon = await prisma.coupon.create({
      data: {
        ...data
      },
    });
    coupons.push(coupon);
    console.log(`   ✓ ${data.name} (${data.code})`);
  }

  console.log(`✅ Created ${coupons.length} coupons\n`);
  return coupons;
}

async function seedCouponHistories(
  users: Array<{ id: string; name: string }>,
  coupons: Array<{ id: string; name: string; code: string }>,
  orders: Array<{ id: string; orderNumber: string }>,
) {
  console.log('📜 Creating coupon histories...');

  const regularUsers = users.filter(u => u.name.startsWith('USER'));
  const couponHistories: Array<{ id: string }> = [];

  for (let i = 0; i < 15; i++) {
    const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
    const coupon = coupons[Math.floor(Math.random() * coupons.length)];
    const order = Math.random() > 0.3 ? orders[Math.floor(Math.random() * orders.length)] : null;

    const issuedAt = generateRandomDate(90);
    const usedAt = order && Math.random() > 0.4 ? new Date(issuedAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null;
    
    const status = usedAt ? 'USED' : Math.random() > 0.7 ? 'EXPIRED' : 'ISSUED';

    const couponHistory = await prisma.couponHistory.create({
      data: {
        couponId: coupon.id,
        userId: user.id,
        orderId: order?.id,
        status,
        issuedAt,
        usedAt,
        expiredAt: status === 'EXPIRED' ? new Date(issuedAt.getTime() + 60 * 24 * 60 * 60 * 1000) : null,
        discountAppliedAmount: usedAt ? Math.floor(Math.random() * 50000) : null,
        purchaseAmountAtUse: usedAt ? Math.floor(Math.random() * 500000 + 100000) : null,
      },
    });

    couponHistories.push(couponHistory);
  }

  console.log(`✅ Created ${couponHistories.length} coupon histories\n`);
  return couponHistories;
}

async function seedBanners(
  products: Array<{ id: string; productName: string | null; salePrice: number | null; productCode: string | null; productCategoryNumber: string | null }>,
  categories: Array<{ productCategoryNumber: string }>,
) {
  console.log('🎨 Creating banners...');

  const banners: Array<{ id: string; title: string; type: BannerType; status: BannerStatus; linkedProductId?: string }> = [];
  
  // Create a map from productCategoryNumber to CategoryType
  const categoryTypeMap = new Map<string, CategoryType>();
  categoryTypeMap.set('CAT001', CategoryType.LIVESTOCK);
  categoryTypeMap.set('CAT002', CategoryType.CONVENIENCE_FOOD);
  categoryTypeMap.set('CAT003', CategoryType.FISHERIES);
  categoryTypeMap.set('CAT004', CategoryType.SIDE_DISH);
  
  // Helper function to get categoryType from productCategoryNumber
  const getCategoryType = (productCategoryNumber: string | null): CategoryType | null => {
    if (!productCategoryNumber) return null;
    return categoryTypeMap.get(productCategoryNumber) || null;
  };
  
  // 1 MAIN_PRODUCTS, 6 CATEGORY (5 CategoryType + 1 extra), 3 FOOTER, 1 CONTENT_HERO, 1 SPECIAL_PRICE = 12 banners
  const bannersData = [
    // 1. MAIN_PRODUCTS Banner - productCategoryNumber should be null
    {
      type: BannerType.MAIN_PRODUCTS,
      productCategoryNumber: products[0].productCategoryNumber,
      categoryType: null,
      status: BannerStatus.ACTIVE,
      title: 'Premium Quality for Your Kitchen',
      badgeText: 'Best Seller',
      mainText: 'Discover our finest selection of premium organic olive oil',
      ctaButtonText: 'Shop Now',
      ctaButtonUrl: `/products/${products[0].id}`,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800',
      displayOrder: 1,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      productId: products[0].id, // CAT001 - Premium Organic Olive Oil
    },
    // 2. CATEGORY Banner - ALL (no specific category)
    {
      type: BannerType.CATEGORY,
      productCategoryNumber: null,
      categoryType: null,
      status: BannerStatus.ACTIVE,
      title: 'Shop Everything You Need',
      badgeText: 'All Products',
      mainText: 'Browse our complete catalog of premium products',
      ctaButtonText: 'Shop All',
      ctaButtonUrl: '/products',
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
      displayOrder: 2,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho CATEGORY banner
    },
    // 3. CATEGORY Banner - LIVESTOCK (CAT001)
    {
      type: BannerType.CATEGORY,
      productCategoryNumber: 'CAT001',
      categoryType: CategoryType.LIVESTOCK,
      status: BannerStatus.ACTIVE,
      title: 'Explore Fresh Meats',
      badgeText: 'New Arrivals',
      mainText: 'Browse our complete collection of fresh, premium meats',
      ctaButtonText: 'View Collection',
      ctaButtonUrl: '/categories/meats',
      imageUrl: 'https://images.unsplash.com/photo-1535473895227-bdecb20fb157?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1535473895227-bdecb20fb157?w=800',
      displayOrder: 3,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho CATEGORY banner
    },
    // 4. CATEGORY Banner - CONVENIENCE_FOOD (CAT002)
    {
      type: BannerType.CATEGORY,
      productCategoryNumber: 'CAT002',
      categoryType: CategoryType.CONVENIENCE_FOOD,
      status: BannerStatus.ACTIVE,
      title: 'Quick & Convenient Meals',
      badgeText: 'Ready to Eat',
      mainText: 'Discover our range of delicious convenience foods for your busy lifestyle',
      ctaButtonText: 'Explore Convenience Foods',
      ctaButtonUrl: '/categories/convenience-food',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      displayOrder: 4,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho CATEGORY banner
    },
    // 5. CATEGORY Banner - FISHERIES (CAT003)
    {
      type: BannerType.CATEGORY,
      productCategoryNumber: 'CAT003',
      categoryType: CategoryType.FISHERIES,
      status: BannerStatus.ACTIVE,
      title: 'Fresh Seafood Collection',
      badgeText: 'Premium Quality',
      mainText: 'Discover our premium selection of fresh seafood',
      ctaButtonText: 'Explore Seafood',
      ctaButtonUrl: '/categories/seafood',
      imageUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=800',
      displayOrder: 5,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho CATEGORY banner
    },
    // 6. CATEGORY Banner - SIDE_DISH (CAT004)
    {
      type: BannerType.CATEGORY,
      productCategoryNumber: 'CAT004',
      categoryType: CategoryType.SIDE_DISH,
      status: BannerStatus.ACTIVE,
      title: 'Fresh From Farm to Table',
      badgeText: 'Farm Fresh',
      mainText: 'Experience the difference of locally sourced, organic ingredients delivered daily',
      ctaButtonText: 'Learn More',
      ctaButtonUrl: '/about/farm-fresh',
      imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800',
      displayOrder: 6,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho CATEGORY banner
    },
    // 8. FOOTER Banner 1
    {
      type: BannerType.FOOTER,
      productCategoryNumber: products[1].productCategoryNumber, // CAT002
      categoryType: getCategoryType(products[1].productCategoryNumber), // CONVENIENCE_FOOD
      status: BannerStatus.ACTIVE,
      title: 'Join Our Newsletter',
      badgeText: null,
      mainText: 'Get exclusive deals and recipes delivered to your inbox',
      ctaButtonText: 'Subscribe',
      ctaButtonUrl: '/newsletter/subscribe',
      imageUrl: 'https://images.unsplash.com/photo-1505935428862-770b6f24f629?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1505935428862-770b6f24f629?w=800',
      displayOrder: 8,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho FOOTER banner
    },
    // 9. FOOTER Banner 2
    {
      type: BannerType.FOOTER,
      productCategoryNumber: products[2].productCategoryNumber, // CAT003
      categoryType: getCategoryType(products[2].productCategoryNumber), // FISHERIES
      status: BannerStatus.ACTIVE,
      title: 'Follow Us on Social Media',
      badgeText: 'Connect',
      mainText: 'Stay updated with our latest products and special offers',
      ctaButtonText: 'Follow',
      ctaButtonUrl: '/social',
      imageUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
      displayOrder: 9,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho FOOTER banner
    },
    // 10. FOOTER Banner 3
    {
      type: BannerType.FOOTER,
      productCategoryNumber: products[4].productCategoryNumber, // CAT004
      categoryType: getCategoryType(products[4].productCategoryNumber), // SIDE_DISH
      status: BannerStatus.ACTIVE,
      title: 'Customer Support',
      badgeText: '24/7',
      mainText: 'We are here to help you with any questions or concerns',
      ctaButtonText: 'Contact Us',
      ctaButtonUrl: '/support',
      imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
      displayOrder: 10,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho FOOTER banner
    },
    // 11. CONTENT_HERO Banner
    {
      type: BannerType.CONTENT_HERO,
      productCategoryNumber: products[1].productCategoryNumber, // CAT002
      categoryType: getCategoryType(products[1].productCategoryNumber), // CONVENIENCE_FOOD
      status: BannerStatus.ACTIVE,
      title: 'Valentine\'s Day Special',
      badgeText: 'Coming Soon',
      mainText: 'Celebrate with our artisan bakery collection',
      ctaButtonText: 'Notify Me',
      ctaButtonUrl: `/products/${products[1].id}`,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
      displayOrder: 11,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho CONTENT_HERO banner
    },
    // 12. SPECIAL_PRICE Banner
    {
      type: BannerType.SPECIAL_PRICE,
      productCategoryNumber: products[2].productCategoryNumber, // CAT003
      categoryType: getCategoryType(products[2].productCategoryNumber), // FISHERIES
      status: BannerStatus.ACTIVE,
      title: 'This Week\'s Special Offer',
      badgeText: '30% OFF',
      mainText: 'Wild Caught Salmon - Limited Time Only!',
      ctaButtonText: 'Get Discount',
      ctaButtonUrl: `/products/${products[2].id}`,
      imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
      displayOrder: 12,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      // productId không được phép cho SPECIAL_PRICE banner
    },
  ];

  for (const data of bannersData) {
    const banner = await prisma.banner.create({
      data: {
        type: data.type,
        productCategoryNumber: data.productCategoryNumber,
        status: data.status,
        title: data.title,
        badgeText: data.badgeText,
        mainText: data.mainText,
        ctaButtonText: data.ctaButtonText,
        ctaButtonUrl: data.ctaButtonUrl,
        imageUrl: data.imageUrl,
        mobileImageUrl: data.mobileImageUrl,
        displayOrder: data.displayOrder,
        startDate: data.startDate,
        endDate: data.endDate,
        productId: data.productId,
      },
    });
    
    banners.push({ 
      id: banner.id, 
      title: data.title, 
      type: data.type, 
      status: data.status,
      linkedProductId: data.productId || undefined 
    });
    console.log(`   ✓ ${data.title} (${data.type}, ${data.status}, categoryType: ${data.categoryType || 'N/A'})`);
  }

  console.log(`✅ Created ${banners.length} banners (all ACTIVE)\n`);
  return banners;
}

// async function seedBannerProducts(
//   banners: Array<{ id: string; type: BannerType; status: BannerStatus; linkedProductId?: string }>,
//   products: Array<{ id: string; productName: string | null }>,
// ) {
//   console.log('🔗 Creating banner-product relationships...');

//   const bannerProducts: Array<{ id: string; bannerId: string; productId: string }> = [];
  
//   // Create relationships for banners that have linked products
//   for (const banner of banners) {
//     if (banner.linkedProductId) {
//       const bannerProduct = await prisma.bannerProduct.create({
//         data: {
//           bannerId: banner.id,
//           productId: banner.linkedProductId,
//           type: banner.type,
//           status: banner.status,
//         },
//       });
//       bannerProducts.push({
//         id: bannerProduct.id,
//         bannerId: bannerProduct.bannerId,
//         productId: bannerProduct.productId,
//       });
//       const product = products.find(p => p.id === banner.linkedProductId);
//       console.log(`   ✓ Linked banner "${banner.id}" to product "${product?.productName || banner.linkedProductId}" (${banner.type}, ${banner.status})`);
//     }
//   }

//   // Create some additional many-to-many relationships
//   // Example: Link multiple products to a banner, or multiple banners to a product
//   if (banners.length > 0 && products.length > 0) {
//     // Link first banner to multiple products (if we have enough products)
//     if (products.length >= 3) {
//       const firstBanner = banners[0];
//       const additionalProducts = products.slice(1, 3); // Link to products 2 and 3
      
//       for (const product of additionalProducts) {
//         try {
//           const bannerProduct = await prisma.bannerProduct.create({
//             data: {
//               bannerId: firstBanner.id,
//               productId: product.id,
//               type: firstBanner.type,
//               status: firstBanner.status,
//             },
//           });
//           bannerProducts.push({
//             id: bannerProduct.id,
//             bannerId: bannerProduct.bannerId,
//             productId: bannerProduct.productId,
//           });
//           console.log(`   ✓ Linked banner "${firstBanner.id}" to additional product "${product.productName}" (${firstBanner.type}, ${firstBanner.status})`);
//         } catch (error: any) {
//           // Skip if relationship already exists (unique constraint)
//           if (error?.code !== 'P2002') {
//             throw error;
//           }
//         }
//       }
//     }
//   }

//   console.log(`✅ Created ${bannerProducts.length} banner-product relationships\n`);
//   return bannerProducts;
// }

// ========================================
// Main Seed Function
// ========================================

async function main() {
  try {
    console.log('🌱 Starting database seeding...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await resetAllData();

    const roles = await seedRoles();
    const memberships = await seedMemberships();
    const users = await seedUsers();
    
    await assignRolesToUsers(users, roles);
    await assignMembershipsToUsers(users, memberships);
    
    const categories = await seedCategories();
    const products = await seedProducts();
    const productCategories = seedProductCategories(products);
    // const orders = await seedOrders(users, products);
    // const points = await seedPoints(users, orders);
    const recipes = await seedRecipes(users);
    const coupons = await seedCoupons();
    // const couponHistories = await seedCouponHistories(users, coupons, orders);
    const banners = await seedBanners(products, categories);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • ${roles.length} roles`);
    console.log(`   • ${memberships.length} memberships`);
    console.log(`   • ${users.length} users`);
    console.log(`   • ${users.length} user-role assignments`);
    console.log(`   • ${users.length} user-membership assignments`);
    console.log(`   • ${categories.length} categories`);
    console.log(`   • ${products.length} products`);
    console.log(`   • ${productCategories.length} product-category relationships`);
    // console.log(`   • ${orders.length} orders`);
    // console.log(`   • ${points.length} point transactions`);
    console.log(`   • ${recipes.length} recipes`);
    console.log(`   • ${coupons.length} coupons`);
    // console.log(`   • ${couponHistories.length} coupon histories`);
    console.log(`   • ${banners.length} banners`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Default login credentials:');
    console.log('   Admin: admin1@example.com / password123');
    console.log('   User: user1@example.com / password123\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run the seed function
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
