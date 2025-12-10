import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const [result] = await connection.execute(
  "SELECT id, email, activationToken FROM tenants WHERE email = 'cliente@teste.com' ORDER BY createdAt DESC LIMIT 1"
);

console.log(JSON.stringify(result[0], null, 2));
await connection.end();
