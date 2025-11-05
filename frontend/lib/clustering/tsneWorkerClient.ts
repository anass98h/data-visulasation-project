"use client";

// Lightweight helper to spawn a Web Worker for t‑SNE + KMeans without
// adding any project-wide dependencies or editing existing files.

export type TSNEParams = {
  perplexity?: number;
  earlyExaggeration?: number;
  learningRate?: number;
  nIter?: number;
};

export type ClusterParams = {
  method?: "kmeans" | "dbscan" | "none";
  // kmeans
  k?: number;
  maxIter?: number;
  tries?: number;
  // dbscan
  eps?: number;
  minPts?: number;
};

export type WorkerRunParams = {
  tsne?: TSNEParams;
  cluster?: ClusterParams;
  standardize?: boolean; // z-score in worker (default true)
};

export type TSNEWorkerHandle = {
  worker: Worker;
  revoke: () => void;
};

export function createTSNEWorker(): TSNEWorkerHandle {
  const src = getWorkerSource();
  const blob = new Blob([src], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  return {
    worker,
    revoke: () => URL.revokeObjectURL(url),
  };
}

function getWorkerSource(): string {
  // Pure JS worker code string; loads tsne-js from a CDN and runs t‑SNE + KMeans
  return `
    // --- dynamic imports ---
    (function loadLibs() {
      var urls = [
        // Local vendor path (optional)
        '/vendor/tsne.min.js',
        '/tsne.min.js',
        // tsne-js (scijs) UMD builds
        'https://cdn.jsdelivr.net/npm/tsne-js@1.0.7/build/tsne.min.js',
        'https://unpkg.com/tsne-js@1.0.7/build/tsne.min.js',
        'https://cdn.jsdelivr.net/npm/tsne-js@1.0.7/build/tsne.js',
        'https://unpkg.com/tsne-js@1.0.7/build/tsne.js',
        // Karpathy's tsnejs as last resort
        'https://cdn.jsdelivr.net/gh/karpathy/tsnejs@master/tsne.js'
      ];
      for (var i=0;i<urls.length;i++) {
        try { importScripts(urls[i]); } catch (e) { /* try next */ }
      }
    })();

    function post(type, payload) { self.postMessage(Object.assign({ type }, payload || {})); }

    // z-score standardization
    function standardize(matrix) {
      if (!matrix || !matrix.length) return { matrix, means: [], stds: [] };
      var rows = matrix.length, cols = matrix[0].length;
      var means = new Array(cols).fill(0);
      var stds = new Array(cols).fill(0);
      for (var j=0;j<cols;j++) {
        var s=0; for (var i=0;i<rows;i++) s += matrix[i][j];
        means[j] = s/rows;
      }
      for (var j=0;j<cols;j++) {
        var s=0; for (var i=0;i<rows;i++){ var d = matrix[i][j]-means[j]; s += d*d; }
        stds[j] = Math.sqrt(s/Math.max(1, rows-1)) || 1;
      }
      var out = new Array(rows);
      for (var i=0;i<rows;i++) {
        var row = new Array(cols);
        for (var j=0;j<cols;j++) row[j] = (matrix[i][j]-means[j])/stds[j];
        out[i] = row;
      }
      return { matrix: out, means: means, stds: stds };
    }

    // Simple KMeans over 2D points with multi-try
    function kmeans2D(points, k, maxIter, tries) {
      var n = points.length;
      if (!n) return { labels: [], centers: [] };
      k = Math.max(1, Math.min(k||3, n));
      maxIter = maxIter || 100;
      tries = tries || 5;

      function dist2(a,b){ var dx=a[0]-b[0], dy=a[1]-b[1]; return dx*dx+dy*dy; }

      function runOnce() {
        // init: kmeans++ like (approx)
        var centers = [];
        centers.push(points[Math.floor(Math.random()*n)]);
        while (centers.length < k) {
          var dists = points.map(function(p){
            var m = Infinity; for (var c=0;c<centers.length;c++){ var d=dist2(p, centers[c]); if (d<m) m=d; } return m;
          });
          var sum = dists.reduce(function(s,v){ return s+v; }, 0) || 1;
          var r = Math.random()*sum, acc=0, idx=0;
          for (var i=0;i<n;i++){ acc += dists[i]; if (acc>=r){ idx=i; break; } }
          centers.push(points[idx]);
        }

        var labels = new Array(n).fill(0);
        for (var iter=0; iter<maxIter; iter++) {
          // assign
          var changed = false;
          for (var i=0;i<n;i++) {
            var best=0, bestD=Infinity;
            for (var c=0;c<k;c++) { var d=dist2(points[i], centers[c]); if (d<bestD){bestD=d; best=c;} }
            if (labels[i] !== best){ labels[i]=best; changed=true; }
          }
          // update
          var sums = new Array(k).fill(0).map(()=>[0,0]);
          var counts = new Array(k).fill(0);
          for (var i=0;i<n;i++){ var c=labels[i]; sums[c][0]+=points[i][0]; sums[c][1]+=points[i][1]; counts[c]++; }
          for (var c=0;c<k;c++){
            if (counts[c]>0){ centers[c] = [sums[c][0]/counts[c], sums[c][1]/counts[c]]; }
          }
          if (!changed) break;
        }
        // inertia
        var inertia=0; for (var i=0;i<n;i++){ inertia += dist2(points[i], centers[labels[i]]); }
        return { labels: labels, centers: centers, inertia: inertia };
      }

      var best=null;
      for (var t=0;t<tries;t++) {
        var res = runOnce();
        if (!best || res.inertia < best.inertia) best = res;
      }
      return { labels: best.labels, centers: best.centers };
    }

    // Basic DBSCAN over 2D points
    function dbscan2D(points, eps, minPts){
      var n = points.length; if (!n) return { labels: [], centers: [] };
      eps = eps || 0.8; minPts = minPts || 6;
      var labels = new Array(n).fill(-1); // -1 noise
      var visited = new Array(n).fill(false);
      function dist(a,b){ var dx=a[0]-b[0], dy=a[1]-b[1]; return Math.sqrt(dx*dx+dy*dy); }
      function regionQuery(i){ var res=[]; for (var j=0;j<n;j++){ if (dist(points[i], points[j]) <= eps) res.push(j); } return res; }
      var cid = 0;
      for (var i=0;i<n;i++){
        if (visited[i]) continue; visited[i] = true;
        var neighbors = regionQuery(i);
        if (neighbors.length < minPts){ labels[i] = -1; continue; }
        // expand cluster
        labels[i] = cid;
        var seeds = neighbors.slice();
        for (var s=0; s<seeds.length; s++){
          var idx = seeds[s];
          if (!visited[idx]){
            visited[idx] = true;
            var nbrs2 = regionQuery(idx);
            if (nbrs2.length >= minPts){ seeds = seeds.concat(nbrs2); }
          }
          if (labels[idx] === -1){ labels[idx] = cid; }
          if (labels[idx] == null || labels[idx] === undefined){ labels[idx] = cid; }
        }
        cid++;
      }
      // compute centers as mean per cluster id >= 0
      var centers = [];
      for (var c=0;c<cid;c++){
        var sx=0, sy=0, cnt=0;
        for (var i2=0;i2<n;i2++){ if (labels[i2]===c){ sx+=points[i2][0]; sy+=points[i2][1]; cnt++; } }
        centers.push(cnt? [sx/cnt, sy/cnt] : [0,0]);
      }
      return { labels: labels, centers: centers };
    }

    function resolveTSNECtor() {
      // Prefer scijs tsne-js constructor
      if (self.TSNE && typeof self.TSNE === 'function') return self.TSNE;
      if (self.tsnejs && (self.tsnejs.TSNE || self.tsnejs.default) && typeof (self.tsnejs.TSNE || self.tsnejs.default) === 'function') return (self.tsnejs.TSNE || self.tsnejs.default);
      if (self.tsne && (self.tsne.TSNE || self.tsne.default) && typeof (self.tsne.TSNE || self.tsne.default) === 'function') return (self.tsne.TSNE || self.tsne.default);
      // Karpathy tsnejs exposes tsnejs.tSNE (note lowercase t)
      if (self.tsnejs && self.tsnejs.tSNE && typeof self.tsnejs.tSNE === 'function') return self.tsnejs.tSNE;
      if (self.tSNE && typeof self.tSNE === 'function') return self.tSNE;
      return null;
    }

    function runTSNE_scijs(matrix, params, Ctor){
      var perplexity = (params && params.perplexity) || 30;
      var earlyExaggeration = (params && params.earlyExaggeration) || 4.0;
      var learningRate = (params && params.learningRate) || 200;
      var nIter = (params && params.nIter) || 750;
      var model = new Ctor({ dim: 2, perplexity: perplexity, earlyExaggeration: earlyExaggeration, learningRate: learningRate, nIter: nIter, metric: 'euclidean' });
      model.init({ data: matrix, type: 'dense' });
      model.run();
      var out = (typeof model.getOutputScaled === 'function') ? model.getOutputScaled() : model.getOutput();
      return out;
    }

    function runTSNE_karpathy(matrix, params, Ctor){
      // Karpathy tsnejs API
      var learningRate = (params && params.learningRate) || 10; // mapped to epsilon
      var perplexity = (params && params.perplexity) || 30;
      var nIter = (params && params.nIter) || 750;
      var model = new Ctor({ dim: 2, perplexity: perplexity, epsilon: learningRate });
      model.initDataRaw(matrix);
      for (var i=0;i<nIter;i++) model.step();
      var out = model.getSolution();
      return out;
    }

    function runTSNE(matrix, params){
      var Ctor = resolveTSNECtor();
      if (!Ctor) throw new Error('tsne-js not loaded');
      var out;
      // Detect API shape by presence of run/init vs initDataRaw/step
      if (Ctor && (Ctor === (self.tsnejs && self.tsnejs.tSNE) || Ctor === self.tSNE)) {
        post('log', { message: 'Using Karpathy tsnejs API' });
        out = runTSNE_karpathy(matrix, params, Ctor);
      } else {
        post('log', { message: 'Using scijs tsne-js API' });
        out = runTSNE_scijs(matrix, params, Ctor);
      }
      // normalize to zero-mean unit-variance per axis for stability
      var xs = out.map(function(p){return p[0];});
      var ys = out.map(function(p){return p[1];});
      function norm(arr){ var m=arr.reduce((s,v)=>s+v,0)/arr.length; var sd=Math.sqrt(arr.reduce((s,v)=>s+(v-m)*(v-m),0)/Math.max(1,arr.length-1))||1; return {m:m,sd:sd}; }
      var nx = norm(xs), ny = norm(ys);
      var emb = out.map(function(p){ return [(p[0]-nx.m)/nx.sd, (p[1]-ny.m)/ny.sd]; });
      return emb;
    }

    self.onmessage = function(e){
      try {
        var data = e.data || {};
        if (data.type !== 'run') return;
        var matrix = data.matrix || [];
        var params = data.params || {};
        var doStd = (params.standardize !== false); // default true
        if (!Array.isArray(matrix) || matrix.length === 0){
          return post('error', { error: 'Empty matrix' });
        }
        // z-score optionally
        var m = matrix;
        if (doStd) m = standardize(matrix).matrix;

        post('log', { message: 'Running t-SNE on '+m.length+' rows x '+m[0].length+' cols' });
        var embedding = runTSNE(m, params.tsne || {});

        var labels = null, centers = null;
        var cluster = params.cluster || { method: 'kmeans', k: 5 };
        if (cluster.method === 'kmeans'){
          var k = cluster.k || 5;
          var km = kmeans2D(embedding, k, cluster.maxIter||100, cluster.tries||5);
          labels = km.labels; centers = km.centers;
        } else if (cluster.method === 'dbscan'){
          var eps = cluster.eps || 0.8;
          var minPts = cluster.minPts || 6;
          var dbs = dbscan2D(embedding, eps, minPts);
          labels = dbs.labels; centers = dbs.centers;
        }

        post('result', { embedding: embedding, labels: labels, centers: centers });
      } catch (err) {
        post('error', { error: (err && err.message) || String(err) });
      }
    };
  `;
}
