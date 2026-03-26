export default function Spinner({ size = 24 }) {
  return (
    <div style={{
      width:size, height:size,
      border:`2px solid var(--border2)`,
      borderTopColor:'var(--gold)',
      borderRadius:'50%',
      animation:'spin .7s linear infinite',
    }} />
  );
}
