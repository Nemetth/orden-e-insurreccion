import { ArchiveApp } from "@/components/archive/ArchiveApp";

/** La página es solo cliente (ArchiveApp); evitar force-dynamic reduce fallos intermitentes de RSC/fuentes en dev. */
export default function Home() {
  return <ArchiveApp />;
}
