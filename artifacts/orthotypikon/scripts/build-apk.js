const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { pipeline } = require("stream/promises");
const { Readable } = require("stream");
const {
  normalizeRuntimeDomain,
  verifyContactApiBundle,
} = require("./contact-api-config");

const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "../..");
const appConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "app.json"), "utf8"),
);
const gradleUserHome = path.join(projectRoot, ".gradle-home");
const version = appConfig.expo?.version || "0.0.0";
const packageName = appConfig.expo?.android?.package;
const versionCode = appConfig.expo?.android?.versionCode;
const sdkRoot = path.resolve(
  process.env.ANDROID_HOME || path.join(projectRoot, ".android-sdk"),
);
const commandLineToolsVersion = "13114758";
const commandLineToolsUrl = `https://dl.google.com/android/repository/commandlinetools-linux-${commandLineToolsVersion}_latest.zip`;
const outputDir = path.join(projectRoot, "dist");
const outputName = `OrthoTypikon-${version}-release.apk`;
const outputPath = path.join(outputDir, outputName);

function fail(message) {
  console.error(`\nAPK build failed: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0)
    fail(`${command} exited with status ${result.status}`);
}

function commandExists(command) {
  return (
    spawnSync("sh", ["-c", `command -v ${command}`], { stdio: "ignore" })
      .status === 0
  );
}

function findSdkManager() {
  const candidates = [
    process.env.SDKMANAGER,
    path.join(sdkRoot, "cmdline-tools", "latest", "bin", "sdkmanager"),
    path.join(
      sdkRoot,
      "cmdline-tools",
      `cmdline-tools-${commandLineToolsVersion}`,
      "bin",
      "sdkmanager",
    ),
    path.join(sdkRoot, "tools", "bin", "sdkmanager"),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function download(url, destination) {
  if (fs.existsSync(destination) && fs.statSync(destination).size > 1_000_000)
    return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  console.log(`Downloading Android command-line tools...`);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  if (!response.ok || !response.body)
    fail(
      `Could not download Android command-line tools (HTTP ${response.status})`,
    );
  await pipeline(
    Readable.fromWeb(response.body),
    fs.createWriteStream(destination),
  );
  if (!fs.existsSync(destination) || fs.statSync(destination).size === 0)
    fail("Downloaded Android command-line tools are empty");
}

function ensureSdkManager() {
  const existing =
    findSdkManager() || (commandExists("sdkmanager") ? "sdkmanager" : null);
  if (existing) return existing;

  const archive = path.join(
    sdkRoot,
    "cache",
    `commandlinetools-${commandLineToolsVersion}.zip`,
  );
  const bootstrapDir = path.join(sdkRoot, "cmdline-tools");
  const extractedDir = path.join(bootstrapDir, "latest");
  fs.mkdirSync(bootstrapDir, { recursive: true });
  return download(commandLineToolsUrl, archive).then(() => {
    fs.mkdirSync(extractedDir, { recursive: true });
    run("unzip", [
      "-q",
      "-o",
      archive,
      "-d",
      path.join(sdkRoot, "cmdline-tools"),
    ]);
    const nestedDir = path.join(sdkRoot, "cmdline-tools", "cmdline-tools");
    if (fs.existsSync(nestedDir)) {
      fs.rmSync(extractedDir, { recursive: true, force: true });
      fs.renameSync(nestedDir, extractedDir);
    }
    const sdkmanager = path.join(extractedDir, "bin", "sdkmanager");
    if (!fs.existsSync(sdkmanager))
      fail(`Android sdkmanager was not found after extracting ${archive}`);
    return sdkmanager;
  });
}

function configureRuntimeDomain() {
  let apiHost;
  try {
    apiHost = normalizeRuntimeDomain(process.env.EXPO_PUBLIC_DOMAIN);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  process.env.EXPO_PUBLIC_DOMAIN = apiHost;
  console.log(`Using public API domain: ${apiHost}`);
  return apiHost;
}

async function installSdkComponents(sdkmanager) {
  const sdkArgs = [
    "--sdk_root=" + sdkRoot,
    "platform-tools",
    "platforms;android-36",
    "build-tools;36.0.0",
    "ndk;27.1.12297006",
    "cmake;3.22.1",
  ];
  console.log("Accepting Android SDK licenses...");
  const license = spawnSync(
    "sh",
    ["-c", `yes | "${sdkmanager}" --sdk_root="${sdkRoot}" --licenses`],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: { ...process.env, ANDROID_HOME: sdkRoot, ANDROID_SDK_ROOT: sdkRoot },
    },
  );
  if (license.status !== 0)
    fail(`Android SDK license setup exited with status ${license.status}`);
  run(sdkmanager, sdkArgs, {
    env: { ...process.env, ANDROID_HOME: sdkRoot, ANDROID_SDK_ROOT: sdkRoot },
  });
}

function limitNativeBuildConcurrency() {
  const ninjaPath = path.join(sdkRoot, "cmake", "3.22.1", "bin", "ninja");
  const originalNinjaPath = `${ninjaPath}.original`;
  if (!fs.existsSync(originalNinjaPath)) {
    if (!fs.existsSync(ninjaPath)) {
      fail(`Android Ninja was not found at ${ninjaPath}`);
    }
    const prefix = fs.readFileSync(ninjaPath).subarray(0, 2).toString();
    if (prefix === "#!") {
      fail("Android Ninja wrapper exists without its original binary");
    }
    fs.renameSync(ninjaPath, originalNinjaPath);
  }

  const wrapper = `#!/bin/sh\nexec "${originalNinjaPath}" -j2 "$@"\n`;
  fs.writeFileSync(ninjaPath, wrapper, { mode: 0o755 });
  fs.chmodSync(ninjaPath, 0o755);
  console.log("Limiting Android native compilation to two Ninja jobs.");
}

function listApkEntries(apkPath) {
  const result = spawnSync("unzip", ["-Z1", apkPath], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) fail(`Could not list APK contents: ${result.error.message}`);
  if (result.status !== 0)
    fail(
      `Could not list APK contents: ${
        result.stderr || `unzip exited with status ${result.status}`
      }`,
    );
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function extractApkEntry(apkPath, entryPath, destination) {
  const destinationFd = fs.openSync(destination, "w");
  let result;
  try {
    result = spawnSync("unzip", ["-p", apkPath, entryPath], {
      cwd: projectRoot,
      stdio: ["ignore", destinationFd, "pipe"],
      maxBuffer: 5 * 1024 * 1024,
    });
  } finally {
    fs.closeSync(destinationFd);
  }

  if (result.error) fail(`Could not extract ${entryPath} from APK: ${result.error.message}`);
  if (result.status !== 0) {
    fail(
      `Could not extract ${entryPath} from APK: ${
        result.stderr?.toString() || `unzip exited with status ${result.status}`
      }`,
    );
  }
}

function verifyRemovedHymn(apkPath, entries) {
  const removedHymnSha256 = "3a06c6dab5f4b0f85416e7a4697f8d2a2f2da88774c77ec64100f37ecad016cd";
  const mp3Entries = entries.filter((entry) => /\.mp3$/i.test(entry));
  const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "orthotypikon-apk-check-"));
  const extractedAudioPath = path.join(temporaryDir, "candidate.mp3");
  try {
    for (const entry of mp3Entries) {
      extractApkEntry(apkPath, entry, extractedAudioPath);
      const sha256 = crypto.createHash("sha256").update(fs.readFileSync(extractedAudioPath)).digest("hex");
      if (sha256 === removedHymnSha256) fail("APK still contains the removed hymn audio file");
    }
  } finally {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
  }
  console.log("Verified removed hymn audio is not bundled.");
}

function verifyNativeLibraryArchitectures(entries) {
  const libraryEntries = entries.filter((entry) => entry.startsWith("lib/"));
  const invalidEntries = libraryEntries.filter((entry) => {
    if (entry === "lib/" || entry === "lib/arm64-v8a/") return false;
    if (entry.endsWith("/")) return true;
    return !/^lib\/arm64-v8a\/[^/]+\.so$/.test(entry);
  });
  if (invalidEntries.length > 0) {
    fail(
      `APK contains native libraries outside the intended arm64-v8a ABI: ${invalidEntries.join(
        ", ",
      )}`,
    );
  }

  const sharedLibraries = libraryEntries.filter((entry) =>
    /^lib\/arm64-v8a\/[^/]+\.so$/.test(entry),
  );
  if (sharedLibraries.length === 0)
    fail("APK contains no native libraries for the intended arm64-v8a ABI");
  console.log(
    `Verified ${sharedLibraries.length} native libraries for arm64-v8a only.`,
  );
}

function verifyApkSignature(apkPath) {
  const apksigner = path.join(sdkRoot, "build-tools", "36.0.0", "apksigner");
  if (!fs.existsSync(apksigner) || !fs.statSync(apksigner).isFile())
    fail(`Android SDK apksigner was not found at ${apksigner}`);
  run(apksigner, ["verify", "--verbose", apkPath], {
    env: {
      ...process.env,
      ANDROID_HOME: sdkRoot,
      ANDROID_SDK_ROOT: sdkRoot,
    },
  });
}

function buildNativeAndroid(apiHost) {
  const env = {
    ...process.env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
    GRADLE_USER_HOME: gradleUserHome,
    CMAKE_BUILD_PARALLEL_LEVEL: "2",
    CI: "1",
    NODE_ENV: "production",
  };
  const prebuildArgs = [
    "exec",
    "expo",
    "prebuild",
    "--platform",
    "android",
    "--no-install",
  ];
  if (process.env.APK_PREBUILD_CLEAN !== "0") prebuildArgs.push("--clean");
  run("pnpm", prebuildArgs, { env });
  limitNativeBuildConcurrency();
  run(
    "./gradlew",
    [
      "assembleRelease",
      "--no-daemon",
      "--max-workers=1",
      "-x",
      "lintVitalAnalyzeRelease",
      "-PreactNativeArchitectures=arm64-v8a",
      "-Dorg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=384m",
      "-Dkotlin.compiler.execution.strategy=in-process",
    ],
    {
      cwd: path.join(projectRoot, "android"),
      env,
    },
  );
  return apiHost;
}

function verifyAndCopyApk(apiHost) {
  const sourcePath = path.join(
    projectRoot,
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    "release",
    "app-release.apk",
  );
  if (!fs.existsSync(sourcePath))
    fail(`Gradle completed but no APK was found at ${sourcePath}`);
  const stat = fs.statSync(sourcePath);
  if (stat.size < 100_000)
    fail(`APK is unexpectedly small (${stat.size} bytes)`);
  const header = Buffer.alloc(4);
  const fd = fs.openSync(sourcePath, "r");
  fs.readSync(fd, header, 0, 4, 0);
  fs.closeSync(fd);
  if (header.toString("hex") !== "504b0304")
    fail("Output is not a valid ZIP/APK archive");

  verifyApkSignature(sourcePath);
  const entries = listApkEntries(sourcePath);
  const bundleEntry = "assets/index.android.bundle";
  if (!entries.includes(bundleEntry)) {
    fail(`APK does not contain the Android JavaScript bundle ${bundleEntry}`);
  }
  const bundleDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "orthotypikon-contact-api-check-"),
  );
  const bundlePath = path.join(bundleDir, "index.android.bundle");
  try {
    extractApkEntry(sourcePath, bundleEntry, bundlePath);
    verifyContactApiBundle(fs.readFileSync(bundlePath, "utf8"), apiHost);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    fs.rmSync(bundleDir, { recursive: true, force: true });
  }
  console.log(
    `Verified Android contact API URL: https://${apiHost}/api/contact`,
  );
  verifyRemovedHymn(sourcePath, entries);
  verifyNativeLibraryArchitectures(entries);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.copyFileSync(sourcePath, outputPath);
  const sha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(outputPath))
    .digest("hex");
  const metadata = {
    appName: appConfig.expo?.name,
    packageName,
    version,
    versionCode,
    file: outputName,
    bytes: fs.statSync(outputPath).size,
    sha256,
    architectures: ["arm64-v8a"],
    signing:
      "debug keystore / direct-install build; not Play Store production signing",
  };
  fs.writeFileSync(
    path.join(outputDir, `${outputName}.json`),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  console.log(`\nAPK ready: ${path.relative(workspaceRoot, outputPath)}`);
  console.log(`Size: ${metadata.bytes} bytes`);
  console.log(`SHA-256: ${sha256}`);
}

async function main() {
  const apiHost = configureRuntimeDomain();
  if (packageName !== "com.orthotypikon.app")
    fail(`Unexpected Android package: ${packageName}`);
  if (!Number.isInteger(versionCode) || versionCode < 1)
    fail(`Expected a positive Android versionCode, received ${versionCode}`);
  if (!commandExists("java"))
    fail("Java is required; install a JDK before building");
  if (
    !commandExists("gradle") &&
    !fs.existsSync(path.join(projectRoot, "android", "gradlew"))
  ) {
    fail("Gradle is required to generate the native wrapper");
  }

  fs.mkdirSync(sdkRoot, { recursive: true });
  const sdkmanager = await ensureSdkManager();
  await installSdkComponents(sdkmanager);
  buildNativeAndroid(apiHost);
  verifyAndCopyApk(apiHost);
}

main().catch((error) =>
  fail(error instanceof Error ? error.message : String(error)),
);
