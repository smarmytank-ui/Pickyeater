import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { sqliteD1 } from './helpers/sqlite-d1.mjs';

test('D1 adapter retains repeated and reordered numbered bindings',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    const row=sqliteD1(db,'SELECT ?2 AS second, ?1 AS first, ?2 AS repeated','get',['one','two']);
    assert.deepEqual({...row},{second:'two',first:'one',repeated:'two'});
    assert.equal(sqliteD1(db,'SELECT ?3 AS value','get',['unused','unused','three']).value,'three');
  }finally{db.close();}
});

test('D1 adapter ignores placeholder-looking text and supports run/all and anonymous bindings',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    db.exec('CREATE TABLE items (id INTEGER, label TEXT)');
    sqliteD1(db,'INSERT INTO items VALUES (?2,?1)','run',['label',7]);
    assert.deepEqual(sqliteD1(db,"SELECT id, label, '?99' AS literal FROM items WHERE id=?1 /* ?88 */ -- ?77\n",'all',[7]).map(row=>({...row})),[{id:7,label:'label',literal:'?99'}]);
    assert.equal(sqliteD1(db,'SELECT ? AS value','get',['anonymous']).value,'anonymous');
    assert.throws(()=>sqliteD1(db,'SELECT ?2','get',['one']),/Missing D1 binding/);
  }finally{db.close();}
});
