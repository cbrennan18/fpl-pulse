import PulseLogo from '../assets/PulseLogo.svg';

export default function Logo({ size = 'w-32' }) {
  return (
    <img
      src={PulseLogo}
      alt="Pulse Logo"
      className={`${size} h-auto`}
    />
  );
}