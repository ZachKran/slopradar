export default function RealIcon({ size = 24 }) {
  return <img src="/icons/real-icon.png" alt="Real photo" width={size} height={size} style={{ display: "block", objectFit: "contain" }} draggable={false} />;
}
