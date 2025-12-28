const paypal = require('@paypal/checkout-server-sdk');

/**
 * PayPal Service for handling payments
 * Supports Sandbox and Live environments
 */

// Configure PayPal environment
function environment() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox';

    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env');
    }

    if (mode === 'production') {
        return new paypal.core.LiveEnvironment(clientId, clientSecret);
    } else {
        return new paypal.core.SandboxEnvironment(clientId, clientSecret);
    }
}

// Create PayPal HTTP client
function client() {
    return new paypal.core.PayPalHttpClient(environment());
}

/**
 * Create PayPal Order
 * @param {number} amount - Amount in USD
 * @param {string} currency - Currency code (default: USD)
 * @param {string} returnUrl - Return URL after payment
 * @param {string} cancelUrl - Cancel URL
 * @returns {object} PayPal order response
 */
async function createOrder(amount, currency = 'USD', returnUrl = null, cancelUrl = null) {
    try {
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: amount.toFixed(2)
                },
                description: 'Add Funds to Freelancing Platform'
            }],
            application_context: {
                brand_name: 'Freelancing Platform',
                landing_page: 'NO_PREFERENCE',
                user_action: 'PAY_NOW',
                return_url: returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
                cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`
            }
        });

        const order = await client().execute(request);
        console.log('✅ PayPal Order Created:', order.result.id);

        return {
            success: true,
            orderId: order.result.id,
            status: order.result.status,
            links: order.result.links,
            order: order.result
        };
    } catch (error) {
        console.error('❌ PayPal Create Order Error:', error);
        return {
            success: false,
            error: error.message,
            details: error.statusCode ? {
                statusCode: error.statusCode,
                message: error.message
            } : null
        };
    }
}

/**
 * Capture PayPal Order (Complete Payment)
 * @param {string} orderId - PayPal Order ID
 * @returns {object} Capture response
 */
async function captureOrder(orderId) {
    try {
        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        request.requestBody({});

        const capture = await client().execute(request);
        console.log('✅ PayPal Order Captured:', capture.result.id);

        return {
            success: true,
            orderId: capture.result.id,
            status: capture.result.status,
            captureId: capture.result.purchase_units[0]?.payments?.captures[0]?.id,
            amount: capture.result.purchase_units[0]?.payments?.captures[0]?.amount,
            capture: capture.result
        };
    } catch (error) {
        console.error('❌ PayPal Capture Order Error:', error);
        return {
            success: false,
            error: error.message,
            details: error.statusCode ? {
                statusCode: error.statusCode,
                message: error.message
            } : null
        };
    }
}

/**
 * Get Order Details
 * @param {string} orderId - PayPal Order ID
 * @returns {object} Order details
 */
async function getOrderDetails(orderId) {
    try {
        const request = new paypal.orders.OrdersGetRequest(orderId);
        const order = await client().execute(request);

        return {
            success: true,
            order: order.result
        };
    } catch (error) {
        console.error('❌ PayPal Get Order Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get PayPal Access Token
 * @returns {string} Access token
 */
async function getAccessToken() {
    try {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        const mode = process.env.PAYPAL_MODE || 'sandbox';

        console.log(`🔑 Requesting PayPal access token (${mode} mode)...`);

        const baseURL = mode === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const response = await fetch(`${baseURL}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Failed to get PayPal access token:', errorData);
            throw new Error(`PayPal OAuth failed: ${errorData.error_description || errorData.error}`);
        }

        const data = await response.json();
        console.log('✅ PayPal access token obtained successfully');
        return data.access_token;
    } catch (error) {
        console.error('❌ getAccessToken error:', error.message);
        throw error;
    }
}

/**
 * Create Payout (Withdraw funds to user's PayPal)
 * @param {string} email - PayPal email
 * @param {number} amount - Amount to send
 * @param {string} currency - Currency code
 * @param {string} note - Payout note
 * @returns {object} Payout response
 */
async function createPayout(email, amount, currency = 'USD', note = 'Freelancing Platform Payout') {
    try {
        const mode = process.env.PAYPAL_MODE || 'sandbox';
        const baseURL = mode === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        console.log(`🚀 Creating PayPal payout (${mode} mode):`, {
            email,
            amount: `$${amount}`,
            currency
        });

        const accessToken = await getAccessToken();

        const batchId = `batch_${Date.now()}`;
        const itemId = `item_${Date.now()}`;

        const requestBody = {
            sender_batch_header: {
                sender_batch_id: batchId,
                email_subject: 'You have a payout from Freelancing Platform',
                email_message: 'You have received a payout! Check your PayPal account.'
            },
            items: [{
                recipient_type: 'EMAIL',
                amount: {
                    value: amount.toFixed(2),
                    currency: currency
                },
                receiver: email,
                note: note,
                sender_item_id: itemId
            }]
        };

        console.log('📤 Sending payout request to PayPal...', {
            batchId,
            itemId,
            url: `${baseURL}/v1/payments/payouts`
        });

        const response = await fetch(`${baseURL}/v1/payments/payouts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log('📥 PayPal payout response:', {
            status: response.status,
            statusText: response.statusText,
            batchStatus: data.batch_header?.batch_status,
            batchId: data.batch_header?.payout_batch_id
        });

        if (!response.ok) {
            console.error('❌ PayPal Payout API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                error: data,
                details: {
                    name: data.name,
                    message: data.message,
                    debug_id: data.debug_id,
                    details: data.details
                }
            });

            // Provide detailed error message
            let errorMessage = data.message || data.error_description || `PayPal API Error: ${response.status}`;

            if (mode === 'sandbox' && response.status === 403) {
                errorMessage += ' - PayPal Sandbox has limitations for Payouts. This will work in Production mode.';
            }

            throw new Error(errorMessage);
        }

        console.log('✅ PayPal Payout Created Successfully:', {
            batchId: data.batch_header.payout_batch_id,
            status: data.batch_header.batch_status,
            timeCreated: data.batch_header.time_created
        });

        // Check if Sandbox and add warning
        if (mode === 'sandbox') {
            console.log('⚠️ NOTE: PayPal Sandbox Payouts may show as DENIED. This is a known Sandbox limitation.');
        }

        return {
            success: true,
            batchId: data.batch_header.payout_batch_id,
            status: data.batch_header.batch_status,
            payout: data
        };
    } catch (error) {
        console.error('❌ PayPal Payout Error:', {
            message: error.message,
            stack: error.stack
        });
        return {
            success: false,
            error: error.message,
            details: error.statusCode ? {
                statusCode: error.statusCode,
                message: error.message
            } : null
        };
    }
}

/**
 * Refund a captured payment
 * @param {string} captureId - PayPal Capture ID
 * @param {number} amount - Amount to refund (optional, full refund if not provided)
 * @param {string} currency - Currency code
 * @returns {object} Refund response
 */
async function refundCapture(captureId, amount = null, currency = 'USD') {
    try {
        const request = new paypal.payments.CapturesRefundRequest(captureId);

        if (amount) {
            request.requestBody({
                amount: {
                    value: amount.toFixed(2),
                    currency_code: currency
                }
            });
        } else {
            request.requestBody({});
        }

        const refund = await client().execute(request);
        console.log('✅ PayPal Refund Created:', refund.result.id);

        return {
            success: true,
            refundId: refund.result.id,
            status: refund.result.status,
            refund: refund.result
        };
    } catch (error) {
        console.error('❌ PayPal Refund Error:', error);
        return {
            success: false,
            error: error.message,
            details: error.statusCode ? {
                statusCode: error.statusCode,
                message: error.message
            } : null
        };
    }
}

module.exports = {
    createOrder,
    captureOrder,
    getOrderDetails,
    createPayout,
    refundCapture
};
