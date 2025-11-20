import { useState, useEffect } from "react";

const API_URL = "http://localhost:8000";

export function useDemoData(demoId: string | null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!demoId) {
      setData(null);
      return;
    }

    const fetchDemo = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/demo/${demoId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch demo data");
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        console.error("Error fetching demo:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDemo();
  }, [demoId]);

  return { data, loading, error };
}
