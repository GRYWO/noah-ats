import { PaginaSkeleton } from "@/components/PaginaSkeleton";

export default function Loading() {
  return <PaginaSkeleton titel="Kandidaten" blokken={3} />;
}
