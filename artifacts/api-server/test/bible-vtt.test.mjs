import assert from "node:assert/strict";
import test from "node:test";
import { parseBibleWebVtt } from "../src/lib/bible-vtt.ts";

test("WebVTT verse cues become numbered text segments with playback times", () => {
  const verses = parseBibleWebVtt(
    "WEBVTT\n\n1\n00:00:01.250 --> 00:00:03.000\nالآية الأولى\n\n2\n00:00:03.000 --> 00:00:05.500\nالآية الثانية &amp; تتمتها\n",
  );

  assert.deepEqual(verses, [
    { number: 1, text: "الآية الأولى", startTime: 1.25, endTime: 3 },
    { number: 2, text: "الآية الثانية & تتمتها", startTime: 3, endTime: 5.5 },
  ]);
});

test("WebVTT parser rejects the entire sidecar when any cue is malformed or empty", () => {
  const verses = parseBibleWebVtt(
    "WEBVTT\n\n00:00:02.000 --> 00:00:01.000\nbad time order\n\n00:00:03.000 --> 00:00:04.000\n\n00:00:04.000 --> 00:00:05.000\nvalid cue\n",
  );

  assert.deepEqual(verses, []);
});

test("WebVTT parser rejects overlapping cues and out-of-order numbered verses", () => {
  assert.deepEqual(
    parseBibleWebVtt(
      "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nfirst\n\n00:00:02.000 --> 00:00:04.000\nsecond",
    ),
    [],
  );
  assert.deepEqual(
    parseBibleWebVtt(
      "WEBVTT\n\n2\n00:00:01.000 --> 00:00:03.000\nfirst\n\n1\n00:00:03.000 --> 00:00:04.000\nsecond",
    ),
    [],
  );
});

test("WebVTT parser requires a valid header and keeps gaps between cues", () => {
  assert.deepEqual(parseBibleWebVtt("00:00:01.000 --> 00:00:02.000\nverse"), []);
  assert.deepEqual(
    parseBibleWebVtt(
      "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nfirst\n\n00:00:03.000 --> 00:00:04.000\nsecond",
    ).map(({ startTime, endTime }) => [startTime, endTime]),
    [[1, 2], [3, 4]],
  );
});
