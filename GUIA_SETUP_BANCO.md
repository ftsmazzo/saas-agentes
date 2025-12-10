# 🗄️ Guia de Setup do Banco de Dados

## 📋 Passo a Passo

### 1. Criar Banco no EasyPanel

1. Acesse seu EasyPanel
2. Vá em **Databases** → **MySQL**
3. Clique em **Create Database**
4. Configure:
   - **Database Name**: `saas_agentes` (ou o nome que preferir)
   - **User**: Crie um usuário
   - **Password**: Defina uma senha forte
   - **Host**: Anote o host (geralmente `localhost` ou IP do servidor)
   - **Port**: Geralmente `3306`

### 2. Executar Script SQL

**Opção A: Via EasyPanel (Recomendado)**
1. No EasyPanel, vá em **Databases** → Seu banco
2. Clique em **phpMyAdmin** ou **Database Manager**
3. Selecione o banco criado
4. Vá na aba **SQL**
5. Cole o conteúdo do arquivo `setup-database.sql`
6. Clique em **Executar**

**Opção B: Via Terminal (MySQL CLI)**
```bash
mysql -h HOST -u USUARIO -p NOME_DO_BANCO < setup-database.sql
```

### 3. Configurar .env

Após criar o banco, atualize seu `.env`:

```env
DATABASE_URL=mysql://usuario:senha@host:3306/nome_do_banco
```

**Exemplo:**
```env
DATABASE_URL=mysql://saas_user:MinhaSenh@123@192.168.1.100:3306/saas_agentes
```

### 4. Verificar Conexão

Teste a conexão rodando o servidor:

```powershell
$env:NODE_ENV="development"; pnpm exec tsx watch server/_core/index.ts
```

Se não der erro de conexão, está funcionando! ✅

---

## 📊 O que o Script Cria

O script `setup-database.sql` cria:

✅ **11 tabelas principais:**
- `users` - Usuários admin
- `plans` - Planos de assinatura (já com 3 planos de teste)
- `tenants` - Clientes/Tenants
- `agentConfigs` - Configurações do agente
- `usageMetrics` - Métricas de uso
- `platformLogs` - Logs da plataforma
- `system_config` - Configurações do sistema
- `contacts` - Contatos dos clientes
- `conversations` - Conversas
- `chatMessages` - Mensagens
- `activationTokens` - Tokens de ativação

✅ **3 planos de teste** já inseridos:
- Plano Básico (R$ 99,00)
- Plano Pro (R$ 199,00)
- Plano Enterprise (R$ 499,00)

---

## 🔄 Migrar Dados do Manus (Opcional)

Se você tinha dados no Manus e quer migrar:

### 1. Exportar do Manus
- Acesse o banco do Manus
- Exporte as tabelas que você quer manter
- Salve como SQL

### 2. Importar no EasyPanel
- Use o mesmo processo do passo 2 acima
- Execute o SQL exportado

### 3. Verificar Dados
- Confirme que os dados foram importados
- Verifique se os IDs estão corretos

---

## ⚠️ Importante

- **Backup**: Sempre faça backup antes de executar scripts SQL
- **Senhas**: Use senhas fortes para o banco
- **Permissões**: O usuário precisa ter permissões de CREATE, INSERT, UPDATE, DELETE
- **Charset**: O banco deve usar `utf8mb4` para suportar emojis

---

## 🐛 Troubleshooting

### Erro: "Access denied"
- Verifique usuário e senha no `.env`
- Confirme que o usuário tem permissões

### Erro: "Table already exists"
- As tabelas já existem, pode ignorar
- Ou use `DROP TABLE` antes de criar (CUIDADO: apaga dados!)

### Erro: "Connection refused"
- Verifique se o MySQL está rodando
- Confirme host e porta
- Verifique firewall

---

## ✅ Próximos Passos

Após criar o banco:

1. ✅ Configurar `.env` com `DATABASE_URL`
2. ✅ Testar conexão rodando o servidor
3. ✅ Verificar se os planos aparecem na landing page
4. ✅ Testar criação de tenant via "Modo Teste"

---

**Pronto!** Seu banco está configurado! 🎉

