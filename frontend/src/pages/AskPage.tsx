import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface AskResult {
  interpretation: string;
  results: Array<Record<string, unknown>>;
}

const EXAMPLES = [
  "Which squads use MG42?",
  "Which units unlock Tiger?",
  "Show all units costing more than 300",
];

export function AskPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(q: string) {
    setQuery(q);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ask?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Query failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ask-page">
      <p className="disclaimer">
        This is structured query matching over real, already-parsed game data — pattern
        matching on "use/with", "unlock", and "cost more/less than", with a free-text
        fallback. It is NOT embeddings-based semantic search, so paraphrases outside
        those patterns may not be understood. Also: unit ids are role-based (e.g.
        "fusilier_mg", "mgun_1") rather than literal weapon names in most cases, so
        weapon-name searches like "MG42" will under-count real matches unless the weapon
        name happens to appear in the id.
      </p>

      <div className="ask-input-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk(query)}
          placeholder="Ask about squads, units, or costs..."
        />
        <button onClick={() => handleAsk(query)} disabled={loading}>
          Ask
        </button>
      </div>

      <div className="ask-examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="example-chip" onClick={() => handleAsk(ex)}>
            {ex}
          </button>
        ))}
      </div>

      {loading && <p>Searching...</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="ask-results">
          <p className="interpretation">{result.interpretation}</p>
          <p>{result.results.length} result(s)</p>
          <table className="ask-results-table">
            <tbody>
              {result.results.slice(0, 200).map((r, i) => (
                <tr key={i}>
                  <td>
                    <code>{JSON.stringify(r)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.results.length > 200 && <p>...and {result.results.length - 200} more</p>}
        </div>
      )}
    </div>
  );
}
