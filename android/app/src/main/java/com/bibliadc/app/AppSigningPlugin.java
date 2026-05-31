package com.bibliadc.app;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.MessageDigest;

/**
 * Expõe package name e SHA-1 do certificado de assinatura para chamadas REST
 * à API Gemini com chave restrita a apps Android (Capacitor/WebView).
 */
@CapacitorPlugin(name = "AppSigning")
public class AppSigningPlugin extends Plugin {

  @PluginMethod
  public void getAndroidSigningInfo(PluginCall call) {
    try {
      String packageName = getContext().getPackageName();
      String sha1 = obterSha1Assinatura();
      JSObject ret = new JSObject();
      ret.put("packageName", packageName);
      ret.put("sha1", sha1);
      call.resolve(ret);
    } catch (Exception e) {
      call.reject(e.getMessage() != null ? e.getMessage() : "Falha ao ler assinatura Android");
    }
  }

  private String obterSha1Assinatura() throws Exception {
    PackageManager pm = getContext().getPackageManager();
    String packageName = getContext().getPackageName();
    Signature[] signatures;

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      PackageInfo pi = pm.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES);
      if (pi.signingInfo.hasMultipleSigners()) {
        signatures = pi.signingInfo.getApkContentsSigners();
      } else {
        signatures = pi.signingInfo.getSigningCertificateHistory();
      }
    } else {
      @SuppressWarnings("deprecation")
      PackageInfo pi = pm.getPackageInfo(packageName, PackageManager.GET_SIGNATURES);
      signatures = pi.signatures;
    }

    if (signatures == null || signatures.length == 0) {
      throw new IllegalStateException("Nenhuma assinatura encontrada");
    }

    MessageDigest md = MessageDigest.getInstance("SHA-1");
    byte[] digest = md.digest(signatures[0].toByteArray());
    StringBuilder sb = new StringBuilder(digest.length * 2);
    for (byte b : digest) {
      sb.append(String.format("%02x", b));
    }
    return sb.toString();
  }
}
