import type { DomainModel, EntityModel, FieldModel } from '../../core/models';

export class PostgreSQLGenerator {
  private readonly now: () => Date;

  constructor(opts?: { now?: () => Date }) {
    this.now = opts?.now ?? (() => new Date());
  }

  generate(model: DomainModel): Map<string, string> {
    const files = new Map<string, string>();
    
    // Migration dosyaları
    const timestamp = this.now().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    
    model.entities.forEach((entity, index) => {
      const version = (index + 1).toString().padStart(3, '0');
      const filename = `V${timestamp}__${version}__create_${entity.tableName}.sql`;
      files.set(filename, this.generateTableSQL(entity));
    });

    // Foreign key migration'ı (sonradan çalıştırılır)
    const fkFilename = `V${timestamp}__999__add_foreign_keys.sql`;
    files.set(fkFilename, this.generateForeignKeysSQL(model));

    return files;
  }

  private generateTableSQL(entity: EntityModel): string {
    const lines: string[] = [];
    
    if (entity.comment) {
      lines.push(`-- ${entity.comment}`);
    }
    
    lines.push(`CREATE TABLE IF NOT EXISTS ${entity.tableName} (`);
    
    // Fields
    const fieldDefs = entity.fields.map(f => this.generateFieldDefinition(f));
    lines.push(fieldDefs.join(',\n'));
    
    // Primary key
    if (entity.primaryKey) {
      lines.push(`    CONSTRAINT pk_${entity.tableName} PRIMARY KEY (${entity.primaryKey.name})`);
    }
    
    lines.push(');');
    lines.push('');
    
    // Indexes
    entity.indexes.forEach(idx => {
      const idxType = idx.unique ? 'UNIQUE INDEX' : 'INDEX';
      const idxName = idx.name || `idx_${entity.tableName}_${idx.fields.join('_')}`;
      lines.push(`CREATE ${idxType} IF NOT EXISTS ${idxName} ON ${entity.tableName} (${idx.fields.join(', ')});`);
    });
    
    // Field comments
    entity.fields.forEach(f => {
      if (f.comment) {
        lines.push(`COMMENT ON COLUMN ${entity.tableName}.${f.name} IS '${f.comment.replace(/'/g, "''")}';`);
      }
    });
    
    // Table comment
    if (entity.comment) {
      lines.push(`COMMENT ON TABLE ${entity.tableName} IS '${entity.comment.replace(/'/g, "''")}';`);
    }
    
    return lines.join('\n');
  }

  private generateFieldDefinition(field: FieldModel): string {
    const parts: string[] = [];
    
    // Column name and type
    parts.push(`    ${field.name} ${field.sqlType}`);
    
    // NOT NULL constraint
    if (!field.nullable) {
      parts.push('NOT NULL');
    }
    
    // UNIQUE constraint
    if (field.unique) {
      parts.push('UNIQUE');
    }
    
    // DEFAULT value
    if (field.defaultValue) {
      parts.push(`DEFAULT ${field.defaultValue}`);
    }
    
    return parts.join(' ');
  }

  private generateForeignKeysSQL(model: DomainModel): string {
    const lines: string[] = [];
    lines.push('-- Foreign key constraints');
    lines.push('');
    
    model.entities.forEach(entity => {
      entity.relationships.forEach(rel => {
        if (rel.type === 'ManyToOne' || (rel.type === 'OneToOne' && rel.joinColumn)) {
          const constraintName = `fk_${entity.tableName}_${rel.target.toLowerCase()}`;
          const targetPk = model.entityMap.get(rel.target)?.primaryKey;
          const targetPkName = targetPk?.name ?? 'id';
          lines.push(`ALTER TABLE ${entity.tableName}`);
          lines.push(`    ADD CONSTRAINT ${constraintName}`);
          lines.push(`    FOREIGN KEY (${rel.joinColumn})`);
          lines.push(`    REFERENCES ${rel.targetTable}(${targetPkName})`);
          
          if (rel.cascade.includes('REMOVE')) {
            lines.push('    ON DELETE CASCADE');
          } else {
            lines.push('    ON DELETE RESTRICT');
          }
          
          lines.push(';');
          lines.push('');
        }
        
        if (rel.type === 'ManyToMany' && rel.joinTable) {
          lines.push(`-- Many-to-many join table: ${rel.joinTable}`);
          const targetPk = model.entityMap.get(rel.target)?.primaryKey;
          const targetPkName = targetPk?.name ?? 'id';
          const targetPkSqlType = targetPk?.sqlType ?? 'UUID';
          lines.push(`CREATE TABLE IF NOT EXISTS ${rel.joinTable} (`);
          lines.push(`    ${rel.joinColumn} ${entity.primaryKey?.sqlType || 'UUID'} NOT NULL,`);
          lines.push(`    ${rel.inverseJoinColumn} ${targetPkSqlType} NOT NULL,`);
          lines.push(`    CONSTRAINT pk_${rel.joinTable} PRIMARY KEY (${rel.joinColumn}, ${rel.inverseJoinColumn}),`);
          lines.push(`    CONSTRAINT fk_${rel.joinTable}_${entity.tableName} FOREIGN KEY (${rel.joinColumn}) REFERENCES ${entity.tableName}(${entity.primaryKey?.name ?? 'id'}) ON DELETE CASCADE,`);
          lines.push(`    CONSTRAINT fk_${rel.joinTable}_${rel.target.toLowerCase()} FOREIGN KEY (${rel.inverseJoinColumn}) REFERENCES ${rel.targetTable}(${targetPkName}) ON DELETE CASCADE`);
          lines.push(');');
          lines.push('');
        }
      });
    });
    
    return lines.join('\n');
  }

  generateRollbackSQL(entity: EntityModel): string {
    return `DROP TABLE IF EXISTS ${entity.tableName} CASCADE;`;
  }
}
