/**
 * Generieke pagina-skeleton voor instant feedback bij navigatie.
 * Verschijnt direct (~10ms) i.p.v. witte pagina tot de server klaar is.
 * Gebruikt in loading.tsx files door de hele app.
 */
export function PaginaSkeleton({
  titel,
  blokken = 3,
}: {
  titel?: string;
  blokken?: number;
}) {
  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      {/* Top-bar placeholder */}
      <div className="h-14 bg-white border-b border-gray-100" />

      <div className="p-8 max-w-7xl mx-auto animate-pulse">
        {/* Pagina-header */}
        <div className="mb-6">
          {titel ? (
            <h1 className="text-3xl font-bold text-gray-300 select-none">{titel}</h1>
          ) : (
            <div className="h-9 bg-gray-200 rounded w-48 mb-2" />
          )}
          <div className="h-4 bg-gray-100 rounded w-64 mt-2" />
        </div>

        {/* Inhoud-blokken */}
        <div className="space-y-4">
          {Array.from({ length: blokken }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
