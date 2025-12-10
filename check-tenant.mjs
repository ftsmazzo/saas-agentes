import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Verificar tenants
  const [tenants] = await connection.execute(
    'SELECT * FROM tenants WHERE email = ?',
    ['webhook-test@example.com']
  );
  
  console.log('📊 Tenants encontrados:', tenants.length);
  if (tenants.length > 0) {
    console.log('✅ Tenant criado:');
    console.log(JSON.stringify(tenants[0], null, 2));
  } else {
    console.log('❌ Nenhum tenant encontrado');
  }
  
  // Verificar platform_logs
  const [logs] = await connection.execute(
    'SELECT * FROM platform_logs ORDER BY created_at DESC LIMIT 10'
  );
  
  console.log('\n📋 Últimos logs da plataforma:', logs.length);
  logs.forEach(log => {
    console.log(`- [${log.event_type}] ${log.message}`);
  });
  
} finally {
  await connection.end();
}
