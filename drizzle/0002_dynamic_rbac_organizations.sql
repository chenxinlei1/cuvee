CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY,
  "name" text NOT NULL,
  "type" "organization_type" NOT NULL,
  "created_at" bigint NOT NULL,
  UNIQUE("type", "name")
);
CREATE TABLE "access_roles" (
  "id" uuid PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "system" boolean NOT NULL DEFAULT false,
  "created_at" bigint NOT NULL
);
CREATE TABLE "permissions" ("key" text PRIMARY KEY, "description" text NOT NULL);
CREATE TABLE "role_permissions" (
  "role_id" uuid NOT NULL REFERENCES "access_roles"("id") ON DELETE CASCADE,
  "permission_key" text NOT NULL REFERENCES "permissions"("key") ON DELETE CASCADE,
  PRIMARY KEY("role_id", "permission_key")
);
CREATE TABLE "organization_members" (
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" bigint NOT NULL,
  PRIMARY KEY("organization_id", "user_id"),
  UNIQUE("user_id")
);
CREATE TABLE "user_roles" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role_id" uuid NOT NULL REFERENCES "access_roles"("id") ON DELETE CASCADE,
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "created_at" bigint NOT NULL,
  PRIMARY KEY("user_id", "role_id")
);

ALTER TABLE "reports" ADD COLUMN "organization_id" uuid REFERENCES "organizations"("id");
ALTER TABLE "documents" ADD COLUMN "organization_id" uuid REFERENCES "organizations"("id");
CREATE INDEX "idx_reports_organization_time" ON "reports"("organization_id", "created_at");
CREATE INDEX "idx_documents_organization_time" ON "documents"("organization_id", "created_at");

INSERT INTO organizations(id,name,type,created_at)
SELECT (substr(md5(organization_type::text||'::'||organization_name),1,8)||'-'||substr(md5(organization_type::text||'::'||organization_name),9,4)||'-4'||substr(md5(organization_type::text||'::'||organization_name),14,3)||'-a'||substr(md5(organization_type::text||'::'||organization_name),18,3)||'-'||substr(md5(organization_type::text||'::'||organization_name),21,12))::uuid,
       organization_name,organization_type,min(created_at)
FROM users WHERE organization_type IS NOT NULL AND organization_name IS NOT NULL
GROUP BY organization_type,organization_name;

INSERT INTO access_roles(id,key,name,system,created_at) VALUES
('10000000-0000-4000-a000-000000000001','platformAdmin','平台超级管理员',true,extract(epoch from now())*1000),
('10000000-0000-4000-a000-000000000002','wineryAdmin','酒庄管理员',true,extract(epoch from now())*1000),
('10000000-0000-4000-a000-000000000003','wineryStaff','酒庄操作员',true,extract(epoch from now())*1000),
('10000000-0000-4000-a000-000000000004','buyerAdmin','商超 / 酒商管理员',true,extract(epoch from now())*1000),
('10000000-0000-4000-a000-000000000005','buyerStaff','采购员',true,extract(epoch from now())*1000);

INSERT INTO permissions(key,description) VALUES
('analysis:run','运行分析'),('workspace:vineyard','访问葡萄园工作区'),('workspace:trade','访问贸易工作区'),
('report:read','读取授权报告'),('report:read:any','读取所有组织报告'),('report:manage','管理本组织报告'),
('document:manage','管理本组织文档'),('document:read:any','读取所有组织文档'),
('user:manage','管理全部用户'),('user:manage:organization','管理本组织成员'),('role:manage','管理角色权限');

INSERT INTO role_permissions(role_id,permission_key)
SELECT r.id,p.key FROM access_roles r JOIN permissions p ON
  r.key='platformAdmin' OR
  (r.key='wineryAdmin' AND p.key IN('analysis:run','workspace:vineyard','report:read','report:manage','document:manage','user:manage:organization')) OR
  (r.key='wineryStaff' AND p.key IN('analysis:run','workspace:vineyard','report:read','document:manage')) OR
  (r.key='buyerAdmin' AND p.key IN('analysis:run','workspace:trade','report:read','report:manage','user:manage:organization')) OR
  (r.key='buyerStaff' AND p.key IN('analysis:run','workspace:trade','report:read'));

INSERT INTO organization_members(organization_id,user_id,created_at)
SELECT o.id,u.id,u.created_at FROM users u JOIN organizations o ON o.type=u.organization_type AND o.name=u.organization_name;
INSERT INTO user_roles(user_id,role_id,organization_id,created_at)
SELECT u.id,r.id,om.organization_id,u.created_at FROM users u JOIN access_roles r ON r.key=u.role::text LEFT JOIN organization_members om ON om.user_id=u.id;
UPDATE report_grants g SET target_value=o.id::text
FROM organizations o
WHERE g.target_kind='organization' AND g.target_value=(o.type::text||'::'||o.name);
UPDATE reports r SET organization_id=om.organization_id FROM organization_members om WHERE om.user_id=r.owner_id;
UPDATE documents d SET organization_id=om.organization_id FROM organization_members om WHERE om.user_id=d.owner_id;
ALTER TABLE reports ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN organization_id SET NOT NULL;
