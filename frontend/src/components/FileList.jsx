import React from "react";

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getKind(file) {
  return file.type === "application/pdf" ? "pdf" : "img";
}

export default function FileList({ files, setFiles }) {
  function removeFile(index) {
    setFiles(files.filter((_, i) => i !== index));
  }

  function moveFile(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    setFiles(next);
  }

  if (!files.length) {
    return (
      <div className="queue-empty">
        Files you add will line up here, in the order they&apos;ll appear in the final PDF.
      </div>
    );
  }

  return (
    <div className="queue-list">
      {files.map((file, index) => {
        const kind = getKind(file);
        return (
          <div className="file-chip" key={`${file.name}-${file.size}-${index}`}>
            <button className="mini-btn" type="button" onClick={() => moveFile(index, -1)} disabled={index === 0}>↑</button>
            <button className="mini-btn" type="button" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1}>↓</button>
            <div className={`file-icon ${kind}`}>{kind === "pdf" ? "PDF" : "IMG"}</div>
            <div className="file-meta">
              <div className="file-name">{file.name}</div>
              <div className="file-size">{formatSize(file.size)}</div>
            </div>
            <button className="remove-btn" type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}>×</button>
          </div>
        );
      })}
    </div>
  );
}
