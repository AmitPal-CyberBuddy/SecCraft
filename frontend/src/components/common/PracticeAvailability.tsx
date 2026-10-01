/** Delivery availability is separate from protocol/RF requirements and local grading. */
export function PracticeAvailability({ expanded = false }: { expanded?: boolean }) {
  return <details className="sc-practice-availability" open={expanded || undefined}>
    <summary><span>Offline practice available</span><span>Hosted live labs unavailable</span></summary>
    <div className="sc-practice-delivery-grid">
      <div><h3>Supplied evidence · available</h3><p>Review captures, written cases and configurations. Use the decoded evidence when you cannot install tools.</p></div>
      <div><h3>Local tools · your computer</h3><p>Downloaded captures work with your own Wireshark or TShark. The browser command simulator is scripted, not a shell or VM.</p></div>
      <div><h3>RF validation · optional equipment</h3><p>Physical reception, injection and client effects need your own isolated, authorized AP, adapter and client. Record these as not tested when unavailable.</p></div>
      <div><h3>Hosted execution · not available</h3><p>SecCraft does not provision a cloud lab or live target. Complete the offline reasoning now; it does not demonstrate live execution competence.</p></div>
    </div>
    <p className="sc-practice-delivery-note">Availability is separate from assessment: local answer checks and self-review are not independent grading. Offline lessons do not require hardware.</p>
  </details>
}
