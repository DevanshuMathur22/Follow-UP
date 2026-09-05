import crypto from "crypto";
import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../../src/lib/requestBody";
import { validEmail } from "../../../../src/lib/inputValidation";
import prisma from "../../../../src/lib/prisma";
import {
  passwordResetMailConfigured,
  sendPasswordResetOtp,
} from "../../../../src/lib/mail";

const OTP_MINUTES = 10;
const RESEND_SECONDS = 60;

function otpHash(otp) {
  return crypto
    .createHmac(
      "sha256",
      process.env.PASSWORD_RESET_SECRET,
    )
    .update(String(otp))
    .digest("hex");
}

export async function POST(request) {
  const originError =
    validateWriteOrigin(request);

  if (originError) return originError;

  try {
    const { data: body, error: bodyError } =
      await readJsonBody(
        request,
        8 * 1024,
      );

    if (bodyError) return bodyError;

    const email = String(
      body?.email || "",
    )
      .trim()
      .toLowerCase();

    if (!validEmail(email)) {
      return Response.json(
        {
          success: false,
          message:
            "Enter a valid email address",
        },
        { status: 400 },
      );
    }

    if (!passwordResetMailConfigured()) {
      return Response.json(
        {
          success: false,
          message:
            "Password recovery email is not configured",
        },
        { status: 503 },
      );
    }

    const genericMessage =
      "If this account exists, a 6-digit reset code has been sent to the email address.";

    const user =
      await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          passwordResetRequestedAt: true,
        },
      });

    if (!user?.active) {
      return Response.json({
        success: true,
        message: genericMessage,
      });
    }

    const now = new Date();

    if (
      user.passwordResetRequestedAt &&
      now.getTime() -
        new Date(
          user.passwordResetRequestedAt,
        ).getTime() <
        RESEND_SECONDS * 1000
    ) {
      return Response.json({
        success: true,
        message: genericMessage,
      });
    }

    const otp = String(
      crypto.randomInt(
        100000,
        1000000,
      ),
    );

    const expiresAt = new Date(
      now.getTime() +
        OTP_MINUTES * 60 * 1000,
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetRequestedAt: now,
        passwordResetOtpHash:
          otpHash(otp),
        passwordResetOtpExpiresAt:
          expiresAt,
        passwordResetOtpAttempts: 0,
      },
    });

    try {
      await sendPasswordResetOtp({
        email: user.email,
        name: user.name,
        otp,
      });
    } catch (error) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetOtpHash: null,
          passwordResetOtpExpiresAt:
            null,
          passwordResetOtpAttempts: 0,
        },
      });

      console.error(
        "PASSWORD RESET EMAIL ERROR:",
        error,
      );

      return Response.json(
        {
          success: false,
          message:
            "Unable to send password reset email",
        },
        { status: 503 },
      );
    }

    return Response.json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to start password recovery",
      },
      { status: 500 },
    );
  }
}
