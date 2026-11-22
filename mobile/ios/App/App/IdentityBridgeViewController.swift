import Capacitor

class IdentityBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(InstallationIdentityPlugin())
    }
}
