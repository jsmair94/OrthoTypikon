export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const canTryExtension =
      error?.code === "ERR_MODULE_NOT_FOUND" ||
      error?.code === "ERR_UNSUPPORTED_DIR_IMPORT";
    if (
      !canTryExtension ||
      !specifier.startsWith(".") ||
      /\.[^/]+$/.test(specifier)
    ) {
      throw error;
    }

    for (const extension of [".ts", ".js", ".mjs"]) {
      try {
        return await nextResolve(`${specifier}${extension}`, context);
      } catch (candidateError) {
        if (candidateError?.code !== "ERR_MODULE_NOT_FOUND")
          throw candidateError;
      }
    }

    for (const extension of [".ts", ".js", ".mjs"]) {
      try {
        return await nextResolve(`${specifier}/index${extension}`, context);
      } catch (candidateError) {
        if (
          candidateError?.code !== "ERR_MODULE_NOT_FOUND" &&
          candidateError?.code !== "ERR_UNSUPPORTED_DIR_IMPORT"
        ) {
          throw candidateError;
        }
      }
    }

    throw error;
  }
}
