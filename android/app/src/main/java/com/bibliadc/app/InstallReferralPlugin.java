package com.bibliadc.app;

import android.os.Handler;
import android.os.Looper;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/** Consulta a origem fornecida pela Play Store, sem bloquear a abertura da Bíblia. */
@CapacitorPlugin(name = "InstallReferral")
public class InstallReferralPlugin extends Plugin {
    @PluginMethod
    public void read(PluginCall call) {
        final InstallReferrerClient client;
        try {
            client = InstallReferrerClient.newBuilder(getContext()).build();
        } catch (Exception error) {
            call.resolve(result("unavailable", ""));
            return;
        }
        final Handler handler = new Handler(Looper.getMainLooper());
        final AtomicBoolean finished = new AtomicBoolean(false);
        final Runnable timeout = () -> {
            if (!finished.compareAndSet(false, true)) return;
            try { client.endConnection(); } catch (Exception ignored) { }
            call.resolve(result("unavailable", ""));
        };
        final Consumer<JSObject> complete = value -> {
            if (!finished.compareAndSet(false, true)) return;
            handler.removeCallbacks(timeout);
            try { client.endConnection(); } catch (Exception ignored) { }
            call.resolve(value);
        };
        handler.postDelayed(timeout, 4000);
        try {
            client.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int code) {
                    if (finished.get()) return;
                    if (code == InstallReferrerClient.InstallReferrerResponse.OK) {
                        execute(() -> {
                            try {
                                complete.accept(result("ok", client.getInstallReferrer().getInstallReferrer()));
                            } catch (Exception error) {
                                complete.accept(result("unavailable", ""));
                            }
                        });
                    } else {
                        complete.accept(result(code == InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED ? "unsupported" : "unavailable", ""));
                    }
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    complete.accept(result("unavailable", ""));
                }
            });
        } catch (Exception error) {
            complete.accept(result("unavailable", ""));
        }
    }

    private static JSObject result(String status, String referrer) {
        JSObject value = new JSObject();
        value.put("status", status);
        value.put("referrer", referrer);
        return value;
    }
}
