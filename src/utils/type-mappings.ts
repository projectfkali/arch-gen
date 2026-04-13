import type { FieldType } from '../dsl/schema';

export function mapTypeToJava(type: FieldType): string {
  const mapping: Record<FieldType, string> = {
    'UUID': 'UUID',
    'String': 'String',
    'Integer': 'Integer',
    'Long': 'Long',
    'Double': 'Double',
    'Decimal': 'BigDecimal',
    'Boolean': 'Boolean',
    'Date': 'LocalDate',
    'DateTime': 'LocalDateTime',
    'Time': 'LocalTime',
    'Text': 'String',
    'Blob': 'byte[]',
    'JSON': 'JsonNode'
  };
  return mapping[type];
}

export function mapTypeToCSharp(type: FieldType): string {
  const mapping: Record<FieldType, string> = {
    'UUID': 'Guid',
    'String': 'string',
    'Integer': 'int',
    'Long': 'long',
    'Double': 'double',
    'Decimal': 'decimal',
    'Boolean': 'bool',
    'Date': 'DateOnly',
    'DateTime': 'DateTime',
    'Time': 'TimeOnly',
    'Text': 'string',
    'Blob': 'byte[]',
    'JSON': 'JsonDocument'
  };
  return mapping[type];
}

export function mapTypeToSQL(
  type: FieldType,
  length?: number,
  precision?: number,
  scale?: number
): string {
  const len = length || 255;
  
  switch (type) {
    case 'UUID':
      return 'UUID';
    case 'String':
      return len > 255 ? `VARCHAR(${len})` : `VARCHAR(${len})`;
    case 'Text':
      return 'TEXT';
    case 'Integer':
      return 'INTEGER';
    case 'Long':
      return 'BIGINT';
    case 'Double':
      return 'DOUBLE PRECISION';
    case 'Decimal':
      return precision && scale 
        ? `DECIMAL(${precision},${scale})` 
        : 'DECIMAL(19,2)';
    case 'Boolean':
      return 'BOOLEAN';
    case 'Date':
      return 'DATE';
    case 'DateTime':
      return 'TIMESTAMP';
    case 'Time':
      return 'TIME';
    case 'Blob':
      return 'BYTEA';
    case 'JSON':
      return 'JSONB';
    default:
      return 'VARCHAR(255)';
  }
}

export function mapTypeToCSharpNullable(type: FieldType, nullable: boolean): string {
  const baseType = mapTypeToCSharp(type);
  if (nullable && !baseType.endsWith('[]') && baseType !== 'string') {
    return `${baseType}?`;
  }
  return baseType;
}

export function mapTypeToJavaWrapper(type: FieldType, nullable: boolean): string {
  const baseType = mapTypeToJava(type);
  if (!nullable && ['Integer', 'Long', 'Double', 'Boolean'].includes(type)) {
    const primitive: Record<string, string> = {
      'Integer': 'int',
      'Long': 'long',
      'Double': 'double',
      'Boolean': 'boolean'
    };
    return primitive[baseType] || baseType;
  }
  return baseType;
}
