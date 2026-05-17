import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yamljs';

const spec = YAML.parse(fs.readFileSync(path.join(process.cwd(), 'docs', 'openapi.yaml'), 'utf8'));

describe('OpenAPI contract', () => {
  it('has valid metadata', () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBe('Link Shortener API');
  });

  it('documents TZ endpoints', () => {
    expect(spec.paths['/redirect/{shortCode}']?.get).toBeDefined();
    expect(spec.paths['/users/me/links']?.get).toBeDefined();
    expect(spec.paths['/links/{shortCode}/stats']?.get).toBeDefined();
    expect(spec.paths['/qr/{shortCode}']?.get).toBeDefined();
  });
});
