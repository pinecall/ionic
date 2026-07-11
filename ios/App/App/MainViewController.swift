import UIKit
import Capacitor

/// Custom bridge VC — registers the in-app PinecallCall plugin (Capacitor 8
/// custom-native-code pattern: override capacitorDidLoad + registerPluginInstance).
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PinecallCallPlugin())
    }
}
