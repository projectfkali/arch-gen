import type { DSL, Entity, Field, Relationship } from '../dsl/schema';
import type { DomainModel, ProjectModel, EntityModel, FieldModel, RelationshipModel } from './models';
import { toCamelCase, toPascalCase, toKebabCase, toSnakeCase, pluralize } from '../utils/strings';
import { mapTypeToJava, mapTypeToCSharp, mapTypeToSQL } from '../utils/type-mappings';

export function transformDSL(dsl: DSL): DomainModel {
  const project = transformProject(dsl.project);
  const entities = dsl.entities.map(e => transformEntity(e));
  const entityMap = new Map(entities.map(e => [e.name, e]));

  // İkinci geçiş: ilişkileri çözümle
  entities.forEach(entity => {
    const dslEntity = dsl.entities.find(e => e.name === entity.name)!;
    entity.relationships = dslEntity.relationships.map(r => 
      transformRelationship(r, entityMap, dslEntity, dsl.entities)
    );
  });

  return { project, entities, entityMap };
}

function transformProject(config: DSL['project']): ProjectModel {
  return {
    name: config.name,
    package: config.package,
    version: config.version,
    description: config.description,
    author: config.author,
    basePackage: config.package,
    entityPackage: `${config.package}.entity`,
    repositoryPackage: `${config.package}.repository`,
    servicePackage: `${config.package}.service`,
    controllerPackage: `${config.package}.controller`,
    dtoPackage: `${config.package}.dto`,
    configPackage: `${config.package}.config`,
    database: config.database
  };
}

function transformEntity(entity: Entity): EntityModel {
  const fields = entity.fields.map(f => transformField(f));
  const primaryKey = fields.find(f => f.primary);
  const hasAutoIncrement = fields.some(f => f.autoIncrement);

  return {
    name: entity.name,
    tableName: entity.tableName || toSnakeCase(pluralize(entity.name)),
    camelName: toCamelCase(entity.name),
    pascalName: toPascalCase(entity.name),
    camelPlural: toCamelCase(pluralize(entity.name)),
    pascalPlural: toPascalCase(pluralize(entity.name)),
    kebabName: toKebabCase(entity.name),
    snakeName: toSnakeCase(entity.name),
    comment: entity.comment,
    fields,
    relationships: [], // İkinci geçişte doldurulacak
    indexes: entity.indexes,
    primaryKey,
    hasAutoIncrement
  };
}

function transformField(field: Field): FieldModel {
  return {
    name: field.name,
    camelName: toCamelCase(field.name),
    pascalName: toPascalCase(field.name),
    snakeName: toSnakeCase(field.name),
    type: field.type,
    sqlType: mapTypeToSQL(field.type, field.length, field.precision, field.scale),
    javaType: mapTypeToJava(field.type),
    csharpType: mapTypeToCSharp(field.type),
    length: field.length,
    precision: field.precision,
    scale: field.scale,
    nullable: field.nullable,
    unique: field.unique,
    primary: field.primary,
    autoIncrement: field.autoIncrement,
    defaultValue: field.defaultValue,
    index: field.index,
    comment: field.comment
  };
}

function transformRelationship(
  rel: Relationship,
  entityMap: Map<string, EntityModel>,
  sourceEntity: Entity,
  _allEntities: Entity[]
): RelationshipModel {
  const target = entityMap.get(rel.target);
  if (!target) {
    throw new Error(`Target entity '${rel.target}' not found in relationship`);
  }

  let joinColumn = rel.joinColumn;
  let inverseJoinColumn: string | undefined;

  if (!joinColumn) {
    if (rel.type === 'ManyToMany') {
      joinColumn = `${toSnakeCase(sourceEntity.name)}_id`;
      inverseJoinColumn = `${toSnakeCase(target.name)}_id`;
    } else if (rel.type === 'ManyToOne' || rel.type === 'OneToOne') {
      joinColumn = `${toSnakeCase(rel.target)}_id`;
    }
  }

  return {
    type: rel.type,
    target: rel.target,
    targetTable: target.tableName,
    field: rel.field,
    mappedBy: rel.mappedBy,
    joinTable: rel.joinTable || (rel.type === 'ManyToMany' 
      ? `${toSnakeCase(sourceEntity.name)}_${toSnakeCase(rel.target)}` 
      : undefined),
    joinColumn,
    inverseJoinColumn,
    cascade: rel.cascade || [],
    fetch: rel.fetch,
    orphanRemoval: rel.orphanRemoval
  };
}
