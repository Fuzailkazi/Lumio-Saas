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
          secret: env.POLAR_ACCESS_TOKEN,
          onOrderPaid: async (order) => {
            const externalCustomerId = order.data.customer.externalId;

            if (!externalCustomerId) {
              console.error("No external customer ID found.");
              throw new Error("No external customer id found.");
            }

            const productId = order.data.productId;

            let creditsToAdd = 0;

            switch (productId) {
              case "43585d8b-a849-485c-a359-7773d185d8ef":
                creditsToAdd = 50;
                break;
              case "ba9b9094-3f22-4933-86f2-7d74cdcfbf52":
                creditsToAdd = 200;
                break;
              case "2c7735ec-5758-4c6a-8907-da76dced50b6":
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