// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PinecallIonic",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "PinecallIonic",
            targets: ["PinecallCallPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/stasel/WebRTC.git", from: "125.0.0")
    ],
    targets: [
        .target(
            name: "PinecallCallPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "WebRTC", package: "WebRTC")
            ],
            path: "ios/Sources/PinecallCallPlugin",
            linkerSettings: [
                .linkedFramework("CallKit"),
                .linkedFramework("AVFoundation")
            ])
    ]
)
