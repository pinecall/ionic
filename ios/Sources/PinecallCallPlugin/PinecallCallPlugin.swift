import Foundation
import Capacitor

/// Capacitor bridge for the native call stack. Thin — all logic lives in
/// PinecallCallController.
@objc(PinecallCallPlugin)
public class PinecallCallPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PinecallCallPlugin"
    public let jsName = "PinecallCall"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isNativeCallSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setMuted", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSpeaker", returnType: CAPPluginReturnPromise)
    ]

    private let controller = PinecallCallController()

    override public func load() {
        controller.onState = { [weak self] state, reason in
            var data: [String: Any] = ["state": state]
            if let reason { data["reason"] = reason }
            self?.notifyListeners("state", data: data)
        }
        controller.onServerEvent = { [weak self] json in
            self?.notifyListeners("serverEvent", data: ["data": json])
        }
    }

    @objc func isNativeCallSupported(_ call: CAPPluginCall) {
        // CallKit is broken on the iOS simulator (callservicesd kills incoming
        // calls) and simulator media capture is unreliable — native calls are
        // real-device only. CallClient falls back to @pinecall/web elsewhere.
        #if targetEnvironment(simulator)
        call.resolve(["supported": false])
        #else
        call.resolve(["supported": true])
        #endif
    }

    @objc func startCall(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId"),
              let callerName = call.getString("callerName"),
              let tokenUrl = call.getString("tokenUrl") else {
            call.reject("callId, callerName and tokenUrl are required")
            return
        }
        let opts = PinecallCallController.StartOptions(
            callId: callId,
            callerName: callerName,
            handle: call.getString("handle") ?? callerName,
            tokenUrl: tokenUrl,
            direction: call.getString("direction") ?? "outgoing"
        )
        controller.startCall(opts) { error in
            if let error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    @objc func endCall(_ call: CAPPluginCall) {
        controller.endCall()
        call.resolve()
    }

    @objc func setMuted(_ call: CAPPluginCall) {
        controller.setMuted(call.getBool("muted") ?? false)
        call.resolve()
    }

    @objc func setSpeaker(_ call: CAPPluginCall) {
        controller.setSpeaker(call.getBool("on") ?? false)
        call.resolve()
    }
}
