import { describe, it, expect } from 'vitest';
import { ValidationRules, createValidator, ValidationError } from './validation';

describe('Validation', () => {
  describe('ValidationRules', () => {
    it('should validate required fields', () => {
      expect(ValidationRules.required('test', 'field')).toBeNull();
      expect(ValidationRules.required('', 'field')).toBe('field is required');
      expect(ValidationRules.required(null, 'field')).toBe('field is required');
      expect(ValidationRules.required(undefined, 'field')).toBe('field is required');
    });

    it('should validate string type', () => {
      expect(ValidationRules.string('test', 'field')).toBeNull();
      expect(ValidationRules.string(123, 'field')).toBe('field must be a string');
    });

    it('should validate email format', () => {
      expect(ValidationRules.email('test@example.com', 'email')).toBeNull();
      expect(ValidationRules.email('invalid-email', 'email')).toBe('email must be a valid email address');
    });

    it('should validate number range', () => {
      const minRule = ValidationRules.min(10);
      expect(minRule(15, 'value')).toBeNull();
      expect(minRule(5, 'value')).toBe('value must be at least 10');

      const maxRule = ValidationRules.max(100);
      expect(maxRule(50, 'value')).toBeNull();
      expect(maxRule(150, 'value')).toBe('value must be no more than 100');
    });
  });

  describe('Validator', () => {   
    it('should validate object with rules', () => {
      const validator = createValidator()
        .addRule('name', ValidationRules.required, ValidationRules.string)
        .addRule('age', ValidationRules.required, ValidationRules.number, ValidationRules.min(0));

      const validData = { name: 'John', age: 25 };
      const invalidData = { name: '', age: -5 };

      expect(validator.isValid(validData)).toBe(true);
      expect(validator.isValid(invalidData)).toBe(false);

      const errors = validator.validate(invalidData);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toBeInstanceOf(ValidationError);
    });

    it('should throw validation error when validateAndThrow is called', () => {
      const validator = createValidator()
        .addRule('required_field', ValidationRules.required);

      expect(() => {
        validator.validateAndThrow({ required_field: '' });
      }).toThrow(ValidationError);

      expect(() => {
        validator.validateAndThrow({ required_field: 'valid' });
      }).not.toThrow();
    });
  });
});