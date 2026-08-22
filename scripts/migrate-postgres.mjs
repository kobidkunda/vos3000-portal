import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
const {Client}=pg;
const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is required");
const client=new Client({connectionString:url});await client.connect();
try{
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const dir=path.resolve("infra/postgres/migrations");
  for(const name of (await fs.readdir(dir)).filter(x=>x.endsWith(".sql")).sort()){
    const done=await client.query("SELECT 1 FROM schema_migrations WHERE version=$1",[name]);if(done.rowCount)continue;
    const sql=await fs.readFile(path.join(dir,name),"utf8");
    console.log(`Applying ${name}`);await client.query("BEGIN");try{await client.query(sql);await client.query("INSERT INTO schema_migrations(version) VALUES($1)",[name]);await client.query("COMMIT")}catch(e){await client.query("ROLLBACK");throw e}
  }
  console.log("PostgreSQL migrations complete");
}finally{await client.end()}
