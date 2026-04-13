import type { FieldType, RelationshipType, CascadeType, FetchType } from '../dsl/schema';

export interface FieldModel {
  name: string;
  camelName: string;
  pascalName: string;
  snakeName: string;
  type: FieldType;
  sqlType: string;
  javaType: string;
  csharpType: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  unique: boolean;
  primary: boolean;
  autoIncrement: boolean;
  defaultValue?: string;
  index: boolean;
  comment?: string;
}

export interface RelationshipModel {
  type: RelationshipType;
  target: string;
  targetTable: string;
  field?: string;
  mappedBy?: string;
  joinTable?: string;
  joinColumn?: string;
  inverseJoinColumn?: string;
  cascade: CascadeType[];
  fetch: FetchType;
  orphanRemoval: boolean;
}

export interface IndexModel {
  name: string;
  fields: string[];
  unique: boolean;
}

export interface EntityModel {
  name: string;
  tableName: string;
  camelName: string;
  pascalName: string;
  camelPlural: string;
  pascalPlural: string;
  kebabName: string;
  snakeName: string;
  comment?: string;
  fields: FieldModel[];
  relationships: RelationshipModel[];
  indexes: IndexModel[];
  primaryKey?: FieldModel;
  hasAutoIncrement: boolean;
}

export interface ProjectModel {
  name: string;
  package: string;
  version: string;
  description?: string;
  author?: string;
  basePackage: string;
  entityPackage: string;
  repositoryPackage: string;
  servicePackage: string;
  controllerPackage: string;
  dtoPackage: string;
  configPackage: string;
  database?: {
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
}

export interface DomainModel {
  project: ProjectModel;
  entities: EntityModel[];
  entityMap: Map<string, EntityModel>;
}
