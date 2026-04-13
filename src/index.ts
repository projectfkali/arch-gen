// Main exports for the architecture generator
export { DSLSchema, type DSL, type Entity, type Field, type Relationship, type ProjectConfig } from './dsl/schema';
export { transformDSL } from './core/transformer';
export type { DomainModel, EntityModel, FieldModel, RelationshipModel, ProjectModel } from './core/models';
export { JavaGenerator } from './generators/java/java-generator';
export { CSharpGenerator } from './generators/csharp/csharp-generator';
export { PostgreSQLGenerator } from './generators/sql/postgres-generator';
export { MermaidERGenerator } from './generators/diagram/mermaid-generator';
