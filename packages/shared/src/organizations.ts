import { z } from "zod";

import {
  idSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
  timestampSchema,
} from "./common.js";
import { userSummarySchema } from "./users.js";

export const memberRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

export const organizationSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// What the signed-in user sees in lists: the organization plus their own role in it.
export const organizationMembershipSchema = organizationSchema.extend({
  role: memberRoleSchema,
});

export const memberSchema = z.object({
  id: idSchema,
  role: memberRoleSchema,
  user: userSummarySchema,
  createdAt: timestampSchema,
});

export const createOrganizationInputSchema = z.object({
  name: nonEmptyTextSchema(191),
  description: optionalTextSchema(2000),
});

export const updateOrganizationInputSchema = createOrganizationInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const meSchema = z.object({
  user: userSummarySchema,
  organizations: z.array(organizationMembershipSchema),
});

export type MemberRole = z.infer<typeof memberRoleSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationMembership = z.infer<
  typeof organizationMembershipSchema
>;
export type Member = z.infer<typeof memberSchema>;
export type CreateOrganizationInput = z.infer<
  typeof createOrganizationInputSchema
>;
export type UpdateOrganizationInput = z.infer<
  typeof updateOrganizationInputSchema
>;
export type Me = z.infer<typeof meSchema>;
