// Keep the same playback controller alive across Studio workspace and canvas routes.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
