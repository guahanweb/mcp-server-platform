/**
 * Validation utilities for MCP plugins
 */

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type ValidationRule<T = any> = (value: T, field: string) => string | null;

/**
 * Common validation rules
 */
export const ValidationRules = {
  required: <T>(value: T, field: string): string | null => {
    if (value === null || value === undefined || value === '') {
      return `${field} is required`;
    }
    return null;
  },

  string: (value: any, field: string): string | null => {
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }
    return null;
  },

  number: (value: any, field: string): string | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${field} must be a valid number`;
    }
    return null;
  },

  boolean: (value: any, field: string): string | null => {
    if (typeof value !== 'boolean') {
      return `${field} must be a boolean`;
    }
    return null;
  },

  array: (value: any, field: string): string | null => {
    if (!Array.isArray(value)) {
      return `${field} must be an array`;
    }
    return null;
  },

  object: (value: any, field: string): string | null => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return `${field} must be an object`;
    }
    return null;
  },

  minLength: (min: number): ValidationRule<string> => {
    return (value: string, field: string): string | null => {
      if (typeof value === 'string' && value.length < min) {
        return `${field} must be at least ${min} characters long`;
      }
      return null;
    };
  },

  maxLength: (max: number): ValidationRule<string> => {
    return (value: string, field: string): string | null => {
      if (typeof value === 'string' && value.length > max) {
        return `${field} must be no more than ${max} characters long`;
      }
      return null;
    };
  },

  min: (min: number): ValidationRule<number> => {
    return (value: number, field: string): string | null => {
      if (typeof value === 'number' && value < min) {
        return `${field} must be at least ${min}`;
      }
      return null;
    };
  },

  max: (max: number): ValidationRule<number> => {
    return (value: number, field: string): string | null => {
      if (typeof value === 'number' && value > max) {
        return `${field} must be no more than ${max}`;
      }
      return null;
    };
  },

  email: (value: string, field: string): string | null => {
    if (typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${field} must be a valid email address`;
      }
    }
    return null;
  },

  url: (value: string, field: string): string | null => {
    if (typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        return `${field} must be a valid URL`;
      }
    }
    return null;
  },

  oneOf: <T>(options: T[]): ValidationRule<T> => {
    return (value: T, field: string): string | null => {
      if (!options.includes(value)) {
        return `${field} must be one of: ${options.join(', ')}`;
      }
      return null;
    };
  },

  pattern: (regex: RegExp, message?: string): ValidationRule<string> => {
    return (value: string, field: string): string | null => {
      if (typeof value === 'string' && !regex.test(value)) {
        return message || `${field} does not match the required pattern`;
      }
      return null;
    };
  }
};

/**
 * Validator class for validating objects
 */
export class Validator {
  private rules: Map<string, ValidationRule[]> = new Map();

  addRule(field: string, ...rules: ValidationRule[]): Validator {
    const existingRules = this.rules.get(field) || [];
    this.rules.set(field, [...existingRules, ...rules]);
    return this;
  }

  validate(data: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [field, rules] of this.rules) {
      const value = data[field];
      
      for (const rule of rules) {
        const error = rule(value, field);
        if (error) {
          errors.push(new ValidationError(error, field, value));
          break; // Stop at first error for this field
        }
      }
    }

    return errors;
  }

  validateAndThrow(data: Record<string, any>): void {
    const errors = this.validate(data);
    if (errors.length > 0) {
      const message = errors.map(e => e.message).join(', ');
      throw new ValidationError(`Validation failed: ${message}`);
    }
  }

  isValid(data: Record<string, any>): boolean {
    return this.validate(data).length === 0;
  }
}

/**
 * Helper function to create a validator
 */
export function createValidator(): Validator {
  return new Validator();
}

/**
 * Common validation schemas
 */
export const CommonValidators = {
  email: createValidator()
    .addRule('email', ValidationRules.required, ValidationRules.string, ValidationRules.email),

  url: createValidator()
    .addRule('url', ValidationRules.required, ValidationRules.string, ValidationRules.url),

  positiveNumber: createValidator()
    .addRule('value', ValidationRules.required, ValidationRules.number, ValidationRules.min(0)),

  nonEmptyString: createValidator()
    .addRule('value', ValidationRules.required, ValidationRules.string, ValidationRules.minLength(1)),

  id: createValidator()
    .addRule('id', ValidationRules.required, ValidationRules.string, ValidationRules.minLength(1)),

  name: createValidator()
    .addRule('name', ValidationRules.required, ValidationRules.string, ValidationRules.minLength(1), ValidationRules.maxLength(100)),

  description: createValidator()
    .addRule('description', ValidationRules.string, ValidationRules.maxLength(1000))
};

/**
 * Validation decorators
 */
export function validate(validator: Validator) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const params = args[0];
      if (params && typeof params === 'object') {
        validator.validateAndThrow(params);
      }
      return method.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Parameter validation helpers
 */
export const ParamValidation = {
  requireString: (value: any, name: string): string => {
    if (typeof value !== 'string') {
      throw new ValidationError(`${name} must be a string`, name, value);
    }
    return value;
  },

  requireNumber: (value: any, name: string): number => {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError(`${name} must be a valid number`, name, value);
    }
    return value;
  },

  requireBoolean: (value: any, name: string): boolean => {
    if (typeof value !== 'boolean') {
      throw new ValidationError(`${name} must be a boolean`, name, value);
    }
    return value;
  },

  requireArray: (value: any, name: string): any[] => {
    if (!Array.isArray(value)) {
      throw new ValidationError(`${name} must be an array`, name, value);
    }
    return value;
  },

  requireObject: (value: any, name: string): Record<string, any> => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ValidationError(`${name} must be an object`, name, value);
    }
    return value;
  },

  optional: <T>(value: any, validator: (val: any, name: string) => T, name: string): T | undefined => {
    if (value === undefined || value === null) {
      return undefined;
    }
    return validator(value, name);
  }
};