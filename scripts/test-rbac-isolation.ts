import dotenv from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { canAccessTrade, canAccessVineyard, type AuthUser, type Permission, type Role } from "../src/lib/auth/types";
import { closeDatabase, listReports } from "../src/lib/auth/db";

dotenv.config({path:".env.local"});

async function main(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is required");
const pool=new Pool({connectionString:url});const fixtureIds:string[]=[];try{
  const users=(await pool.query<{id:string;email:string;role:Role;organization_id:string;organization_type:AuthUser["organizationType"];organization_name:string;permissions:string[]}>(`SELECT u.id,u.email,ar.key role,o.id organization_id,o.type organization_type,o.name organization_name,ARRAY_REMOVE(ARRAY_AGG(DISTINCT rp.permission_key),NULL) permissions FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN access_roles ar ON ar.id=ur.role_id JOIN organizations o ON o.id=ur.organization_id LEFT JOIN role_permissions rp ON rp.role_id=ar.id WHERE u.status='active' GROUP BY u.id,ar.key,o.id`)).rows;
  assert(users.length>0,"active users must have RBAC assignments");
  for(const row of users){const user:AuthUser={id:row.id,email:row.email,name:row.email,role:row.role,organizationId:row.organization_id,organizationType:row.organization_type,organizationName:row.organization_name,permissions:row.permissions as Permission[]};if(user.role!=="platformAdmin")assert.notEqual(canAccessVineyard(user)&&canAccessTrade(user),true,`${user.email} must not access both workspaces`);}
  const unscopedReports=Number((await pool.query<{count:string}>("SELECT count(*) count FROM reports WHERE organization_id IS NULL")).rows[0]?.count??0);
  const unscopedDocuments=Number((await pool.query<{count:string}>("SELECT count(*) count FROM documents WHERE organization_id IS NULL")).rows[0]?.count??0);
  assert.equal(unscopedReports,0,"all reports must be organization scoped");assert.equal(unscopedDocuments,0,"all documents must be organization scoped");
  const scopedUsers=users.filter(user=>user.role!=="platformAdmin");const first=scopedUsers[0],second=scopedUsers.find(user=>user.organization_id!==first?.organization_id);assert(first&&second,"two organizations are required for isolation test");
  for(const [index,user] of [first,second].entries()){const id=randomUUID();fixtureIds.push(id);await pool.query(`INSERT INTO reports(id,owner_id,organization_id,region_id,region_name,vintage,risk_score,result_json,generated_at,created_at,updated_at,visibility) VALUES($1,$2,$3,'rbac-test','RBAC Test','2099',1,$4,$5,$6,$6,'workspace')`,[id,user.id,user.organization_id,{},`rbac-${id}`,Date.now()+index]);}
  const asUser=(row:typeof first):AuthUser=>({id:row.id,email:row.email,name:row.email,role:row.role,organizationId:row.organization_id,organizationType:row.organization_type,organizationName:row.organization_name,permissions:row.permissions as Permission[]});
  const firstVisible=await listReports(asUser(first)),secondVisible=await listReports(asUser(second));assert(firstVisible.some(report=>report.id===fixtureIds[0]),"own workspace report must be visible");assert(!firstVisible.some(report=>report.id===fixtureIds[1]),"other organization report must be hidden");assert(secondVisible.some(report=>report.id===fixtureIds[1]),"second organization report must be visible");assert(!secondVisible.some(report=>report.id===fixtureIds[0]),"first organization report must be hidden from second");
  console.log(`RBAC isolation checks passed for ${users.length} active users.`);
}finally{if(fixtureIds.length)await pool.query("DELETE FROM reports WHERE id=ANY($1::uuid[])",[fixtureIds]);await Promise.all([pool.end(),closeDatabase()]);}}
void main();
