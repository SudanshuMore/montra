// Server-owned facts, not a self-attested approval form. Changing this report
// never enables a provider: providers.ts and access.ts remain fail-closed.
export function integrationReadiness() {
 return {
  mode:'synthetic', liveEnabled:false, sandboxConnected:false,
  provider:null, sdk:null, reviewedAt:'2026-10-16',
  items:[
   {id:'eligibility',title:'Eligible operator',status:'blocked',detail:'Montra has no declared financial-sector registration. Establish an eligible FIU or a legally reviewed service arrangement with one; a TSP subscription does not confer eligibility.'},
   {id:'coverage',title:'SBI Card coverage',status:'unconfirmed',detail:'SBI Cashback credit-card transaction history is not verified. SBI deposit-account coverage is insufficient.'},
   {id:'sandbox',title:'Provider sandbox',status:'not_connected',detail:'Select a provider, obtain permitted test access and confirm the current API version before integration.'},
   {id:'sdk',title:'API or SDK integration',status:'not_selected',detail:'Use the selected provider’s documented REST API or verified official SDK. No banking SDK is installed or approved.'},
   {id:'certification',title:'Certification and security assessment',status:'pending',detail:'Agree conformance certification and application security audit scope with the FIU, TSP and applicable regulator. No certification is claimed.'},
   {id:'storage',title:'Production identity and data governance',status:'pending',detail:'Email-link login code and session tests are implemented; provider configuration and real-email acceptance are pending. Protected production storage, consent-bound processing, key custody, retention, deletion and incident response still need review.'}
  ]
 };
}
