import { useState, useEffect, type RefObject } from "react";

type AdaptiveGridOptions = {
  participantCount: number;
  targetRatio?: number;
  gap?: number;
};

type AdaptiveGridResult = {
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  gridWidth: number;
  gridHeight: number;
};

export function useAdaptiveGrid(
  containerRef: RefObject<HTMLElement | null>,
  options: AdaptiveGridOptions
): AdaptiveGridResult {
  const { participantCount, targetRatio = 16 / 9, gap = 12 } = options;
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  const { width, height } = dimensions;

  if (width === 0 || height === 0 || participantCount === 0) {
    return { columns: 1, rows: 1, tileWidth: 0, tileHeight: 0, gridWidth: 0, gridHeight: 0 };
  }

  let bestColumns = 1;
  let bestRows = 1;
  let maxArea = 0;
  let bestTileWidth = 0;
  let bestTileHeight = 0;

  for (let c = 1; c <= participantCount; c++) {
    const r = Math.ceil(participantCount / c);
    
    // Account for gaps
    const availableWidth = width - (c - 1) * gap;
    const availableHeight = height - (r - 1) * gap;

    if (availableWidth <= 0 || availableHeight <= 0) continue;

    const widthConstrained = availableWidth / c;
    const heightConstrained = (availableHeight / r) * targetRatio;

    const tileWidth = Math.min(widthConstrained, heightConstrained);
    const tileHeight = tileWidth / targetRatio;
    
    const area = tileWidth * tileHeight;
    
    if (area > maxArea) {
      maxArea = area;
      bestColumns = c;
      bestRows = r;
      bestTileWidth = tileWidth;
      bestTileHeight = tileHeight;
    }
  }

  return {
    columns: bestColumns,
    rows: bestRows,
    tileWidth: bestTileWidth,
    tileHeight: bestTileHeight,
    gridWidth: bestColumns * bestTileWidth + (bestColumns - 1) * gap,
    gridHeight: bestRows * bestTileHeight + (bestRows - 1) * gap,
  };
}
