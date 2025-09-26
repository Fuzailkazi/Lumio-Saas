import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
import { Polar } from "@polar-sh/sdk";
import { env } from "~/env";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { db } from "~/server/db";

const polarClient = new Polar({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: "sandbox",
});

const prisma = new PrismaClient();
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: "ce2e6a65-5726-4bb9-9dae-2dacf210bb7f",
              slug: "small",
            },
            {
              productId: "52cc11bb-0baa-4cc3-9ef3-9d1f20db1604",
              slug: "medium",
            },
            {
              productId: "100e77d8-6848-4539-a9e2-ef94035090c9",
              slug: "large",
            },
          ],
          successUrl: "/dashboard",
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          secret: env.POLAR_WEBHOOK_SECRET,
          onOrderPaid: async (order) => {
            const externalCustomerId = order.data.customer.externalId;

            if (!externalCustomerId) {
              console.error("No external customer ID found.");
              throw new Error("No external customer id found.");
            }

            const productId = order.data.productId;

            let creditsToAdd = 0;

            switch (productId) {
              case "9e1f7dec-87b0-4041-8602-8ff9200adfb2":
                creditsToAdd = 50;
                break;
              case "95f25d66-68d8-4d50-867a-3ccf942f9708":
                creditsToAdd = 200;
                break;
              case "068e7d87-d390-49d1-a0f4-3063d4a94df6":
                creditsToAdd = 400;
                break;
            }

            await db.user.update({
              where: { id: externalCustomerId },
              data: {
                credits: {
                  increment: creditsToAdd,
                },
              },
            });
          },
        }),
      ],
    }),
  ],
});