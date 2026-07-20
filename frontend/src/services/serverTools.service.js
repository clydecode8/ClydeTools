const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export async function processWithServerMemory(files) {
  if (!files?.length) {
    throw new Error("Please select at least one file.");
  }

  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(
    `${API_URL}/api/pdf/merge-memory`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));

    throw new Error(
      payload.message || "Server processing failed."
    );
  }

  const blob = await response.blob();

  downloadBlob(blob, "clydetools-server-output.pdf");
}