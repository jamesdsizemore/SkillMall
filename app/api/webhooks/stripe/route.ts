import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { handleWebhook } from '@/lib/marketplace/payments'

// Next.js App Router: raw body is accessed via req.arrayBuffer()
// No need for bodyParser: false config — App Router doesn't use bodyParser
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 })
  }

  // Read raw body — MUST use arrayBuffer for Stripe signature verification
  const rawArrayBuffer = await req.arrayBuffer()
  const rawBody = Buffer.from(rawArrayBuffer)

  try {
    const result = await handleWebhook(rawBody, signature)
    return NextResponse.json({ received: true, ...result })
  } catch (err) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }
    console.error('[stripe-webhook] unexpected error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
