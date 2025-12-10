import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';

describe('Stripe Integration', () => {
  it('should validate Stripe sandbox key and retrieve products', async () => {
    const stripeKey = process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    
    expect(stripeKey).toBeDefined();
    expect(stripeKey).not.toBe('');
    
    const stripe = new Stripe(stripeKey!, {
      apiVersion: '2025-11-17.clover',
    });
    
    // Tentar listar produtos para validar a chave
    const products = await stripe.products.list({ limit: 3 });
    
    expect(products).toBeDefined();
    expect(products.data).toBeInstanceOf(Array);
    
    console.log(`✅ Stripe key validated successfully. Found ${products.data.length} products.`);
  });
  
  it('should retrieve price details for Plano Profissional', async () => {
    const stripeKey = process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    const stripe = new Stripe(stripeKey!, {
      apiVersion: '2025-11-17.clover',
    });
    
    const priceId = 'price_1ScacVKoCeJjoiGpzleApdC5';
    
    try {
      const price = await stripe.prices.retrieve(priceId);
      
      expect(price).toBeDefined();
      expect(price.id).toBe(priceId);
      expect(price.active).toBe(true);
      
      console.log(`✅ Price ${priceId} is valid and active`);
      console.log(`   Amount: ${price.unit_amount} ${price.currency}`);
    } catch (error: any) {
      throw new Error(`Failed to retrieve price ${priceId}: ${error.message}`);
    }
  });
});
