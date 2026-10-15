import { fail } from './money.ts';
export type Capabilities={authorization:'demo-consent'|'unverified';pagination:boolean;incremental:boolean;balances:boolean;events:boolean;remoteRevocation:boolean};
export type SourceTransaction={id:string;amount:string;currency:string;direction:'credit'|'debit';status:'pending'|'booked'|'reversed';narration:string;counterparty?:string;bookedAt?:string;sourceAt?:string;reversalOf?:string};
export interface Provider {
 capabilities:Capabilities;
 authorization():{method:string;scopes:string[]};
 accounts():Promise<{id:string;currency:string}[]>;
 transactions(input:{accountId:string;checkpoint:string|null;scenario:string;attempt:number}):Promise<{records:SourceTransaction[];next:string|null;dataThrough:string|null}>;
 balances():Promise<{amount:string;currency:string;type:string;sourceAt:string}[]>;
 status():Promise<string>;
 disconnect():Promise<{remoteRevoked:boolean}>;
 verifyEvent(request:Request):Promise<never>;
}
export class TransientError extends Error{retryAfter:number;constructor(seconds=1){super('PROVIDER_TEMPORARY');this.retryAfter=seconds}}
export const demoRecords:SourceTransaction[]=[
{id:'demo-001',amount:'12450.00',currency:'USD',direction:'credit',status:'booked',narration:'NORTHSTAR STUDIO / INV NS-0926 / CLIENT SETTLEMENT',counterparty:'Northstar Studio',bookedAt:'2026-09-25',sourceAt:'2026-09-25T12:00:00Z'},
{id:'demo-002',amount:'2800.00',currency:'USD',direction:'debit',status:'booked',narration:'ATLAS WORKSPACE / OFFICE LEASE SEPTEMBER',counterparty:'Atlas Workspace',bookedAt:'2026-09-24',sourceAt:'2026-09-24T10:00:00Z'},
{id:'demo-003',amount:'249.00',currency:'USD',direction:'debit',status:'booked',narration:'CLOUDLINE SYSTEMS / SOFTWARE SUBSCRIPTION',counterparty:'Cloudline Systems',bookedAt:'2026-09-23',sourceAt:'2026-09-23T10:00:00Z'},
{id:'demo-004',amount:'6200.00',currency:'USD',direction:'credit',status:'booked',narration:'MERIDIAN PARTNERS / MP-1042',counterparty:'Meridian Partners',bookedAt:'2026-09-22',sourceAt:'2026-09-22T10:00:00Z'},
{id:'demo-005',amount:'480.50',currency:'USD',direction:'debit',status:'pending',narration:'CARD AUTHORIZATION / SUPPLIES',counterparty:'Paper & Form',sourceAt:'2026-09-26T09:00:00Z'},
{id:'demo-006',amount:'86.40',currency:'USD',direction:'debit',status:'booked',narration:'BANK SERVICE CHARGE',bookedAt:'2026-09-20',sourceAt:'2026-09-20T10:00:00Z'},
{id:'demo-007',amount:'1200.00',currency:'USD',direction:'debit',status:'booked',narration:'STUDIO EQUIPMENT / PART PAYMENT',counterparty:'Forma Supply',bookedAt:'2026-09-19',sourceAt:'2026-09-19T10:00:00Z'},
{id:'demo-008',amount:'940.00',currency:'USD',direction:'credit',status:'booked',narration:'DESIGN RETAINER / SEPTEMBER',counterparty:'Olive Collective',bookedAt:'2026-09-18',sourceAt:'2026-09-18T10:00:00Z'}];
export class MockProvider implements Provider {
 capabilities:Capabilities={authorization:'demo-consent',pagination:true,incremental:false,balances:true,events:false,remoteRevocation:false};
 authorization(){return {method:'Explicit synthetic authorization; no bank mandate',scopes:['accounts:read','transactions:read','balances:read']}}
 async accounts(){return [{id:'operating',currency:'USD'}]}
 async transactions({checkpoint,scenario,attempt}:Parameters<Provider['transactions']>[0]){
  const offset=checkpoint?Number(checkpoint):0;if(!Number.isInteger(offset)||offset<0||offset>100)fail(400,'Invalid demo checkpoint');
  if(scenario==='retry'&&offset===3&&attempt===1)throw new TransientError(1);
  const records=structuredClone(demoRecords);
  if(scenario==='updated'||scenario==='reversal'){records[4]={...records[4],status:'booked',bookedAt:'2026-09-27',amount:'475.50',sourceAt:'2026-09-27T11:00:00Z'};}
  if(scenario==='reversal'){records[6]={...records[6],status:'reversed',sourceAt:'2026-09-28T10:00:00Z'};records.push({id:'demo-009',amount:'1200.00',currency:'USD',direction:'credit',status:'booked',narration:'REVERSAL / STUDIO EQUIPMENT',counterparty:'Forma Supply',bookedAt:'2026-09-28',sourceAt:'2026-09-28T10:00:00Z',reversalOf:'demo-007'});}
  const chunk=records.slice(offset,offset+3);
  return {records:scenario==='duplicate'?[...chunk,...chunk]:chunk,next:offset+3<records.length?String(offset+3):null,dataThrough:scenario==='reversal'?'2026-09-28T10:00:00Z':scenario==='updated'?'2026-09-27T11:00:00Z':'2026-09-26T09:00:00Z'};
 }
 async balances(){return [{amount:'28450.65',currency:'USD',type:'provider reported booked (synthetic)',sourceAt:'2026-09-26T09:00:00Z'}]}
 async status(){return 'connected'}
 async disconnect(){return {remoteRevoked:false}}
 async verifyEvent(_request:Request):Promise<never>{return fail(501,'Provider events are unsupported')}
}
export interface SecretStore{resolve(reference:string):Promise<string>}
export class DisabledSecretStore implements SecretStore{async resolve(_reference:string):Promise<string>{return fail(503,'Production secrets manager is not configured')}}
export class UnverifiedProvider implements Provider{
 capabilities:Capabilities={authorization:'unverified',pagination:false,incremental:false,balances:false,events:false,remoteRevocation:false};
 private disabled():never{return fail(503,'Real provider integration is unverified and disabled')}
 authorization():never{return this.disabled()}
 async accounts():Promise<never>{return this.disabled()}
 async transactions(_input:Parameters<Provider['transactions']>[0]):Promise<never>{return this.disabled()}
 async balances():Promise<never>{return this.disabled()}
 async status(){return 'unverified'}
 async disconnect():Promise<never>{return this.disabled()}
 async verifyEvent(_request:Request):Promise<never>{return this.disabled()}
}
export function provider(name:string):Provider {if(name==='mock')return new MockProvider();return new UnverifiedProvider();}

