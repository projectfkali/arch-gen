import express from 'express';
import path from 'path';
import JSZip from 'jszip';
import * as fs from 'fs-extra';

import { DSLSchema } from '../dsl/schema';
import { transformDSL } from '../core/transformer';
import { JavaGenerator } from '../generators/java/java-generator';
import { CSharpGenerator } from '../generators/csharp/csharp-generator';
import { PostgreSQLGenerator } from '../generators/sql/postgres-generator';
import { MermaidERGenerator } from '../generators/diagram/mermaid-generator';

type Target = 'java' | 'csharp' | 'sql' | 'diagram' | 'all';

const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '5mb' }));

const publicDir = path.resolve(__dirname, 'public');
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/__example/ecommerce', async (_req, res) => {
  try {
    const examplePath = path.resolve(__dirname, '..', '..', 'examples', 'ecommerce-schema.json');
    const content = await fs.readFile(examplePath, 'utf-8');
    res.type('application/json').send(content);
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const target: Target = (req.body?.target ?? 'all') as Target;
    const dslData = req.body?.dsl;

    const validation = DSLSchema.safeParse(dslData);
    if (!validation.success) {
      return res.status(400).json({
        error: 'DSL Validation failed',
        details: validation.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }

    const domainModel = transformDSL(validation.data);

    const targets: Exclude<Target, 'all'>[] =
      target === 'all' ? ['java', 'csharp', 'sql', 'diagram'] : [target];

    const zip = new JSZip();

    for (const t of targets) {
      switch (t) {
        case 'java': {
          const gen = new JavaGenerator();
          const files = gen.generate(domainModel);
          for (const [filePath, content] of files) {
            zip.file(path.posix.join('java', filePath.replace(/\\/g, '/')), content);
          }
          break;
        }
        case 'csharp': {
          const gen = new CSharpGenerator();
          const files = gen.generate(domainModel);
          for (const [filePath, content] of files) {
            zip.file(path.posix.join('csharp', filePath.replace(/\\/g, '/')), content);
          }
          break;
        }
        case 'sql': {
          const gen = new PostgreSQLGenerator();
          const files = gen.generate(domainModel);
          for (const [filePath, content] of files) {
            zip.file(
              path.posix.join('sql', 'migrations', filePath.replace(/\\/g, '/')),
              content
            );
          }
          break;
        }
        case 'diagram': {
          const gen = new MermaidERGenerator();
          zip.file(path.posix.join('diagrams', 'er-diagram.mermaid.md'), gen.generate(domainModel));
          zip.file(
            path.posix.join('diagrams', 'er-diagram.puml'),
            gen.generatePlantUML(domainModel)
          );
          break;
        }
      }
    }

    const output = await zip.generateAsync({ type: 'nodebuffer' });
    const projectName = validation.data.project?.name ?? 'project';
    const filename = `${projectName}-${target}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(output);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const PORT = Number(process.env.PORT ?? 5179);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`GUI running at http://localhost:${PORT}`);
});

