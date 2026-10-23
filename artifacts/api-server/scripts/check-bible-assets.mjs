import { runBibleStorageReadinessCheck } from "../src/routes/bible.ts";

try {
  const report = await runBibleStorageReadinessCheck();
  if (report.issues.length === 0) {
    console.log(
      `Bible storage is ready: all ${report.checkedChapters} chapters have text and audio.`,
    );
  } else {
    console.error(
      `Bible storage is incomplete: ${report.issues.length} issue(s) found across ${report.checkedChapters} chapters.`,
    );
    for (const issue of report.issues) {
      const detail = "missing" in issue
        ? `missing ${issue.missing.join(" and ")}`
        : {
            ambiguous: "multiple matching asset folders",
            empty_text: "empty chapter text",
            unusable_text: "chapter text contains no usable verse content",
            unreadable_text: "unreadable chapter text",
            unreadable_audio: "invalid or unreadable audio",
          }[issue.problem];
      console.error(`- ${issue.book} ${issue.chapter}: ${detail}`);
    }
    process.exitCode = 1;
  }
} catch (error) {
  const message =
    error instanceof Error &&
    error.message === "Bible storage is not configured."
      ? error.message
      : "Could not check the configured Bible storage bucket. Verify its connection and try again.";
  console.error(message);
  process.exitCode = 1;
}
