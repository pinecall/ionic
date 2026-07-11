require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'PinecallIonic'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://pinecall.io'
  s.author = package['author']
  s.source = { :git => 'https://github.com/pinecall/ionic.git', :tag => package['version'] }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.dependency 'WebRTC-SDK', '~> 125.6422.07'
  s.swift_version = '5.1'
end
