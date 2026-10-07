export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://laspeedcameras.com").replace(/\/$/, "");
export const SITE_NAME = "LA Speed Cameras";
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
export const TAGLINE = "Watch your rear end out there.";
export const DESCRIPTION =
  "Find every City of Los Angeles speed camera on a map, by neighborhood, street or commute. Updated from LADOT data as cameras are installed and switched on.";

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
export const MAPBOX_STYLE = "mapbox://styles/stiles/cmiuh91nz003q01su2wd5b64l";
export const REPORT_URL = process.env.NEXT_PUBLIC_REPORT_URL || "mailto:hello@laspeedcameras.com?subject=Speed%20camera%20report";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-Q32FS03M95";
// Keep local dev and Vercel preview traffic out of GA.
export const ANALYTICS_ENABLED =
  process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview";

export const LADOT_URL = "https://ladot.lacity.gov/speed-safety-system";
export const COUNCIL_FILE_URL = "https://cityclerk.lacity.org/lacityclerkconnect/index.cfm?fa=ccfi.viewrecord&cfnumber=23-1168";
export const AB645_URL = "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB645";
export const LA_GEOGRAPHY_URL = "https://github.com/stiles/la-geography";

export const FIRST_ACTIVATION = "2026-10-26";

// LA County bounding box for geocoding
export const LA_BBOX: [number, number, number, number] = [-118.95, 33.7, -117.65, 34.83];
export const LA_CENTER: [number, number] = [-118.36, 34.05];
export const CITY_BBOX: [number, number, number, number] = [-118.67, 33.7, -118.15, 34.34];
