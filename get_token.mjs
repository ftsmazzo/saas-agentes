import { drizzle } from "drizzle-orm/mysql2";
import { activationTokens, tenants } from "./drizzle/schema.js";
import { desc, eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

const result = await db
  .select({
    token: activationTokens.token,
    email: tenants.email,
    companyName: tenants.companyName
  })
  .from(activationTokens)
  .leftJoin(tenants, eq(activationTokens.tenantId, tenants.id))
  .orderBy(desc(activationTokens.createdAt))
  .limit(1);

if (result[0]) {
  console.log('\n✅ TOKEN DE ATIVAÇÃO:');
  console.log('Email:', result[0].email);
  console.log('Empresa:', result[0].companyName);
  console.log('Token:', result[0].token);
  console.log('\n🔗 LINK DE ATIVAÇÃO:');
  console.log(`https://3000-isfg4hd90k7xcxf2ok6gt-ac12418e.manusvm.computer/activate/${result[0].token}`);
} else {
  console.log('Nenhum token encontrado');
}

process.exit(0);
