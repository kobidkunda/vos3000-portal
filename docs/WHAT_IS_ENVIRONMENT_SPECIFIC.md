# Environment-specific items not guessed by this repository

The supplied materials do not prove a universal official VOS REST contract for every visible VOS3000 client action. Therefore these items require deployment-specific confirmation:

1. Exact VOS base URL/protocol and authentication mechanism.
2. Exact endpoint/parameters for each write operation.
3. Uniqueness scope of CDR serial number across multiple VOS instances/time periods.
4. Outbound CDR callback payload shape and acknowledgement/retry behavior on your licensed build.
5. Online/offline event feed details on your build.
6. Payment provider selected by your business.
7. SMTP/SMS provider and notification policy.
8. Production HA node count and retention according to measured traffic.

The app runs in mock mode until these are configured. Unsupported VOS writes fail closed instead of silently changing database tables.

> For the concrete host steps (server.conf, e_web_access_control, Tomcat 7391, GUI user admin) see [`VOS3000_SERVER_SETUP.md`](VOS3000_SERVER_SETUP.md).
