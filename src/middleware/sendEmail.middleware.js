import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls:{
    rejectUnauthorized: false,
  },
});

export async function sendEmail(email, firstName, id) {
  const encodedEmail = encodeURIComponent(email);
  const unsubscribeUrl = `${process.env.BASE_API_URL}/unsubscribe?email=${encodedEmail}&id=${id}`;

  const htmlContent = `
<html>
  <body style="font-family: Arial, sans-serif;">
    <h2>Hello ${firstName},</h2>
    <p>This is your monthly report.</p>
    <p>If you’d like to stop receiving these emails, click below:</p>

    <a href="${unsubscribeUrl}" target="_blank" style="text-decoration:none;">
      <img 
        src="https://yourdomain.com/images/unsubscribe-button.png"
        alt="Unsubscribe"
        width="180"
        height="45"
        style="display:block; border:none;"
      />
    </a>

    <img src="${unsubscribeUrl}" width="1" height="1" style="display:none;" alt="" />
  </body>
</html>
`;

  const mailOptions = {
    from: `"Your Service" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your Monthly Report",
    text: `Hello ${firstName}. Here is your report. To unsubscribe, visit: ${unsubscribeUrl}`,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
}
