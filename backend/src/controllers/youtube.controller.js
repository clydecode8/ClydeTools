import crypto from "crypto";
import fs from "fs";
import path from "path";
import ytDlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";

const runtimeDirectory = path.resolve("runtime");

fs.mkdirSync(runtimeDirectory, {
  recursive: true,
});

/*
Temporary in-memory job storage.

This is suitable for local development or one backend instance.
For multiple production servers, use Redis or a database instead.
*/
const jobs = new Map();

function isValidYoutubeUrl(value) {
  try {
    const parsedUrl = new URL(value);

    return [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
    ].includes(parsedUrl.hostname);
  } catch {
    return false;
  }
}

function inspectYoutubeUrl(value) {
  const parsedUrl = new URL(value);

  const playlistId = parsedUrl.searchParams.get("list");

  const isPlaylistPage =
    parsedUrl.pathname === "/playlist" && Boolean(playlistId);

  const isVideoInsidePlaylist =
    parsedUrl.pathname === "/watch" &&
    parsedUrl.searchParams.has("v") &&
    Boolean(playlistId);

  return {
    isPlaylist: isPlaylistPage,
    isVideoInsidePlaylist,
    playlistId,
  };
}

function cleanSingleVideoUrl(value) {
  const parsedUrl = new URL(value);

  parsedUrl.searchParams.delete("list");
  parsedUrl.searchParams.delete("index");
  parsedUrl.searchParams.delete("start_radio");

  return parsedUrl.toString();
}

function createJob({ url, format }) {
  const id = crypto.randomUUID();

  const job = {
    id,
    url,
    format,
    progress: 0,
    phase: "queued",
    status: "processing",
    error: null,
    outputPath: null,
    filename: null,
    createdAt: Date.now(),

    // Connected SSE clients
    listeners: new Set(),
  };

  jobs.set(id, job);

  return job;
}

function updateProgressFromText(job, text) {
  const lines = text.split(/\r?\n/);
  let changed = false;

  for (const line of lines) {
    const progressMatch = line.match(
      /\[download\]\s+(\d{1,3}(?:\.\d+)?)%/
    );

    if (progressMatch) {
      const percentage = Math.min(
        94,
        Math.max(0, Number(progressMatch[1]))
      );

      const nextProgress = Math.max(
        job.progress,
        percentage
      );

      if (
        nextProgress !== job.progress ||
        job.phase !== "downloading"
      ) {
        job.progress = nextProgress;
        job.phase = "downloading";
        changed = true;
      }
    }

    if (
      line.includes("[Merger]") ||
      line.includes("[ExtractAudio]") ||
      line.includes("Post-process")
    ) {
      const nextPhase =
        job.format === "mp3"
          ? "converting audio"
          : "merging video and audio";

      if (
        job.progress < 95 ||
        job.phase !== nextPhase
      ) {
        job.progress = Math.max(job.progress, 95);
        job.phase = nextPhase;
        changed = true;
      }
    }
  }

  if (changed) {
    sendJobUpdate(job);
  }
}

function findFinishedFile(fileId, format) {
  const expectedExtension = format === "mp3" ? ".mp3" : ".mp4";

  const matchingFile = fs
    .readdirSync(runtimeDirectory)
    .find(
      (filename) =>
        filename.startsWith(fileId) &&
        filename.endsWith(expectedExtension)
    );

  if (!matchingFile) {
    return null;
  }

  return path.join(runtimeDirectory, matchingFile);
}

async function processJob(job) {
  const fileId = job.id;

  const outputTemplate = path.join(
    runtimeDirectory,
    `${fileId}.%(ext)s`
  );

  const commonOptions = {
    noPlaylist: true,
    newline: true,
    ffmpegLocation: ffmpegPath,
    output: outputTemplate,
  };

  const options =
    job.format === "mp3"
      ? {
          ...commonOptions,
          extractAudio: true,
          audioFormat: "mp3",
          audioQuality: "0",
          format: "bestaudio/best",
        }
      : {
          ...commonOptions,
          format:
            "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
          mergeOutputFormat: "mp4",
        };

    try {
        job.phase = "starting";
        job.progress = 1;
        sendJobUpdate(job);

        const subprocess = ytDlp.exec(job.url, options);

        subprocess.stdout?.on("data", (chunk) => {
            updateProgressFromText(job, chunk.toString());
        });

        subprocess.stderr?.on("data", (chunk) => {
            const text = chunk.toString();

            updateProgressFromText(job, text);

            console.log(`[yt-dlp ${job.id}]`, text.trim());
        });

        await subprocess;

        const outputPath = findFinishedFile(fileId, job.format);

        if (!outputPath) {
            throw new Error(
                `The ${job.format.toUpperCase()} output file was not created.`
            );
        }

        job.outputPath = outputPath;
        job.filename =
        job.format === "mp3"
            ? `clydetools-${fileId}.mp3`
            : `clydetools-${fileId}.mp4`;

        job.progress = 100;
        job.phase = "ready";
        job.status = "completed";
        sendJobUpdate(job);

    } catch (error) {
        console.error("Conversion failed:", error);

        job.status = "failed";
        job.phase = "failed";
        job.error =
        error.stderr ||
        error.shortMessage ||
        error.message ||
        "Conversion failed.";
        deleteJobFiles(job.id);
        sendJobUpdate(job);
    }
}

function cleanupFinishedJobs() {
  for (const [jobId, job] of jobs.entries()) {
    const isFinished =
      job.status === "completed" ||
      job.status === "failed";

    if (!isFinished) {
      continue;
    }

    deleteJobFiles(jobId);
    jobs.delete(jobId);

    console.log(
      `Deleted previous ${job.status} job: ${jobId}`
    );
  }
}

function deleteJobFiles(jobId) {
  if (!fs.existsSync(runtimeDirectory)) {
    return;
  }

  const files = fs.readdirSync(runtimeDirectory);

  for (const filename of files) {
    if (!filename.startsWith(jobId)) {
      continue;
    }

    const filePath = path.join(runtimeDirectory, filename);

    try {
      fs.rmSync(filePath, {
        force: true,
        recursive: true,
      });

      console.log(`Deleted temporary file: ${filePath}`);
    } catch (error) {
      console.error(
        `Unable to delete temporary file ${filePath}:`,
        error
      );
    }
  }
}

export async function inspectUrl(req, res) {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
        return res.status(400).json({
        message: "A YouTube URL is required.",
        });
    }

    if (!isValidYoutubeUrl(url.trim())) {
        return res.status(400).json({
        message: "Please enter a valid YouTube URL.",
        });
    }

    const result = inspectYoutubeUrl(url.trim());

    return res.json(result);
}

export async function startConversion(req, res) {
    const { url, format } = req.body;

    if (!url || typeof url !== "string") {
        return res.status(400).json({
        message: "A YouTube URL is required.",
        });
    }

    if (!["mp3", "mp4"].includes(format)) {
        return res.status(400).json({
        message: "Format must be MP3 or MP4.",
        });
    }

    const trimmedUrl = url.trim();

    if (!isValidYoutubeUrl(trimmedUrl)) {
        return res.status(400).json({
        message: "Please enter a valid YouTube URL.",
        });
    }

    const urlDetails = inspectYoutubeUrl(trimmedUrl);

    /*
    Reject a direct playlist URL.

    A watch URL containing list=... is allowed, but the playlist
    parameters are removed so only the selected video is processed.
    */
    if (urlDetails.isPlaylist) {
        return res.status(400).json({
        code: "PLAYLIST_NOT_SUPPORTED",
        message:
            "This is a playlist URL. Add the individual video links instead.",
        });
    }

    const cleanUrl = urlDetails.isVideoInsidePlaylist
        ? cleanSingleVideoUrl(trimmedUrl)
        : trimmedUrl;

    cleanupFinishedJobs();
    const job = createJob({
        url: cleanUrl,
        format,
    });

    processJob(job);

    return res.status(202).json({
        jobId: job.id,
        progress: job.progress,
        status: job.status,
        wasInsidePlaylist: urlDetails.isVideoInsidePlaylist,
    });
}

export function getConversionProgress(req, res) {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      message: "Conversion job not found.",
    });
  }

  return res.json({
    jobId: job.id,
    format: job.format,
    progress: Math.round(job.progress),
    phase: job.phase,
    status: job.status,
    error: job.error,
    ready: job.status === "completed",
  });
}

export function downloadConversion(req, res) {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      message: "Conversion job not found.",
    });
  }

  if (job.status !== "completed" || !job.outputPath) {
    return res.status(409).json({
      message: "The file is not ready yet.",
    });
  }

  if (!fs.existsSync(job.outputPath)) {
    deleteJobsFiles(job.id);
    jobs.delete(job.id);

    return res.status(404).json({
      message: "The generated file no longer exists.",
    });
  }

  res.download(
    job.outputPath,
    job.filename,
    (downloadError) => {
      if (downloadError) {
        console.error("Unable to send download:", downloadError);
      }

      fs.rm(job.outputPath, { force: true }, () => {});
      jobs.delete(job.id);
    }
  );
}

function sendJobUpdate(job) {
  if (!job.listeners) {
    return;
  }

  const payload = JSON.stringify({
    jobId: job.id,
    format: job.format,
    progress: Math.round(job.progress),
    phase: job.phase,
    status: job.status,
    error: job.error,
    ready: job.status === "completed",
  });

  for (const response of job.listeners) {
    response.write(`data: ${payload}\n\n`);
  }

  if (
    job.status === "completed" ||
    job.status === "failed"
  ) {
    for (const response of job.listeners) {
      response.end();
    }

    job.listeners.clear();
  }
}

export function streamConversionProgress(req, res) {
    const job = jobs.get(req.params.jobId);

    if (!job) {
        return res.status(404).json({
        message: "Conversion job not found.",
        });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    /*
    Prevent proxies from buffering the event stream.
    This is especially useful when deploying behind Nginx.
    */
    res.setHeader("X-Accel-Buffering", "no");

    res.flushHeaders?.();

    job.listeners.add(res);

    // Immediately send the current state.
    const initialPayload = JSON.stringify({
        jobId: job.id,
        format: job.format,
        progress: Math.round(job.progress),
        phase: job.phase,
        status: job.status,
        error: job.error,
        ready: job.status === "completed",
    });

    res.write(`data: ${initialPayload}\n\n`);

    /*
    Keep the connection alive through proxies and hosting services.
    This is not a new HTTP request; it is data on the existing connection.
    */
    const heartbeat = setInterval(() => {
        res.write(": keep-alive\n\n");
    }, 15000);

    req.on("close", () => {
        clearInterval(heartbeat);
        job.listeners.delete(res);
    });
}