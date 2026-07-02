import React, { useMemo, useRef, useState } from "react";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import FileDropzone from "./components/FileDropzone.jsx";
import FileList from "./components/FileList.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const TOOLS = {
  merge: {
    eyebrow: "01 — pick a tool",
    title: <>Merge PDFs<br />into <span>one clean file.</span></>,
    sub: "Reorder pages by dragging, then combine. Your files are processed temporarily and returned as one PDF.",
    tab: "Merge PDF",
    dropTitle: "Drop PDF files here",
    spec: ".pdf only · 10 files max · 10MB each",
    cta: "Merge PDF",
    accept: "application/pdf",
    allowedTypes: new Set(["application/pdf"]),
  },
  images: {
    eyebrow: "02 — pick a tool",
    title: <>Turn images<br />into <span>PDF pages.</span></>,
    sub: "Each image becomes its own PDF page, in the order you add them. JPG, PNG, and WEBP are supported.",
    tab: "Images to PDF",
    dropTitle: "Drop JPG, PNG, or WEBP files here",
    spec: ".jpg .png .webp · 10 files max · 10MB each",
    cta: "Convert to PDF",
    accept: "image/jpeg,image/png,image/webp",
    allowedTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
  },
  mixed: {
    eyebrow: "03 — pick a tool",
    title: <>PDFs and images,<br /><span>one file out.</span></>,
    sub: "Mix PDFs with photos. ClydeTools converts images into pages and merges everything in your chosen order.",
    tab: "Mixed Combine",
    dropTitle: "Drop PDFs and images together",
    spec: ".pdf .jpg .png .webp · 10 files max · 10MB each",
    cta: "Create Combined PDF",
    accept: "application/pdf,image/jpeg,image/png,image/webp",
    allowedTypes: new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  },
};

function validateFile(file, activeTool) {
  const tool = TOOLS[activeTool];
  if (!tool.allowedTypes.has(file.type)) {
    return `Unsupported file: ${file.name}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name} is larger than 10MB.`;
  }
  return null;
}

export default function App() {
  const [activeTool, setActiveTool] = useState("merge");
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const tool = TOOLS[activeTool];

  const fileSummary = useMemo(() => {
    const pdfCount = files.filter((file) => file.type === "application/pdf").length;
    const imageCount = files.filter((file) => file.type.startsWith("image/")).length;
    return { pdfCount, imageCount };
  }, [files]);

  function switchTool(key) {
    setActiveTool(key);
    setFiles([]);
    setError("");
    setStatus("");
    setIsDragging(false);
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
    setStatus("Processing your files...");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(`${API_URL}/api/pdf/combine`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to process files.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "clydetools-output.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setStatus("Downloaded successfully.");
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="wrap">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <div>
              <div className="brand-name">ClydeTools</div>
              <div className="brand-tag">document utilities</div>
            </div>
          </div>

          <div className="privacy-pill">
            <ShieldCheck size={14} />
            files are processed temporarily
          </div>
        </header>

        <section className="hero">
          <div className="eyebrow">{tool.eyebrow}</div>
          <h1>{tool.title}</h1>
          <p>{tool.sub}</p>
        </section>

        <nav className="tool-tabs" aria-label="ClydeTools tools">
          {Object.entries(TOOLS).map(([key, item], index) => (
            <button
              key={key}
              type="button"
              className={`tool-tab ${activeTool === key ? "active" : ""}`}
              onClick={() => switchTool(key)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.tab}
            </button>
          ))}
        </nav>

        <section className="workbench">
          <div className="drop-column">
            <FileDropzone
              title={tool.dropTitle}
              spec={tool.spec}
              accept={tool.accept}
              inputRef={fileInputRef}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              onFilesSelected={onFilesSelected}
            />
          </div>

          <div className="queue-column">
            <div className="queue-head">
              <span>Queue</span>
              <span>{files.length} {files.length === 1 ? "file" : "files"}</span>
            </div>

            <FileList files={files} setFiles={setFiles} />

            <div className="summary-line">
              {fileSummary.pdfCount} PDF · {fileSummary.imageCount} image
            </div>

            {error && <div className="message error">{error}</div>}
            {status && <div className="message success">{status}</div>}

            <div className="cta-row">
              <button
                type="button"
                className="primary-btn"
                disabled={isProcessing || !files.length}
                onClick={handleCombine}
              >
                {isProcessing ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
                {isProcessing ? "Processing..." : tool.cta}
              </button>
              <span>{files.length ? "ready to process" : "add files to continue"}</span>
            </div>
          </div>

          <div className="footnote">
            <b>Why three tools instead of one dropzone:</b> each mode expects a different file type and produces a different result, so the drop target, accepted formats, and button label all change with your selection.
          </div>
        </section>
      </section>
    </main>
  );
}
