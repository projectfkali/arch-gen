# Architecture Generator

Tek bir **JSON DSL** dosyasından şu çıktıları üreten CLI araç:

- Java **Spring Boot** proje iskeleti (entity/repository/service/controller/DTO)
- C# **.NET 8 Web API** proje iskeleti (EF Core DbContext + repository/service + controller + DTO)
- PostgreSQL **migration** dosyaları (Flyway isimlendirme)
- **ER diagram** (Mermaid + PlantUML)

## Hızlı Başlangıç (npx)

```bash
npx @projectfkali/arch-gen generate -i examples/ecommerce-schema.json -o ./output
```

## Deterministik SQL migration timestamp

CI/test veya ekip içinde aynı migration isimlerini üretmek için:

```bash
arch-gen generate -i examples/ecommerce-schema.json -o ./output -t sql --timestamp 20260413171510
```

## Kurulum

```bash
npm i -g @projectfkali/arch-gen
arch-gen --help
```

## Demo (1 komut)

```bash
arch-gen generate -i examples/ecommerce-schema.json -o ./output -t all
```

## 🚀 Özellikler

- ✅ **Java Spring Boot** projesi üretimi (Entities, Repositories, Services, Controllers, DTOs)
- ✅ **C# .NET 8 Web API** projesi üretimi (Entities, DbContext, Repositories, Services, Controllers, DTOs)
- ✅ **PostgreSQL** migration dosyaları (Flyway format)
- ✅ **ER Diyagramları** (Mermaid + PlantUML)
- ✅ Tam **DSL desteği**: İlişkiler (1:1, 1:N, N:M), validasyonlar, indexler, unique constraint'ler

## 🎯 Kullanım

### CLI

```bash
# Tüm hedefler için
npx arch-gen generate -i schema.json -o ./output

# Sadece Java için
npx arch-gen generate -i schema.json -o ./output -t java

# Sadece C# için
npx arch-gen generate -i schema.json -o ./output -t csharp

# Sadece SQL migration'lar
npx arch-gen generate -i schema.json -o ./output -t sql

# Sadece ER Diyagramları
npx arch-gen generate -i schema.json -o ./output -t diagram
```

#### Parametreler

- `-i, --input <file>`: DSL JSON dosyası
- `-o, --output <dir>`: çıktı klasörü
- `-t, --target <target>`: `java|csharp|sql|diagram|all` (default: `all`)

### Programmatic API

```typescript
import { DSLSchema, transformDSL, JavaGenerator, CSharpGenerator } from '@projectfkali/arch-gen';

// DSL validasyonu
const dsl = DSLSchema.parse(jsonData);

// Domain model'e dönüştürme
const model = transformDSL(dsl);

// Java projesi üretimi
const javaGen = new JavaGenerator();
const javaFiles = javaGen.generate(model);

// C# projesi üretimi
const csharpGen = new CSharpGenerator();
const csharpFiles = csharpGen.generate(model);
```

## 📝 DSL Schema Formatı

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

- `OneToOne` - Birebir ilişki
- `OneToMany` - Bire çok ilişki (bir ürünün birden fazla yorumu)
- `ManyToOne` - Çoktan bire ilişki (birçok sipariş bir kullanıcıya ait)
- `ManyToMany` - Çoktan çoğa ilişki (ürünler ve etiketler)

## 📁 Output Yapısı

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

## 🔧 Geliştirme

```bash
npm install

npm run build

npm test

npm run dev -- generate -i examples/ecommerce-schema.json -o ./test-output
```

## 📝 Örnek Projeler

- `examples/ecommerce-schema.json` - E-Ticaret platformu
- `examples/blog-schema.json` - Blog sistemi
- `examples/saas-schema.json` - SaaS uygulaması

## Troubleshooting

- **`arch-gen` bulunamadı**: global kurulumdan sonra yeni terminal aç veya `npx arch-gen ...` kullan.
- **Validasyon hatası**: hata çıktısındaki `path` alanı, DSL içindeki sorunlu alanı gösterir.

## 📄 Lisans

MIT
