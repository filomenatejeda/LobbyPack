import { Elysia } from "elysia";
import { AuthError } from "../auth/session";
import { authRoutes } from "./auth";
import { dashboardRoutes } from "./dashboard";
import { issuesRoutes } from "./issues";
import { messageRoutes } from "./messages";
import { parcelRoutes } from "./parcels";
import { settingsRoutes } from "./settings";

export const api = new Elysia({ prefix: "/api" })
  .onError(({ error, set }) => {
    if (error instanceof AuthError) {
      set.status = error.status;
      return { message: error.message };
    }
  })
  .use(authRoutes)
  .use(parcelRoutes)
  .use(issuesRoutes)
  .use(messageRoutes)
  .use(settingsRoutes)
  .use(dashboardRoutes);
