import { HttpStatus } from '@nestjs/common';
// ErrorKey is an enumeration of all possible application-specific error keys.
// errorMessage is a dictionary mapping these keys to human-readable messages.
import { ErrorKey, errorMessage } from './error-message';

// ===================================================================================
// SECTION 1: CENTRALIZED MAPPING LOGIC
// ===================================================================================

/**
 * A centralized helper function to map a specific ErrorKey to a corresponding HttpStatus.
 * This is the single source of truth for status code mapping.
 * @param key The error key to map.
 * @returns The corresponding Hypertext Transfer Protocol status code.
 */
function mapErrorKeyToHttpStatus(key: ErrorKey): HttpStatus {
    // A switch statement provides a clean and efficient way to handle the mapping.
    switch (key) {
        // --- 404 Not Found ---
        case ErrorKey.ENTITY_NOT_FOUND_KEY:
            return HttpStatus.NOT_FOUND;

        // --- 409 Conflict ---
        case ErrorKey.ENTITY_EXISTED_KEY:
        case ErrorKey.DUPLICATE_KEY:
        case ErrorKey.USER_ALREADY_EXISTS_KEY:
            return HttpStatus.CONFLICT;

        // --- 401 Unauthorized ---
        case ErrorKey.LOGIN_FAILED_KEY:
        case ErrorKey.AUTHENTICATION_FAILED_KEY:
            return HttpStatus.UNAUTHORIZED;

        // --- 400 Bad Request (Default for most validation/logic errors) ---
        case ErrorKey.REQUEST_INVALID_ERR_KEY:
        case ErrorKey.DATA_PROCESS_ERR_KEY:
        case ErrorKey.VALIDATION_ERROR_KEY:
        case ErrorKey.NOT_EMPTY:
        case ErrorKey.VALUE_INVALID_ERR_KEY:
        case ErrorKey.CCONDITION_FAILED_ERR_KEY:
            return HttpStatus.BAD_REQUEST;

        // --- 500 Internal Server Error (Default fallback) ---
        case ErrorKey.UNKNOW_ERR_KEY:
        default:
            return HttpStatus.INTERNAL_SERVER_ERROR;
    }
}

// ====================================================================================================
// SECTION 2: CORE ERROR CLASSES
// ====================================================================================================

/**
 * A class to encapsulate detailed, machine-readable error information.
 */
export class DetailError {
    public message?: string;
    public name?: string;
    public errors?: object;
    public code?: number;
    public codeName?: string;
    public keyPattern?: object;
    public keyValue?: object;

    public constructor(
        input: string | { message: string; name?: string; errors?: object; code?: number; codeName?: string; keyPattern?: object; keyValue?: object; },
    ) {
        // This constructor handles both simple string messages and complex error objects.
        if (typeof input === 'string') {
            this.message = input;
            this.name = 'Error';
            this.errors = {};
        } else {
            this.message = input.message;
            this.name = input.name ?? 'Error';
            this.errors = input.errors ?? {};
            this.code = input.code;
            this.codeName = input.codeName;
            this.keyPattern = input.keyPattern;
            this.keyValue = input.keyValue;
        }
    }
}

/**
 * [REFACTORED] An abstract base class for all custom application errors.
 * It enforces a standard structure and requires subclasses to implement getStatusCode.
 */
export abstract class BaseError extends Error {
    public readonly key: ErrorKey;
    public readonly text: string;
    public readonly detail: DetailError;
    public readonly errorCode: string;
    public readonly traceId?: string;

    public constructor(
        // The key parameter now strictly requires a value from the ErrorKey enum for type safety.
        key: ErrorKey,
        errorCode: string,
        detail: string | { message: string; name?: string; errors?: object; code?: number; codeName?: string; keyPattern?: object; keyValue?: object; } = '',
    ) {
        // Set the human-readable message from the centralized errorMessage dictionary.
        super(errorMessage[key]);
        // Restore the prototype chain.
        Object.setPrototypeOf(this, new.target.prototype);
        // Assign properties based on the constructor arguments.
        this.key = key;
        this.text = errorMessage[key];
        this.errorCode = errorCode;
        this.detail = new DetailError(detail || this.text);



        // Capture the stack trace for easier debugging.
        Error.captureStackTrace(this);
    }

    /**
     * An abstract method that must be implemented by all concrete error classes.
     * It is responsible for returning the appropriate Hypertext Transfer Protocol status code for the error.
     */
    public abstract getStatusCode(): HttpStatus;

    /**
     * [NEW] A method to generate a standardized, client-facing error payload.
     * This is intended to be used by a global exception filter.
     */
    public toErrorPayload(): object {
        // This method constructs a consistent JSON object for all errors.
        return {
            statusCode: this.getStatusCode(),
            message: this.message,
            error: this.constructor.name,
            errorCode: this.errorCode,
            key: this.key,
            detail: this.detail,
        };
    }
}

// ====================================================================================================
// SECTION 3: SPECIFIC ERROR IMPLEMENTATIONS
// ====================================================================================================

/**
 * A generic application error.
 */
export class MsxError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorKey: ErrorKey, errorCode: string = '', detail: any = {}) {
        super(errorKey, errorCode, detail);
    }
}

/**
 * An error representing a validation failure.
 */
export class ValidationException extends Error {
    public constructor(public errorCode: string, public detail: any, message?: string) {
        super(message || errorCode); // Use errorCode as message if no custom message provided
        this.name = 'ValidationError';
    }
}

/**
 * An error for database duplicate key violations.
 */
export class DuplicateKeyError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.DUPLICATE_KEY, errorCode, detail); }
}

/**
 * An error for unknown or unexpected failures.
 */
export class UnknowError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.UNKNOW_ERR_KEY, errorCode, detail); }
}

/**
 * An error indicating that the request itself was invalid.
 */
export class RequestInvalidError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.REQUEST_INVALID_ERR_KEY, errorCode, detail); }
}

/**
 * An error indicating that an entity that was expected to exist already exists.
 */
export class EntityExistedError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.ENTITY_EXISTED_KEY, errorCode, detail); }
}

/**
 * An error for failures during data processing.
 */
export class DataProcessError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.DATA_PROCESS_ERR_KEY, errorCode, detail); }
}

/**
 * An error indicating that a requested entity was not found.
 */
export class EntityNotFoundError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.ENTITY_NOT_FOUND_KEY, errorCode, detail); }
}

/**
 * A specific error for when a user that is being created already exists.
 */
export class UserAlreadyExistsError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.USER_ALREADY_EXISTS_KEY, errorCode, detail); }
}

/**
 * A specific error for when a user fails to log in.
 */
export class LoginFailedError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.LOGIN_FAILED_KEY, errorCode, detail); }
}
/**
 * A specific error for when a user fails to log in.
 */
export class AuthenticationFailedError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.AUTHENTICATION_FAILED_KEY, errorCode, detail); }
}

/**
 * A specific error for when a required value is not provided.
 */
export class NotEmptyError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) { super(ErrorKey.NOT_EMPTY, errorCode, detail); }
}

/**
 * [PRESERVED] A specific error for when a value is invalid.
 */
export class ValueInvalidError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) {
        super(ErrorKey.VALUE_INVALID_ERR_KEY, errorCode, detail);
    }
}

/**
 * [PRESERVED] A specific error for when a condition for an operation fails.
 */
export class ConditionFailedError extends BaseError {
    public getStatusCode(): HttpStatus { return mapErrorKeyToHttpStatus(this.key); }
    public constructor(errorCode: string = '', detail: any = {}) {
        super(ErrorKey.CCONDITION_FAILED_ERR_KEY, errorCode, detail);
    }
}