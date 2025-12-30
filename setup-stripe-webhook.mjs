import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
});

// Use a variável de ambiente ou configure manualmente
const WEBHOOK_URL = process.env.STRIPE_WEBHOOK_URL || process.env.VITE_APP_URL 
  ? `${process.env.VITE_APP_URL}/api/webhooks/stripe`
  : 'https://seu-dominio.com/api/webhooks/stripe';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

async function setupWebhook() {
  try {
    console.log('🔍 Verificando webhooks existentes...');
    
    // Listar webhooks existentes
    const existingWebhooks = await stripe.webhookEndpoints.list();
    console.log(`📋 Encontrados ${existingWebhooks.data.length} webhooks`);
    
    // Verificar se já existe um webhook com a mesma URL
    const existingWebhook = existingWebhooks.data.find(wh => wh.url === WEBHOOK_URL);
    
    if (existingWebhook) {
      console.log('✅ Webhook já existe:', existingWebhook.id);
      console.log('   URL:', existingWebhook.url);
      console.log('   Status:', existingWebhook.status);
      console.log('   Events:', existingWebhook.enabled_events);
      return;
    }
    
    console.log('🆕 Criando novo webhook endpoint...');
    
    // Criar webhook
    const webhook = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: ['checkout.session.completed'],
      api_version: '2025-11-17.clover',
    });
    
    console.log('✅ Webhook criado com sucesso!');
    console.log('   ID:', webhook.id);
    console.log('   URL:', webhook.url);
    console.log('   Secret:', webhook.secret);
    console.log('');
    console.log('⚠️  IMPORTANTE: O secret do webhook é:', webhook.secret);
    console.log('   Você precisa atualizar STRIPE_WEBHOOK_SECRET com este valor!');
    console.log('   Secret configurado atualmente:', WEBHOOK_SECRET);
    
    if (webhook.secret !== WEBHOOK_SECRET) {
      console.log('');
      console.log('❌ ATENÇÃO: O secret do webhook NÃO corresponde ao configurado!');
      console.log('   Atualize STRIPE_WEBHOOK_SECRET para:', webhook.secret);
    }
    
  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error.message);
    throw error;
  }
}

setupWebhook();
