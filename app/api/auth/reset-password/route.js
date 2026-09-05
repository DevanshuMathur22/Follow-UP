import crypto from "crypto";
import bcrypt from "bcryptjs";
import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../../src/lib/requestBody";
import {
  validEmail,
  validPassword,
} from "../../../../src/lib/inputValidation";
import prisma from "../../../../src/lib/prisma";

const MAX_OTP_ATTEMPTS = 5;

function otpHash(otp) {
  return crypto
    .createHmac(
      "sha256",
      process.env.PASSWORD_RESET_SECRET,
    )
    .update(String(otp))
    .digest("hex");
}

function sameHash(left, right) {
  if (!left || !right) return false;

  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");

  return (
    a.length === b.length &&
    crypto.timingSafeEqual(a, b)
  );
}

function invalidCode() {
  return Response.json(
    {
      success: false,
      message:
        "Invalid or expired reset code",
    },
    { status: 400 },
  );
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

    const otp = String(
      body?.otp || "",
    ).trim();

    const newPassword = String(
      body?.newPassword || "",
    );

    if (
      !validEmail(email) ||
      !/^\d{6}$/.test(otp) ||
      !validPassword(
        newPassword,
        8,
      )
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Enter a valid email, 6-digit code and new password",
        },
        { status: 400 },
      );
    }

    if (
      !process.env
        .PASSWORD_RESET_SECRET
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Password recovery is not configured",
        },
        { status: 503 },
      );
    }

    const user =
      await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          active: true,
          passwordResetOtpHash:
            true,
          passwordResetOtpExpiresAt:
            true,
          passwordResetOtpAttempts:
            true,
        },
      });

    if (
      !user?.active ||
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpiresAt
    ) {
      return invalidCode();
    }

    const now = new Date();

    if (
      new Date(
        user.passwordResetOtpExpiresAt,
      ).getTime() <= now.getTime()
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetOtpHash: null,
          passwordResetOtpExpiresAt:
            null,
          passwordResetOtpAttempts: 0,
        },
      });

      return invalidCode();
    }

    if (
      Number(
        user.passwordResetOtpAttempts ||
          0,
      ) >= MAX_OTP_ATTEMPTS
    ) {
      return invalidCode();
    }

    const validOtp = sameHash(
      otpHash(otp),
      user.passwordResetOtpHash,
    );

    if (!validOtp) {
      const attempts =
        Number(
          user.passwordResetOtpAttempts ||
            0,
        ) + 1;

      await prisma.user.update({
        where: { id: user.id },
        data:
          attempts >=
          MAX_OTP_ATTEMPTS
            ? {
                passwordResetOtpHash:
                  null,
                passwordResetOtpExpiresAt:
                  null,
                passwordResetOtpAttempts:
                  attempts,
              }
            : {
                passwordResetOtpAttempts:
                  attempts,
              },
      });

      return invalidCode();
    }

    const password =
      await bcrypt.hash(
        newPassword,
        12,
      );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password,
        sessionVersion: {
          increment: 1,
        },
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordResetRequestedAt:
          null,
        passwordResetOtpHash: null,
        passwordResetOtpExpiresAt:
          null,
        passwordResetOtpAttempts: 0,
      },
    });

    return Response.json({
      success: true,
      message:
        "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to reset password",
      },
      { status: 500 },
    );
  }
}
