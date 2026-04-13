import { JavaGenerator } from '../src/generators/java/java-generator';
import { transformDSL } from '../src/core/transformer';
import type { DSL } from '../src/dsl/schema';

describe('JavaGenerator', () => {
  it('should generate @JoinColumn for ManyToOne relationship', () => {
    const dsl: DSL = {
      project: { name: 'TestProject', package: 'com.test', version: '1.0.0' },
      entities: [
        {
          name: 'User',
          fields: [{ name: 'id', type: 'UUID', primary: true, nullable: false, unique: false, autoIncrement: false, index: false }],
          relationships: [],
          indexes: []
        },
        {
          name: 'Order',
          fields: [{ name: 'id', type: 'UUID', primary: true, nullable: false, unique: false, autoIncrement: false, index: false }],
          relationships: [{ type: 'ManyToOne', target: 'User', joinColumn: 'user_id', fetch: 'LAZY', orphanRemoval: false }],
          indexes: []
        }
      ]
    };

    const model = transformDSL(dsl);
    const gen = new JavaGenerator();
    const files = gen.generate(model);

    const orderPath = 'src/main/java/com/test/entity/Order.java';
    const orderJava = files.get(orderPath);
    expect(orderJava).toBeDefined();
    expect(orderJava!).toContain('@ManyToOne');
    expect(orderJava!).toContain('@JoinColumn(name = "user_id")');
  });
});

