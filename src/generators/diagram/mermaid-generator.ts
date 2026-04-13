import type { DomainModel, EntityModel, RelationshipModel } from '../../core/models';

export class MermaidERGenerator {
  generate(model: DomainModel): string {
    const lines: string[] = [];
    
    lines.push('```mermaid');
    lines.push('erDiagram');
    lines.push('');
    
    // Entities
    model.entities.forEach(entity => {
      lines.push(this.generateEntityDiagram(entity));
      lines.push('');
    });
    
    // Relationships
    model.entities.forEach(entity => {
      entity.relationships.forEach(rel => {
        const relLine = this.generateRelationshipLine(entity, rel);
        if (relLine) {
          lines.push(relLine);
        }
      });
    });
    
    lines.push('```');
    
    return lines.join('\n');
  }

  private generateEntityDiagram(entity: EntityModel): string {
    const lines: string[] = [];
    
    lines.push(`    ${entity.pascalName} {`);
    
    entity.fields.forEach(field => {
      const pkMarker = field.primary ? 'PK' : '';
      const fkMarker = entity.relationships.some(r => r.joinColumn === field.name) ? 'FK' : '';
      const markers = [pkMarker, fkMarker].filter(Boolean).join(',');
      const markerStr = markers ? ` "${markers}"` : '';
      
      lines.push(`        ${field.sqlType} ${field.name}${markerStr}`);
    });
    
    lines.push('    }');
    
    return lines.join('\n');
  }

  private generateRelationshipLine(entity: EntityModel, rel: RelationshipModel): string | null {
    const fromEntity = entity.pascalName;
    const toEntity = rel.target;
    
    let cardinality: string;
    
    switch (rel.type) {
      case 'OneToOne':
        cardinality = '||--||';
        break;
      case 'OneToMany':
        cardinality = '||--o{';
        break;
      case 'ManyToOne':
        cardinality = 'o|--||';
        break;
      case 'ManyToMany':
        cardinality = 'o{--o{';
        break;
      default:
        cardinality = '||--||';
    }
    
    const label = rel.type.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    
    return `    ${fromEntity} ${cardinality} ${toEntity} : "${label}"`;
  }

  generatePlantUML(model: DomainModel): string {
    const lines: string[] = [];
    
    lines.push('@startuml');
    lines.push('skinparam classAttributeIconSize 0');
    lines.push('skinparam linetype ortho');
    lines.push('');
    lines.push('title Entity Relationship Diagram');
    lines.push('');
    
    // Entities
    model.entities.forEach(entity => {
      lines.push(`class ${entity.pascalName} {`);
      entity.fields.forEach(field => {
        const pkMarker = field.primary ? ' <<PK>>' : '';
        const fkMarker = entity.relationships.some(r => r.joinColumn === field.name) ? ' <<FK>>' : '';
        lines.push(`  +${field.javaType} ${field.name}${pkMarker}${fkMarker}`);
      });
      lines.push('}');
      lines.push('');
    });
    
    // Relationships
    model.entities.forEach(entity => {
      entity.relationships.forEach(rel => {
        const relStr = this.generatePlantUMLRelationship(entity, rel);
        if (relStr) {
          lines.push(relStr);
        }
      });
    });
    
    lines.push('@enduml');
    
    return lines.join('\n');
  }

  private generatePlantUMLRelationship(entity: EntityModel, rel: RelationshipModel): string | null {
    const from = entity.pascalName;
    const to = rel.target;
    
    switch (rel.type) {
      case 'OneToOne':
        return `${from} "1" -- "1" ${to}`;
      case 'OneToMany':
        return `${from} "1" -- "0..*" ${to}`;
      case 'ManyToOne':
        return `${from} "0..*" -- "1" ${to}`;
      case 'ManyToMany':
        return `${from} "0..*" -- "0..*" ${to}`;
      default:
        return null;
    }
  }
}
