import SafariServices
import UIKit
import WebKit

// The live PWA in a full-screen web view, as the Android TWA shows it (ROADMAP item 182):
// a web deploy updates the app without a store release. The page draws under the status
// bar, as the home-screen PWA does (`black-translucent`), and pads itself with
// env(safe-area-inset-*). Bridge adds the native parts that WKWebView lacks.
final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    // The host of the Play app (~/sun-chaser-android/twa-manifest.json). Also in Info.plist
    // (WKAppBoundDomains).
    static let appURL = URL(string: "https://sun-chaser.vercel.app/")!

    private let bridge = Bridge()
    private var webView: WKWebView!

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func loadView() {
        let config = WKWebViewConfiguration()
        // App-bound domains turn on the service worker, so the app opens offline as the PWA does.
        config.limitsNavigationsToAppBoundDomains = true
        config.allowsInlineMediaPlayback = true
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(named: "LaunchBackground")
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        #if DEBUG
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        #endif
        bridge.webView = webView
        bridge.install(in: config.userContentController) { [weak self] in
            Self.blockTestRunHosts(in: config.userContentController) {
                self?.webView.load(URLRequest(url: Self.appURL))
            }
        }
        view = webView
    }

    // A debug test run (launch argument `-SunChaserTestRun YES`, ios/README.md) blocks the
    // APIs that ban or throttle the developer's IP: BigDataCloud (CLAUDE.md) and CelesTrak.
    private static func blockTestRunHosts(in controller: WKUserContentController, then done: @escaping () -> Void) {
        #if DEBUG
        if UserDefaults.standard.bool(forKey: "SunChaserTestRun") {
            // One rule per host: content-blocker regexes have no `|`.
            let rules = "[" + [#"api\\.bigdatacloud\\.net"#, #"api-bdc\\.io"#, #"celestrak\\.org"#].map {
                #"{"trigger":{"url-filter":"^https?://\#($0)/"},"action":{"type":"block"}}"#
            }.joined(separator: ",") + "]"
            WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "test-run", encodedContentRuleList: rules) { list, error in
                guard let list else { fatalError("Test-run block list: \(String(describing: error))") }
                controller.add(list)
                done()
            }
            return
        }
        #endif
        done()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // The installed app keeps the screen on (useWakeLock with isInstalledApp(), item 90).
        UIApplication.shared.isIdleTimerDisabled = true
    }

    // Other sites open in an in-app Safari view and mail in the Mail app, as from the
    // home-screen PWA.
    private func openOutside(_ url: URL) {
        if url.scheme == "http" || url.scheme == "https" {
            present(SFSafariViewController(url: url), animated: true)
        } else {
            UIApplication.shared.open(url)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = action.request.url, action.targetFrame?.isMainFrame != false,
           ["http", "https", "mailto", "tel"].contains(url.scheme), url.host != Self.appURL.host {
            openOutside(url)
            return decisionHandler(.cancel)
        }
        decisionHandler(.allow)
    }

    // target="_blank" links (data sources, NORAD, OpenStreetMap).
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { openOutside(url) }
        return nil
    }

    // The compass (item 8): DeviceOrientationEvent.requestPermission() resolves 'granted'
    // with no second web prompt.
    func webView(_ webView: WKWebView, requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(origin.host == Self.appURL.host ? .grant : .deny)
    }

    // The scene is heavy; iOS can end the web process in the background. Load it again.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.load(URLRequest(url: Self.appURL))
    }

    // Only the first start has no service worker cache. Without a connection, say so.
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        let error = error as NSError
        guard error.domain == NSURLErrorDomain, error.code != NSURLErrorCancelled else { return }
        webView.loadHTMLString(Self.offlinePage, baseURL: Self.appURL)
    }

    private static var offlinePage: String {
        """
        <!doctype html>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:0 32px;box-sizing:border-box;background:#0F1016;color:#fff;font:17px -apple-system,system-ui;text-align:center">
        <b>\(String(localized: "offline.title"))</b>
        <span style="opacity:.7">\(String(localized: "offline.body"))</span>
        <button onclick="location.replace('/')" style="margin-top:12px;padding:10px 24px;border:0;border-radius:999px;background:#FEC6A1;color:#0F1016;font:inherit">\(String(localized: "offline.retry"))</button>
        </body>
        """
    }
}
