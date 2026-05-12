// FILE: services/emailService.js

const SERVICE_ID = 'service_nh26fde'; 
const TEMPLATE_ID = 'template_gxqfcpa'; 
const PUBLIC_KEY = 'X1DRoJSCqLw6Vm80t'; 

/**
 * Sends a welcome email via EmailJS API
 * @param {string} toEmail - Recipient email
 * @param {string} name - Recipient name
 */
export const sendWelcomeEmail = async (toEmail, name, role) => {
  const data = {
    service_id: SERVICE_ID,
    template_id: TEMPLATE_ID,
    user_id: PUBLIC_KEY,
    template_params: {
      name: name,
      email: toEmail,
      user_role: role || 'FARMER',
      reply_to: 'eleguardlk@gmail.com',
    },
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log('Welcome email sent successfully via EmailJS');
      return true;
    } else {
      const errorText = await response.text();
      console.warn('EmailJS API Error:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Failed to send welcome email via EmailJS:', error);
    return false;
  }
};

/**
 * Sends a password reset confirmation email via EmailJS API
 * @param {string} toEmail - Recipient email
 * @param {string} name - Recipient name
 */
export const sendPasswordResetNotification = async (toEmail, name) => {
  const now = new Date();
  const data = {
    service_id: SERVICE_ID,
    template_id: 'template_cbwxrpb',
    user_id: PUBLIC_KEY,
    template_params: {
      name: name || 'User',
      email: toEmail,
      change_date: now.toLocaleDateString(),
      change_time: now.toLocaleTimeString(),
      reply_to: 'eleguardlk@gmail.com',
    },
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log('Reset email sent successfully via EmailJS');
      return true;
    } else {
      const errorText = await response.text();
      console.warn('EmailJS API Error (Reset):', errorText);
      return false;
    }
  } catch (error) {
    console.error('Failed to send reset email via EmailJS:', error);
    return false;
  }
};
