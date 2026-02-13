"use client";

import React from "react";
import { clearFunnelId, getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";

type Props = {
  resultId: string;
};

export default function TrackResultViewed({ resultId }: Props) {
  const hasTracked = React.useRef(false);

  React.useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    void trackFunnelMetric({
      event: "result_viewed",
      funnelId: getOrCreateFunnelId(),
      resultId,
    }).finally(() => {
      clearFunnelId();
    });
  }, [resultId]);

  return null;
}

