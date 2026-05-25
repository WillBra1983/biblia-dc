/**
 * Apple ITMS-91061: GoogleSignIn 6.x (via @codetrix-studio/capacitor-google-auth) não inclui
 * PrivacyInfo.xcprivacy em GoogleSignIn, GTMAppAuth e GTMSessionFetcher.
 * Força GoogleSignIn 7.1+ e adapta Plugin.swift à API do SDK 7.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkgDir = path.join(
  root,
  'node_modules',
  '@codetrix-studio',
  'capacitor-google-auth'
)

if (!fs.existsSync(pkgDir)) {
  console.warn('[ios-patch-google-auth] Pacote não instalado; rode npm ci antes.')
  process.exit(0)
}

const podspecPath = path.join(pkgDir, 'CodetrixStudioCapacitorGoogleAuth.podspec')
let podspec = fs.readFileSync(podspecPath, 'utf8')
if (!podspec.includes("GoogleSignIn', '~> 7.1'")) {
  podspec = podspec.replace(
    /s\.dependency 'GoogleSignIn', '[^']+'/,
    "s.dependency 'GoogleSignIn', '~> 7.1'"
  )
  fs.writeFileSync(podspecPath, podspec)
  console.log('[ios-patch-google-auth] podspec → GoogleSignIn ~> 7.1')
}

const pluginSwift = `import Foundation
import Capacitor
import GoogleSignIn

/**
 * Adaptado para GoogleSignIn 7.1+ (manifestos de privacidade Apple ITMS-91061).
 * Original: @codetrix-studio/capacitor-google-auth
 */
@objc(GoogleAuth)
public class GoogleAuth: CAPPlugin {
    var signInCall: CAPPluginCall!
    var googleSignIn: GIDSignIn!
    var googleSignInConfiguration: GIDConfiguration!
    var forceAuthCode: Bool = false
    var additionalScopes: [String]!

    func loadSignInClient(
        customClientId: String,
        customScopes: [String]
    ) {
        googleSignIn = GIDSignIn.sharedInstance

        let serverClientId = getServerClientIdValue()

        googleSignInConfiguration = GIDConfiguration(
            clientID: customClientId,
            serverClientID: serverClientId
        )

        let defaultGrantedScopes = ["email", "profile", "openid"]
        additionalScopes = customScopes.filter {
            !defaultGrantedScopes.contains($0)
        }

        forceAuthCode = getConfig().getBoolean("forceCodeForRefreshToken", false)

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOpenUrl(_:)),
            name: Notification.Name(Notification.Name.capacitorOpenURL.rawValue),
            object: nil
        )
    }

    public override func load() {
    }

    @objc
    func initialize(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId") ?? getClientIdValue() as? String else {
            NSLog("no client id found in config")
            call.resolve()
            return
        }

        let customScopes = call.getArray("scopes", String.self) ?? (
            getConfigValue("scopes") as? [String] ?? []
        )

        forceAuthCode = call.getBool("grantOfflineAccess") ?? (
            getConfigValue("forceCodeForRefreshToken") as? Bool ?? false
        )

        self.loadSignInClient(
            customClientId: clientId,
            customScopes: customScopes
        )
        call.resolve()
    }

    @objc
    func signIn(_ call: CAPPluginCall) {
        signInCall = call
        DispatchQueue.main.async {
            self.googleSignIn.configuration = self.googleSignInConfiguration

            if self.googleSignIn.hasPreviousSignIn() && !self.forceAuthCode {
                self.googleSignIn.restorePreviousSignIn { user, error in
                    if let error = error {
                        self.signInCall?.reject(error.localizedDescription)
                        return
                    }
                    self.resolveSignInCallWith(user: user!, serverAuthCode: nil)
                }
            } else {
                let presentingVc = self.bridge!.viewController!

                self.googleSignIn.signIn(
                    withPresenting: presentingVc,
                    hint: nil,
                    additionalScopes: self.additionalScopes
                ) { signInResult, error in
                    if let error = error {
                        self.signInCall?.reject(error.localizedDescription, "\\(error._code)")
                        return
                    }
                    guard let signInResult = signInResult else {
                        self.signInCall?.reject("Sign-in sem resultado.")
                        return
                    }
                    self.resolveSignInCallWith(
                        user: signInResult.user,
                        serverAuthCode: signInResult.serverAuthCode
                    )
                }
            }
        }
    }

    @objc
    func refresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.googleSignIn.currentUser == nil {
                call.reject("User not logged in.")
                return
            }
            self.googleSignIn.currentUser!.refreshTokensIfNeeded { user, error in
                guard let user = user else {
                    call.reject(error?.localizedDescription ?? "Something went wrong.")
                    return
                }
                let authenticationData: [String: Any] = [
                    "accessToken": user.accessToken.tokenString,
                    "idToken": user.idToken?.tokenString ?? NSNull(),
                    "refreshToken": user.refreshToken.tokenString
                ]
                call.resolve(authenticationData)
            }
        }
    }

    @objc
    func signOut(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.googleSignIn.signOut()
        }
        call.resolve()
    }

    @objc
    func handleOpenUrl(_ notification: Notification) {
        guard let object = notification.object as? [String: Any] else {
            print("There is no object on handleOpenUrl")
            return
        }
        guard let url = object["url"] as? URL else {
            print("There is no url on handleOpenUrl")
            return
        }
        _ = googleSignIn.handle(url)
    }

    func getClientIdValue() -> String? {
        if let clientId = getConfig().getString("iosClientId") {
            return clientId
        } else if let clientId = getConfig().getString("clientId") {
            return clientId
        } else if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
                  let dict = NSDictionary(contentsOfFile: path) as? [String: AnyObject],
                  let clientId = dict["CLIENT_ID"] as? String {
            return clientId
        }
        return nil
    }

    func getServerClientIdValue() -> String? {
        if let serverClientId = getConfig().getString("serverClientId") {
            return serverClientId
        }
        return nil
    }

    func resolveSignInCallWith(user: GIDGoogleUser, serverAuthCode: String?) {
        var userData: [String: Any] = [
            "authentication": [
                "accessToken": user.accessToken.tokenString,
                "idToken": user.idToken?.tokenString ?? NSNull(),
                "refreshToken": user.refreshToken.tokenString
            ],
            "serverAuthCode": serverAuthCode ?? NSNull(),
            "email": user.profile?.email ?? NSNull(),
            "familyName": user.profile?.familyName ?? NSNull(),
            "givenName": user.profile?.givenName ?? NSNull(),
            "id": user.userID ?? NSNull(),
            "name": user.profile?.name ?? NSNull()
        ]
        if let imageUrl = user.profile?.imageURL(withDimension: 100)?.absoluteString {
            userData["imageUrl"] = imageUrl
        }
        signInCall?.resolve(userData)
    }
}
`

fs.writeFileSync(path.join(pkgDir, 'ios', 'Plugin', 'Plugin.swift'), pluginSwift)
console.log('[ios-patch-google-auth] Plugin.swift atualizado para GoogleSignIn 7.x')
