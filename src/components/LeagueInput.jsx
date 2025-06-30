export default function LeagueInput({ teamId, setTeamId, onSubmit, loading, error }) {
  return (
    <div className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="border border-subtle bg-white px-3 py-2 rounded-md w-full"
          placeholder="Enter FPL Team ID"
        />
        <button
          onClick={onSubmit}
          className="bg-primary text-white px-4 py-2 rounded-md font-semibold"
        >
          Submit
        </button>
      </div>
      {loading && <p className="text-subtext mt-2">Loading...</p>}
      {error && <p className="text-danger font-semibold mt-2">Invalid Team ID. Please try again.</p>}
    </div>
  );
}