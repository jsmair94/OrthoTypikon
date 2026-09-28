export type ProblemCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "DATABASE_UNAVAILABLE"
  | "INTERNAL_ERROR";

const problemCodes = new Set<ProblemCode>([
  "INVALID_REQUEST",
  "NOT_FOUND",
  "DATABASE_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

export const ProblemResponse = {
  parse(input: unknown): { error: string; code: ProblemCode } {
    if (
      !input ||
      typeof input !== "object" ||
      typeof (input as { error?: unknown }).error !== "string" ||
      !problemCodes.has((input as { code?: ProblemCode }).code as ProblemCode)
    ) {
      throw new TypeError("Invalid problem response");
    }
    return input as { error: string; code: ProblemCode };
  },
};

export class ApiProblemError extends Error {
  constructor(
    readonly status: number,
    readonly code: ProblemCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class DatabaseUnavailableError extends ApiProblemError {
  constructor(options?: ErrorOptions) {
    super(
      503,
      "DATABASE_UNAVAILABLE",
      "Content database is temporarily unavailable.",
      options,
    );
  }
}

export function invalidRequest(message = "The request is invalid."): ApiProblemError {
  return new ApiProblemError(400, "INVALID_REQUEST", message);
}

export function notFound(message = "Content was not found."): ApiProblemError {
  return new ApiProblemError(404, "NOT_FOUND", message);
}