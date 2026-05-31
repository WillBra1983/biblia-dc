package com.bibliadc.app;

import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(AppSigningPlugin.class);
    super.onCreate(savedInstanceState);
  }

  @Override
  public boolean onKeyDown(int keyCode, KeyEvent event) {
    if (keyCode == KeyEvent.KEYCODE_BACK) {
      WebView webView = this.getBridge().getWebView();
      if (webView != null) {
        webView.post(() -> webView.evaluateJavascript("window.dispatchEvent(new Event('androidBack'));", null));
        return true; // bloqueia o comportamento padrão
      }
    }
    return super.onKeyDown(keyCode, event);
  }
}
