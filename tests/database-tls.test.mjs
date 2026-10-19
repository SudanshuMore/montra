import {test} from 'node:test';
import assert from 'node:assert/strict';
import {X509Certificate} from 'node:crypto';
import {databaseTls} from '../montra/database-tls.mjs';

test('database TLS verifies the server using the official Supabase root',()=>{
 const cert=new X509Certificate(databaseTls.ca);
 assert.equal(databaseTls.rejectUnauthorized,true);
 assert.equal(cert.ca,true);
 assert.equal(cert.fingerprint256,'80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
 assert.ok(new Date(cert.validTo)>new Date(),'Renew the database CA before it expires');
});
