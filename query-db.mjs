import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [rows] = await connection.execute(
    'SELECT * FROM user WHERE email = ?',
    ['teste@example.com']
  );
  
  console.log('📊 Usuários encontrados:', rows.length);
  if (rows.length > 0) {
    console.log('✅ Usuário criado:');
    console.log(JSON.stringify(rows[0], null, 2));
  } else {
    console.log('❌ Nenhum usuário encontrado');
  }
} finally {
  await connection.end();
}
