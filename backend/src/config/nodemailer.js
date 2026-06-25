import nodemailer from 'nodemailer';

let transporter;
// 🟢 The OTP gets printed on logs , so be careful about it.
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10), // 🟢 U can use a .env variable , for more scalability. (process.env.SMPTP_PORT)
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for other ports. 🟢 Same as port.
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  // Stub transporter so signup and reset password requests don't crash when SMTP is unconfigured
  transporter = {
    sendMail: async (options) => {
      console.warn('\n--- 📧 STUB EMAIL SENDER ---');
      console.warn(`To:      ${options.to}`);
      console.warn(`Subject: ${options.subject}`);
      console.warn(`Content: ${options.html}`);
      console.warn('-----------------------------\n');
      return { messageId: 'stub-email-id' };
    }
  };
}

export default transporter;