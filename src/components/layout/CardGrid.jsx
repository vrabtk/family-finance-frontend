export default function CardGrid({ children }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:14}}>
      {children}
    </div>
  );
}
