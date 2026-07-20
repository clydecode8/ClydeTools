import React from "react";
import { FileImage, FileText, GripVertical, X } from "lucide-react";

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

  return (
    <div className="file-list">
      {files.map((file, index) => {
        const isPdf = file.type === "application/pdf";
        const Icon = isPdf ? FileText : FileImage;
        return (
          <div className="file-row" key={`${file.name}-${file.size}-${index}`}>
            <div className="reorder-controls">
              <button type="button" onClick={() => moveFile(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
              <button type="button" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1} aria-label="Move down">↓</button>
            </div>
            <div className={`file-type-icon ${isPdf ? "pdf" : "image"}`}><Icon size={15} /></div>
            <div className="file-info">
              <strong>{file.name}</strong>
              <small>{formatSize(file.size)}</small>
            </div>
            <button className="remove-btn" type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
