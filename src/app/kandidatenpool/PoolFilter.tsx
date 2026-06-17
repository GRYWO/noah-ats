import Link from "next/link";

type Props = {
  q?: string;
  functie?: string;
  woonplaats?: string;
  max_km?: string;
  leeftijd_min?: string;
  leeftijd_max?: string;
  rijbewijs?: string;
  eigen_vervoer?: string;
  werkvergunning?: string;
  taal_ok?: string;
  uren_min?: string;
  uren_max?: string;
  beschikbaarheid?: string;
  ai_oordeel?: string;
  orderBy?: string;
};

export function PoolFilter(props: Props) {
  return (
    <form
      method="GET"
      action="/kandidatenpool"
      className="bg-white rounded-xl shadow-sm p-4 mb-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Zoek (naam, e-mail)</label>
          <input
            name="q"
            defaultValue={props.q ?? ""}
            placeholder="naam of e-mail"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Open voor functie</label>
          <input
            name="functie"
            defaultValue={props.functie ?? ""}
            placeholder="bv. Sales, Engineer"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Woonplaats</label>
          <input
            name="woonplaats"
            defaultValue={props.woonplaats ?? ""}
            placeholder="bv. Rotterdam"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Max. reisafstand (km)</label>
          <input
            name="max_km"
            type="number"
            min="0"
            defaultValue={props.max_km ?? ""}
            placeholder="bv. 30"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Leeftijd min</label>
            <input
              name="leeftijd_min"
              type="number"
              min="16"
              max="99"
              defaultValue={props.leeftijd_min ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Leeftijd max</label>
            <input
              name="leeftijd_max"
              type="number"
              min="16"
              max="99"
              defaultValue={props.leeftijd_max ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Rijbewijs bevat</label>
          <input
            name="rijbewijs"
            defaultValue={props.rijbewijs ?? ""}
            placeholder="bv. B"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Eigen vervoer</label>
          <select
            name="eigen_vervoer"
            defaultValue={props.eigen_vervoer ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          >
            <option value="">Maakt niet uit</option>
            <option value="ja">Ja</option>
            <option value="nee">Nee</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Werkvergunning NL</label>
          <select
            name="werkvergunning"
            defaultValue={props.werkvergunning ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          >
            <option value="">Maakt niet uit</option>
            <option value="ja">Ja</option>
            <option value="nee">Nee</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Voldoende NL</label>
          <select
            name="taal_ok"
            defaultValue={props.taal_ok ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          >
            <option value="">Maakt niet uit</option>
            <option value="ja">Ja</option>
            <option value="nee">Nee</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Uren min</label>
            <input
              name="uren_min"
              type="number"
              min="0"
              max="60"
              defaultValue={props.uren_min ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Uren max</label>
            <input
              name="uren_max"
              type="number"
              min="0"
              max="60"
              defaultValue={props.uren_max ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Beschikbaar vanaf</label>
          <input
            name="beschikbaarheid"
            defaultValue={props.beschikbaarheid ?? ""}
            placeholder="bv. per direct of 1 augustus"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">AI-oordeel</label>
          <select
            name="ai_oordeel"
            defaultValue={props.ai_oordeel ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          >
            <option value="">Alle</option>
            <option value="goedgekeurd">Goedgekeurd</option>
            <option value="afgekeurd">Afgekeurd</option>
            <option value="onbekend">Onbekend</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Sorteren op</label>
          <select
            name="orderBy"
            defaultValue={props.orderBy ?? "created_at_desc"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
          >
            <option value="created_at_desc">Nieuwste eerst</option>
            <option value="created_at_asc">Oudste eerst</option>
            <option value="naam_asc">Naam (A-Z)</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button
          type="submit"
          className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm"
        >
          Filteren
        </button>
        <Link
          href="/kandidatenpool"
          className="text-sm text-gray-600 hover:text-[#333399] px-3 py-2"
        >
          Filters wissen
        </Link>
      </div>
    </form>
  );
}
