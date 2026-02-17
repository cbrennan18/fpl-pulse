import { useState } from 'react';
import { CaretUpIcon, CaretDownIcon } from '@phosphor-icons/react';

export default function LeagueStandings({ standings, highlightEntry }) {
  const [sortBy, setSortBy] = useState('rank');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (key === sortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir(['total', 'event_total'].includes(key) ? 'desc' : 'asc');
    }
  };

  const sorted = [...standings].sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];

    if (typeof valA === 'string') {
      return sortDir === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return sortDir === 'asc' ? valA - valB : valB - valA;
  });

  const SortIcon = ({ field }) => {
    const isActive = sortBy === field;
    const className = 'text-subtext ml-1';
    return (
      <span className="inline-block w-[12px]">
        {isActive ? (
          sortDir === 'asc' ? (
            <CaretUpIcon size={12} weight="bold" className={className} />
          ) : (
            <CaretDownIcon size={12} weight="bold" className={className} />
          )
        ) : null}
      </span>
    );
  };

  return (
    <div className="mb-6">
      <div className="rounded-xl p-1 shadow-md bg-white overflow-hidden">
        <div className="max-h-[30vh] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-white text-subtext border-b text-xs uppercase tracking-wide z-10">
              <tr>
                <th
                  className="py-[2px] pl-3 pr-1 cursor-pointer"
                  onClick={() => handleSort('rank')}
                >
                  <span className="inline-flex items-center gap-1">
                    #
                    <SortIcon field="rank" />
                  </span>
                </th>
                <th
                  className="py-[2px] pr-1 cursor-pointer"
                  onClick={() => handleSort('entry_name')}
                >
                  <span className="inline-flex items-center gap-1">
                    Name
                    <SortIcon field="entry_name" />
                  </span>
                </th>
                <th
                  className="py-[2px] pr-1 text-right cursor-pointer"
                  onClick={() => handleSort('event_total')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    GW
                    <SortIcon field="event_total" />
                  </span>
                </th>
                <th className="py-[2px] pr-1 text-right">Mth</th>
                <th
                  className="py-[2px] pr-3 text-right cursor-pointer"
                  onClick={() => handleSort('total')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Pts
                    <SortIcon field="total" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={`border-b last:border-none ${
                    index % 2 === 1 ? 'bg-subtle' : ''
                  }`}
                >
                  <td
                    className={`py-1 pl-3 pr-1 border-l-4 ${
                      Number(highlightEntry) === Number(entry.entry)
                        ? 'border-primary'
                        : 'border-transparent'
                    }`}
                  >
                    {entry.rank}
                  </td>
                  <td className="py-1 pr-1">
                    <div className="font-medium">{entry.player_name}</div>
                    <div className="text-xs text-subtext italic">{entry.entry_name}</div>
                  </td>
                  <td className="py-1 pr-1 text-right">{entry.event_total}</td>
                  <td className="py-1 pr-1 text-right text-subtext italic">—</td>
                  <td className="py-1 pr-3 text-right font-semibold">{entry.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
      </div>
    </div>
  );
}