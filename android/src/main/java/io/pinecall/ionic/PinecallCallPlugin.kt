package io.pinecall.ionic

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import io.pinecall.call.PinecallCallController

/**
 * Capacitor bridge for the native call stack (Android). Thin — all logic lives
 * in the shared io.pinecall.call.PinecallCallController. Events go to JS
 * listeners registered via addListener('state' | 'serverEvent').
 */
@CapacitorPlugin(name = "PinecallCall")
class PinecallCallPlugin : Plugin() {

    override fun load() {
        PinecallCallController.init(context)
        PinecallCallController.onState = { state, reason ->
            val data = JSObject().put("state", state)
            if (reason != null) data.put("reason", reason)
            notifyListeners("state", data)
        }
        PinecallCallController.onServerEvent = { json ->
            notifyListeners("serverEvent", JSObject().put("data", json))
        }
    }

    @PluginMethod
    fun isNativeCallSupported(call: PluginCall) {
        call.resolve(JSObject().put("supported", PinecallCallController.isSupported()))
    }

    @PluginMethod
    fun startCall(call: PluginCall) {
        val callId = call.getString("callId")
        val callerName = call.getString("callerName")
        val tokenUrl = call.getString("tokenUrl")
        if (callId == null || callerName == null || tokenUrl == null) {
            call.reject("callId, callerName and tokenUrl are required")
            return
        }
        PinecallCallController.startCall(
            PinecallCallController.StartOptions(
                callId = callId,
                callerName = callerName,
                handle = call.getString("handle") ?: callerName,
                tokenUrl = tokenUrl,
                direction = call.getString("direction") ?: "outgoing",
            ),
        )
        call.resolve()
    }

    @PluginMethod
    fun endCall(call: PluginCall) {
        PinecallCallController.endCall()
        call.resolve()
    }

    @PluginMethod
    fun setMuted(call: PluginCall) {
        PinecallCallController.setMuted(call.getBoolean("muted", false) == true)
        call.resolve()
    }

    @PluginMethod
    fun setSpeaker(call: PluginCall) {
        PinecallCallController.setSpeaker(call.getBoolean("on", false) == true)
        call.resolve()
    }
}
