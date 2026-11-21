import { TopBar } from "@/components/TopBar";
import { getSession } from "@/lib/session";
import { db } from "@/lib/data";
import { MapExplorer } from "./MapExplorer";

export const dynamic = "force-dynamic";

export default async function MapPage({ searchParams }: { searchParams: Promise<{ ward?: string; c?: string }> }) {
  const s = await getSession();
  const sp = await searchParams;
  const { wards, geo } = db();
  return (
    <>
      <TopBar session={s} active="/map" wide />
      <MapExplorer wards={wards as any} geo={geo} initialWard={sp.ward} initialComplaint={sp.c} loggedIn={s?.role === "citizen"} />
    </>
  );
}
