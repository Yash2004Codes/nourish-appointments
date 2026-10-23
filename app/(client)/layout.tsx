import Link from "next/link";
import ClientNav from "@/components/ClientNav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      {/* soft background wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_80%_at_80%_0%,#dfeae2_0%,transparent_70%),radial-gradient(50%_70%_at_0%_10%,#fcefe8_0%,transparent_70%)]"
      />
      <ClientNav />
      <main className="mx-auto w-full max-w-5xl px-5 pb-32 pt-6 md:px-6 md:pb-20 md:pt-10">{children}</main>
      <footer className="mx-auto hidden max-w-5xl px-6 pb-10 text-xs text-muted md:block">
        Nourish · Nutrition consultations ·{" "}
        <Link href="/dashboard" className="underline-offset-2 hover:underline">
          Practice dashboard
        </Link>
      </footer>
    </div>
  );
}
