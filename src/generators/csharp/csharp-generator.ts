import type { DomainModel, EntityModel } from '../../core/models';
import { toPascalCase, toKebabCase } from '../../utils/strings';

export class CSharpGenerator {
  generate(model: DomainModel): Map<string, string> {
    const files = new Map<string, string>();

    // Entities
    model.entities.forEach(entity => {
      files.set(`Entities/${entity.pascalName}.cs`, this.generateEntity(entity, model));
    });

    // DbContext
    files.set('Data/ApplicationDbContext.cs', this.generateDbContext(model));

    // Repositories
    model.entities.forEach(entity => {
      files.set(`Repositories/I${entity.pascalName}Repository.cs`, this.generateRepositoryInterface(entity, model));
      files.set(`Repositories/${entity.pascalName}Repository.cs`, this.generateRepositoryImplementation(entity, model));
    });

    // Services
    model.entities.forEach(entity => {
      files.set(`Services/I${entity.pascalName}Service.cs`, this.generateServiceInterface(entity, model));
      files.set(`Services/${entity.pascalName}Service.cs`, this.generateServiceImplementation(entity, model));
    });

    // Controllers
    model.entities.forEach(entity => {
      files.set(`Controllers/${entity.pascalName}Controller.cs`, this.generateController(entity, model));
    });

    // DTOs
    model.entities.forEach(entity => {
      files.set(`DTOs/${entity.pascalName}Dto.cs`, this.generateDto(entity, model));
      files.set(`DTOs/Create${entity.pascalName}Dto.cs`, this.generateCreateDto(entity, model));
      files.set(`DTOs/Update${entity.pascalName}Dto.cs`, this.generateUpdateDto(entity, model));
    });

    // Program.cs
    files.set('Program.cs', this.generateProgramCs(model));

    // appsettings.json
    files.set('appsettings.json', this.generateAppSettings(model));

    // .csproj
    files.set(`${toPascalCase(model.project.name)}.csproj`, this.generateCsproj(model));

    return files;
  }

  private generateEntity(entity: EntityModel, model: DomainModel): string {
    const ns = model.project.package;
    const lines: string[] = [];

    lines.push('using System;');
    lines.push('using System.Collections.Generic;');
    lines.push('using System.ComponentModel.DataAnnotations;');
    lines.push('using System.ComponentModel.DataAnnotations.Schema;');
    lines.push('using System.Text.Json;');
    lines.push('');
    lines.push(`namespace ${ns}.Entities;`);
    lines.push('');

    if (entity.comment) {
      lines.push(`/// <summary>`);
      lines.push(`/// ${entity.comment}`);
      lines.push(`/// </summary>`);
    }

    lines.push(`[Table("${entity.tableName}")]`);
    lines.push(`public class ${entity.pascalName}`);
    lines.push('{');
    lines.push('');

    // Fields
    entity.fields.forEach(field => {
      if (field.comment) {
        lines.push(`    /// <summary>${field.comment}</summary>`);
      }

      if (field.primary) {
        lines.push('    [Key]');
        if (field.autoIncrement) {
          lines.push('    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]');
        }
      }

      if (field.unique) {
        lines.push(`    [Index(IsUnique = true)]`);
      }

      const dataAnnotations: string[] = [];
      if (!field.nullable) {
        dataAnnotations.push('Required');
      }
      if (field.length) {
        dataAnnotations.push(`StringLength(${field.length})`);
      }

      dataAnnotations.forEach(attr => {
        lines.push(`    [${attr}]`);
      });

      const nullableChar = field.nullable && field.csharpType !== 'string' && !field.csharpType.endsWith('[]') ? '?' : '';
      lines.push(`    public ${field.csharpType}${nullableChar} ${field.pascalName} { get; set; }${field.nullable ? '' : ' = default!;'}`);
      lines.push('');
    });

    // Relationships
    entity.relationships.forEach(rel => {
      lines.push(`    // ${rel.type} relationship to ${rel.target}`);
      
      if (rel.type === 'OneToMany') {
        lines.push(`    public ICollection<${rel.target}> ${rel.target}s { get; set; } = new List<${rel.target}>();`);
      } else if (rel.type === 'ManyToMany') {
        lines.push(`    public ICollection<${rel.target}> ${rel.target}s { get; set; } = new List<${rel.target}>();`);
      } else {
        lines.push(`    public ${rel.target}? ${rel.target} { get; set; }`);
        if (rel.joinColumn) {
          lines.push(`    [ForeignKey("${rel.target}")]`);
          const targetPk = model.entityMap.get(rel.target)?.primaryKey;
          const fkType = targetPk?.csharpType || 'Guid';
          const fkNullable = rel.type === 'ManyToOne' ? '?' : '';
          lines.push(`    public ${fkType}${fkNullable} ${toPascalCase(rel.joinColumn)} { get; set; }`);
        }
      }
      lines.push('');
    });

    lines.push('}');

    return lines.join('\n');
  }

  private generateDbContext(model: DomainModel): string {
    const ns = model.project.package;
    const lines: string[] = [];

    lines.push('using Microsoft.EntityFrameworkCore;');
    lines.push(`using ${ns}.Entities;`);
    lines.push('');
    lines.push(`namespace ${ns}.Data;`);
    lines.push('');
    lines.push('public class ApplicationDbContext : DbContext');
    lines.push('{');
    lines.push(`    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)`);
    lines.push('        : base(options)');
    lines.push('    {');
    lines.push('    }');
    lines.push('');

    // DbSets
    model.entities.forEach(entity => {
      lines.push(`    public DbSet<${entity.pascalName}> ${entity.pascalPlural} => Set<${entity.pascalName}>();`);
    });

    lines.push('');
    lines.push('    protected override void OnModelCreating(ModelBuilder modelBuilder)');
    lines.push('    {');
    lines.push('        base.OnModelCreating(modelBuilder);');
    lines.push('');

    // Fluent API configuration
    model.entities.forEach(entity => {
      lines.push(`        // ${entity.pascalName} configuration`);
      lines.push(`        modelBuilder.Entity<${entity.pascalName}>(entity =>`);
      lines.push('        {');

      // Table name
      lines.push(`            entity.ToTable("${entity.tableName}");`);

      // Primary key
      if (entity.primaryKey) {
        lines.push(`            entity.HasKey(e => e.${entity.primaryKey.pascalName});`);
      }

      // Indexes
      entity.indexes.forEach(idx => {
        const unique = idx.unique ? 'IsUnique()' : 'IsUnique(false)';
        lines.push(`            entity.HasIndex(e => new { ${idx.fields.map(f => `e.${toPascalCase(f)}`).join(', ')} }).${unique};`);
      });

      // Unique constraints on fields
      entity.fields.filter(f => f.unique && !f.primary).forEach(f => {
        lines.push(`            entity.HasIndex(e => e.${f.pascalName}).IsUnique();`);
      });

      // Relationships
      entity.relationships.forEach(rel => {
        if (rel.type === 'OneToMany') {
          lines.push(`            entity.HasMany(e => e.${rel.target}s)`);
          lines.push(`                .WithOne(e => e.${entity.pascalName})`);
          if (rel.mappedBy) {
            lines.push(`                .HasForeignKey(e => e.${toPascalCase(rel.mappedBy)});`);
          }
        } else if (rel.type === 'ManyToOne') {
          lines.push(`            entity.HasOne(e => e.${rel.target})`);
          lines.push(`                .WithMany()`);
          if (rel.joinColumn) {
            lines.push(`                .HasForeignKey(e => e.${toPascalCase(rel.joinColumn)});`);
          }
        }
      });

      lines.push('        });');
      lines.push('');
    });

    lines.push('    }');
    lines.push('}');

    return lines.join('\n');
  }

  private generateRepositoryInterface(entity: EntityModel, model: DomainModel): string {
    const ns = model.project.package;
    const idType = entity.primaryKey?.csharpType || 'Guid';

    return `using ${ns}.Entities;

namespace ${ns}.Repositories;

public interface I${entity.pascalName}Repository
{
    Task<IEnumerable<${entity.pascalName}>> GetAllAsync();
    Task<${entity.pascalName}?> GetByIdAsync(${idType} id);
    Task<${entity.pascalName}> AddAsync(${entity.pascalName} entity);
    Task UpdateAsync(${entity.pascalName} entity);
    Task DeleteAsync(${idType} id);
    Task<bool> ExistsAsync(${idType} id);
}
`;
  }

  private generateRepositoryImplementation(entity: EntityModel, model: DomainModel): string {
    const ns = model.project.package;
    const idType = entity.primaryKey?.csharpType || 'Guid';

    return `using ${ns}.Data;
using ${ns}.Entities;
using Microsoft.EntityFrameworkCore;

namespace ${ns}.Repositories;

public class ${entity.pascalName}Repository : I${entity.pascalName}Repository
{
    private readonly ApplicationDbContext _context;

    public ${entity.pascalName}Repository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<${entity.pascalName}>> GetAllAsync()
    {
        return await _context.${entity.pascalPlural}.ToListAsync();
    }

    public async Task<${entity.pascalName}?> GetByIdAsync(${idType} id)
    {
        return await _context.${entity.pascalPlural}.FindAsync(id);
    }

    public async Task<${entity.pascalName}> AddAsync(${entity.pascalName} entity)
    {
        _context.${entity.pascalPlural}.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task UpdateAsync(${entity.pascalName} entity)
    {
        _context.${entity.pascalPlural}.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(${idType} id)
    {
        var entity = await GetByIdAsync(id);
        if (entity != null)
        {
            _context.${entity.pascalPlural}.Remove(entity);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> ExistsAsync(${idType} id)
    {
        return await _context.${entity.pascalPlural}.AnyAsync(e => e.${entity.primaryKey?.pascalName || 'Id'} == id);
    }
}
`;
  }

  private generateServiceInterface(entity: EntityModel, model: DomainModel): string {
    const ns = model.project.package;
    const dtoNs = `${ns}.DTOs`;
    const idType = entity.primaryKey?.csharpType || 'Guid';

    return `using ${dtoNs};

namespace ${ns}.Services;

public interface I${entity.pascalName}Service
{
    Task<IEnumerable<${entity.pascalName}Dto>> GetAllAsync();
    Task<${entity.pascalName}Dto?> GetByIdAsync(${idType} id);
    Task<${entity.pascalName}Dto> CreateAsync(Create${entity.pascalName}Dto dto);
    Task<${entity.pascalName}Dto> UpdateAsync(${idType} id, Update${entity.pascalName}Dto dto);
    Task DeleteAsync(${idType} id);
}
`;
  }

  private generateServiceImplementation(entity: EntityModel, model: DomainModel): string {
    const ns = model.project.package;
    const dtoNs = `${ns}.DTOs`;
    const entityNs = `${ns}.Entities`;
    const repoNs = `${ns}.Repositories`;
    const idType = entity.primaryKey?.csharpType || 'Guid';

    return `using ${dtoNs};
using ${entityNs};
using ${repoNs};

namespace ${ns}.Services;

public class ${entity.pascalName}Service : I${entity.pascalName}Service
{
    private readonly I${entity.pascalName}Repository _repository;

    public ${entity.pascalName}Service(I${entity.pascalName}Repository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<${entity.pascalName}Dto>> GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        return entities.Select(MapToDto);
    }

    public async Task<${entity.pascalName}Dto?> GetByIdAsync(${idType} id)
    {
        var entity = await _repository.GetByIdAsync(id);
        return entity == null ? null : MapToDto(entity);
    }

    public async Task<${entity.pascalName}Dto> CreateAsync(Create${entity.pascalName}Dto dto)
    {
        var entity = MapToEntity(dto);
        entity = await _repository.AddAsync(entity);
        return MapToDto(entity);
    }

    public async Task<${entity.pascalName}Dto> UpdateAsync(${idType} id, Update${entity.pascalName}Dto dto)
    {
        var entity = await _repository.GetByIdAsync(id);
        if (entity == null)
            throw new KeyNotFoundException($"{entity.pascalName} with id {id} not found");

        MapToEntity(dto, entity);
        await _repository.UpdateAsync(entity);
        return MapToDto(entity);
    }

    public async Task DeleteAsync(${idType} id)
    {
        await _repository.DeleteAsync(id);
    }

    private ${entity.pascalName}Dto MapToDto(${entity.pascalName} entity)
    {
        return new ${entity.pascalName}Dto(
${entity.fields.map(f => `            entity.${f.pascalName}`).join(',\n')}
        );
    }

    private ${entity.pascalName} MapToEntity(Create${entity.pascalName}Dto dto)
    {
        return new ${entity.pascalName}
        {
${entity.fields.filter(f => !f.primary).map(f => `            ${f.pascalName} = dto.${f.pascalName}`).join(',\n')}
        };
    }

    private void MapToEntity(Update${entity.pascalName}Dto dto, ${entity.pascalName} entity)
    {
${entity.fields.filter(f => !f.primary).map(f => `        entity.${f.pascalName} = dto.${f.pascalName};`).join('\n')}
    }
}
`;
  }

  private generateController(entity: EntityModel, model: DomainModel): string {
    const ns = model.project.package;
    const dtoNs = `${ns}.DTOs`;
    const svcNs = `${ns}.Services`;
    const idType = entity.primaryKey?.csharpType || 'Guid';

    return `using ${dtoNs};
using ${svcNs};
using Microsoft.AspNetCore.Mvc;

namespace ${ns}.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ${entity.pascalName}Controller : ControllerBase
{
    private readonly I${entity.pascalName}Service _service;

    public ${entity.pascalName}Controller(I${entity.pascalName}Service service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<${entity.pascalName}Dto>>> GetAll()
    {
        var items = await _service.GetAllAsync();
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<${entity.pascalName}Dto>> GetById(${idType} id)
    {
        var item = await _service.GetByIdAsync(id);
        if (item == null)
            return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<${entity.pascalName}Dto>> Create([FromBody] Create${entity.pascalName}Dto dto)
    {
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.${entity.primaryKey?.pascalName || 'Id'} }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<${entity.pascalName}Dto>> Update(${idType} id, [FromBody] Update${entity.pascalName}Dto dto)
    {
        var updated = await _service.UpdateAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(${idType} id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
`;
  }

  private generateDto(entity: EntityModel, model: DomainModel): string {
    const ns = `${model.project.package}.DTOs`;
    const fields = entity.fields.map(f => {
      const nullable = f.nullable && f.csharpType !== 'string' ? '?' : '';
      return `    ${f.csharpType}${nullable} ${f.pascalName}`;
    }).join(',\n');

    return `namespace ${ns};

public record ${entity.pascalName}Dto(
${fields}
);
`;
  }

  private generateCreateDto(entity: EntityModel, model: DomainModel): string {
    const ns = `${model.project.package}.DTOs`;
    const fields = entity.fields
      .filter(f => !f.primary)
      .map(f => {
        const nullable = f.nullable && f.csharpType !== 'string' ? '?' : '';
        const required = !f.nullable ? '[Required]\n    ' : '';
        return `    ${required}${f.csharpType}${nullable} ${f.pascalName}`;
      }).join(',\n');

    return `using System.ComponentModel.DataAnnotations;

namespace ${ns};

public record Create${entity.pascalName}Dto(
${fields}
);
`;
  }

  private generateUpdateDto(entity: EntityModel, model: DomainModel): string {
    const ns = `${model.project.package}.DTOs`;
    const fields = entity.fields
      .filter(f => !f.primary)
      .map(f => {
        const nullable = f.nullable && f.csharpType !== 'string' ? '?' : '';
        return `    ${f.csharpType}${nullable} ${f.pascalName}`;
      }).join(',\n');

    return `namespace ${ns};

public record Update${entity.pascalName}Dto(
${fields}
);
`;
  }

  private generateProgramCs(model: DomainModel): string {
    const ns = model.project.package;

    return `using ${ns}.Data;
using ${ns}.Repositories;
using ${ns}.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register repositories
${model.entities.map(e => `builder.Services.AddScoped<I${e.pascalName}Repository, ${e.pascalName}Repository>();`).join('\n')}

// Register services
${model.entities.map(e => `builder.Services.AddScoped<I${e.pascalName}Service, ${e.pascalName}Service>();`).join('\n')}

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
`;
  }

  private generateAppSettings(model: DomainModel): string {
    const db = model.project.database || {
      host: 'localhost',
      port: 5432,
      database: toKebabCase(model.project.name),
      username: 'postgres',
      password: 'postgres'
    };

    return JSON.stringify({
      "Logging": {
        "LogLevel": {
          "Default": "Information",
          "Microsoft.AspNetCore": "Warning"
        }
      },
      "AllowedHosts": "*",
      "ConnectionStrings": {
        "DefaultConnection": `Host=${db.host};Port=${db.port};Database=${db.database};Username=${db.username};Password=${db.password}`
      }
    }, null, 2);
  }

  private generateCsproj(_model: DomainModel): string {
    return `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.0">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
  </ItemGroup>

</Project>
`;
  }
}
