import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
});

const webhookId = 'we_1ScdcPKoCeJjoiGp9zGzHPes';

console.log('🗑️  Deletando webhook:', webhookId);
await stripe.webhookEndpoints.del(webhookId);
console.log('✅ Webhook deletado com sucesso!');
