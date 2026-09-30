package org.seccraft.noteslab;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Deliberately tiny, synthetic training app. Never connect it to real accounts or data. */
public final class MainActivity extends Activity {
    private String activeUser = "alice"; // Mock account selector, NOT real authentication.
    private TextView output;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(28, 40, 28, 28);
        TextView explanation = new TextView(this);
        explanation.setText("Synthetic notes only. No real accounts, network or secrets. " +
                (BuildConfig.DEMO_VULNERABLE ? "VULNERABLE" : "FIXED") + " variant.");
        layout.addView(explanation);
        Button switchAccount = new Button(this);
        switchAccount.setText("Switch mock account (Alice / Bob)");
        layout.addView(switchAccount);
        output = new TextView(this);
        output.setTextSize(18);
        layout.addView(output);
        setContentView(layout);
        switchAccount.setOnClickListener((View view) -> {
            activeUser = activeUser.equals("alice") ? "bob" : "alice";
            output.setText("Mock account: " + activeUser + ". Open an owned demo note URI to test.");
        });
        handleIntent(getIntent());
    }

    @Override public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (!Intent.ACTION_VIEW.equals(intent.getAction()) || intent.getData() == null) {
            output.setText("Mock account: " + activeUser + ". Open seccraftnotes://open?id=1 or id=2.");
            return;
        }
        String id = intent.getData().getQueryParameter("id"); // Untrusted caller-supplied value.
        String note = NoteStore.lookup(id, activeUser, BuildConfig.DEMO_VULNERABLE);
        output.setText("Mock account: " + activeUser + "\n" +
                (note == null ? "DENIED or unknown note" : "Visible note: " + note));
    }
}
