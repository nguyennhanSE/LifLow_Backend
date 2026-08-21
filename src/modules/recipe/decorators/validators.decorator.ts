import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * List of valid recipe categories
 * Update this list as needed for your application
 */
const VALID_CATEGORIES = [
  'Italian',
  'Chinese',
  'Japanese',
  'Korean',
  'Mexican',
  'French',
  'Thai',
  'Indian',
  'Mediterranean',
  'American',
  'Vietnamese',
  'Spanish',
  'Greek',
  'Middle Eastern',
  'Desserts',
  'Beverages',
  'Appetizers',
  'Salads',
  'Soups',
  'Main Course',
  'Side Dishes',
  'Breakfast',
  'Brunch',
  'Lunch',
  'Dinner',
  'Snacks',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
  'Healthy',
  'Comfort Food',
  'Quick & Easy',
  'Gourmet',
  'Traditional',
  'Fusion',
  'Seasonal',
  'Holiday',
  'Kids',
  'Party',
  'BBQ',
  'Seafood',
  'Meat',
  'Poultry',
  'Pasta',
  'Rice',
  'Noodles',
  'Bread',
  'Baking',
  'Other',
];

/**
 * Validator for recipe categories
 */
@ValidatorConstraint({ name: 'isValidCategory', async: false })
export class IsValidCategoryConstraint implements ValidatorConstraintInterface {
  validate(category: string, args: ValidationArguments) {
    if (!category || typeof category !== 'string') {
      return false;
    }
    return VALID_CATEGORIES.includes(category);
  }

  defaultMessage(args: ValidationArguments) {
    return `Category must be one of the following: ${VALID_CATEGORIES.join(', ')}`;
  }
}

/**
 * Custom decorator to validate recipe category
 * Usage: @IsValidCategory()
 */
export function IsValidCategory(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCategoryConstraint,
    });
  };
}

/**
 * Validator for recipe status
 */
@ValidatorConstraint({ name: 'isValidRecipeStatus', async: false })
export class IsValidRecipeStatusConstraint
  implements ValidatorConstraintInterface
{
  validate(status: string, args: ValidationArguments) {
    if (!status || typeof status !== 'string') {
      return false;
    }
    return ['Active', 'Hidden'].includes(status);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Status must be either "Active" or "Hidden"';
  }
}

/**
 * Custom decorator to validate recipe status
 * Usage: @IsValidRecipeStatus()
 */
export function IsValidRecipeStatus(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidRecipeStatusConstraint,
    });
  };
}

/**
 * Validator for recipe content length
 */
@ValidatorConstraint({ name: 'isValidRecipeContent', async: false })
export class IsValidRecipeContentConstraint
  implements ValidatorConstraintInterface
{
  validate(content: string, args: ValidationArguments) {
    if (!content || typeof content !== 'string') {
      return false;
    }
    // Minimum 50 characters, maximum 50000 characters
    return content.length >= 50 && content.length <= 50000;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Recipe content must be between 50 and 50000 characters';
  }
}

/**
 * Custom decorator to validate recipe content
 * Usage: @IsValidRecipeContent()
 */
export function IsValidRecipeContent(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidRecipeContentConstraint,
    });
  };
}

/**
 * Validator for thumbnail URL
 */
@ValidatorConstraint({ name: 'isValidThumbnailUrl', async: false })
export class IsValidThumbnailUrlConstraint
  implements ValidatorConstraintInterface
{
  validate(url: string, args: ValidationArguments) {
    if (!url) {
      return true; // Optional field
    }
    if (typeof url !== 'string') {
      return false;
    }
    // Basic URL validation
    try {
      const urlObj = new URL(url);
      // Check if it's http or https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      // Check if it's an image URL (common extensions)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      return imageExtensions.some((ext) =>
        urlObj.pathname.toLowerCase().endsWith(ext),
      );
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'Thumbnail URL must be a valid HTTP/HTTPS URL pointing to an image file (jpg, jpeg, png, gif, webp, svg)';
  }
}

/**
 * Custom decorator to validate thumbnail URL
 * Usage: @IsValidThumbnailUrl()
 */
export function IsValidThumbnailUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidThumbnailUrlConstraint,
    });
  };
}

/**
 * Export valid categories for use in other modules
 */
export { VALID_CATEGORIES };

