"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("./CameraMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-zinc-200" />,
});

export default MapClient;
