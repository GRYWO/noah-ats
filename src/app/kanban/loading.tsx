import { PaginaSkeleton } from "@/components/PaginaSkeleton";

export default function Loading() {
  return <PaginaSkeleton titel="Kanban" blokken={3} />;
}
