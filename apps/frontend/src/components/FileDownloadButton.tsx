import { useState } from "react";
import { downloadBerkas } from "../services/berkas";

export default function FileDownloadButton({
  berkasId,
  fileName
}: {
  berkasId: string;
  fileName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setError("");
    setIsLoading(true);

    try {
      await downloadBerkas(berkasId, fileName);
    } catch {
      setError("Gagal download");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        type="button"
        className="small-button"
        onClick={handleDownload}
        disabled={isLoading}
      >
        {isLoading ? "Mengunduh..." : "Download"}
      </button>

      {error ? <small className="inline-error">{error}</small> : null}
    </div>
  );
}