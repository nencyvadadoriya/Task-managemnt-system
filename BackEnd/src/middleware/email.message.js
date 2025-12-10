const { Resend } = require('resend');
require('dotenv').config();

console.log('🔧 Email Configuration:');
console.log('Using Resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Send OTP Email
exports.sendOtpEmail = async (email, otp, name = 'User') => {
    try {
        console.log(`📤 Attempting to send OTP to: ${email}`);

        const { data, error } = await resend.emails.send({
            from: 'Your App <onboarding@resend.dev>',
            to: email,
            subject: 'Password Reset OTP',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>OTP Verification</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
                        .content { padding: 30px; }
                        .otp-box { background: #f8fafc; border: 2px dashed #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #2563eb; }
                        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>OTP Verification</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${name},</h2>
                            <p>You requested to reset your password. Use the OTP below:</p>
                            <div class="otp-box">${otp}</div>
                            <p><strong>⚠️ Important:</strong> This OTP is valid for 2 minutes only.</p>
                            <p>If you didn't request this, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Your App</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('❌ Resend error:', error);
            return false;
        }

        console.log('✅ Email sent via Resend:', data.id);
        return true;
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        return false;
    }
};