import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  Link2,
  Loader2,
  Music,
  Trash2,
  Video,
  X,
} from "lucide-react";

import {
  getYoutubeDownloadUrl,
  getYoutubeEventUrl,
  getYoutubeProgress,
  startYoutubeConversion,
} from "../services/youtube.service.js";

function splitLinks(value) {
  return [
    ...new Set(
      value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

function createItem(url, format) {
  return {
    localId: crypto.randomUUID(),
    url,
    format,
    jobId: null,
    progress: 0,
    phase: "waiting",
    status: "waiting",
    error: "",
    wasInsidePlaylist: false,
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export default function YoutubeDownloader() {
    const [input, setInput] = useState("");
    const [format, setFormat] = useState("mp4");
    const [items, setItems] = useState([]);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState("");

    function updateItem(localId, changes) {
        setItems((current) =>
        current.map((item) =>
            item.localId === localId
            ? { ...item, ...changes }
            : item
        )
        );
    }

    function monitorJob(item, jobId) {
        return new Promise((resolve) => {
            const eventSource = new EventSource(
            getYoutubeEventUrl(jobId)
            );

            eventSource.onmessage = (event) => {
            try {
                const progressResult = JSON.parse(event.data);

                updateItem(item.localId, {
                progress: progressResult.progress,
                phase: progressResult.phase,
                status: progressResult.status,
                error: progressResult.error || "",
                });

                if (
                progressResult.status === "completed" ||
                progressResult.status === "failed"
                ) {
                eventSource.close();
                resolve();
                }
            } catch {
                updateItem(item.localId, {
                phase: "invalid progress response",
                });
            }
            };

            eventSource.onerror = () => {
            /*
            EventSource automatically reconnects unless it is closed.
            Do not immediately mark the conversion as failed.
            */
            updateItem(item.localId, {
                phase: "reconnecting to server",
            });
            };
        });
}

    async function startOneItem(item) {
        try {
            updateItem(item.localId, {
                status: "starting",
                phase: "checking link",
                error: "",
            });

            const result = await startYoutubeConversion(
                item.url,
                item.format
            );

            updateItem(item.localId, {
                jobId: result.jobId,
                status: "processing",
                phase: "starting",
                progress: 1,
                wasInsidePlaylist: result.wasInsidePlaylist,
            });

            await monitorJob(item, result.jobId);
        } catch (conversionError) {
            updateItem(item.localId, {
            status: "failed",
            phase: "failed",
            error:
                conversionError.message || "Conversion failed.",
            });
        }
    }

    async function handleStart() {
        const links = splitLinks(input);

        setError("");

        if (!links.length) {
        setError("Paste at least one YouTube link.");
        return;
        }

        if (links.length > 10) {
        setError("You can process up to 10 links at one time.");
        return;
        }

        const newItems = links.map((url) =>
        createItem(url, format)
        );

        setItems(newItems);
        setIsStarting(true);

        /*
        Start them sequentially to avoid overloading the computer
        with several simultaneous yt-dlp and FFmpeg processes.
        */
        for (const item of newItems) {
        await startOneItem(item);
        }

        setIsStarting(false);
    }

    function removeItem(localId) {
        setItems((current) =>
        current.filter((item) => item.localId !== localId)
    );
  }

  return (
    <>
      <section className="step-section">
        <h2>
          <span>2</span>
          Add video links
        </h2>

        <div className="youtube-panel">
          <label
            className="youtube-input-label"
            htmlFor="youtube-links"
          >
            YouTube links
          </label>

          <div className="youtube-textarea-wrap">
            <Link2 size={18} />

            <textarea
              id="youtube-links"
              value={input}
              disabled={isStarting}
              rows={5}
              placeholder={
                "Paste one link per line...\nhttps://www.youtube.com/watch?v=...\nhttps://youtu.be/..."
              }
              onChange={(event) => {
                setInput(event.target.value);
                setError("");
              }}
            />
          </div>

          <small className="youtube-help">
            Add one video link per line. A direct playlist URL
            will be rejected.
          </small>
        </div>
      </section>

      <section className="step-section">
        <h2>
          <span>3</span>
          Choose format
        </h2>

        <div className="youtube-format-grid">
          <button
            type="button"
            className={`youtube-format-card ${
              format === "mp4" ? "selected" : ""
            }`}
            disabled={isStarting}
            onClick={() => setFormat("mp4")}
          >
            <Video size={21} />

            <span>
              <strong>MP4 video</strong>
              <small>Video with audio</small>
            </span>

            {format === "mp4" && <Check size={15} />}
          </button>

          <button
            type="button"
            className={`youtube-format-card ${
              format === "mp3" ? "selected" : ""
            }`}
            disabled={isStarting}
            onClick={() => setFormat("mp3")}
          >
            <Music size={21} />

            <span>
              <strong>MP3 audio</strong>
              <small>Audio only</small>
            </span>

            {format === "mp3" && <Check size={15} />}
          </button>
        </div>

        <button
          type="button"
          className="primary-btn"
          disabled={isStarting || !input.trim()}
          onClick={handleStart}
        >
          {isStarting ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <Download size={15} />
          )}

          {isStarting
            ? "Processing links..."
            : "Start conversion"}
        </button>

        {error && (
          <div className="message error">
            <X size={14} />
            {error}
          </div>
        )}
      </section>

      {items.length > 0 && (
        <section className="step-section final-step">
          <h2>
            <span>4</span>
            Conversion progress
          </h2>

          <div className="youtube-job-list">
            {items.map((item, index) => (
              <article
                className="youtube-job"
                key={item.localId}
              >
                <div className="youtube-job-head">
                  <div>
                    <strong>
                      Link {index + 1} ·{" "}
                      {item.format.toUpperCase()}
                    </strong>

                    <small title={item.url}>
                      {item.url}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="youtube-remove"
                    aria-label="Remove item"
                    onClick={() =>
                      removeItem(item.localId)
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="youtube-progress-row">
                  <div className="youtube-progress-track">
                    <div
                      className="youtube-progress-fill"
                      style={{
                        width: `${item.progress}%`,
                      }}
                    />
                  </div>

                  <strong>{item.progress}%</strong>
                </div>

                <div className="youtube-job-status">
                  {item.status === "completed" ? (
                    <Check size={14} />
                  ) : item.status === "failed" ? (
                    <X size={14} />
                  ) : (
                    <Loader2
                      className="spin"
                      size={14}
                    />
                  )}

                  <span>{item.phase}</span>
                </div>

                {item.wasInsidePlaylist && (
                  <div className="youtube-warning">
                    <AlertTriangle size={14} />
                    Only the selected video was processed;
                    the surrounding playlist was ignored.
                  </div>
                )}

                {item.error && (
                  <div className="message error">
                    <X size={14} />
                    {item.error}
                  </div>
                )}

                {item.status === "completed" &&
                  item.jobId && (
                    <a
                      className="primary-btn youtube-download-link"
                      href={getYoutubeDownloadUrl(
                        item.jobId
                      )}
                    >
                      <Download size={15} />
                      Download{" "}
                      {item.format.toUpperCase()}
                    </a>
                  )}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}