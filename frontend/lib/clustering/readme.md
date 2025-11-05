Clustering pipeline (overview)

1) Snapshot extraction (extractSnapshots.ts)
- For each round, for each selected timepoint (seconds after freezeTimeEndTick), find the nearest tick within ±searchWindowSeconds.
- For each team, collect alive players at that tick, order them by angle around team centroid for stable slotting, and pad/truncate to 5 players.
- Attach economy (ctStartMoney+tEquip, tStartMoney+tEquip) and mapName.

2) Feature engineering (features.ts)
- Normalize player positions to [0,1] using map bounds.
- Concatenate positions across selected timepoints into one vector per (round, team).
- Append normalized team/opponent economy, weighted by economyWeight.
- Optional standardization is also available.

3) Embedding + clustering (tsneWorkerClient.ts)
- Web Worker loads tsne-js from CDN and runs t‑SNE in 2D off the main thread.
- Clustering options:
  - KMeans: configurable k, tries, and iterations.
  - DBSCAN: configurable eps (in embedding space) and minPts.

4) Representatives (representatives.ts)
- For a given (team, timepoint), compute per-cluster average player positions per slot.
- predictMostLikelySetup can optionally filter by economy bucket (low/mid/high) and returns the most frequent cluster representative.

Notes
- The worker standardizes features by default; embeddings are normalized axis-wise for stability.
- DBSCAN eps is in embedding units (post-normalization); start with ~0.7–1.0 and minPts ~6–12.

