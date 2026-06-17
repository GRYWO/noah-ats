import { zetPoolKandidaatNaarWachtrij, haalKandidaatUitPool } from "../kandidaten/[id]/website-intake-actions";

type Props = {
  kandidaatId: string;
};

export function PoolKaartActies({ kandidaatId }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <a
        href={`/kandidaten/${kandidaatId}`}
        className="bg-white hover:bg-gray-50 text-[#333399] border border-[#333399] font-semibold px-3 py-1.5 rounded-md text-xs"
      >
        Bekijk
      </a>
      <form action={zetPoolKandidaatNaarWachtrij} className="inline-block">
        <input type="hidden" name="id" value={kandidaatId} />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-md text-xs"
        >
          Naar wachtrij
        </button>
      </form>
      <form action={haalKandidaatUitPool} className="inline-block">
        <input type="hidden" name="id" value={kandidaatId} />
        <button
          type="submit"
          className="bg-white hover:bg-red-50 text-red-700 border border-red-300 font-semibold px-3 py-1.5 rounded-md text-xs"
        >
          Uit pool
        </button>
      </form>
    </div>
  );
}
