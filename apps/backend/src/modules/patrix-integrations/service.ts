import { MedusaService } from "@medusajs/framework/utils"
import IntegrationConnection from "./models/integration-connection"
import IntegrationLog from "./models/integration-log"
import IntegrationWebhook from "./models/integration-webhook"

class PatrixIntegrationsService extends MedusaService({ IntegrationConnection, IntegrationWebhook, IntegrationLog }) {}

export default PatrixIntegrationsService
