// Opt-in compatibility preload for the Node 22.16 SQLite-backed D1 test doubles.
// D1 binds ?N parameters positionally; this Node SQLite version treats ?N as
// named parameters. This affects tests only, never Cloudflare production SQL.
// Usage: node --import ./test-support/sqlite-numbered-bindings.mjs test/example.test.mjs
import { DatabaseSync } from 'node:sqlite';

const originalPrepare = DatabaseSync.prototype.prepare;
DatabaseSync.prototype.prepare = function prepareD1TestStatement(sql) {
  const indices = [];
  // Skip quoted SQL and comments so a literal '?1' remains a literal.
  const rewritten = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\r\n]*|\/\*[\s\S]*?\*\/|\?(\d+)/g,
    (match, number) => {
      if (number === undefined) return match;
      indices.push(Number(number) - 1);
      return '?';
    });
  if (!indices.length) return originalPrepare.call(this, sql);
  const statement = originalPrepare.call(this, rewritten);
  return new Proxy(statement, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      if (typeof value !== 'function') return value;
      return (...args) => value.apply(target,
        ['run', 'get', 'all', 'iterate'].includes(key) ? indices.map(index => args[index]) : args);
    },
  });
};
