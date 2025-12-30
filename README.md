# Recipe Module

Complete NestJS module for managing recipes with full CRUD operations, authentication, and advanced features.

## 🚀 Getting Started

### Running the Application

To run the application, use Docker Compose:

```bash
docker compose up --build
```

This command will:
- Build the Docker images
- Start all required services (database, application, etc.)
- Set up the application environment

The application will be available once the containers are running.

## 📁 Module Structure

```
recipe/
├── dto/
│   ├── create-recipe.dto.ts       # DTO for creating recipes
│   ├── update-recipe.dto.ts       # DTO for updating recipes
│   ├── recipe-response.dto.ts     # Response DTO
│   ├── recipe-list-query.dto.ts   # Query parameters for filtering/pagination
│   └── index.ts                   # Barrel exports
├── entities/
│   └── recipe.entity.ts           # Recipe entity definition
├── repositories/
│   ├── recipe.repository.ts       # Data access layer with Prisma
│   └── index.ts
├── mapper/
│   ├── recipe.mapper.ts           # Response mapping utilities
│   └── index.ts
├── recipe.controller.ts           # REST API endpoints
├── recipe.service.ts              # Business logic layer
├── recipe.module.ts               # Module configuration
└── README.md                      # This file
```

## 🚀 Features

### ✅ Complete CRUD Operations
- Create recipes (authenticated users)
- Read recipes (public/authenticated)
- Update recipes (owner only)
- Delete recipes (owner only)

### ✅ Advanced Functionality
- **Pagination**: Configurable page size (1-100 items)
- **Filtering**: By category, status, author
- **Sorting**: By createdAt, updatedAt, views, title, category
- **Search**: Full-text search in title and content
- **View Tracking**: Automatic view counter increment
- **Authorization**: Owner-based access control

### ✅ Public Endpoints
- Browse recipes by category
- Browse recipes by author
- Get popular recipes (most viewed)
- Get recent recipes (latest)
- Get all categories

## 📋 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/recipes` | List all recipes with pagination/filters |
| GET | `/recipes/:id` | Get single recipe (increments views) |
| GET | `/recipes/meta/categories` | Get all recipe categories |
| GET | `/recipes/meta/popular` | Get popular recipes by views |
| GET | `/recipes/meta/recent` | Get recent recipes |
| GET | `/recipes/author/:authorId` | Get recipes by author |
| GET | `/recipes/category/:category` | Get recipes by category |

### Protected Endpoints (Require Authentication)

| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| POST | `/recipes` | Create a new recipe | Authenticated users |
| PATCH | `/recipes/:id` | Update recipe | Recipe owner only |
| DELETE | `/recipes/:id` | Delete recipe | Recipe owner only |

## 🔐 Authentication & Authorization

### Guards Used
- **AuthGuard**: Global JWT authentication guard
- **RolesGuard**: Role-based access control
- **@Public()**: Decorator for public endpoints
- **@Roles()**: Decorator for role-based access

### Ownership Checks
- Update and delete operations verify that the authenticated user owns the recipe
- Returns `403 Forbidden` if user doesn't own the recipe

## 📊 Data Models

### Recipe Schema (Prisma)
```prisma
model Recipe {
  id             String   @id @default(uuid())
  title          String   @db.VarChar(255)
  authorId       String
  authorName     String   @db.VarChar(100)
  category       String   @db.VarChar(50)
  dateOfWriting  DateTime @map("date_of_writing")
  views          Int      @default(0)
  status         String   @default("Active")
  thumbnailUrl   String?  @map("thumbnail_url")
  content        String
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  
  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)
  
  @@index([status])
  @@index([authorId])
  @@index([category])
  @@index([dateOfWriting])
  @@map("recipes")
}
```

### CreateRecipeDto
```typescript
{
  title: string;          // Required, max 255 chars
  category: string;       // Required, max 50 chars
  thumbnailUrl?: string;  // Optional
  content: string;        // Required
}
```

### Query Parameters
```typescript
{
  page?: number;          // Default: 1
  limit?: number;         // Default: 20, Max: 100
  category?: string;
  status?: 'Active' | 'Hidden';
  authorId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'dateOfWriting' | 'views' | 'title' | 'category';
  order?: 'asc' | 'desc'; // Default: 'desc'
  search?: string;        // Searches title and content
}
```

## 🔄 Response Format

### Success Response
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Recipe Title",
    "authorId": "uuid",
    "authorName": "John Doe",
    "category": "Italian",
    "dateOfWriting": "2025-12-10T10:30:00.000Z",
    "views": 125,
    "status": "Active",
    "thumbnailUrl": "https://...",
    "content": "Recipe content...",
    "createdAt": "2025-12-10T10:30:00.000Z",
    "updatedAt": "2025-12-10T10:30:00.000Z",
    "author": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "message": "Recipe retrieved successfully"
}
```

### Paginated Response
```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "Recipes retrieved successfully"
}
```

## 🛠️ Usage Examples

### Creating a Recipe (Requires Authentication)

```bash
POST /recipes
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Classic Italian Pasta",
  "category": "Italian",
  "thumbnailUrl": "https://example.com/pasta.jpg",
  "content": "Ingredients: ... Instructions: ..."
}
```

### Listing Recipes with Filters

```bash
GET /recipes?page=1&limit=20&category=Italian&sortBy=views&order=desc&search=pasta
```

### Getting Recipes by Author

```bash
GET /recipes/author/123e4567-e89b-12d3-a456-426614174000?page=1&limit=20
```

### Updating a Recipe (Owner Only)

```bash
PATCH /recipes/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Updated Title",
  "category": "Mediterranean"
}
```

## 🏗️ Architecture

### Layered Architecture
1. **Controller Layer** (`recipe.controller.ts`)
   - Handles HTTP requests/responses
   - Input validation via DTOs
   - Route guards and decorators

2. **Service Layer** (`recipe.service.ts`)
   - Business logic
   - Authorization checks
   - Error handling

3. **Repository Layer** (`recipe.repository.ts`)
   - Data access with Prisma
   - Query building
   - Database operations

4. **Mapper Layer** (`recipe.mapper.ts`)
   - Entity transformation
   - Response serialization
   - Sensitive data exclusion

## 🔍 Repository Methods

- `create(data)` - Create new recipe
- `findAll(query)` - List with pagination/filters
- `findById(id)` - Get single recipe
- `findByIdOrThrow(id)` - Get or throw 404
- `findByAuthor(authorId)` - Get by author
- `update(id, data)` - Update recipe
- `delete(id)` - Delete recipe
- `incrementViews(id)` - Increment view count
- `countByFilters(query)` - Count with filters
- `getCategories()` - Get distinct categories
- `getPopularRecipes()` - Most viewed
- `getRecentRecipes()` - Latest recipes

## ⚡ Performance Optimizations

1. **Database Indexes**
   - `status`, `authorId`, `category`, `dateOfWriting`

2. **Denormalization**
   - `authorName` stored in recipe for fast listing

3. **Async View Increment**
   - View tracking doesn't block response

4. **Pagination**
   - Efficient offset-based pagination
   - Configurable page size

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 Error Handling

### HTTP Status Codes
- `200 OK` - Successful GET/PATCH/DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Recipe not found

### Error Response Format
```json
{
  "statusCode": 404,
  "message": "Recipe with id xxx not found",
  "error": "Not Found"
}
```

## 🔗 Dependencies

- **@nestjs/common** - Core NestJS features
- **@nestjs/swagger** - API documentation
- **@prisma/client** - Database ORM
- **class-validator** - DTO validation
- **class-transformer** - Object transformation

## 📚 Related Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Swagger/OpenAPI](https://swagger.io/)

## 🤝 Contributing

When adding new features:
1. Update DTOs if needed
2. Add business logic to service
3. Update repository methods
4. Add controller endpoints
5. Update Swagger documentation
6. Add tests
7. Update this README

## 📄 License

Private - All rights reserved

