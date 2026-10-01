package com.bibliadc.app;

import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Oculta as barras do Android apenas durante a leitura em tela completa. */
@CapacitorPlugin(name = "ReadingFullscreen")
public class ReadingFullscreenPlugin extends Plugin {
  private boolean enabled = false;
  private int previousFlags = 0;
  private int previousBehavior = 0;
  private boolean statusVisible = true;
  private boolean navigationVisible = true;

  @PluginMethod
  public void setEnabled(PluginCall call) {
    final boolean requested = Boolean.TRUE.equals(call.getBoolean("enabled", false));
    getActivity().runOnUiThread(() -> {
      try {
        View decor = getActivity().getWindow().getDecorView();
        if (requested && !enabled) {
          previousFlags = decor.getSystemUiVisibility();
          if (Build.VERSION.SDK_INT >= 30) {
            WindowInsets insets = decor.getRootWindowInsets();
            if (insets != null) {
              statusVisible = insets.isVisible(WindowInsets.Type.statusBars());
              navigationVisible = insets.isVisible(WindowInsets.Type.navigationBars());
            }
            WindowInsetsController controller = getActivity().getWindow().getInsetsController();
            if (controller != null) previousBehavior = controller.getSystemBarsBehavior();
          }
        }
        if (requested || enabled) apply(requested);
        enabled = requested;
        call.resolve();
      } catch (Exception error) {
        call.reject("Não foi possível ajustar a tela completa.", error);
      }
    });
  }

  @SuppressWarnings("deprecation")
  private void apply(boolean active) {
    View decor = getActivity().getWindow().getDecorView();
    if (Build.VERSION.SDK_INT >= 30) {
      WindowInsetsController controller = getActivity().getWindow().getInsetsController();
      if (controller != null) {
        if (active) {
          controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
          controller.hide(WindowInsets.Type.systemBars());
        } else {
          controller.setSystemBarsBehavior(previousBehavior);
          if (statusVisible) controller.show(WindowInsets.Type.statusBars());
          else controller.hide(WindowInsets.Type.statusBars());
          if (navigationVisible) controller.show(WindowInsets.Type.navigationBars());
          else controller.hide(WindowInsets.Type.navigationBars());
        }
        return;
      }
    }
    decor.setSystemUiVisibility(active
      ? View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      : previousFlags);
  }

  @Override
  protected void handleOnResume() {
    if (enabled) getActivity().runOnUiThread(() -> apply(true));
  }
}
