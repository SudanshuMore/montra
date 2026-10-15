# Connector decision: India first, global architecture

User decision (2026-10-03): start with Indian banks, but keep Montra open to providers in other countries. 'Connect pay' means a bank connectivity platform, not taking payments.

Recommendation: evaluate Setu's AA sandbox first for the consent/data journey, while verifying production eligibility and corporate-current-account coverage. AA is not a plug-and-play production entitlement for an ordinary SaaS: the data-consuming FIU must meet the applicable eligibility rules. A partner route, if proposed, must explicitly permit Montra's business and data use; a partnership alone is not assumed sufficient. Sources: https://docs.setu.co/data/account-aggregator/v1/overview and https://sahamati.org.in/faq/

For the first actual corporate account, also investigate that bank's own API access through the authorized company. ICICI documents corporate API banking, but the bank, account product, statement endpoints and commercial approval still need verification: https://www.icicibank.com/corporate/transact/online-platform/corporate-api-suite

Keep the existing common provider interface. Add regional adapters only after verifying their documented capabilities and bank coverage. Do not promise that one connector supports every bank worldwide.

The pilot needs account-information access: list authorized corporate accounts, read transactions with stable identifiers and pagination, and fetch balances where available. Receiving or initiating payments is a different scope.

Provide:
1. Country of the bank and registered company.
2. Exact bank name, business banking product/account type, and currencies. No account number required at this stage.
3. Whether 'connect pay' means ConnectPay at connectpay.com, Plaid, another vendor, or payment processing.
4. Whether the first account belongs to your company or a customer, and whether an authorized company representative can approve access.
5. Any existing provider account, sandbox access, public documentation link or vendor contact. Do not paste credentials.
6. Desired refresh frequency/history and a rough pilot budget.

Candidates to investigate, not confirmed eligibility:
- ConnectPay: its PSD2 documentation concerns third-party access to ConnectPay account information and states TPP registration/certificate prerequisites. It does not establish universal aggregation of unrelated banks. https://docs.connectpay.com/open-banking-psd2-apis/
- UK/European business accounts: Yapily documents business-account data connectivity; confirm the exact bank, account product and commercial access model. https://www.yapily.com/blog/open-banking-for-business-accounts
- US/Canada: Plaid publishes Transactions coverage by institution, including business-bank entries. Exact account support and production eligibility still need verification. https://plaid.com/docs/institutions/
- India: evaluate direct corporate-bank access and the applicable Account Aggregator provider/partner route. Setu describes consented financial-data access; this does not establish Montra's eligibility or corporate-current-account coverage. https://setu.co/data/financial-data-apis/account-aggregator/

Research checked 2026-10-03. No vendor selected, no real endpoints implemented, no production eligibility claimed. Next gate: verify one target bank/account, then implement that provider's documented sandbox flow and reconcile imported data against an authorized statement.
