import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {migrateAuth} from '../scripts/migrate-auth-local.mjs';

test('auth migration preserves existing sample records and can be rerun',()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_faulty_ikaris.sql','utf8'));
 db.prepare('INSERT INTO users(id,email) VALUES(?,?)').run('existing','existing@example.test');
 assert.equal(migrateAuth(db).applied,true);assert.equal(migrateAuth(db).applied,false);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name IN ('auth_attempts','auth_sessions','workspace_onboarding','auth_rate_limits')").get().n,4);db.close();
});
test('auth migration rejects partial or unknown schema without modifying data',()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_faulty_ikaris.sql','utf8'));db.exec('CREATE TABLE auth_attempts(unexpected TEXT)');
 assert.throws(()=>migrateAuth(db),/Untracked/);assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='auth_sessions'").get().n,0);db.close();
});
