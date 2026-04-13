#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { DSLSchema } from '../dsl/schema';
import { transformDSL } from '../core/transformer';
import { JavaGenerator } from '../generators/java/java-generator';
import { CSharpGenerator } from '../generators/csharp/csharp-generator';
import { PostgreSQLGenerator } from '../generators/sql/postgres-generator';
import { MermaidERGenerator } from '../generators/diagram/mermaid-generator';

const program = new Command();

program
  .name('arch-gen')
  .description('JSON DSL\'den Java/C# proje iskeleti, SQL migration ve ER Diyagramı üreten geliştirici aracı')
  .version('1.0.0');

program
  .command('generate')
  .alias('gen')
  .description('Generate project from DSL schema')
  .requiredOption('-i, --input <file>', 'Input JSON schema file')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('-t, --target <target>', 'Target language (java|csharp|sql|diagram|all)', 'all')
  .option('--timestamp <YYYYMMDDHHmmss>', 'Override SQL migration timestamp (only affects sql target)')
  .action(async (options) => {
    try {
      console.log('🚀 Architecture Generator');
      console.log(`📄 Input: ${options.input}`);
      console.log(`📁 Output: ${options.output}`);
      console.log(`🎯 Target: ${options.target}`);
      console.log('');

      // Validate input file exists
      if (!await fs.pathExists(options.input)) {
        console.error(`❌ Error: Input file not found: ${options.input}`);
        process.exit(1);
      }

      // Parse and validate DSL
      const dslContent = await fs.readFile(options.input, 'utf-8');
      const dslData = JSON.parse(dslContent);
      
      console.log('🔍 Validating DSL schema...');
      const validationResult = DSLSchema.safeParse(dslData);
      
      if (!validationResult.success) {
        console.error('❌ DSL Validation failed:');
        validationResult.error.errors.forEach(err => {
          console.error(`   - ${err.path.join('.')}: ${err.message}`);
        });
        process.exit(1);
      }

      const dsl = validationResult.data;
      console.log(`✅ DSL valid: ${dsl.project.name} (${dsl.entities.length} entities)`);
      console.log('');

      // Transform to domain model
      console.log('🔄 Transforming to domain model...');
      const domainModel = transformDSL(dsl);
      console.log(`✅ Transformed: ${domainModel.entities.length} entities`);
      console.log('');

      // Generate based on target
      const outputDir = path.resolve(options.output);
      await fs.ensureDir(outputDir);

      const targets = options.target === 'all' 
        ? ['java', 'csharp', 'sql', 'diagram'] 
        : [options.target];

      for (const target of targets) {
        console.log(`📝 Generating ${target}...`);
        
        switch (target) {
          case 'java':
            await generateJava(domainModel, outputDir);
            break;
          case 'csharp':
            await generateCSharp(domainModel, outputDir);
            break;
          case 'sql':
            await generateSQL(domainModel, outputDir, options.timestamp);
            break;
          case 'diagram':
            await generateDiagrams(domainModel, outputDir);
            break;
        }
        
        console.log(`✅ ${target} generated`);
        console.log('');
      }

      console.log('🎉 Generation complete!');
      console.log(`📁 Output: ${outputDir}`);

    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

async function generateJava(model: ReturnType<typeof transformDSL>, outputDir: string): Promise<void> {
  const generator = new JavaGenerator();
  const files = generator.generate(model);
  
  const javaDir = path.join(outputDir, 'java');
  
  for (const [filePath, content] of files) {
    const fullPath = path.join(javaDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`   📄 ${filePath}`);
  }
}

async function generateCSharp(model: ReturnType<typeof transformDSL>, outputDir: string): Promise<void> {
  const generator = new CSharpGenerator();
  const files = generator.generate(model);
  
  const csharpDir = path.join(outputDir, 'csharp');
  
  for (const [filePath, content] of files) {
    const fullPath = path.join(csharpDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`   📄 ${filePath}`);
  }
}

async function generateSQL(
  model: ReturnType<typeof transformDSL>,
  outputDir: string,
  timestampOverride?: string
): Promise<void> {
  const ts = typeof timestampOverride === 'string' ? timestampOverride : undefined;
  const generator = new PostgreSQLGenerator({
    now: ts
      ? () => {
          const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(ts);
          if (!m) return new Date();
          const [, y, mo, d, h, mi, s] = m;
          return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
        }
      : undefined
  });
  const files = generator.generate(model);
  
  const sqlDir = path.join(outputDir, 'sql', 'migrations');
  
  for (const [filePath, content] of files) {
    const fullPath = path.join(sqlDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`   📄 ${filePath}`);
  }
}

async function generateDiagrams(model: ReturnType<typeof transformDSL>, outputDir: string): Promise<void> {
  const generator = new MermaidERGenerator();
  
  const diagramDir = path.join(outputDir, 'diagrams');
  await fs.ensureDir(diagramDir);
  
  // Mermaid diagram
  const mermaid = generator.generate(model);
  await fs.writeFile(path.join(diagramDir, 'er-diagram.mermaid.md'), mermaid, 'utf-8');
  console.log('   📄 er-diagram.mermaid.md');
  
  // PlantUML diagram
  const plantuml = generator.generatePlantUML(model);
  await fs.writeFile(path.join(diagramDir, 'er-diagram.puml'), plantuml, 'utf-8');
  console.log('   📄 er-diagram.puml');
}

program.parse();
