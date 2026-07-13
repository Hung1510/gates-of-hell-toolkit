import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface SaveInfo {
  mp: string | null;
  sp: string | null;
  ap: string | null;
  rp: string | null;
  name: string | null;
  army: string | null;
  enemyArmy: string | null;
  difficulty: string | null;
  region: string | null;
  playedGames: string | null;
  wonGames: string | null;
  entries: string[];
}

export function SaveEditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<SaveInfo | null>(null);
  const [mp, setMp] = useState("");
  const [sp, setSp] = useState("");
  const [ap, setAp] = useState("");
  const [rp, setRp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileSelect(selected: File) {
    setFile(selected);
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", selected);
      const res = await fetch(`${API_BASE}/api/save/inspect`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to inspect save");
      setInfo(data);
      setMp(data.mp ?? "");
      setSp(data.sp ?? "");
      setAp(data.ap ?? "");
      setRp(data.rp ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mp", mp);
      form.append("sp", sp);
      form.append("ap", ap);
      form.append("rp", rp);
      const res = await fetch(`${API_BASE}/api/save/edit`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to edit save");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="save-editor-page">
      <p className="disclaimer">
        Works on real Conquest save files (verified against an actual .sav). Every file
        inside the save other than the resource values is copied through byte-for-byte
        unchanged - your map progress, battle state, and everything else is untouched.
        Single-mission campaign saves don't have these fields and won't work here.
      </p>

      <div className="save-upload">
        <input
          type="file"
          accept=".sav"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
      </div>

      {loading && <p>Working...</p>}
      {error && <p className="error">{error}</p>}

      {info && (
        <div className="save-details">
          <p>
            <strong>{info.name}</strong> - {info.army} vs {info.enemyArmy}, {info.difficulty}, region: {info.region}
          </p>
          <p>Played games: {info.playedGames}, won: {info.wonGames}</p>

          <div className="form-grid">
            <label>
              Manpower (mp)
              <input value={mp} onChange={(e) => setMp(e.target.value)} />
            </label>
            <label>
              Support Points (sp)
              <input value={sp} onChange={(e) => setSp(e.target.value)} />
            </label>
            <label>
              Army Points (ap)
              <input value={ap} onChange={(e) => setAp(e.target.value)} />
            </label>
            <label>
              Resource Points (rp)
              <input value={rp} onChange={(e) => setRp(e.target.value)} />
            </label>
          </div>

          <button className="generate-btn" onClick={handleDownload} disabled={loading}>
            Apply edits and download .sav
          </button>
        </div>
      )}
    </div>
  );
}
