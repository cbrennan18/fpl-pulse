export default function LeagueList({ manager, leagues, onSelect }) {
  return (
    <div className="mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{manager.teamName}</h2>
        <p className="text-subtext">
          Managed by {manager.firstName} {manager.lastName}
        </p>
      </div>

      <h3 className="text-lg font-semibold mb-2">Mini-Leagues</h3>
      <ul className="space-y-2">
        {leagues.map((league) => (
          <li key={league.id}>
            <button
              className="w-full text-left bg-white border border-subtle px-4 py-2 rounded-md shadow-sm"
              onClick={() => onSelect(league)}
            >
              {league.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}