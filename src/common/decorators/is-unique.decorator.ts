import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { getRepository } from 'typeorm';

export function IsUnique(
  entity: any,
  field: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUnique',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entity, field],
      validator: {
        async validate(value: any, args: ValidationArguments) {
          if (!value) return true;
          const [entityClass, field] = args.constraints;
          const repository = getRepository(entityClass);
          const count = await repository.count({ where: { [field]: value } });
          return count === 0;
        },
      },
    });
  };
}
