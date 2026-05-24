import Link from "next/link";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f4f4f7]">
      <div className="bg-[#333399] h-16 flex items-center px-6 shadow-md">
        <Link href="/dashboard" className="flex items-baseline">
          <span className="text-white text-3xl font-black tracking-tighter">noah</span>
          <span className="ml-1.5 w-2.5 h-2.5 rounded-full bg-[#ffd84d] inline-block"></span>
        </Link>
        <nav className="ml-8 flex gap-1">
          <Link href="/dashboard" className="text-white/70 px-3 py-1.5 text-sm rounded-md">Dashboard</Link>
          <Link href="/kandidaten" className="text-white/70 px-3 py-1.5 text-sm rounded-md">Kandidaten</Link>
          <Link href="/kanban" className="text-white/70 px-3 py-1.5 text-sm rounded-md">Kanban</Link>
          <span className="text-white bg-white/15 px-3 py-1.5 text-sm rounded-md">E-mail</span>
        </nav>
      </div>

      <div className="flex" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Sidebar skeleton */}
        <aside className="w-60 bg-white border-r border-gray-200 p-3 flex-shrink-0">
          <div className="h-10 bg-[#333399] rounded-md mb-4 animate-pulse"></div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded mb-2 animate-pulse"></div>
          ))}
        </aside>

        {/* Lijst skeleton */}
        <section className="w-96 bg-white border-r border-gray-200 flex-shrink-0">
          <div className="px-5 py-3 border-b">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 w-48 bg-gray-100 rounded animate-pulse"></div>
          </div>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-5 py-3 border-b border-gray-100">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ))}
        </section>

        {/* Detail panel */}
        <section className="flex-1 bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#333399] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500 text-sm">E-mail laden...</p>
          </div>
        </section>
      </div>
    </main>
  );
}
