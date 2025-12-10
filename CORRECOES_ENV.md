# 🔧 Correções Necessárias no .env

## ⚠️ PROBLEMA CRÍTICO: DATABASE_URL

Sua senha do MySQL tem `@` que precisa ser escapado:

**❌ ERRADO:**
```
DATABASE_URL=mysql://saas_agentes:Fs142779@1524@easypanel.fabricadosdados.online:3306/saas_agentes
```

**✅ CORRETO (Opção 1 - Escapar @):**
```
DATABASE_URL=mysql://saas_agentes:Fs142779%401524@easypanel.fabricadosdados.online:3306/saas_agentes
```

**✅ CORRETO (Opção 2 - Trocar senha):**
Troque a senha no MySQL para algo sem `@` e use:
```
DATABASE_URL=mysql://saas_agentes:NOVA_SENHA_SEM_ARROBA@easypanel.fabricadosdados.online:3306/saas_agentes
```

---

## 📧 EMAIL (Resend)

O Resend só envia para qualquer email se você verificar um domínio. Como está usando `onboarding@resend.dev`, só funciona para o email da sua conta Resend.

**Opções:**

### Opção 1: Verificar Domínio no Resend
1. Acesse https://resend.com/domains
2. Adicione seu domínio
3. Configure os DNS records
4. Use um email do domínio verificado:
```
RESEND_FROM_EMAIL=suporte@seudominio.com
```

### Opção 2: Usar Brevo (Recomendado - já tem conta)
Trocar para Brevo que você já tem configurado. Preciso dos dados:
- SMTP Host
- SMTP Port
- SMTP User
- SMTP Password
- From Email

---

## ✅ O QUE ESTÁ CORRETO

- ✅ Evolution API URL e Key configurados
- ✅ Chatwoot URL, Token e Account ID configurados
- ✅ N8N API URL, Key e Template ID configurados
- ✅ JWT_SECRET configurado
- ✅ RESEND_API_KEY configurado

---

## 🔍 PRÓXIMOS PASSOS

1. **Corrigir DATABASE_URL** (escapar @ ou trocar senha)
2. **Decidir sobre email**: Verificar domínio Resend OU usar Brevo
3. **Reiniciar servidor** após corrigir
4. **Testar criação de tenant** novamente

---

## 🐛 ERROS ESPERADOS (Já Tratados)

Os erros de Evolution/N8N não vão mais quebrar o fluxo:
- ✅ Tenant será criado mesmo se Evolution falhar
- ✅ Token será gerado mesmo se N8N falhar
- ✅ Token aparecerá no console se email falhar

**O importante é corrigir o DATABASE_URL primeiro!**

