import { useState } from "react";

interface Props {
  code: string;
  filename: string;
  error?: string | null;
}

export function CodePreview({ code, filename, error }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDownload() {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="code-preview">
      {error && <p className="error">{error}</p>}
      <pre>{code || "// fill in the form to generate a snippet"}</pre>
      <div className="code-preview-actions">
        <button onClick={handleCopy} disabled={!code}>
          {copied ? "Copied!" : "Copy"}
        </button>
        <button onClick={handleDownload} disabled={!code}>
          Download
        </button>
      </div>
    </div>
  );
}
