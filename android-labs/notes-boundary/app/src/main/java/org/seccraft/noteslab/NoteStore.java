package org.seccraft.noteslab;

/** In-memory, original synthetic teaching records; no persistent storage or credentials. */
public final class NoteStore {
    private NoteStore() { }
    public static String lookup(String id, String activeUser, boolean vulnerable) {
        String owner;
        String body;
        if ("1".equals(id)) { owner = "alice"; body = "Alice's synthetic grocery list"; }
        else if ("2".equals(id)) { owner = "bob"; body = "Bob's synthetic book list"; }
        else return null;
        // Educational bug: the vulnerable flavor fails to enforce ownership.
        if (!vulnerable && !owner.equals(activeUser)) return null;
        return body;
    }
}
