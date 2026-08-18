import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { Pool, type PoolClient } from "pg";

type Role = "platformAdmin" | "wineryAdmin" | "wineryStaff" | "buyerAdmin" | "buyerStaff";
type OrganizationType = "chateau" | "negociant" | "distributor" | "buyer";

interface DemoAccount {
  email: string;
  name: string;
  password: string;
  role: Role;
  organizationType: OrganizationType;
  organizationName: string;
}

const accounts: DemoAccount[] = [
  {
    email: "peradmin@cuvee.demo",
    name: "Platform Admin",
    password: "cuvee-platform-2024",
    role: "platformAdmin",
    organizationType: "buyer",
    organizationName: "Cuvée Platform",
  },
  {
    email: "winery-admin@cuvee.demo",
    name: "Winery Admin",
    password: "cuvee-winery-2024",
    role: "wineryAdmin",
    organizationType: "chateau",
    organizationName: "Demo Château",
  },
  {
    email: "winery-staff@cuvee.demo",
    name: "Winery Staff",
    password: "cuvee-cellar-2024",
    role: "wineryStaff",
    organizationType: "chateau",
    organizationName: "Demo Château",
  },
  {
    email: "buyer-admin@cuvee.demo",
    name: "Buyer Admin",
    password: "cuvee-buyer-admin-2024",
    role: "buyerAdmin",
    organizationType: "buyer",
    organizationName: "Demo Buyer Group",
  },
  {
    email: "buyer-staff@cuvee.demo",
    name: "Buyer Staff",
    password: "cuvee-buyer-staff-2024",
    role: "buyerStaff",
    organizationType: "buyer",
    organizationName: "Demo Buyer Group",
  },
];

function passwordHash(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function upsertDemoAccount(client: PoolClient, account: DemoAccount) {
  const now = Date.now();
  const organization = await client.query<{ id: string }>(
    `INSERT INTO organizations(id,name,type,created_at)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(type,name) DO UPDATE SET name=excluded.name
     RETURNING id`,
    [randomUUID(), account.organizationName, account.organizationType, now],
  );
  const organizationId = organization.rows[0]?.id;
  if (!organizationId) throw new Error(`Organization not found for ${account.email}`);

  const existing = await client.query<{ id: string }>(
    "SELECT id FROM users WHERE lower(email)=lower($1)",
    [account.email],
  );
  const userId = existing.rows[0]?.id ?? randomUUID();

  if (existing.rows[0]) {
    await client.query(
      `UPDATE users
       SET name=$2,password_hash=$3,role=$4,status='active',organization_type=$5,
           organization_name=$6,email_verified_at=$7
       WHERE id=$1`,
      [
        userId,
        account.name,
        passwordHash(account.password),
        account.role,
        account.organizationType,
        account.organizationName,
        now,
      ],
    );
  } else {
    await client.query(
      `INSERT INTO users(id,email,name,password_hash,role,status,organization_type,
                         organization_name,created_at,email_verified_at)
       VALUES($1,$2,$3,$4,$5,'active',$6,$7,$8,$8)`,
      [
        userId,
        account.email,
        account.name,
        passwordHash(account.password),
        account.role,
        account.organizationType,
        account.organizationName,
        now,
      ],
    );
  }

  await client.query("DELETE FROM organization_members WHERE user_id=$1", [userId]);
  await client.query(
    "INSERT INTO organization_members(organization_id,user_id,created_at) VALUES($1,$2,$3)",
    [organizationId, userId, now],
  );
  await client.query("DELETE FROM user_roles WHERE user_id=$1", [userId]);
  await client.query(
    `INSERT INTO user_roles(user_id,role_id,organization_id,created_at)
     SELECT $1,id,$2,$3 FROM access_roles WHERE key=$4`,
    [userId, organizationId, now, account.role],
  );
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const account of accounts) await upsertDemoAccount(client, account);
    await client.query("COMMIT");
    console.table(
      accounts.map(({ email, password, role }) => ({
        email,
        password,
        role,
        status: "active",
      })),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
