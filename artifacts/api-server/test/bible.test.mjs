import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import {
  createBibleRouter,
  findBibleChapterAssets,
  runBibleStorageReadinessCheck,
  scanBibleChapterReadiness,
} from "../src/routes/bible.ts";

const markChapterKeys = [
  "الإنجيل/العهد الجديد/مرقس/1.txt",
  "الإنجيل/العهد الجديد/مرقس/1.MP3",
  "الإنجيل/العهد الجديد/متى/1.txt",
  "الإنجيل/العهد الجديد/متى/1.MP3",
];

function makeMp3(frameCount) {
  const frameLength = 417;
  const bytes = new Uint8Array(frameLength * frameCount);
  for (let index = 0; index < frameCount; index += 1) {
    bytes.set([0xff, 0xfb, 0x90, 0x64], index * frameLength);
  }
  return bytes;
}

function rangeResponse(bytes, range) {
  const match = range.match(/^bytes=(\d+)-(\d+)$|^bytes=-(\d+)$/);
  if (!match) throw new Error("Unexpected range request");
  const start = match[1] === undefined
    ? Math.max(0, bytes.length - Number(match[3]))
    : Number(match[1]);
  const end = Math.min(
    bytes.length - 1,
    match[2] === undefined ? bytes.length - 1 : Number(match[2]),
  );
  const body = bytes.slice(start, end + 1);
  return {
    ContentRange: `bytes ${start}-${end}/${bytes.length}`,
    Body: { transformToByteArray: async () => body },
  };
}

function createAudioReadinessClient(audioBytes, audioRanges = []) {
  return {
    send: async (command) => {
      if (command instanceof ListObjectsV2Command) {
        return {
          Contents: [
            { Key: "الإنجيل/العهد الجديد/مرقس/1.txt" },
            { Key: "الإنجيل/العهد الجديد/مرقس/1.MP3" },
          ],
          IsTruncated: false,
        };
      }
      if (command instanceof GetObjectCommand && command.input.Key.endsWith(".txt")) {
        return { Body: { transformToString: async () => "نص الإصحاح" } };
      }
      if (command instanceof GetObjectCommand) {
        audioRanges.push(command.input.Range);
        return rangeResponse(audioBytes, command.input.Range);
      }
      throw new Error(`Unexpected storage command ${command.constructor.name}`);
    },
  };
}

function createTextReadinessClient(text) {
  return {
    send: async (command) => {
      if (command instanceof ListObjectsV2Command) {
        return {
          Contents: [{ Key: "الإنجيل/العهد الجديد/مرقس/1.txt" }],
          IsTruncated: false,
        };
      }
      if (command instanceof GetObjectCommand) {
        return { Body: { transformToString: async () => text } };
      }
      throw new Error(`Unexpected storage command ${command.constructor.name}`);
    },
  };
}

function createStorageClient(keys, text = "نص الإصحاح", timing = "") {
  return {
    send: async (command) => {
      if (command instanceof ListObjectsV2Command) {
        return { Contents: keys.map((Key) => ({ Key })), IsTruncated: false };
      }
      if (command instanceof GetObjectCommand) {
        const content = command.input.Key?.toLowerCase().endsWith(".vtt") ? timing : text;
        return { Body: { transformToString: async () => content } };
      }
      throw new Error(`Unexpected storage command ${command.constructor.name}`);
    },
  };
}

async function requestBibleChapter(path, { keys = markChapterKeys, text, timing, signer } = {}) {
  const app = express();
  app.use((req, _res, next) => {
    req.log = { error: () => undefined };
    next();
  });
  const client = createStorageClient(keys, text, timing);
  app.use(
    "/api",
    createBibleRouter({
      getStorageConfig: () => ({ bucket: "bible-files", client }),
      signAudioUrl: signer,
    }),
  );
  app.use((error, _req, res, _next) => {
    res.status(500).json({ error: error.message });
  });
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: response.status, payload: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function numberedChapterText(verseCount) {
  return Array.from({ length: verseCount }, (_, index) => `${index + 1}. نص الآية ${index + 1}`).join("\n");
}

function numberedVtt(verseCount, startOffset = 1) {
  return [
    "WEBVTT",
    ...Array.from({ length: verseCount }, (_, index) => {
      const start = startOffset + index * 2;
      const end = start + 2;
      return `\n00:00:${String(start).padStart(2, "0")}.000 --> 00:00:${String(end).padStart(2, "0")}.000\nنص توقيت الآية ${index + 1}`;
    }),
  ].join("\n");
}

test("chapter assets pair Arabic book-folder text with the exact-case MP3 key", () => {
  assert.deepEqual(findBibleChapterAssets(markChapterKeys, "mark", 1), {
    textKey: "الإنجيل/العهد الجديد/مرقس/1.txt",
    audioKey: "الإنجيل/العهد الجديد/مرقس/1.MP3",
  });
});

test("chapter lookup keeps supplied text visible when audio is missing and resolves English folders", () => {
  assert.equal(
    findBibleChapterAssets(
      ["Bible/New Testament/Acts/1.txt", "Bible/New Testament/Acts/1.mp3"],
      "acts",
      1,
    )?.audioKey,
    "Bible/New Testament/Acts/1.mp3",
  );
  assert.deepEqual(findBibleChapterAssets(["Bible/Mark/1.txt"], "mark", 1), {
    textKey: "Bible/Mark/1.txt",
  });
});

test("chapter lookup rejects ambiguous folders instead of serving a mismatched copy", () => {
  assert.throws(
    () =>
      findBibleChapterAssets(
        [
          "first/مرقس/1.txt",
          "first/مرقس/1.MP3",
          "second/مرقس/1.txt",
          "second/مرقس/1.MP3",
        ],
        "mark",
        1,
      ),
    /More than one folder/,
  );
});

test("Bible readiness scan checks all 66 books and reports missing pairs safely", () => {
  const report = scanBibleChapterReadiness([
    "الإنجيل/العهد الجديد/مرقس/1.txt",
    "الإنجيل/العهد الجديد/متى/1.MP3",
  ]);

  assert.equal(report.checkedChapters, 1189);
  assert.deepEqual(report.issues.filter((issue) => issue.book === "matthew").slice(0, 3), [
    { book: "matthew", chapter: 1, missing: ["text"] },
    { book: "matthew", chapter: 2, missing: ["text", "audio"] },
    { book: "matthew", chapter: 3, missing: ["text", "audio"] },
  ]);
  assert.ok(
    report.issues.some(
      (issue) =>
        issue.book === "mark" &&
        issue.chapter === 1 &&
        JSON.stringify(issue.missing) === JSON.stringify(["audio"]),
    ),
  );
  assert.ok(!JSON.stringify(report).includes("MP3"));
  assert.ok(!JSON.stringify(report).includes("signed"));
});

test("Old Testament Arabic folders resolve and chapter limits are enforced", async () => {
  const files = [
    "الإنجيل/العهد القديم/التكوين/1.txt",
    "الإنجيل/العهد القديم/التكوين/1.MP3",
  ];
  assert.deepEqual(findBibleChapterAssets(files, "genesis", 1), {
    textKey: files[0],
    audioKey: files[1],
  });
  const result = await requestBibleChapter("/api/bible/genesis/51", { keys: files });
  assert.equal(result.status, 400);
  assert.match(result.payload.error, /1 to 50/);
});

test("Bible readiness scan honors the configured Matthew object prefix", () => {
  const report = scanBibleChapterReadiness(
    [
      "old/متى/1.txt",
      "old/متى/1.MP3",
      "current/متى/1.txt",
      "current/متى/1.MP3",
    ],
    "current",
  );

  assert.deepEqual(report.issues.find((issue) => issue.book === "matthew" && issue.chapter === 2), {
    book: "matthew",
    chapter: 2,
    missing: ["text", "audio"],
  });
});

test("Bible readiness check catches empty text and failed ranged audio reads safely", async () => {
  const keys = [
    "الإنجيل/العهد الجديد/مرقس/1.txt",
    "الإنجيل/العهد الجديد/مرقس/1.MP3",
  ];
  const commands = [];
  const client = {
    send: async (command) => {
      commands.push(command);
      if (command instanceof ListObjectsV2Command) {
        return { Contents: keys.map((Key) => ({ Key })), IsTruncated: false };
      }
      if (command instanceof GetObjectCommand && command.input.Key.endsWith(".txt")) {
        return { Body: { transformToString: async () => " \n\t" } };
      }
      if (command instanceof GetObjectCommand) {
        throw new Error("private storage path and credentials must not appear in report");
      }
      throw new Error(`Unexpected storage command ${command.constructor.name}`);
    },
  };

  const report = await runBibleStorageReadinessCheck({
    getStorageConfig: () => ({ bucket: "bible-files", client }),
  });
  const chapterIssues = report.issues.filter(
    (issue) => issue.book === "mark" && issue.chapter === 1 && "problem" in issue,
  );
  assert.deepEqual(
    chapterIssues.map((issue) => issue.problem).sort(),
    ["empty_text", "unreadable_audio"],
  );
  assert.ok(!JSON.stringify(report).includes("private storage path"));
  assert.ok(
    commands.some(
      (command) =>
        command instanceof GetObjectCommand &&
        command.input.Key.endsWith(".MP3") &&
        command.input.Range === "bytes=0-65535",
    ),
  );
});

test("Bible readiness accepts chapter prose without requiring a verse punctuation style", async () => {
  const validChapterFormats = [
    "1. In the beginning God created the heaven and the earth.\n2. And the earth was without form.",
    "١ ـ فِي الْبَدْءِ خَلَقَ اللهُ السَّمَاوَاتِ وَالْأَرْضَ\n٢ ـ وَكَانَتِ الْأَرْضُ خَرِبَةً",
    "In the beginning God created the heaven and the earth. And the earth was without form.",
    "في البدء خلق الله السموات والأرض وكان النور",
  ];

  for (const text of validChapterFormats) {
    const report = await runBibleStorageReadinessCheck({
      getStorageConfig: () => ({
        bucket: "bible-files",
        client: createTextReadinessClient(text),
      }),
    });
    assert.ok(
      !report.issues.some(
        (issue) =>
          issue.book === "mark" &&
          issue.chapter === 1 &&
          "problem" in issue &&
          issue.problem === "unusable_text",
      ),
      `expected this chapter format to pass: ${text}`,
    );
  }
});

test("Bible readiness reports non-empty unusable chapter text without exposing its contents", async () => {
  const unusableSamples = [
    "123. — …",
    "placeholder",
    "TODO",
    "lorem ipsum",
    "N/A",
    "نص",
  ];

  for (const text of unusableSamples) {
    const report = await runBibleStorageReadinessCheck({
      getStorageConfig: () => ({
        bucket: "bible-files",
        client: createTextReadinessClient(text),
      }),
    });
    const issue = report.issues.find(
      (entry) =>
        entry.book === "mark" &&
        entry.chapter === 1 &&
        "problem" in entry &&
        entry.problem === "unusable_text",
    );
    assert.deepEqual(issue, {
      book: "mark",
      chapter: 1,
      problem: "unusable_text",
    });
    assert.deepEqual(Object.keys(issue).sort(), ["book", "chapter", "problem"]);
    assert.ok(!JSON.stringify(issue).includes(text));
  }
});

test("Bible readiness check accepts a valid MP3 using bounded ranged GETs", async () => {
  const audioRanges = [];
  const report = await runBibleStorageReadinessCheck({
    getStorageConfig: () => ({
      bucket: "bible-files",
      client: createAudioReadinessClient(makeMp3(200), audioRanges),
    }),
  });
  assert.deepEqual(
    report.issues.filter(
      (issue) => issue.book === "mark" && issue.chapter === 1 && "problem" in issue,
    ),
    [],
  );
  assert.deepEqual(audioRanges, ["bytes=0-65535", "bytes=-65536"]);
  assert.ok(audioRanges.every((range) => range.startsWith("bytes=")));
});

test("Bible readiness check rejects non-audio and truncated MP3 objects safely", async () => {
  const damagedSamples = [
    new TextEncoder().encode("not an MP3 recording"),
    makeMp3(200).slice(0, makeMp3(200).length - 12),
  ];

  for (const audioBytes of damagedSamples) {
    const report = await runBibleStorageReadinessCheck({
      getStorageConfig: () => ({
        bucket: "bible-files",
        client: createAudioReadinessClient(audioBytes),
      }),
    });
    const issue = report.issues.find(
      (entry) =>
        entry.book === "mark" &&
        entry.chapter === 1 &&
        "problem" in entry,
    );
    assert.deepEqual(issue, {
      book: "mark",
      chapter: 1,
      problem: "unreadable_audio",
    });
    assert.deepEqual(Object.keys(issue).sort(), ["book", "chapter", "problem"]);
  }
});

test("Bible readiness scan reports ambiguous folders without stopping the full scan", () => {
  const report = scanBibleChapterReadiness([
    "first/Mark/1.txt",
    "second/Mark/1.txt",
  ]);

  assert.equal(report.checkedChapters, 1189);
  assert.ok(
    report.issues.some(
      (issue) =>
        issue.book === "mark" &&
        issue.chapter === 1 &&
        issue.problem === "ambiguous",
    ),
  );
  assert.ok(
    report.issues.some(
      (issue) =>
        issue.book === "revelation" &&
        issue.chapter === 22 &&
        "missing" in issue,
    ),
  );
});

test("the Bible endpoint returns chapter text and signs its matching recording", async () => {
  let signedKey;
  let signedLifetime;
  const result = await requestBibleChapter("/api/bible/mark/1", {
    signer: async (_client, command, options) => {
      signedKey = command.input.Key;
      signedLifetime = options.expiresIn;
      return "https://storage.example/signed-mark-1";
    },
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.payload, {
    book: "mark",
    chapter: 1,
    text: "نص الإصحاح",
    audioUrl: "https://storage.example/signed-mark-1",
    audioUrlExpiresIn: 3600,
  });
  assert.equal(signedKey, "الإنجيل/العهد الجديد/مرقس/1.MP3");
  assert.equal(signedLifetime, 3600);
});

test("the Bible endpoint distinguishes invalid chapter numbers from missing files", async () => {
  const invalidChapter = await requestBibleChapter("/api/bible/mark/17");
  const missingFiles = await requestBibleChapter("/api/bible/mark/2");

  assert.equal(invalidChapter.status, 400);
  assert.equal(missingFiles.status, 404);
});

test("the Bible endpoint serves supplied chapter text without requiring its recording", async () => {
  let signingAttempted = false;
  const result = await requestBibleChapter("/api/bible/mark/1", {
    keys: ["الإنجيل/العهد الجديد/مرقس/1.txt"],
    signer: async () => {
      signingAttempted = true;
      return "https://storage.example/unused";
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload.text, "نص الإصحاح");
  assert.equal(result.payload.audioUrl, null);
  assert.equal(signingAttempted, false);
});

test("the Bible endpoint returns optional verse timings from the matching WebVTT file", async () => {
  const timingKey = "الإنجيل/العهد الجديد/مرقس/1.vtt";
  const result = await requestBibleChapter("/api/bible/mark/1", {
    keys: [...markChapterKeys, timingKey],
    text: "1. نص الآية الأولى",
    timing: "WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nالآية الأولى\n",
    signer: async () => "https://storage.example/signed-mark-1",
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.payload.verses, [
    { number: 1, text: "نص الآية الأولى", startTime: 1, endTime: 3.5 },
  ]);
});

test("timings are not applied when the chapter text cannot be split into full verses", async () => {
  const result = await requestBibleChapter("/api/bible/mark/1", {
    keys: [...markChapterKeys, "الإنجيل/العهد الجديد/مرقس/1.vtt"],
    text: "نص الإصحاح غير المقسم إلى آيات",
    timing: numberedVtt(1),
    signer: async () => "https://storage.example/signed-mark-1",
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload.audioUrl, "https://storage.example/signed-mark-1");
  assert.equal(result.payload.verses, undefined);
});

test("WebVTT timings are supported for books beyond Matthew and use the chapter's full verse text", async () => {
  const verseCount = 23;
  const result = await requestBibleChapter("/api/bible/mark/2", {
    keys: [
      "الإنجيل/العهد الجديد/مرقس/2.txt",
      "الإنجيل/العهد الجديد/مرقس/2.MP3",
      "الإنجيل/العهد الجديد/مرقس/2.vtt",
    ],
    text: numberedChapterText(verseCount),
    timing: numberedVtt(verseCount, 10),
    signer: async () => "https://storage.example/mark-2",
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload.verses.length, verseCount);
  assert.deepEqual(result.payload.verses[0], {
    number: 1,
    text: "نص الآية 1",
    startTime: 10,
    endTime: 12,
  });
});

test("an incomplete WebVTT does not generate misleading timings for any recording", async () => {
  const verseCount = 23;
  const result = await requestBibleChapter("/api/bible/matthew/2", {
    keys: [
      "الإنجيل/العهد الجديد/متى/2.txt",
      "الإنجيل/العهد الجديد/متى/2.MP3",
      "الإنجيل/العهد الجديد/متى/2.vtt",
    ],
    text: numberedChapterText(verseCount),
    timing: numberedVtt(1, 10),
    signer: async () => "https://storage.example/matthew-2",
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload.audioUrl, "https://storage.example/matthew-2");
  assert.equal(result.payload.verses, undefined);
});

test("timing sidecars are ignored when their matching chapter recording is missing", async () => {
  const result = await requestBibleChapter("/api/bible/matthew/2", {
    keys: [
      "الإنجيل/العهد الجديد/متى/2.txt",
      "الإنجيل/العهد الجديد/متى/2.vtt",
    ],
    text: numberedChapterText(23),
    timing: numberedVtt(23),
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload.audioUrl, null);
  assert.equal(result.payload.verses, undefined);
});

test("Matthew chapter one keeps audio available without highlighting when no WebVTT exists", async () => {
  const chapterText = [
    "متى — الإصحاح 1",
    ...Array.from({ length: 25 }, (_, index) => `${index + 1}. نص الآية ${index + 1}`),
  ].join("\n");
  const result = await requestBibleChapter("/api/bible/matthew/1", {
    text: chapterText,
    signer: async () => "https://storage.example/signed-matthew-1",
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload.audioUrl, "https://storage.example/signed-matthew-1");
  assert.equal(result.payload.verses, undefined);
});
