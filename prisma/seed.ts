// Import PrismaClient from generated location
import { PrismaClient, CouponType, CouponTargetGrade, OrderSituation, BannerType, BannerStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { config } from '../src/libs/config';

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
    name: 'Gold', 
    description: 'Gold membership - Enhanced benefits and rewards',
    minPrice: 300000
  },
  { 
    name: 'Silver', 
    description: 'Silver membership - Standard benefits package',
    minPrice: 150000
  },
  { 
    name: 'General', 
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
    () => prisma.recipeCategory.deleteMany(),
    () => prisma.user.deleteMany(),
    () => prisma.role.deleteMany(),
    () => prisma.membership.deleteMany(),
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

  const userMemberships = users.map(user => {
    // Determine membership based on total purchase amount
    const appropriateMembership = sortedMemberships.find(
      m => user.totalPurchaseAmount >= m.minPrice
    ) || sortedMemberships[sortedMemberships.length - 1]; // Default to lowest tier

    const startDate = generateRandomDate(730); // Random within last 2 years
    const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year validity

    // Determine status: 80% normal, 10% expired, 10% suspended
    const rand = Math.random();
    const status = rand < 0.8 ? 'normal' : rand < 0.9 ? 'expired' : 'suspended';

    return {
      userId: user.id,
      membershipId: appropriateMembership.id,
      membershipName: appropriateMembership.name,
      updatedByAdmin: false,
      membershipDescription: appropriateMembership.description || '',
      status,
      startDate,
      endDate,
    };
  });

  if (userMemberships.length > 0) {
    await prisma.userMembership.createMany({
      data: userMemberships,
      skipDuplicates: true,
    });
  }

  console.log(`✅ Assigned ${userMemberships.length} user-membership relationships\n`);
}

async function seedProducts() {
  console.log('📦 Creating products...');

  const createdProducts: Array<{ id: string; productCode: string | null; productName: string | null; salePrice: number | null }> = [];
  for (const product of PRODUCTS) {
    const createdProduct = await prisma.product.create({
      data: product,
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
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const salePrice = product.salePrice ?? 0;

    const userMembership = await prisma.userMembership.findFirst({
      where: { userId: user.id },
    });

    // Randomly select order situation and courier company
    const situation = orderSituations[Math.floor(Math.random() * orderSituations.length)];
    const courierCompany = courierCompanies[Math.floor(Math.random() * courierCompanies.length)];

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD${(i + 1).toString().padStart(6, '0')}`,
        itemWiseOrderNumber: `ITEM${(i + 1).toString().padStart(6, '0')}`,
        totalOrderAmount: salePrice * quantity,
        totalPaymentAmount: salePrice * quantity,
        productNumber: parseInt(product.productCode?.replace('PROD', '') || '0', 10),
        productName: product.productName || '',
        productNameWithOptions: product.productName || '',
        quantity,
        recipient: user.name,
        recipientAddressFull: `Seoul, Gangnam-gu, Teheran-ro ${100 + i}`,
        recipientPostalCode: 10000 + Math.floor(Math.random() * 90000),
        recipientMobilePhone: user.phoneNumber,
        recipientPhoneNumber: user.phoneNumber,
        deliveryMessage: i % 3 === 0 ? 'Please leave at the door' : '',
        salePrice,
        paymentType: 'ONLINE',
        paymentMethod: ['CARD', 'BANK_TRANSFER', 'KAKAO_PAY'][Math.floor(Math.random() * 3)],
        orderDate: generateRandomDateString(180),
        ordererName: user.name,
        ordererMobilePhone: user.phoneNumber,
        ordererId: user.id,
        desiredDeliveryDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        membershipLevelAtOrderTime: userMembership?.membershipName || 'General',
        situation,
        courierCompany,
      },
    });

    orders.push(order);
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
        membershipLevel: userMembership?.membershipName || 'General',
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

async function seedRecipeCategories() {
  console.log('📂 Creating recipe categories...');

  const categories = [
    {
      name: 'Korean',
      description: 'Traditional and modern Korean cuisine',
    },
    {
      name: 'Italian',
      description: 'Classic Italian dishes and pasta recipes',
    },
    {
      name: 'Healthy',
      description: 'Nutritious and balanced meal options',
    },
    {
      name: 'Thai',
      description: 'Authentic Thai flavors and spices',
    },
    {
      name: 'Japanese',
      description: 'Traditional Japanese cooking techniques',
    },
    {
      name: 'Mediterranean',
      description: 'Fresh Mediterranean cuisine with olive oil and herbs',
    },
    {
      name: 'Vegan',
      description: 'Plant-based recipes without animal products',
    },
    {
      name: 'French',
      description: 'Classical French culinary techniques and pastries',
    },
  ];

  const createdCategories: Array<{ id: string; name: string }> = [];
  for (const category of categories) {
    // NOTE:
    // - Some DBs / generated Prisma clients may not have `name` as a unique field in `WhereUniqueInput`.
    // - Using findFirst + update/create avoids TS2322 while still keeping category names stable.
    const existingCategory = await prisma.recipeCategory.findFirst({
      where: { name: category.name },
      select: { id: true, name: true },
    });

    const createdCategory = existingCategory
      ? await prisma.recipeCategory.update({
          where: { id: existingCategory.id },
          data: { description: category.description },
          select: { id: true, name: true },
        })
      : await prisma.recipeCategory.create({
          data: category,
          select: { id: true, name: true },
        });
    createdCategories.push(createdCategory);
    console.log(`   ✓ ${category.name}`);
  }

  console.log(`✅ Created ${createdCategories.length} recipe categories\n`);
  return createdCategories;
}

async function seedRecipes(
  users: Array<{ id: string; name: string }>,
  recipeCategories: Array<{ id: string; name: string }>,
) {
  console.log('📖 Creating recipes...');

  const recipes: Array<{ id: string; title: string }> = [];
  const recipeData = [
    {
      title: 'Classic Korean Kimchi Fried Rice',
      category: 'Korean',
      content: 'A delicious and easy kimchi fried rice recipe with bacon and vegetables.',
      ingredients: ['Rice', 'Kimchi', 'Bacon', 'Green onion', 'Sesame oil', 'Soy sauce', 'Egg'],
    },
    {
      title: 'Homemade Italian Pasta Carbonara',
      category: 'Italian',
      content: 'Authentic Italian carbonara with eggs, pecorino cheese, and guanciale.',
      ingredients: ['Spaghetti', 'Eggs', 'Pecorino cheese', 'Guanciale', 'Black pepper'],
    },
    {
      title: 'Healthy Buddha Bowl',
      category: 'Healthy',
      content: 'A nutritious bowl packed with quinoa, roasted vegetables, and tahini dressing.',
      ingredients: ['Quinoa', 'Sweet potato', 'Chickpeas', 'Kale', 'Avocado', 'Tahini', 'Lemon'],
    },
    {
      title: 'Spicy Thai Green Curry',
      category: 'Thai',
      content: 'Aromatic Thai green curry with chicken and vegetables in coconut milk.',
      ingredients: ['Chicken', 'Green curry paste', 'Coconut milk', 'Thai basil', 'Bamboo shoots', 'Fish sauce'],
    },
    {
      title: 'Japanese Ramen Bowl',
      category: 'Japanese',
      content: 'Rich and flavorful ramen with pork belly, soft-boiled egg, and noodles.',
      ingredients: ['Ramen noodles', 'Pork belly', 'Egg', 'Green onion', 'Nori', 'Miso paste', 'Chicken broth'],
    },
    {
      title: 'Mediterranean Grilled Chicken',
      category: 'Mediterranean',
      content: 'Grilled chicken marinated in herbs and lemon, served with Greek salad.',
      ingredients: ['Chicken breast', 'Olive oil', 'Lemon', 'Oregano', 'Garlic', 'Tomatoes', 'Cucumber', 'Feta cheese'],
    },
    {
      title: 'Vegan Lentil Soup',
      category: 'Vegan',
      content: 'Hearty and nutritious lentil soup with vegetables and aromatic spices.',
      ingredients: ['Red lentils', 'Carrots', 'Celery', 'Onion', 'Garlic', 'Cumin', 'Vegetable broth'],
    },
    {
      title: 'Classic French Croissant',
      category: 'French',
      content: 'Buttery, flaky croissants made from scratch with laminated dough.',
      ingredients: ['Flour', 'Butter', 'Milk', 'Sugar', 'Salt', 'Yeast'],
    },
  ];

  // Create a map for quick category lookup
  const categoryMap = new Map(recipeCategories.map(cat => [cat.name, cat.id]));

  const regularUsers = users.filter(u => u.name.startsWith('USER'));

  for (let i = 0; i < recipeData.length; i++) {
    const data = recipeData[i];
    const author = regularUsers[Math.floor(Math.random() * regularUsers.length)];
    const categoryId = categoryMap.get(data.category);

    const recipe = await prisma.recipe.create({
      data: {
        title: data.title,
        authorId: author.id,
        authorName: author.name,
        category: data.category,
        recipeCategoryId: categoryId,
        dateOfWriting: generateRandomDate(365),
        views: Math.floor(Math.random() * 5000),
        status: 'active',
        content: data.content,
        ingredients: data.ingredients,
        thumbnailUrl: `https://example.com/thumbnails/recipe-${i + 1}.jpg`,
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
      targetGrades: [CouponTargetGrade.VIP],
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
      targetGrades: [CouponTargetGrade.VVIP],
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
      targetGrades: [CouponTargetGrade.VIP, CouponTargetGrade.VVIP],
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
      targetGrades: [],
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

async function seedBanners(products: Array<{ id: string; productName: string | null; salePrice: number | null; productCode: string | null }>) {
  console.log('🎨 Creating banners...');

  const banners: any[] = [];
  
  // Select some products for product banners
  const productForMainBanner = products[0]; // Premium Organic Olive Oil
  const productForSpecialPrice = products[2]; // Wild Caught Salmon Fillet
  
  const bannersData = [
    // Main Product Banner - Linked to actual product
    {
      type: BannerType.MAIN_PRODUCTS,
      status: BannerStatus.ACTIVE,
      productId: productForMainBanner.id,
      title: 'Premium Quality for Your Kitchen',
      badgeText: 'Best Seller',
      mainText: 'Discover our finest selection of premium organic olive oil',
      ctaButtonText: 'Shop Now',
      ctaButtonUrl: `/products/${productForMainBanner.id}`,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800',
      displayOrder: 1,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      productName: productForMainBanner.productName,
      productPrice: productForMainBanner.salePrice,
      productBrand: 'Organic Foods Co.',
      productExplanation: 'Premium quality olive oil sourced from the finest Mediterranean groves',
    },
    // Special Price Banner - Linked to product
    {
      type: BannerType.SPECIAL_PRICE,
      status: BannerStatus.ACTIVE,
      productId: productForSpecialPrice.id,
      title: 'This Week\'s Special Offer',
      badgeText: '30% OFF',
      mainText: 'Wild Caught Salmon - Limited Time Only!',
      ctaButtonText: 'Get Discount',
      ctaButtonUrl: `/products/${productForSpecialPrice.id}`,
      imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
      displayOrder: 2,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      productName: productForSpecialPrice.productName,
      productPrice: productForSpecialPrice.salePrice,
      productBrand: 'Ocean Fresh Co.',
      productExplanation: 'Fresh wild-caught salmon, rich in omega-3',
    },
    // Category Banner - No product link
    {
      type: BannerType.CATEGORY,
      status: BannerStatus.ACTIVE,
      productId: null,
      title: 'Explore Fresh Seafood',
      badgeText: 'New Arrivals',
      mainText: 'Browse our complete collection of fresh, sustainable seafood',
      ctaButtonText: 'View Collection',
      ctaButtonUrl: '/categories/seafood',
      imageUrl: 'https://images.unsplash.com/photo-1535473895227-bdecb20fb157?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1535473895227-bdecb20fb157?w=800',
      displayOrder: 3,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      productName: null,
      productPrice: null,
      productBrand: null,
      productExplanation: null,
    },
    // Content Hero Banner - No product link
    {
      type: BannerType.CONTENT_HERO,
      status: BannerStatus.ACTIVE,
      productId: null,
      title: 'Fresh From Farm to Table',
      badgeText: 'Farm Fresh',
      mainText: 'Experience the difference of locally sourced, organic ingredients delivered daily',
      ctaButtonText: 'Learn More',
      ctaButtonUrl: '/about/farm-fresh',
      imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800',
      displayOrder: 4,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      productName: null,
      productPrice: null,
      productBrand: null,
      productExplanation: null,
    },
    // Footer Banner - No product link
    {
      type: BannerType.FOOTER,
      status: BannerStatus.ACTIVE,
      productId: null,
      title: 'Join Our Newsletter',
      badgeText: null,
      mainText: 'Get exclusive deals and recipes delivered to your inbox',
      ctaButtonText: 'Subscribe',
      ctaButtonUrl: '/newsletter/subscribe',
      imageUrl: 'https://images.unsplash.com/photo-1505935428862-770b6f24f629?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1505935428862-770b6f24f629?w=800',
      displayOrder: 5,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      productName: null,
      productPrice: null,
      productBrand: null,
      productExplanation: null,
    },
    // Scheduled Banner - Future activation
    {
      type: BannerType.MAIN_PRODUCTS,
      status: BannerStatus.SCHEDULED,
      productId: products[1]?.id, // Artisan Whole Grain Bread
      title: 'Valentine\'s Day Special',
      badgeText: 'Coming Soon',
      mainText: 'Celebrate with our artisan bakery collection',
      ctaButtonText: 'Notify Me',
      ctaButtonUrl: `/products/${products[1]?.id}`,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
      displayOrder: 6,
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-14'),
      productName: products[1]?.productName,
      productPrice: products[1]?.salePrice,
      productBrand: 'Artisan Bakery',
      productExplanation: 'Handcrafted breads baked fresh daily',
    },
    // Inactive Banner
    {
      type: BannerType.SPECIAL_PRICE,
      status: BannerStatus.INACTIVE,
      productId: null,
      title: 'Holiday Sale 2024',
      badgeText: 'Ended',
      mainText: 'Thanks for participating in our holiday sale!',
      ctaButtonText: null,
      ctaButtonUrl: null,
      imageUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=1200',
      mobileImageUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=800',
      displayOrder: 7,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-31'),
      productName: null,
      productPrice: null,
      productBrand: null,
      productExplanation: null,
    },
  ];

  for (const data of bannersData) {
    const banner = await prisma.banner.create({
      data: {
        ...data
      },
    });
    banners.push(banner);
    console.log(`   ✓ ${data.title} (${data.type}, ${data.status})`);
  }

  console.log(`✅ Created ${banners.length} banners\n`);
  return banners;
}

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
    
    const products = await seedProducts();
    const orders = await seedOrders(users, products);
    const points = await seedPoints(users, orders);
    const recipeCategories = await seedRecipeCategories();
    const recipes = await seedRecipes(users, recipeCategories);
    const coupons = await seedCoupons();
    const couponHistories = await seedCouponHistories(users, coupons, orders);
    const banners = await seedBanners(products);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • ${roles.length} roles`);
    console.log(`   • ${memberships.length} memberships`);
    console.log(`   • ${users.length} users`);
    console.log(`   • ${users.length} user-role assignments`);
    console.log(`   • ${users.length} user-membership assignments`);
    console.log(`   • ${products.length} products`);
    console.log(`   • ${orders.length} orders`);
    console.log(`   • ${points.length} point transactions`);
    console.log(`   • ${recipeCategories.length} recipe categories`);
    console.log(`   • ${recipes.length} recipes`);
    console.log(`   • ${coupons.length} coupons`);
    console.log(`   • ${couponHistories.length} coupon histories`);
    console.log(`   • ${banners.length} banners\n`);
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
