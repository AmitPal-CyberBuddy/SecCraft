/** Only the decorative rule is replaced. Evidence text and its focus/scroll stay put. */
export function SelectionMarker({ value }: { value: string | number }) {
  return <span key={value} className="sc-evidence-change-marker" aria-hidden="true" />
}
