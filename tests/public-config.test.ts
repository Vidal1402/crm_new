import test from 'node:test';
import assert from 'node:assert/strict';
import { credentialsFromPublicConfig } from '../src/lib/publicConfig.ts';

test('config pública vazia não libera o app', () => {
  assert.equal(credentialsFromPublicConfig(null), null);
  assert.equal(credentialsFromPublicConfig({ url: '', anonKey: 'x' }), null);
  assert.equal(credentialsFromPublicConfig({ url: 'http://inseguro', anonKey: 'x' }), null);
});

test('config pública com url e chave anon conta como instalado', () => {
  assert.deepEqual(
    credentialsFromPublicConfig({ url: 'https://abc.supabase.co', anonKey: 'eyJpublico' }),
    { url: 'https://abc.supabase.co', anonKey: 'eyJpublico' },
  );
});
