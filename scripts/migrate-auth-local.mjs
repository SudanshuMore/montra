// Add only the email-login schema to an existing local synthetic database.
// No remote database, account data or existing application tables are modified.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sql=readFileSync(resolve(root,'drizzle/0001_email_sessions.sql'),'utf8').replaceAll('\r\n','\n');
const names=['auth_attempts','auth_sessions','workspace_onboarding','auth_rate_limits'];
export function migrateAuth(db){
 const digest=createHash('sha256').update(sql).digest('hex');
 db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
 try{
  db.exec('CREATE TABLE IF NOT EXISTS montra_local_migrations(name TEXT PRIMARY KEY,sha256 TEXT NOT NULL)');
  const previous=db.prepare('SELECT sha256 FROM montra_local_migrations WHERE name=?').get('0001_email_sessions');
  if(previous){if(previous.sha256!==digest)throw new Error('Auth migration changed after application; preserve database and review.');db.exec('COMMIT');return {applied:false};}
  const existing=names.filter(name=>db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
  if(existing.length)throw new Error('Untracked auth tables found; preserve database and review before migration.');
  if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='organizations'").get())throw new Error('Initialize the local sample workspace database first.');
  db.exec(sql);
  db.prepare('INSERT INTO montra_local_migrations(name,sha256) VALUES(?,?)').run('0001_email_sessions',digest);
  db.exec('COMMIT');return {applied:true};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const folder=resolve(root,'.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
 if(!existsSync(folder))throw new Error('Start the local preview and initialize its sample database first.');
 const candidates=[];
 for(const file of readdirSync(folder).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite')){
  const path=resolve(folder,file),db=new DatabaseSync(path,{readOnly:true});
  try{if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='organizations'").get())candidates.push(path);}finally{db.close();}
 }
 if(candidates.length!==1)throw new Error('Expected exactly one local Montra database; no migration applied.');
 const db=new DatabaseSync(candidates[0]);
 try{console.log(migrateAuth(db).applied?'Email-login schema added. Existing sample records preserved.':'Email-login schema already applied.');}finally{db.close();}
}
