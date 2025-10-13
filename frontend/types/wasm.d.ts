declare global {
  interface Window {
    Go: any;
    parseDemo: (
      data: Uint8Array,
      callback: (result: string) => void,
      options?: {
        tickInterval?: number;
        removeZ?: boolean;
      }
    ) => void;
  }
}

export {};
