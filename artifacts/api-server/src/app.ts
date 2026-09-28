import { existsSync } from "node:fs";
import path from "node:path";
import express, {
  type ErrorRequestHandler,
  type Express,
  type RequestHandler,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { ApiProblemError, ProblemResponse } from "./lib/api-errors";

const app: Express = express();

function isZodError(error: unknown): error is Error {
  return error instanceof Error && error.name === "ZodError";
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const configuredOrigins = process.env.CORS_ORIGIN
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: configuredOrigins?.length ? configuredOrigins : true }));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const adminBuildDirectory = path.resolve(
  process.cwd(),
  "artifacts",
  "orthotypikon-admin",
  "dist",
  "public",
);
const adminIndexPath = path.join(adminBuildDirectory, "index.html");

if (existsSync(adminIndexPath)) {
  const serveAdminAssets = express.static(adminBuildDirectory);
  const isApiPath = (requestPath: string): boolean =>
    requestPath === "/api" || requestPath.startsWith("/api/");

  app.use((req, res, next) => {
    if (isApiPath(req.path)) {
      next();
      return;
    }

    serveAdminAssets(req, res, next);
  });

  app.use((req, res, next) => {
    if (
      (req.method !== "GET" && req.method !== "HEAD") ||
      isApiPath(req.path) ||
      !req.accepts("html")
    ) {
      next();
      return;
    }

    res.sendFile(adminIndexPath, (error) => {
      if (error) next(error);
    });
  });
}

const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(
    ProblemResponse.parse({
      error: "API route was not found.",
      code: "NOT_FOUND",
    }),
  );
};

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (isZodError(error)) {
    res.status(400).json({ message: "البيانات المرسلة غير صالحة." });
    return;
  }

  if (
    error instanceof SyntaxError &&
    "status" in error &&
    (error as { status?: unknown }).status === 400
  ) {
    req.log.warn("Malformed JSON request body");
    res.status(400).json(
      ProblemResponse.parse({
        error: "Request body contains malformed JSON.",
        code: "INVALID_REQUEST",
      }),
    );
    return;
  }

  if (error instanceof ApiProblemError) {
    if (error.status >= 500) {
      req.log.error({ err: error.cause }, "API request failed");
    } else {
      req.log.warn({ code: error.code }, "API request rejected");
    }
    res.status(error.status).json(
      ProblemResponse.parse({
        error: error.message,
        code: error.code,
      }),
    );
    return;
  }

  req.log.error({ err: error }, "Unhandled API error");
  res.status(500).json(
    ProblemResponse.parse({
      error: "An unexpected error occurred.",
      code: "INTERNAL_ERROR",
    }),
  );
};

app.use(notFoundHandler);
app.use(errorHandler);

export default app;