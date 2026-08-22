# P10 — Gateway, Rate, Package & Routing Configuration Workflows — UI Template Bundle

Pages: **34**

- **Admin · Customer Packages** — `/admin/customers/{customerId}/packages` — `04_ADMIN_PAGES/014_customer-packages.md`
- **Admin · Mapping Gateways** — `/admin/gateways/mapping` — `04_ADMIN_PAGES/018_mapping-gateways.md`
- **Admin · Mapping Gateway Detail** — `/admin/gateways/mapping/{gatewayId}` — `04_ADMIN_PAGES/019_mapping-gateway-detail.md`
- **Admin · Routing Gateways** — `/admin/gateways/routing` — `04_ADMIN_PAGES/020_routing-gateways.md`
- **Admin · Routing Gateway Detail** — `/admin/gateways/routing/{gatewayId}` — `04_ADMIN_PAGES/021_routing-gateway-detail.md`
- **Admin · Online Gateways** — `/admin/gateways/online` — `04_ADMIN_PAGES/022_online-gateways.md`
- **Admin · Gateway Network Quality** — `/admin/gateways/network` — `04_ADMIN_PAGES/023_gateway-network-quality.md`
- **Admin · Gateway Groups** — `/admin/gateway-groups` — `04_ADMIN_PAGES/025_gateway-groups.md`
- **Admin · Registration Management** — `/admin/registrations` — `04_ADMIN_PAGES/026_registration-management.md`
- **Admin · Routing Analysis** — `/admin/tools/routing-analysis` — `04_ADMIN_PAGES/027_routing-analysis.md`
- **Admin · Network Test** — `/admin/tools/network-test` — `04_ADMIN_PAGES/028_network-test.md`
- **Admin · Domain Management** — `/admin/routing/domains` — `04_ADMIN_PAGES/029_domain-management.md`
- **Admin · Prohibited Media IP** — `/admin/routing/prohibited-media-ips` — `04_ADMIN_PAGES/030_prohibited-media-ip.md`
- **Admin · Softswitches** — `/admin/softswitches` — `04_ADMIN_PAGES/031_softswitches.md`
- **Admin · Phone Directory** — `/admin/phones` — `04_ADMIN_PAGES/032_phone-directory.md`
- **Admin · Phone Detail** — `/admin/phones/{phoneId}` — `04_ADMIN_PAGES/033_phone-detail.md`
- **Admin · Online Phones** — `/admin/phones/online` — `04_ADMIN_PAGES/034_online-phones.md`
- **Admin · Rate Groups** — `/admin/rates/groups` — `04_ADMIN_PAGES/048_rate-groups.md`
- **Admin · Rate Editor** — `/admin/rates/groups/{groupId}` — `04_ADMIN_PAGES/049_rate-editor.md`
- **Admin · Rate Import Jobs** — `/admin/rates/imports` — `04_ADMIN_PAGES/050_rate-import-jobs.md`
- **Admin · Rate Lookup** — `/admin/rates/lookup` — `04_ADMIN_PAGES/051_rate-lookup.md`
- **Admin · Package Groups** — `/admin/packages` — `04_ADMIN_PAGES/052_package-groups.md`
- **Admin · Package Period Rates** — `/admin/packages/{packageId}/period-rates` — `04_ADMIN_PAGES/053_package-period-rates.md`
- **Admin · Package Free Duration** — `/admin/packages/{packageId}/free-duration` — `04_ADMIN_PAGES/054_package-free-duration.md`
- **Admin · Gateway Analysis Reports** — `/admin/reports/gateways` — `04_ADMIN_PAGES/064_gateway-analysis-reports.md`
- **Admin · Number Sections** — `/admin/numbers/sections` — `04_ADMIN_PAGES/067_number-sections.md`
- **Admin · Area Information** — `/admin/numbers/areas` — `04_ADMIN_PAGES/068_area-information.md`
- **Admin · Number Transform** — `/admin/numbers/transforms` — `04_ADMIN_PAGES/069_number-transform.md`
- **Admin · Black / White List Groups** — `/admin/numbers/lists` — `04_ADMIN_PAGES/070_black-white-list-groups.md`
- **Admin · System White List** — `/admin/numbers/system-whitelist` — `04_ADMIN_PAGES/071_system-white-list.md`
- **Admin · Dynamic Black List** — `/admin/numbers/dynamic-blacklist` — `04_ADMIN_PAGES/072_dynamic-black-list.md`
- **Client · Gateway IP Management** — `/app/gateways/{gatewayId}/ips` — `05_CLIENT_PAGES/022_gateway-ip-management.md`
- **Client · SIP Credentials** — `/app/gateways/{gatewayId}/credentials` — `05_CLIENT_PAGES/023_sip-credentials.md`
- **Client · Rate Change History** — `/app/rates/history` — `05_CLIENT_PAGES/028_rate-change-history.md`

## Phase UI Gate

- All listed page API contracts available or explicitly mocked against frozen schemas.
- Required roles/permissions implemented.
- Source requirements have test IDs.
- Loading/empty/error/degraded states implemented.
- Design tokens and archetypes used consistently.
- Integration/VOS capabilities verified before enabling writes.