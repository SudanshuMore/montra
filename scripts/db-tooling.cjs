// Sandboxed Windows may not expose the OS account record. tsx uses only uid for its temp directory.
const os = require('node:os'); const original=os.userInfo;
os.userInfo=(...args)=>{try{return original(...args)}catch(e){if(e.code!=='ERR_SYSTEM_ERROR')throw e;return {uid:-1,gid:-1,username:'sandbox',homedir:os.homedir(),shell:null}}};

