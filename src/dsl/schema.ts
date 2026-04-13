import { z } from 'zod';

export const FieldTypeSchema = z.enum([
  'UUID', 'String', 'Integer', 'Long', 'Double', 'Decimal', 'Boolean',
  'Date', 'DateTime', 'Time', 'Text', 'Blob', 'JSON'
]);

export const RelationshipTypeSchema = z.enum([
  'OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'
]);

export const CascadeTypeSchema = z.enum([
  'ALL', 'PERSIST', 'MERGE', 'REMOVE', 'REFRESH', 'DETACH'
]);

export const FetchTypeSchema = z.enum(['EAGER', 'LAZY']);

export const FieldSchema = z.object({
  name: z.string().min(1),
  type: FieldTypeSchema,
  length: z.number().optional(),
  precision: z.number().optional(),
  scale: z.number().optional(),
  nullable: z.boolean().default(true),
  unique: z.boolean().default(false),
  primary: z.boolean().default(false),
  autoIncrement: z.boolean().default(false),
  defaultValue: z.string().optional(),
  index: z.boolean().default(false),
  comment: z.string().optional()
});

export const RelationshipSchema = z.object({
  type: RelationshipTypeSchema,
  target: z.string().min(1),
  field: z.string().optional(),
  mappedBy: z.string().optional(),
  joinTable: z.string().optional(),
  joinColumn: z.string().optional(),
  cascade: z.array(CascadeTypeSchema).optional(),
  fetch: FetchTypeSchema.default('LAZY'),
  orphanRemoval: z.boolean().default(false)
});

export const EntitySchema = z.object({
  name: z.string().min(1),
  tableName: z.string().optional(),
  comment: z.string().optional(),
  fields: z.array(FieldSchema).min(1),
  relationships: z.array(RelationshipSchema).default([]),
  indexes: z.array(z.object({
    name: z.string(),
    fields: z.array(z.string()),
    unique: z.boolean().default(false)
  })).default([])
});

export const ProjectConfigSchema = z.object({
  name: z.string().min(1),
  package: z.string().min(1),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),
  author: z.string().optional(),
  database: z.object({
    type: z.enum(['postgresql', 'mysql', 'sqlserver']),
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    database: z.string(),
    username: z.string().default('postgres'),
    password: z.string().default('postgres')
  }).optional()
});

export const DSLSchema = z.object({
  project: ProjectConfigSchema,
  entities: z.array(EntitySchema).min(1)
});

export type FieldType = z.infer<typeof FieldTypeSchema>;
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export type CascadeType = z.infer<typeof CascadeTypeSchema>;
export type FetchType = z.infer<typeof FetchTypeSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type DSL = z.infer<typeof DSLSchema>;
