# Lemon Squeezy Setup Guide

## Step 1: Create Lemon Squeezy Account

1. Go to https://lemonsqueezy.com/
2. Sign up for an account
3. Complete your profile and business verification

## Step 2: Create Your Store

1. Go to **Dashboard** → **Stores**
2. Click **Create Store**
3. Fill in your store details:
   - Store name: `Jurist Diction`
   - Store URL: `jurist-diction` (or your preferred URL)
   - Category: **Software** or **Education**

## Step 3: Create Products

### Subscription Products

Create 3 products for your subscription tiers:

#### Basic Plan ($29/month)
1. Go to **Products** → **Add Product**
2. Fill in:
   - Name: `Basic Plan`
   - Description: `Essential tools for occasional document review`
   - Price: `$29.00`
   - Billing: `Recurring` → `Monthly`
   - Category: `SaaS`
3. Save and note the **Product ID** and **Variant ID**

#### Professional Plan ($79/month)
1. Create another product
2. Fill in:
   - Name: `Professional Plan`
   - Description: `Complete toolkit for serious legal document management`
   - Price: `$79.00`
   - Billing: `Recurring` → `Monthly`
3. Mark as **Featured** (this will be your "Most Popular" tier)
4. Save and note IDs

#### Firm Plan ($299/month)
1. Create another product
2. Fill in:
   - Name: `Firm Plan`
   - Description: `Enterprise solution for law firms`
   - Price: `$299.00`
   - Billing: `Recurring` → `Monthly`
3. Save and note IDs

### Packet Products (One-Time Purchases)

Create 5 products for individual packets:

1. **Traffic Ticket Defense Packet** - $9.99
2. **Eviction Defense Packet** - $14.99
3. **Expungement Packet** - $19.99
4. **DL Reinstatement Packet** - $9.99
5. **Foreclosure Prevention Packet** - $14.99

For each:
- Set billing to `One-time payment`
- Enable `License keys` if you want to limit packet usage

## Step 4: Get API Keys

1. Go to **Settings** → **API**
2. Click **Create API Key**
3. Name it `Production API`
4. Copy the key (you won't see it again!)
5. Add to your `.env` as `LEMONSQUEEZY_API_KEY`

## Step 5: Set Up Webhooks

1. Go to **Settings** → **Webhooks**
2. Click **Add Endpoint**
3. Enter your webhook URL:
   ```
   https://jurist-diction-main.vercel.app/api/payments/webhook
   ```
4. Select events to listen to:
   - `order_created`
   - `order_updated`
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_expired`
   - `subscription_payment_success`
   - `subscription_payment_failed`
   - `license_key_created`

5. Save and copy the **Signing Secret**
6. Add to your `.env` as `LEMONSQUEEZY_WEBHOOK_SECRET`

## Step 6: Configure Environment Variables

In Vercel Dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add all variables from `.env.example`:
   ```
   LEMONSQUEEZY_API_KEY=your_key
   LEMONSQUEEZY_STORE_ID=123456
   LEMONSQUEEZY_WEBHOOK_SECRET=your_secret
   LEMONSQUEEZY_BASIC_VARIANT_ID=222222
   ... etc
   ```

## Step 7: Test the Integration

1. Deploy to Vercel
2. Visit `/subscribe.html`
3. Click "Subscribe Now"
4. You should be redirected to Lemon Squeezy checkout

## Business Classification

For Lemon Squeezy, classify your business as:

- **Category**: `Software` or `Education`
- **Subcategory**: `SaaS` or `Information Services`
- **Product Type**: `Digital Products`

**Important**: Do NOT classify as "Legal Services" - your packets are information products, not legal advice.

## Fees

Lemon Squeezy charges:
- **5% + $0.50** per transaction
- They handle:
  - Payment processing
  - Global sales tax (VAT)
  - Chargeback protection
  - Fraud prevention

Example: On a $79 sale:
- You receive: ~$74.55
- Lemon Squeezy keeps: ~$4.45

## Chargeback Protection

Lemon Squeezy is the Merchant of Record, which means:
- They handle chargeback disputes
- They absorb fraudulent transaction costs
- You don't pay chargeback fees
- Your account won't be penalized for disputes

## Support

- Lemon Squeezy docs: https://docs.lemonsqueezy.com/
- API reference: https://docs.lemonsqueezy.com/api
- Help center: https://help.lemonsqueezy.com/

## Next Steps

1. ✅ Create Lemon Squeezy account
2. ✅ Create products
3. ✅ Get API keys
4. ✅ Set up webhooks
5. ✅ Configure environment variables
6. ✅ Test checkout flow
7. 🔄 Connect to your database for user management
8. 🔄 Implement email notifications
