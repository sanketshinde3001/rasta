export function BrandLogo({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand-logo${large ? " brand-logo-large" : ""}`}>
      {/* The supplied artwork includes its own wordmark. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/my-bmc-rasta-logo.png" alt="My BMC Rasta" width={1736} height={906} />
    </span>
  );
}
