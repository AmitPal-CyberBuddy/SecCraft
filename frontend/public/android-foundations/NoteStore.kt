// Synthetic second excerpt. A demo-only invariant, not proof of runtime execution.
package org.seccraft.training.notes

class NoteStore(private val session: Session, private val db: NoteDatabase) {
    fun lookup(id: String): Note? {
        val candidate = db.findById(id) ?: return null
        return if (candidate.ownerId == session.userId) candidate else null
    }
}
