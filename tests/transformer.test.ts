import { transformDSL } from '../src/core/transformer';
import type { DSL } from '../src/dsl/schema';

describe('transformDSL', () => {
  const sampleDSL: DSL = {
    project: {
      name: 'TestProject',
      package: 'com.test',
      version: '1.0.0'
    },
    entities: [
      {
        name: 'User',
        tableName: 'users',
        fields: [
          { name: 'id', type: 'UUID', primary: true, nullable: false, unique: false, autoIncrement: false, index: false },
          { name: 'email', type: 'String', unique: true, nullable: false, length: 255, primary: false, autoIncrement: false, index: false },
          { name: 'createdAt', type: 'DateTime', nullable: false, unique: false, primary: false, autoIncrement: false, index: false }
        ],
        relationships: [],
        indexes: []
      },
      {
        name: 'Order',
        fields: [
          { name: 'id', type: 'Long', primary: true, autoIncrement: true, nullable: false, unique: false, index: false },
          { name: 'total', type: 'Decimal', precision: 19, scale: 2, nullable: false, unique: false, primary: false, autoIncrement: false, index: false }
        ],
        relationships: [
          { type: 'ManyToOne', target: 'User', joinColumn: 'user_id', fetch: 'LAZY', orphanRemoval: false }
        ],
        indexes: []
      }
    ]
  };

  it('should transform project config correctly', () => {
    const model = transformDSL(sampleDSL);
    
    expect(model.project.name).toBe('TestProject');
    expect(model.project.package).toBe('com.test');
    expect(model.project.version).toBe('1.0.0');
    expect(model.project.entityPackage).toBe('com.test.entity');
  });

  it('should transform entities with correct naming', () => {
    const model = transformDSL(sampleDSL);
    
    const userEntity = model.entities.find(e => e.name === 'User');
    expect(userEntity).toBeDefined();
    expect(userEntity?.tableName).toBe('users');
    expect(userEntity?.camelName).toBe('user');
    expect(userEntity?.pascalName).toBe('User');
    expect(userEntity?.pascalPlural).toBe('Users');
  });

  it('should transform fields with correct types', () => {
    const model = transformDSL(sampleDSL);
    
    const userEntity = model.entityMap.get('User')!;
    
    const idField = userEntity.fields.find(f => f.name === 'id');
    expect(idField?.javaType).toBe('UUID');
    expect(idField?.csharpType).toBe('Guid');
    expect(idField?.sqlType).toBe('UUID');
    expect(idField?.primary).toBe(true);
    
    const emailField = userEntity.fields.find(f => f.name === 'email');
    expect(emailField?.javaType).toBe('String');
    expect(emailField?.csharpType).toBe('string');
    expect(emailField?.sqlType).toBe('VARCHAR(255)');
    expect(emailField?.unique).toBe(true);
    
    const createdAtField = userEntity.fields.find(f => f.name === 'createdAt');
    expect(createdAtField?.javaType).toBe('LocalDateTime');
    expect(createdAtField?.csharpType).toBe('DateTime');
    expect(createdAtField?.sqlType).toBe('TIMESTAMP');
  });

  it('should transform relationships correctly', () => {
    const model = transformDSL(sampleDSL);
    
    const orderEntity = model.entityMap.get('Order')!;
    expect(orderEntity.relationships).toHaveLength(1);
    
    const rel = orderEntity.relationships[0];
    expect(rel.type).toBe('ManyToOne');
    expect(rel.target).toBe('User');
    expect(rel.targetTable).toBe('users');
    expect(rel.joinColumn).toBe('user_id');
  });

  it('should build entity map correctly', () => {
    const model = transformDSL(sampleDSL);
    
    expect(model.entityMap.size).toBe(2);
    expect(model.entityMap.has('User')).toBe(true);
    expect(model.entityMap.has('Order')).toBe(true);
  });

  it('should identify primary keys correctly', () => {
    const model = transformDSL(sampleDSL);
    
    const userEntity = model.entityMap.get('User')!;
    expect(userEntity.primaryKey?.name).toBe('id');
    
    const orderEntity = model.entityMap.get('Order')!;
    expect(orderEntity.primaryKey?.name).toBe('id');
    expect(orderEntity.hasAutoIncrement).toBe(true);
  });
});
