const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.message || "The request could not be completed."
    );
  }

  return payload;
}

export async function inspectYoutubeUrl(url) {
  const response = await fetch(
    `${API_URL}/api/youtube/inspect`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    }
  );

  return readJsonResponse(response);
}

export async function startYoutubeConversion(url, format) {
  const response = await fetch(
    `${API_URL}/api/youtube/convert`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        format,
      }),
    }
  );

  return readJsonResponse(response);
}

export async function getYoutubeProgress(jobId) {
  const response = await fetch(
    `${API_URL}/api/youtube/progress/${jobId}`
  );

  return readJsonResponse(response);
}

export function getYoutubeDownloadUrl(jobId) {
  return `${API_URL}/api/youtube/download/${jobId}`;
}

export function getYoutubeEventUrl(jobId) {
  return `${API_URL}/api/youtube/events/${jobId}`;
}