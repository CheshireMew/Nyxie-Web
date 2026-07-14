export function BootScreen({ ready }: { ready: boolean }) {
  return (
    <div className={`boot-screen${ready ? " is-done" : ""}`} aria-hidden={ready}>
      <div className="boot-mark">NX</div>
      <div className="boot-line"><span /></div>
      <p>OPENING THE WRONG DOOR</p>
    </div>
  );
}
