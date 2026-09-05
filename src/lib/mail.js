import nodemailer from "nodemailer";

export function passwordResetMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM &&
      process.env.PASSWORD_RESET_SECRET,
  );
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure:
      String(process.env.SMTP_SECURE)
        .toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetOtp({
  email,
  name,
  otp,
}) {
  await transporter().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Dr. Vaibhav Mathur · CareTrack password reset code",
    text:
      `Hello ${name || "CareTrack user"},\n\n` +
      `Your Dr. Vaibhav Mathur · CareTrack password reset code is: ${otp}\n\n` +
      "This code expires in 10 minutes. " +
      "If you did not request this reset, ignore this email.",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2 style="margin:0 0 16px">Dr. Vaibhav Mathur · CareTrack password reset</h2>
        <p>Hello ${name || "CareTrack user"},</p>
        <p>Your 6-digit password reset code is:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">
          ${otp}
        </div>
        <p>This code expires in 10 minutes.</p>
        <p style="color:#64748b;font-size:13px">
          If you did not request this password reset, ignore this email.
        </p>
      </div>
    `,
  });
}
