export default function PlaceholderCard({ message = "Coming soon..." }) {
  return (
    <div className="w-full bg-white shadow-md rounded-2xl py-12 px-6 text-center">
      <p className="text-subtext text-sm italic opacity-80">{message}</p>
    </div>
  );
}