import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common"
import { Observable } from "rxjs"
import { map } from "rxjs/operators"

export interface Response<T> {
    statusCode: number
    message: string
    data: T
}

/**
 * Recursively converts BigInt values to strings and handles Date objects in an object
 */
function convertBigIntToString(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    // Handle Date objects - convert to ISO string or null if invalid
    if (obj instanceof Date) {
        return isNaN(obj.getTime()) ? null : obj.toISOString();
    }
    
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    
    if (Array.isArray(obj)) {
        return obj.map(convertBigIntToString);
    }
    
    if (typeof obj === 'object') {
        // Check if it's an empty object that might be a serialized invalid Date
        const keys = Object.keys(obj);
        if (keys.length === 0 && obj.constructor === Object && !(obj instanceof Date)) {
            // This might be an empty object from an invalid Date, return null
            return null;
        }
        
        const converted: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                converted[key] = convertBigIntToString(obj[key]);
            }
        }
        return converted;
    }
    
    return obj;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        const http = context.switchToHttp()
        return next.handle().pipe(
            map((data) => {
                // Convert any BigInt values to strings
                const convertedData = convertBigIntToString(data);
                
                // If data is a primitive (string, number, boolean) or null/undefined,
                // wrap it in the response object instead of spreading
                if (convertedData === null || convertedData === undefined || 
                    typeof convertedData !== 'object' || Array.isArray(convertedData)) {
                    return {
                        data: convertedData,
                        statusCode: http.getResponse().statusCode,
                        message: http.getResponse().message,
                    }
                }
                
                // If data is already an object, spread it and add statusCode/message
                return {
                    ...convertedData,
                    statusCode: http.getResponse().statusCode,
                    message: http.getResponse().message,
                }
            }),
        )
    }
}