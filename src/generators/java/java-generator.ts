import type { DomainModel, EntityModel, RelationshipModel } from '../../core/models';
import { toCamelCase, toPascalCase, toKebabCase } from '../../utils/strings';

export class JavaGenerator {
  generate(model: DomainModel): Map<string, string> {
    const files = new Map<string, string>();
    const basePath = `src/main/java/${model.project.basePackage.replace(/\./g, '/')}`;

    // Entities
    model.entities.forEach(entity => {
      const entityPath = `${basePath}/entity/${entity.pascalName}.java`;
      files.set(entityPath, this.generateEntity(entity, model));
    });

    // Repositories
    model.entities.forEach(entity => {
      const repoPath = `${basePath}/repository/${entity.pascalName}Repository.java`;
      files.set(repoPath, this.generateRepository(entity, model));
    });

    // Services
    model.entities.forEach(entity => {
      const servicePath = `${basePath}/service/${entity.pascalName}Service.java`;
      files.set(servicePath, this.generateService(entity, model));
    });

    // Controllers
    model.entities.forEach(entity => {
      const ctrlPath = `${basePath}/controller/${entity.pascalName}Controller.java`;
      files.set(ctrlPath, this.generateController(entity, model));
    });

    // DTOs
    model.entities.forEach(entity => {
      const dtoPath = `${basePath}/dto/${entity.pascalName}Dto.java`;
      files.set(dtoPath, this.generateDto(entity, model));
    });

    // Config
    files.set(`${basePath}/config/JpaConfig.java`, this.generateJpaConfig(model));

    // pom.xml
    files.set('pom.xml', this.generatePomXml(model));

    // application.yml
    files.set('src/main/resources/application.yml', this.generateApplicationYml(model));

    return files;
  }

  private generateEntity(entity: EntityModel, model: DomainModel): string {
    const pkg = model.project.entityPackage;
    const imports = new Set<string>([
      'jakarta.persistence.*',
      'java.time.*',
      'java.util.*',
      'java.math.BigDecimal'
    ]);

    if (entity.fields.some(f => f.type === 'UUID')) {
      imports.add('java.util.UUID');
    }

    const lines: string[] = [];
    lines.push(`package ${pkg};`);
    lines.push('');
    imports.forEach(imp => lines.push(`import ${imp};`));
    lines.push('');

    if (entity.comment) {
      lines.push(`/** ${entity.comment} */`);
    }

    lines.push(`@Entity`);
    lines.push(`@Table(name = "${entity.tableName}")`);
    lines.push(`public class ${entity.pascalName} {`);
    lines.push('');

    // Fields
    entity.fields.forEach(field => {
      if (field.comment) {
        lines.push(`    /** ${field.comment} */`);
      }

      if (field.primary) {
        lines.push(`    @Id`);
        if (field.type === 'UUID') {
          lines.push(`    @GeneratedValue(strategy = GenerationType.UUID)`);
        } else if (field.autoIncrement) {
          lines.push(`    @GeneratedValue(strategy = GenerationType.IDENTITY)`);
        }
      }

      if (field.unique) {
        lines.push(`    @Column(unique = true${field.nullable ? '' : ', nullable = false'})`);
      } else if (!field.nullable) {
        lines.push(`    @Column(nullable = false)`);
      }

      if (field.length) {
        lines.push(`    @Column(length = ${field.length})`);
      }

      lines.push(`    private ${field.javaType} ${field.name};`);
      lines.push('');
    });

    // Relationships
    entity.relationships.forEach(rel => {
      const relType = this.getRelationshipAnnotation(rel);
      lines.push(`    ${relType}`);
      
      if (rel.type === 'OneToMany') {
        lines.push(`    private List<${rel.target}> ${toCamelCase(rel.target + 's')};`);
      } else if (rel.type === 'ManyToMany') {
        lines.push(`    @JoinTable(name = "${rel.joinTable}",`);
        lines.push(`        joinColumns = @JoinColumn(name = "${rel.joinColumn}"),`);
        lines.push(`        inverseJoinColumns = @JoinColumn(name = "${rel.inverseJoinColumn}"))`);
        lines.push(`    private Set<${rel.target}> ${toCamelCase(rel.target + 's')};`);
      } else {
        if (rel.joinColumn) {
          lines.push(`    @JoinColumn(name = "${rel.joinColumn}")`);
        }
        lines.push(`    private ${rel.target} ${toCamelCase(rel.target)};`);
      }
      lines.push('');
    });

    // Getters and Setters
    entity.fields.forEach(field => {
      const getter = `get${toPascalCase(field.name)}`;
      const setter = `set${toPascalCase(field.name)}`;
      
      lines.push(`    public ${field.javaType} ${getter}() {`);
      lines.push(`        return this.${field.name};`);
      lines.push(`    }`);
      lines.push('');
      
      lines.push(`    public void ${setter}(${field.javaType} ${field.name}) {`);
      lines.push(`        this.${field.name} = ${field.name};`);
      lines.push(`    }`);
      lines.push('');
    });

    lines.push('}');

    return lines.join('\n');
  }

  private getRelationshipAnnotation(rel: RelationshipModel): string {
    const args: string[] = [];

    if (rel.mappedBy) {
      args.push(`mappedBy = "${rel.mappedBy}"`);
    }

    if (rel.cascade.length > 0) {
      const cascadeStr = rel.cascade.map(c => `CascadeType.${c}`).join(', ');
      args.push(`cascade = {${cascadeStr}}`);
    }

    if (rel.orphanRemoval) {
      args.push('orphanRemoval = true');
    }

    if (rel.fetch !== 'LAZY') {
      args.push(`fetch = FetchType.${rel.fetch}`);
    }

    return args.length > 0 ? `@${rel.type}(${args.join(', ')})` : `@${rel.type}`;
  }

  private generateRepository(entity: EntityModel, model: DomainModel): string {
    const pkg = model.project.repositoryPackage;
    const entityPkg = model.project.entityPackage;

    return `package ${pkg};

import ${entityPkg}.${entity.pascalName};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface ${entity.pascalName}Repository extends JpaRepository<${entity.pascalName}, ${entity.primaryKey?.javaType || 'UUID'}> {
}
`;
  }

  private generateService(entity: EntityModel, model: DomainModel): string {
    const pkg = model.project.servicePackage;
    const entityPkg = model.project.entityPackage;
    const repoPkg = model.project.repositoryPackage;
    const dtoPkg = model.project.dtoPackage;

    return `package ${pkg};

import ${entityPkg}.${entity.pascalName};
import ${repoPkg}.${entity.pascalName}Repository;
import ${dtoPkg}.${entity.pascalName}Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ${entity.pascalName}Service {

    private final ${entity.pascalName}Repository repository;

    public ${entity.pascalName}Service(${entity.pascalName}Repository repository) {
        this.repository = repository;
    }

    public List<${entity.pascalName}> findAll() {
        return repository.findAll();
    }

    public ${entity.pascalName} findById(${entity.primaryKey?.javaType || 'UUID'} id) {
        return repository.findById(id)
            .orElseThrow(() -> new RuntimeException("${entity.pascalName} not found"));
    }

    public ${entity.pascalName} save(${entity.pascalName} entity) {
        return repository.save(entity);
    }

    public void deleteById(${entity.primaryKey?.javaType || 'UUID'} id) {
        repository.deleteById(id);
    }
}
`;
  }

  private generateController(entity: EntityModel, model: DomainModel): string {
    const pkg = model.project.controllerPackage;
    const svcPkg = model.project.servicePackage;
    const entityPkg = model.project.entityPackage;
    const idType = entity.primaryKey?.javaType || 'UUID';

    return `package ${pkg};

import ${entityPkg}.${entity.pascalName};
import ${svcPkg}.${entity.pascalName}Service;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/${entity.kebabName}s")
public class ${entity.pascalName}Controller {

    private final ${entity.pascalName}Service service;

    public ${entity.pascalName}Controller(${entity.pascalName}Service service) {
        this.service = service;
    }

    @GetMapping
    public List<${entity.pascalName}> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<${entity.pascalName}> findById(@PathVariable ${idType} id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<${entity.pascalName}> create(@RequestBody ${entity.pascalName} entity) {
        return ResponseEntity.ok(service.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<${entity.pascalName}> update(@PathVariable ${idType} id, @RequestBody ${entity.pascalName} entity) {
        return ResponseEntity.ok(service.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable ${idType} id) {
        service.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
`;
  }

  private generateDto(entity: EntityModel, model: DomainModel): string {
    const pkg = model.project.dtoPackage;
    const lines: string[] = [];

    lines.push(`package ${pkg};`);
    lines.push('');
    lines.push(`public record ${entity.pascalName}Dto(`);

    const fields = entity.fields.map(f => `    ${f.javaType} ${f.name}`).join(',\n');
    lines.push(fields);

    lines.push(`) {}`);

    return lines.join('\n');
  }

  private generateJpaConfig(model: DomainModel): string {
    const pkg = model.project.configPackage;

    return `package ${pkg};

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
`;
  }

  private generatePomXml(model: DomainModel): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>

    <groupId>${model.project.package}</groupId>
    <artifactId>${toKebabCase(model.project.name)}</artifactId>
    <version>${model.project.version}</version>
    <packaging>jar</packaging>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`;
  }

  private generateApplicationYml(model: DomainModel): string {
    const db = model.project.database || {
      host: 'localhost',
      port: 5432,
      database: toKebabCase(model.project.name),
      username: 'postgres',
      password: 'postgres'
    };

    return `spring:
  application:
    name: ${toKebabCase(model.project.name)}
  datasource:
    url: jdbc:postgresql://${db.host}:${db.port}/${db.database}
    username: ${db.username}
    password: ${db.password}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  port: 8080
`;
  }
}
