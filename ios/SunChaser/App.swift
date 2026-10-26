import UIKit
import UserNotifications

// Sun Chaser for iOS (ios/README.md): one window with WebViewController, which shows the
// live PWA. The app delegate also shows a reminder while the app is open, as the web
// notification does.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        Store.finishUpdates()
        return true
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        // Unit tests (SunChaserTests) host the app: no page, so no API calls from the test run.
        let isTestHost = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
        window.rootViewController = isTestHost ? UIViewController() : WebViewController()
        window.makeKeyAndVisible()
        self.window = window
        #if DEBUG
        // Simulator checks (ios/README.md): `-SunChaserTestLandscape YES` turns the app to landscape.
        if UserDefaults.standard.bool(forKey: "SunChaserTestLandscape") {
            scene.requestGeometryUpdate(.iOS(interfaceOrientations: .landscapeRight))
        }
        #endif
    }
}
