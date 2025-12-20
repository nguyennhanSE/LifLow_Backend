import { Transform } from "class-transformer";
import { trim as lodashTrim, toLower as lodashToLower } from "lodash";

export function trim() {
    return Transform(({ value }: { value: unknown }): string | undefined => {
      if (typeof value === 'string') {
        return lodashTrim(value);
      }
      return value as string | undefined;
    });
  }
  
export function toLower() {
    return Transform(({ value }: { value: unknown }): string | undefined => {
      if (typeof value === 'string') {
        return lodashToLower(value);
      }
      return value as string | undefined;
    });
}