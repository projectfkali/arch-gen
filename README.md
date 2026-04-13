# Architecture Generator

A CLI tool that generates the following outputs from a single **JSON DSL** file:

- Java **Spring Boot** project skeleton (entity/repository/service/controller/DTO)
- C# **.NET 8 Web API** project skeleton (EF Core DbContext + repository/service + controller + DTO)
- PostgreSQL **migration** files (Flyway naming convention)
- **ER diagram** (Mermaid + PlantUML)

## Quick Start (npx)

```bash
npx @projectfkali/arch-gen generate -i examples/ecommerce-schema.json -o ./output
```

## Deterministic SQL migration timestamp

To generate the same migration names for CI/testing or team collaboration:

```bash
arch-gen generate -i examples/ecommerce-schema.json -o ./output -t sql --timestamp 20260413171510
```

## Installation

```bash
npm i -g @projectfkali/arch-gen
arch-gen --help
```

## Demo (1 command)

```bash
arch-gen generate -i examples/ecommerce-schema.json -o ./output -t all
```

## 🚀 Features

- ✅ **Java Spring Boot** project generation (Entities, Repositories, Services, Controllers, DTOs)
- ✅ **C# .NET 8 Web API** project generation (Entities, DbContext, Repositories, Services, Controllers, DTOs)
- ✅ **PostgreSQL** migration files (Flyway format)
- ✅ **ER Diagrams** (Mermaid + PlantUML)
- ✅ Full **DSL support**: Relationships (1:1, 1:N, N:M), validations, indexes, unique constraints

## 🎯 Usage

### CLI

```bash
# For all targets
npx arch-gen generate -i schema.json -o ./output

# Java only
npx arch-gen generate -i schema.json -o ./output -t java

# C# only
npx arch-gen generate -i schema.json -o ./output -t csharp

# SQL migrations only
npx arch-gen generate -i schema.json -o ./output -t sql

# ER Diagrams only
npx arch-gen generate -i schema.json -o ./output -t diagram
```

#### Parameters

- `-i, --input <file>`: DSL JSON file
- `-o, --output <dir>`: output directory
- `-t, --target <target>`: `java|csharp|sql|diagram|all` (default: `all`)

### Programmatic API

```typescript
import { DSLSchema, transformDSL, JavaGenerator, CSharpGenerator } from '@projectfkali/arch-gen';

// DSL validation
const dsl = DSLSchema.parse(jsonData);

// Transform to domain model
const model = transformDSL(dsl);

// Java project generation
const javaGen = new JavaGenerator();
const javaFiles = javaGen.generate(model);

// C# project generation
const csharpGen = new CSharpGenerator();
const csharpFiles = csharpGen.generate(model);
```

## 📝 DSL Schema Format

```json
{
  "project": {
    "name": "ECommerce",
    "package": "com.ecommerce",
    "version": "1.0.0",
    "description": "E-Commerce platform",
    "database": {
      "type": "postgresql",
      "host": "localhost",
      "port": 5432,
      "database": "ecommerce_db",
      "username": "postgres",
      "password": "postgres"
    }
  },
  "entities": [
    {
      "name": "User",
      "tableName": "users",
      "fields": [
        { "name": "id", "type": "UUID", "primary": true, "nullable": false },
        { "name": "email", "type": "String", "unique": true, "nullable": false, "length": 255 },
        { "name": "createdAt", "type": "DateTime", "nullable": false }
      ],
      "relationships": [
        { "type": "OneToMany", "target": "Order", "mappedBy": "user", "cascade": ["ALL"] }
      ],
      "indexes": [
        { "name": "idx_users_email", "fields": ["email"], "unique": true }
      ]
    }
  ]
}
```

### Field Types

| DSL Type | PostgreSQL | Java | C# |
|----------|------------|------|-----|
| UUID | UUID | UUID | Guid |
| String | VARCHAR(n) | String | string |
| Text | TEXT | String | string |
| Integer | INTEGER | Integer | int |
| Long | BIGINT | Long | long |
| Double | DOUBLE PRECISION | Double | double |
| Decimal | DECIMAL(p,s) | BigDecimal | decimal |
| Boolean | BOOLEAN | Boolean | bool |
| Date | DATE | LocalDate | DateOnly |
| DateTime | TIMESTAMP | LocalDateTime | DateTime |
| Time | TIME | LocalTime | TimeOnly |
| Blob | BYTEA | byte[] | byte[] |
| JSON | JSONB | JsonNode | JsonDocument |

### Relationship Types

- `OneToOne` - One-to-one relationship
- `OneToMany` - One-to-many relationship (one product having multiple comments)
- `ManyToOne` - Many-to-one relationship (many orders belonging to one user)
- `ManyToMany` - Many-to-many relationship (products and tags)

## 📁 Output Structure

```
output/
├── java/
│   ├── pom.xml
│   ├── src/main/resources/application.yml
│   └── src/main/java/com/example/
│       ├── entity/
│       ├── repository/
│       ├── service/
│       ├── controller/
│       ├── dto/
│       └── config/
├── csharp/
│   ├── ECommerce.csproj
│   ├── Program.cs
│   ├── appsettings.json
│   ├── Entities/
│   ├── Data/
│   ├── Repositories/
│   ├── Services/
│   ├── Controllers/
│   └── DTOs/
├── sql/
│   └── migrations/
│       ├── V20240113120000__001__create_users.sql
│       ├── V20240113120000__002__create_orders.sql
│       └── V20240113120000__999__add_foreign_keys.sql
└── diagrams/
    ├── er-diagram.mermaid.md
    └── er-diagram.puml
```

## 🔧 Development

```bash
npm install

npm run build

npm test

npm run dev -- generate -i examples/ecommerce-schema.json -o ./test-output
```

## 📝 Example Projects

- `examples/ecommerce-schema.json` - E-Commerce platform
- `examples/blog-schema.json` - Blog system
- `examples/saas-schema.json` - SaaS application

## Troubleshooting

- **`arch-gen` not found**: Open a new terminal after global installation or use `npx arch-gen ...`.
- **Validation error**: The `path` field in the error output indicates the problematic area within the DSL.

## 📄 License

MIT
