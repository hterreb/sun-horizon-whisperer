import CoreLocation
import UIKit
import UserNotifications
import WebKit

// The native side of the page script below. WKWebView asks for the location a second time
// on each start and has no Notification API, so the page's location and reminder calls
// come here: Core Location for navigator.geolocation, UserNotifications for Notification
// and ServiceWorkerRegistration.showNotification, and the reminders the page schedules
// ahead of time (window.sunChaserReminders, getNativeReminders in useSunsetReminder.ts).
final class Bridge: NSObject, WKScriptMessageHandlerWithReply, CLLocationManagerDelegate {
    weak var webView: WKWebView?
    private let locationManager = CLLocationManager()
    private var waitingForPermission: [PositionRequest] = []
    private var waitingForFix: [PositionRequest] = []

    // Adds the message handler and the page script with the current permission states,
    // then calls `ready`. The page reads Notification.permission once at start, so it waits
    // for iOS's answer, but at most 1 s (a fresh simulator took over 60 s): then it starts
    // with the last known state, and a late answer corrects the page.
    func install(in controller: WKUserContentController, ready: @escaping () -> Void) {
        locationManager.delegate = self
        controller.addScriptMessageHandler(self, contentWorld: .page, name: "sunChaser")
        NotificationCenter.default.addObserver(self, selector: #selector(sendNotificationState), name: UIApplication.willEnterForegroundNotification, object: nil)
        var isInstalled = false
        let addScript = { [self] (notifications: String) in
            guard !isInstalled else { return }
            isInstalled = true
            let source = Self.pageScript
                .replacingOccurrences(of: "%GEOLOCATION%", with: geolocationState)
                .replacingOccurrences(of: "%NOTIFICATIONS%", with: notifications)
            controller.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            ready()
        }
        notificationState { [weak self] state in
            if isInstalled { self?.webView?.evaluateJavaScript("window.__sunChaserNotificationState?.('\(state)')") }
            addScript(state)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            addScript(UserDefaults.standard.string(forKey: Self.notificationStateKey) ?? "default")
        }
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        // Only the app's own page may use the bridge, not a frame from another site.
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.host == WebViewController.appURL.host,
              let body = message.body as? [String: Any], let action = body["action"] as? String else {
            return replyHandler(nil, "Not allowed")
        }
        switch action {
        case "getCurrentPosition":
            getCurrentPosition(PositionRequest(reply: replyHandler, timeoutMs: body["timeout"] as? Double, highAccuracy: body["highAccuracy"] as? Bool ?? false))
        case "requestNotificationPermission":
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in
                DispatchQueue.main.async {
                    UserDefaults.standard.set(granted ? "granted" : "denied", forKey: Self.notificationStateKey)
                    replyHandler(granted ? "granted" : "denied", nil)
                }
            }
        case "notify":
            // A tag replaces the shown notification with the same tag, as on the web.
            let tag = body["tag"] as? String ?? ""
            addNotification(id: tag.isEmpty ? UUID().uuidString : tag, title: body["title"] as? String ?? "", body: body["body"] as? String ?? "", trigger: nil)
            replyHandler(nil, nil)
        case "schedule":
            // A reminder the page gives ahead of time (getNativeReminders): it also comes while
            // the app is in the background or closed.
            guard let id = body["id"] as? String, let at = body["at"] as? Double else { return replyHandler(nil, "Bad reminder") }
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, at / 1000 - Date().timeIntervalSince1970), repeats: false)
            addNotification(id: id, title: "Sun Chaser", body: body["body"] as? String ?? "", trigger: trigger)
            replyHandler(nil, nil)
        case "cancel":
            if let id = body["id"] as? String {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
            }
            replyHandler(nil, nil)
        default:
            replyHandler(nil, "Unknown action \(action)")
        }
    }

    // MARK: Location

    private var geolocationState: String {
        switch locationManager.authorizationStatus {
        case .notDetermined: "prompt"
        case .authorizedWhenInUse, .authorizedAlways: "granted"
        default: "denied"
        }
    }

    private func getCurrentPosition(_ request: PositionRequest) {
        switch geolocationState {
        case "prompt":
            waitingForPermission.append(request)
            locationManager.requestWhenInUseAuthorization()
        case "granted":
            startFix(request)
        default:
            request.fail(code: 1, "User denied Geolocation")
        }
    }

    // The timeout starts once the location is allowed, as in a browser.
    private func startFix(_ request: PositionRequest) {
        waitingForFix.append(request)
        if let timeoutMs = request.timeoutMs {
            DispatchQueue.main.asyncAfter(deadline: .now() + timeoutMs / 1000) { [weak self, weak request] in
                guard let self, let request, let index = waitingForFix.firstIndex(where: { $0 === request }) else { return }
                waitingForFix.remove(at: index)
                request.fail(code: 3, "Timeout expired")
            }
        }
        locationManager.desiredAccuracy = request.highAccuracy ? kCLLocationAccuracyBest : kCLLocationAccuracyHundredMeters
        locationManager.requestLocation()
    }

    // Also runs when the location is allowed later in Settings: the page's Permissions API
    // status gets a change event, and SunTracker asks for the position again (item 170).
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let state = geolocationState
        webView?.evaluateJavaScript("window.__sunChaserGeolocationState?.('\(state)')")
        guard state != "prompt" else { return }
        let waiting = waitingForPermission
        waitingForPermission = []
        for request in waiting {
            if state == "granted" { startFix(request) } else { request.fail(code: 1, "User denied Geolocation") }
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        let fixes = waitingForFix
        waitingForFix = []
        fixes.forEach { $0.succeed(location) }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let denied = (error as? CLError)?.code == .denied
        let fixes = waitingForFix
        waitingForFix = []
        fixes.forEach { $0.fail(code: denied ? 1 : 2, denied ? "User denied Geolocation" : "Position unavailable") }
    }

    // MARK: Notifications

    private func addNotification(id: String, title: String, body: String, trigger: UNNotificationTrigger?) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }

    private static let notificationStateKey = "notificationState"

    // Also saves the state for the next start (see install).
    private func notificationState(_ done: @escaping (String) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let state = switch settings.authorizationStatus {
            case .notDetermined: "default"
            case .denied: "denied"
            default: "granted"
            }
            DispatchQueue.main.async {
                UserDefaults.standard.set(state, forKey: Self.notificationStateKey)
                done(state)
            }
        }
    }

    // Notifications can be turned on or off in Settings while the app is in the background.
    @objc private func sendNotificationState() {
        notificationState { [weak self] state in
            self?.webView?.evaluateJavaScript("window.__sunChaserNotificationState?.('\(state)')")
        }
    }

    // Injected at document start into the main frame. It also sets navigator.standalone,
    // as the home-screen PWA has it: isInstalledApp() is true, so there is no install
    // prompt and the screen stays on.
    private static let pageScript = #"""
    (() => {
      const state = { geolocation: '%GEOLOCATION%', notifications: '%NOTIFICATIONS%' };
      const native = (action, body) => window.webkit.messageHandlers.sunChaser.postMessage({ action, ...body });

      Object.defineProperty(navigator, 'standalone', { value: true });

      // ponytail: getCurrentPosition only, the app has no watchPosition; maximumAge is ignored.
      const positionError = (code, message) => ({ code, message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
      Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
        value(success, error, options) {
          const timeout = options?.timeout;
          native('getCurrentPosition', { timeout: Number.isFinite(timeout) ? timeout : null, highAccuracy: !!options?.enableHighAccuracy })
            .then((r) => (r.coords ? success({ coords: r.coords, timestamp: r.timestamp }) : error?.(positionError(r.code, r.message))));
        },
      });

      const geolocationStatus = Object.assign(new EventTarget(), { name: 'geolocation', onchange: null });
      Object.defineProperty(geolocationStatus, 'state', { get: () => state.geolocation });
      window.__sunChaserGeolocationState = (next) => {
        if (next === state.geolocation) return;
        state.geolocation = next;
        const event = new Event('change');
        geolocationStatus.dispatchEvent(event);
        geolocationStatus.onchange?.(event);
      };
      if (navigator.permissions) {
        const query = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (descriptor) =>
          descriptor?.name === 'geolocation' ? Promise.resolve(geolocationStatus) : query(descriptor);
      }

      const notify = (title, options = {}) => native('notify', { title, body: options.body ?? '', tag: options.tag ?? '' });
      window.Notification = class Notification extends EventTarget {
        constructor(title, options = {}) {
          super();
          Object.assign(this, { title, body: options.body ?? '', tag: options.tag ?? '', onclick: null, onclose: null, onerror: null, onshow: null });
          notify(title, options);
        }
        close() {}
        static get permission() { return state.notifications; }
        static async requestPermission(callback) {
          state.notifications = await native('requestNotificationPermission');
          callback?.(state.notifications);
          return state.notifications;
        }
      };
      window.__sunChaserNotificationState = (next) => { state.notifications = next; };
      // getNativeReminders (src/hooks/useSunsetReminder.ts): the sunset and ISS reminders.
      window.sunChaserReminders = {
        schedule: (id, at, body) => { native('schedule', { id, at, body }); },
        cancel: (id) => { native('cancel', { id }); },
      };
      if (window.ServiceWorkerRegistration) {
        ServiceWorkerRegistration.prototype.showNotification = async (title, options) => { await notify(title, options); };
      }
    })();
    """#
}

private final class PositionRequest {
    let reply: (Any?, String?) -> Void
    let timeoutMs: Double?
    let highAccuracy: Bool

    init(reply: @escaping (Any?, String?) -> Void, timeoutMs: Double?, highAccuracy: Bool) {
        self.reply = reply
        self.timeoutMs = timeoutMs
        self.highAccuracy = highAccuracy
    }

    func succeed(_ location: CLLocation) {
        // Core Location marks an unknown value with a negative number; the web uses null.
        func optional(_ value: Double, _ valid: Bool) -> Any { valid ? value as Any : NSNull() }
        let coords: [String: Any] = [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "altitude": optional(location.altitude, location.verticalAccuracy >= 0),
            "altitudeAccuracy": optional(location.verticalAccuracy, location.verticalAccuracy >= 0),
            "heading": optional(location.course, location.course >= 0),
            "speed": optional(location.speed, location.speed >= 0),
        ]
        reply(["coords": coords, "timestamp": location.timestamp.timeIntervalSince1970 * 1000] as [String: Any], nil)
    }

    func fail(code: Int, _ message: String) {
        reply(["code": code, "message": message] as [String: Any], nil)
    }
}
