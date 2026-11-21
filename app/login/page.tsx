import { LoginForm } from "./LoginForm";
import { db, WARD_ORDER } from "@/lib/data";

export default async function Login({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const wards = WARD_ORDER.map((c) => ({ code: c, name: db().wardMap.get(c)?.ward_name || "" }));
  return <LoginForm role={role === "officer" ? "officer" : "citizen"} wards={wards} />;
}
