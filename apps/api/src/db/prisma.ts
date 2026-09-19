import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

// Prisma is the only layer that talks to MariaDB. Everything else goes through
// the domain services in `modules/`.
const adapter = new PrismaMariaDb(env.DATABASE_URL);

export const prisma = new PrismaClient({ adapter });

export type { Prisma } from "../generated/prisma/client.js";
