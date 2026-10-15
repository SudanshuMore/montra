export const scales:Record<string,number>={USD:2,EUR:2,GBP:2,INR:2,JPY:0,KWD:3};
export class AppError extends Error { status:number; constructor(status:number,message:string){super(message);this.status=status;} }
export function fail(status:number,message:string):never{throw new AppError(status,message)}
export function money(value:unknown,currency:unknown){if(typeof currency!=='string'||!Object.hasOwn(scales,currency))fail(400,'Unsupported currency');if(typeof value!=='string'||!/^\d{1,13}(\.\d{1,3})?$/.test(value))fail(400,'Use an unsigned decimal amount');const scale=scales[currency], [whole,fraction='']=value.split('.');if(fraction.length>scale)fail(400,'Too many decimal places');const units=BigInt(whole)*10n**BigInt(scale)+BigInt(fraction.padEnd(scale,'0')||'0');if(units>9000000000000n)fail(400,'Amount exceeds pilot limit');return {units:Number(units),amount:BigInt(whole).toString()+(scale?'.'+fraction.padEnd(scale,'0'):''),currency};}
export function decimal(units:bigint|number,currency:string){const scale=scales[currency];if(scale===undefined)fail(400,'Unsupported currency');let n=BigInt(units),sign=n<0?'-':'';if(n<0)n=-n;const s=n.toString().padStart(scale+1,'0');return sign+(scale?s.slice(0,-scale)+'.'+s.slice(-scale):s);}
export function validDate(x:unknown){if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))fail(400,'Use a valid YYYY-MM-DD date');const date=new Date(x);if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==x)fail(400,'Use a valid YYYY-MM-DD date');return x;}
export const now=()=>new Date().toISOString();
export const uid=()=>crypto.randomUUID();
export async function hash(text:string|ArrayBuffer){const digest=await crypto.subtle.digest('SHA-256',typeof text==='string'?new TextEncoder().encode(text):text);return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');}

