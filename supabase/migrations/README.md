# Database migrations

Name migrations with an ordered UTC timestamp and a short description, for example:

```text
20260929190000_create_organizations.sql
```

Each migration must be forward-applicable, reviewed together with its RLS policies, and safe for an existing environment. Never place production exports or credentials in this directory.
