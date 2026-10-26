// node:sqlite treats SQLite's ?NNN parameters as named bindings on Node 22.
// D1 bind(...values) instead addresses them by their one-based parameter index.
// Keep the SQL unchanged: repeated and reordered parameters must retain D1 semantics.
export function sqliteD1(database,sql,method,values=[]){
  const indexes=new Set();
  let anonymous=false;
  // Skip SQL literals, quoted identifiers and comments before reading parameters.
  const tokens=sql.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|--[^\r\n]*|\/\*[\s\S]*?\*\/|\?\d*|[^'"`[?/-]+|./g) || [];
  for(const token of tokens){
    if(token==='?') anonymous=true;
    else if(/^\?\d+$/.test(token)) indexes.add(Number(token.slice(1)));
  }
  if(!indexes.size) return database.prepare(sql)[method](...values);
  if(anonymous) throw new Error('Test D1 adapter requires consistent numbered or anonymous parameters.');
  const bindings={};
  for(const index of indexes){
    if(index<1 || index>values.length) throw new RangeError(`Missing D1 binding ?${index}`);
    bindings[`?${index}`]=values[index-1];
  }
  return database.prepare(sql)[method](bindings);
}
