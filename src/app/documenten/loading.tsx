import { PaginaSkeleton } from "@/components/PaginaSkeleton";

export default function Loading() {
  return <PaginaSkeleton titel="Documenten" blokken={3} />;
}
