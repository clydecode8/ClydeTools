import React from "react";
import { Upload } from "lucide-react";

export default function FileDropzone({
  title,
  browseLabel,
  spec,
  accept,
  inputRef,
  isDragging,
  setIsDragging,
  onFilesSelected,
}) {
  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    onFilesSelected(Array.from(event.dataTransfer.files || []));
  }

  function handleInput(event) {
    onFilesSelected(Array.from(event.target.files || []));
    event.target.value = "";
  }

  return (
    <div
      className={`dropzone ${isDragging ? "drag" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
    >
      <div className="drop-icon"><Upload size={23} /></div>
      <div className="drop-title">{title}</div>
      <div className="drop-or">— or —</div>
      <button className="choose-btn" type="button" tabIndex={-1}>{browseLabel}</button>
      <div className="drop-spec">{spec}</div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleInput}
        className="hidden-input"
      />
    </div>
  );
}
