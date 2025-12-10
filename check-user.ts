import { db } from './server/db';
import { user } from './drizzle/schema';
import { eq } from 'drizzle-orm';

const email = 'teste@example.com';

const users = await db.select().from(user).where(eq(user.email, email));

console.log('📊 Usuários encontrados:', users.length);
if (users.length > 0) {
  console.log('✅ Usuário criado:');
  console.log(JSON.stringify(users[0], null, 2));
} else {
  console.log('❌ Nenhum usuário encontrado com email:', email);
}

process.exit(0);
