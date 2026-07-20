import React, { useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  FileImage,
  Files,
  FileText,
  Loader2,
  Mail,
  Phone,
  RotateCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  Minimize2,
} from "lucide-react";
import FileDropzone from "./components/FileDropzone.jsx";
import FileList from "./components/FileList.jsx";
import {
  mergePdfsInBrowser,
  imagesToPdfInBrowser,
} from "./services/browserPdf.service.js";
import YoutubeDownloader from "./components/YoutubeDownloader";
import { Analytics } from "@vercel/analytics/react";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const TOOLS = {
  merge: {
    title: "Combine PDFs",
    description: "Join files into one",
    pageTitle: "Combine PDF files into one document",
    stepTitle: "Combine your files",
    dropTitle: "Drag files here",
    browseLabel: "Choose Files",
    spec: "PDF · up to 10 files · up to 10 MB each",
    cta: "Combine & Download",
    accept: "application/pdf",
    allowedTypes: new Set(["application/pdf"]),
    icon: Files,
    enabled: true,
  },
  // split: {
  //   title: "Split a PDF",
  //   description: "Pull pages apart",
  //   pageTitle: "Split a PDF into separate files",
  //   icon: FileText,
  //   enabled: false,
  // },
  images: {
    title: "Photos to PDF",
    description: "Turn photos into a PDF",
    pageTitle: "Turn your photos into a PDF",
    stepTitle: "Create your PDF",
    dropTitle: "Drag photos here",
    browseLabel: "Choose Files",
    spec: "JPG, PNG or WEBP · up to 10 photos · up to 10 MB each",
    cta: "Create PDF & Download",
    accept: "image/jpeg,image/png,image/webp",
    allowedTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
    icon: FileImage,
    enabled: true,
  },
  // compress: {
  //   title: "Compress a PDF",
  //   description: "Make the file smaller",
  //   pageTitle: "Compress a PDF file",
  //   icon: Minimize2,
  //   enabled: false,
  // },
  // remove: {
  //   title: "Remove Pages",
  //   description: "Delete pages you don't need",
  //   pageTitle: "Remove pages from a PDF",
  //   icon: Trash2,
  //   enabled: false,
  // },
  youtube: {
    title: "YouTube Downloader",
    description: "Download permitted videos as MP4 or MP3",
    pageTitle: "Download video or audio",
    icon: Download,
    enabled: true,
  }
};

function validateFile(file, activeTool) {
  const tool = TOOLS[activeTool];
  if (!tool.allowedTypes?.has(file.type)) return `Unsupported file: ${file.name}`;
  if (file.size > MAX_FILE_SIZE) return `${file.name} is larger than 10 MB.`;
  return null;
}

export default function App() {
  const [activeTool, setActiveTool] = useState("merge");
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergePhotos, setMergePhotos] = useState(true);
  const fileInputRef = useRef(null);

  const tool = TOOLS[activeTool];
  const fileSummary = useMemo(() => {
    const pdfCount = files.filter((file) => file.type === "application/pdf").length;
    const imageCount = files.filter((file) => file.type.startsWith("image/")).length;
    return { pdfCount, imageCount };
  }, [files]);

  function switchTool(key) {
    if (!TOOLS[key].enabled) return;
    setActiveTool(key);
    setFiles([]);
    setError("");
    setStatus("");
    setIsDragging(false);
    setMergePhotos(true);
  }

  function onFilesSelected(selectedFiles) {
    setError("");
    setStatus("");
    const incoming = Array.from(selectedFiles || []);
    const accepted = [];

    for (const file of incoming) {
      const message = validateFile(file, activeTool);
      if (message) {
        setError(message);
        continue;
      }
      accepted.push(file);
    }

    setFiles((current) => [...current, ...accepted].slice(0, MAX_FILES));
  }

  async function handleCombine() {
    if (!files.length) {
      setError("Please add at least one file first.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setStatus("Processing locally in your browser...");

    try {
      if (activeTool === "merge") {
        await mergePdfsInBrowser(files);
      } else if (activeTool === "images") {
        await imagesToPdfInBrowser(files, mergePhotos);
      } else {
        throw new Error("This tool is not available yet.");
      }

      setStatus("Downloaded successfully. Your files never left your device.");
    } catch (err) {
      setError(err.message || "Failed to process files.");
      setStatus("");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="app-card">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark"><FileText size={18} /></div>
            <div>
              <div className="brand-name">ClydeTools</div>
              <div className="brand-tag">Simple tools for your documents</div>
            </div>
          </div>

          <div className="top-actions">
            <div className="privacy-pill"><ShieldCheck size={13} /> Files never leave your device</div>
            <div className="font-toggle" aria-label="Text size controls"><span>A</span><strong>A+</strong></div>
          </div>
        </header>

        <div className="divider" />

        <section className="main-content">
          <h1>{tool.pageTitle}</h1>

          <div className="tool-grid" aria-label="Document tools">
            {Object.entries(TOOLS).map(([key, item]) => {
              const Icon = item.icon;
              const selected = activeTool === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`tool-card ${selected ? "selected" : ""} ${!item.enabled ? "disabled" : ""}`}
                  onClick={() => switchTool(key)}
                  aria-disabled={!item.enabled}
                  title={!item.enabled ? "Coming soon" : item.title}
                >
                  {selected && <span className="selected-check"><Check size={12} /></span>}
                  {!item.enabled && <span className="coming-soon">Soon</span>}
                  <span className="tool-icon"><Icon size={21} /></span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </button>
              );
            })}
          </div>

          {activeTool === "youtube" ? (
            <YoutubeDownloader />
          ) : (
            <>
              <section className="step-section">
                <h2><span>2</span> Add your files</h2>

                <FileDropzone
                  title={tool.dropTitle}
                  browseLabel={tool.browseLabel}
                  spec={tool.spec}
                  accept={tool.accept}
                  inputRef={fileInputRef}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  onFilesSelected={onFilesSelected}
                />

                {files.length > 0 && (
                  <div className="file-panel">
                    <div className="file-panel-head">
                      <span>
                        {activeTool === "images"
                          ? "Your photos"
                          : "Your files"}
                      </span>

                      <span>{files.length} added</span>
                    </div>

                    <FileList
                      files={files}
                      setFiles={setFiles}
                    />
                  </div>
                )}
              </section>

              <section className="step-section final-step">
                <h2>
                  <span>3</span> {tool.stepTitle}
                </h2>

                {activeTool === "images" && (
                  <label className="merge-option">
                    <input
                      type="checkbox"
                      checked={mergePhotos}
                      onChange={(event) =>
                        setMergePhotos(event.target.checked)
                      }
                      disabled={isProcessing}
                    />

                    <span
                      className="custom-checkbox"
                      aria-hidden="true"
                    >
                      {mergePhotos && <Check size={13} />}
                    </span>

                    <span>
                      <strong>
                        Merge photos into one PDF
                      </strong>

                      <small>
                        Untick to download one PDF for each photo.
                      </small>
                    </span>
                  </label>
                )}

                <div className="ready-panel">
                  <div>
                    <strong>
                      {files.length
                        ? "Ready to go"
                        : "Add files to continue"}
                    </strong>

                    {files.length > 0 && (
                      <small>
                        {fileSummary.pdfCount} PDF ·{" "}
                        {fileSummary.imageCount} image
                      </small>
                    )}
                  </div>

                  <button
                    type="button"
                    className="primary-btn"
                    disabled={isProcessing || !files.length}
                    onClick={handleCombine}
                  >
                    {isProcessing ? (
                      <Loader2
                        className="spin"
                        size={15}
                      />
                    ) : (
                      <Download size={15} />
                    )}

                    {isProcessing
                      ? "Processing..."
                      : tool.cta}
                  </button>
                </div>

                {error && (
                  <div className="message error">
                    <X size={14} />
                    {error}
                  </div>
                )}

                {status && (
                  <div className="message success">
                    <Check size={14} />
                    {status}
                  </div>
                )}
              </section>
            </>
          )}

          

          
        </section>
      </section>
    </main>
  );
}
