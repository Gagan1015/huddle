import { z } from "zod";

import { idSchema } from "./common.js";

export const userSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
});

export type UserSummary = z.infer<typeof userSummarySchema>;
