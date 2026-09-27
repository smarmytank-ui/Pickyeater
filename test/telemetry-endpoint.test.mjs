import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {onRequestPost} from '../functions/api/events.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

class Statement{
  constructor(database,sql){ this.database=database; this.sql=sql; this.values=[]; }
  bind(...values){ this.values=values; return this; }
  async run(){ const result=this.database.prepare(this.sql).run(...this.values); return {meta:{changes:Number(result.changes)}}; }
}

class D1{
  constructor(database){ this.database=database; }
  prepare(sql){ return new Statement(this.database,sql); }
  async batch(statements){
    this.database.exec('BEGIN');
    try{
      for(const statement of statements) await statement.run();
      this.database.exec('COMMIT');
    }catch(error){ this.database.exec('ROLLBACK'); throw error; }
  }
}

test('telemetry insertion transaction removes events older than 90 days',async()=>{
  const database=new DatabaseSync(':memory:');
  database.exec(await readFile(path.join(root,'migrations/0003_product_telemetry.sql'),'utf8'));
  database.prepare('INSERT INTO product_events (id,event_name,session_id,path,details,created_at) VALUES (?,?,?,?,?,?)')
    .run('old','page_view','12345678-1234-4123-8123-123456789abc','/','{}','2020-01-01T00:00:00.000Z');
  const request=new Request('https://foodmyway.app/api/events',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      event:'page_view',sessionId:'12345678-1234-4123-8123-123456789abc',path:'/',details:{}
    })
  });
  const response=await onRequestPost({request,env:{TELEMETRY:new D1(database)}});
  assert.equal(response.status,201);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM product_events WHERE id='old'").get().count,0);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM product_events').get().count,1);
  database.close();
});
