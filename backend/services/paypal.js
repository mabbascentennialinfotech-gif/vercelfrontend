import axios from 'axios';

async function generateAccessToken() {
  const response = await axios({
    url: process.env.PAYPAL_BASE_URL + '/v1/oauth2/token',
    method: 'post',
    data: 'grant_type=client_credentials',
    auth: {
      username: process.env.PAYPAL_CLIENT_ID,
      password: process.env.PAYPAL_SECRET
    }
  });
  return response.data.access_token;
}

// Create order with dynamic amount
export async function createOrder(amount, planName) {
  const accessToken = await generateAccessToken();

  const response = await axios({
    url: process.env.PAYPAL_BASE_URL + '/v2/checkout/orders',
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    data: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          items: [
            {
              name: planName,
              description: `${planName} for Resume Builder`,
              quantity: 1,
              unit_amount: {
                currency_code: 'USD',
                value: amount.toString()
              }
            }
          ],
          amount: {
            currency_code: 'USD',
            value: amount.toString(),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: amount.toString()
              }
            }
          }
        }
      ],
      application_context: {
        return_url: process.env.BASE_URL + '/api/paypal/success',
        cancel_url: process.env.BASE_URL + '/api/paypal/cancel',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        brand_name: 'Resume Builder'
      }
    })
  });

  return response.data.links.find(link => link.rel === 'approve').href;
}

// Capture payment after approval
export async function capturePayment(orderId) {
  const accessToken = await generateAccessToken();

  const response = await axios({
    url: process.env.PAYPAL_BASE_URL + `/v2/checkout/orders/${orderId}/capture`,
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    }
  });

  return response.data;
}