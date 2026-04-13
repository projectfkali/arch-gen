import { PostgreSQLGenerator } from '../src/generators/sql/postgres-generator';
import { transformDSL } from '../src/core/transformer';
import type { DSL } from '../src/dsl/schema';

describe('PostgreSQLGenerator', () => {
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
          { name: 'age', type: 'Integer', nullable: true, unique: false, primary: false, autoIncrement: false, index: false },
          { name: 'balance', type: 'Decimal', precision: 19, scale: 2, nullable: false, unique: false, primary: false, autoIncrement: false, index: false }
        ],
        relationships: [],
        indexes: []
      }
    ]
  };

  const generator = new PostgreSQLGenerator();

  it('should generate CREATE TABLE statement', () => {
    const model = transformDSL(sampleDSL);
    const files = generator.generate(model);
    
    const tableFile = Array.from(files.values())[0];
    
    expect(tableFile).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(tableFile).toContain('id UUID NOT NULL');
    expect(tableFile).toContain('email VARCHAR(255) NOT NULL UNIQUE');
    expect(tableFile).toContain('age INTEGER');
    expect(tableFile).toContain('balance DECIMAL(19,2) NOT NULL');
  });

  it('should generate primary key constraint', () => {
    const model = transformDSL(sampleDSL);
    const files = generator.generate(model);
    
    const tableFile = Array.from(files.values())[0];
    
    expect(tableFile).toContain('CONSTRAINT pk_users PRIMARY KEY (id)');
  });

  it('should reference target primary key name in foreign keys', () => {
    const dsl: DSL = {
      project: { name: 'TestProject', package: 'com.test', version: '1.0.0' },
      entities: [
        {
          name: 'User',
          tableName: 'users',
          fields: [
            { name: 'user_uuid', type: 'UUID', primary: true, nullable: false, unique: false, autoIncrement: false, index: false }
          ],
          relationships: [],
          indexes: []
        },
        {
          name: 'Order',
          tableName: 'orders',
          fields: [
            { name: 'id', type: 'UUID', primary: true, nullable: false, unique: false, autoIncrement: false, index: false },
            { name: 'user_uuid', type: 'UUID', nullable: false, unique: false, primary: false, autoIncrement: false, index: false }
          ],
          relationships: [
            { type: 'ManyToOne', target: 'User', joinColumn: 'user_uuid', fetch: 'LAZY', orphanRemoval: false }
          ],
          indexes: []
        }
      ]
    };

    const model = transformDSL(dsl);
    const files = generator.generate(model);

    const fkFile = Array.from(files.entries()).find(([name]) => name.includes('__999__add_foreign_keys'))?.[1];
    expect(fkFile).toBeDefined();
    expect(fkFile!).toContain('REFERENCES users(user_uuid)');
  });

  it('should allow deterministic timestamp via constructor now()', () => {
    const model = transformDSL(sampleDSL);
    const fixed = new Date('2026-04-13T17:15:10.000Z');
    const fixedGen = new PostgreSQLGenerator({ now: () => fixed });
    const files = fixedGen.generate(model);
    const names = Array.from(files.keys());
    expect(names.some(n => n.startsWith('V20260413171510__001__'))).toBe(true);
  });
});
