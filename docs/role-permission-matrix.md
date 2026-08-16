# Role Permission Matrix

This document is the human-readable companion to `src/lib/auth/types.ts`.
Keep it in sync with the source of truth whenever roles or permissions change.

## Roles

| Role key | Display name | Typical owner | Default landing |
|---|---|---|---|
| `platformAdmin` | 平台超级管理员 | Platform / system operator | `/admin` |
| `wineryAdmin` | 酒庄管理员 | A winery organization | `/vineyard` |
| `wineryStaff` | 酒庄操作员 | A winery organization | `/vineyard` |
| `buyerAdmin` | 商超 / 酒商管理员 | A buyer organization | `/trade` |
| `buyerStaff` | 采购员 | A buyer organization | `/trade` |

## Permissions

| Permission | Meaning |
|---|---|
| `analysis:run` | Run the analysis pipeline |
| `report:read` | Read reports you are allowed to access |
| `report:read:any` | Read any report in the workspace |
| `report:manage` | Manage report visibility and grants |
| `document:manage` | Upload, edit, and remove documents |
| `document:read:any` | Read any document in the workspace |
| `user:manage` | Create users, edit roles, and manage access |

## Access Matrix

| Role key | Permissions |
|---|---|
| `platformAdmin` | `analysis:run`, `report:read`, `report:read:any`, `report:manage`, `document:manage`, `document:read:any`, `user:manage` |
| `wineryAdmin` | `analysis:run`, `report:read`, `report:manage`, `document:manage` |
| `wineryStaff` | `analysis:run`, `report:read`, `document:manage` |
| `buyerAdmin` | `report:read` |
| `buyerStaff` | `report:read` |

## Notes

- `platformAdmin` is the only role with `user:manage`, so it is the only role that can open `/admin`.
- `wineryAdmin` and `wineryStaff` can run analysis because they operate on the winery side of the workflow.
- `buyerAdmin` and `buyerStaff` are read-focused roles. They can access shared reports, but they do not run analysis.
- `buyerStaff` is also the default role for self-registration.
- The code still contains a compatibility migration for old role values (`admin`, `analyst`, `viewer`) so existing local SQLite data keeps working.
