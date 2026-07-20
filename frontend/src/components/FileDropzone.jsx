import React from "react";
import { Download } from "lucide-react";

export default function FileDropzone({
  title,
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
      <div className="drop-icon"><Download size={25} /></div>
      <div className="drop-title">{title}</div>
      <div className="drop-copy">or <span>browse from your device</span></div>
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
