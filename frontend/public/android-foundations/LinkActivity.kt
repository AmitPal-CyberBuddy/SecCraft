// Synthetic teaching excerpt; not a compiled app. Names/values are invented.
package org.seccraft.training.notes

class LinkActivity : Activity() {
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val id = intent?.data?.getQueryParameter("id") ?: return
        // The parameter is untrusted: the manifest's intent filter does not authenticate it.
        val note = noteStore.lookup(id)
        // Hypothesis only: whether lookup enforces ownership is NOT supplied in this excerpt.
        showNote(note)
    }
}
