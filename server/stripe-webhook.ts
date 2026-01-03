import { Request, Response } from 'express';
import Stripe from 'stripe';
import * as db from './db';
import { notifyOwner } from './_core/notification';
import { getDb } from './db';
import { tenantCredits } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

/**
 * Handler para webhooks do Stripe
 * Rota: POST /api/stripe/webhook
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('[Stripe Webhook] Missing stripe-signature header');
    return res.status(400).send('Missing signature');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Detectar eventos de teste e retornar resposta de verificação
  if (event.id.startsWith('evt_test_')) {
    console.log('[Stripe Webhook] Test event detected, returning verification response');
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing event:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Checkout session completado - primeira assinatura
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('[Stripe] Checkout session completed:', session.id);

  const tenantId = session.metadata?.tenant_id;
  if (!tenantId) {
    console.warn('[Stripe] No tenant_id in session metadata');
    return;
  }

  const tenant = await db.getTenantById(Number(tenantId));
  if (!tenant) {
    console.error('[Stripe] Tenant not found:', tenantId);
    return;
  }

  // Atualizar tenant com informações do Stripe
  await db.updateTenant(Number(tenantId), {
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
    subscriptionStatus: 'active',
  });

  await db.createPlatformLog({
    tenantId: Number(tenantId),
    eventType: 'payment_success',
    severity: 'info',
    message: `Assinatura ativada para ${tenant.companyName}`,
    metadata: JSON.stringify({ sessionId: session.id }),
  });

  await notifyOwner({
    title: 'Nova Assinatura Ativada',
    content: `O cliente ${tenant.companyName} completou o pagamento e a assinatura foi ativada.`,
  });
}

/**
 * Assinatura criada
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('[Stripe] Subscription created:', subscription.id);

  // Buscar tenant pelo customer ID
  const tenants = await db.getAllTenants();
  const tenant = tenants.find(t => t.stripeCustomerId === subscription.customer);

  if (!tenant) {
    console.warn('[Stripe] No tenant found for customer:', subscription.customer);
    return;
  }

  await db.updateTenant(tenant.id, {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status as any,
  });
}

/**
 * Assinatura atualizada
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('[Stripe] Subscription updated:', subscription.id);

  const tenants = await db.getAllTenants();
  const tenant = tenants.find(t => t.stripeSubscriptionId === subscription.id);

  if (!tenant) {
    console.warn('[Stripe] No tenant found for subscription:', subscription.id);
    return;
  }

  await db.updateTenant(tenant.id, {
    subscriptionStatus: subscription.status as any,
  });

  // Se a assinatura foi cancelada, suspender o tenant
  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    await db.updateTenant(tenant.id, { status: 'suspended' });

    await db.createPlatformLog({
      tenantId: tenant.id,
      eventType: 'tenant_suspended',
      severity: 'warning',
      message: `Tenant suspenso devido ao status da assinatura: ${subscription.status}`,
    });

    await notifyOwner({
      title: 'Cliente Suspenso',
      content: `O cliente ${tenant.companyName} foi suspenso devido ao status da assinatura: ${subscription.status}`,
    });
  }
}

/**
 * Assinatura deletada
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('[Stripe] Subscription deleted:', subscription.id);

  const tenants = await db.getAllTenants();
  const tenant = tenants.find(t => t.stripeSubscriptionId === subscription.id);

  if (!tenant) {
    console.warn('[Stripe] No tenant found for subscription:', subscription.id);
    return;
  }

  await db.updateTenant(tenant.id, {
    subscriptionStatus: 'canceled',
    status: 'suspended',
  });

  await db.createPlatformLog({
    tenantId: tenant.id,
    eventType: 'tenant_suspended',
    severity: 'warning',
    message: `Assinatura cancelada`,
  });
}

/**
 * Fatura paga - Renovação mensal ou primeira assinatura
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('[Stripe] Invoice paid:', invoice.id);

  const tenants = await db.getAllTenants();
  const tenant = tenants.find(t => t.stripeCustomerId === invoice.customer);

  if (!tenant) {
    console.warn('[Stripe] No tenant found for customer:', invoice.customer);
    return;
  }

  // Atribuir créditos mensais quando fatura é paga (renovação mensal)
  try {
    const plan = tenant.currentPlanId ? await db.getPlanById(tenant.currentPlanId) : null;
    if (plan?.monthlyCredits) {
      console.log(`[Stripe] Atribuindo ${plan.monthlyCredits} créditos do plano ${plan.name} para tenant ${tenant.id}`);
      
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      
      // Buscar ou criar registro de créditos
      const existingCredits = await database
        .select()
        .from(tenantCredits)
        .where(eq(tenantCredits.tenantId, tenant.id))
        .limit(1);
      
      if (existingCredits[0]) {
        // Adicionar créditos mensais ao saldo atual
        await database
          .update(tenantCredits)
          .set({
            currentCredits: sql`${tenantCredits.currentCredits} + ${plan.monthlyCredits}`,
            totalCreditsPurchased: sql`${tenantCredits.totalCreditsPurchased} + ${plan.monthlyCredits}`,
            updatedAt: new Date(),
          })
          .where(eq(tenantCredits.tenantId, tenant.id));
        
        console.log(`[Stripe] ✅ Créditos atualizados. Novo saldo: ${existingCredits[0].currentCredits + plan.monthlyCredits}`);
      } else {
        // Criar registro inicial
        await database.insert(tenantCredits).values({
          tenantId: tenant.id,
          currentCredits: plan.monthlyCredits,
          totalCreditsPurchased: plan.monthlyCredits,
        });
        
        console.log(`[Stripe] ✅ Registro de créditos criado. Saldo inicial: ${plan.monthlyCredits}`);
      }
      
      await db.createPlatformLog({
        tenantId: tenant.id,
        eventType: 'credits_assigned',
        message: `${plan.monthlyCredits} créditos atribuídos do plano ${plan.name} (renovação mensal)`,
        metadata: JSON.stringify({ planId: plan.id, monthlyCredits: plan.monthlyCredits, invoiceId: invoice.id }),
      });
    } else {
      console.warn(`[Stripe] ⚠️ Plano não encontrado ou sem créditos mensais configurados para tenant ${tenant.id}`);
    }
  } catch (error: any) {
    console.error(`[Stripe] Erro ao atribuir créditos:`, error);
    await db.createPlatformLog({
      tenantId: tenant.id,
      eventType: 'credits_assignment_failed',
      message: `Failed to assign credits on invoice payment: ${error.message}`,
      metadata: JSON.stringify({ error: error.message, invoiceId: invoice.id }),
    });
  }

  await db.createPlatformLog({
    tenantId: tenant.id,
    eventType: 'payment_success',
    severity: 'info',
    message: `Pagamento recebido: R$ ${((invoice.amount_paid || 0) / 100).toFixed(2)}`,
    metadata: JSON.stringify({ invoiceId: invoice.id }),
  });
}

/**
 * Falha no pagamento da fatura
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('[Stripe] Invoice payment failed:', invoice.id);

  const tenants = await db.getAllTenants();
  const tenant = tenants.find(t => t.stripeCustomerId === invoice.customer);

  if (!tenant) {
    console.warn('[Stripe] No tenant found for customer:', invoice.customer);
    return;
  }

  await db.createPlatformLog({
    tenantId: tenant.id,
    eventType: 'payment_failed',
    severity: 'error',
    message: `Falha no pagamento da fatura ${invoice.id}`,
  });

  await notifyOwner({
    title: 'Falha de Pagamento',
    content: `O pagamento do cliente ${tenant.companyName} falhou. Fatura: ${invoice.id}`,
  });
}
