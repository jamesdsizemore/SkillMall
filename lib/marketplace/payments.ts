import Stripe from 'stripe'
import { getDb } from '../db/client'
import { getSkillTier } from './gate'
import { checkMarketplaceReady } from './gate'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured. Add it to .env.local.')
  }
  // Use Stripe's latest API version automatically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Stripe(key as any)
}

export interface CheckoutSessionResult {
  checkoutUrl: string
  sessionId: string
}

export async function createCheckoutSession(
  skillSlug: string,
  skillName: string,
  buyerGithubLogin: string,
  successUrl: string,
  cancelUrl: string
): Promise<CheckoutSessionResult> {
  // Marketplace must be ready to process payments
  const readiness = checkMarketplaceReady()
  if (!readiness.ready) {
    throw new Error('Marketplace is not yet available. Launch conditions have not been met.')
  }

  const tier = getSkillTier(skillSlug)
  if (tier.tier !== 'premium' || tier.price_cents <= 0) {
    throw new Error(`${skillSlug} is not a premium skill or has no price set.`)
  }

  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tier.price_cents,
          product_data: {
            name: skillName,
            description: `SkillMall premium skill: ${skillSlug}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      skillSlug,
      buyerGithubLogin,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  if (!session.url) throw new Error('Stripe checkout session returned no URL')
  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  }
}

export async function handleWebhook(
  rawBody: Buffer,
  signature: string
): Promise<{ processed: boolean; event?: string }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.')
  }

  const stripe = getStripe()

  // Verify signature — throws if invalid
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { skillSlug, buyerGithubLogin } = session.metadata ?? {}

    if (skillSlug && buyerGithubLogin && session.amount_total) {
      const db = getDb()
      // Idempotent insert — ignore duplicate session_id
      db.prepare(
        `INSERT OR IGNORE INTO purchases (skill_slug, buyer_github_login, stripe_session_id, amount_cents)
         VALUES (?, ?, ?, ?)`
      ).run(skillSlug, buyerGithubLogin, session.id, session.amount_total)
    }

    return { processed: true, event: event.type }
  }

  return { processed: false, event: event.type }
}
