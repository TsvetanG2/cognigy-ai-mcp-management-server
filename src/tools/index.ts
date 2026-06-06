/**
 * Tool registration module.
 * Registers all available MCP tools with the server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";
import { registerListProjects } from "./list-projects.js";
import { registerListFlows } from "./list-flows.js";
import { registerGetFlow } from "./get-flow.js";
import { registerGetFlowSettings } from "./get-flow-settings.js";
import { registerGetLatestLogEntries } from "./get-latest-log-entries.js";
import { registerGetNodes } from "./get-nodes.js";
import { registerGetNode } from "./get-node.js";
import { registerSearchNodes } from "./search-nodes.js";
import { registerGetNodeDescriptors } from "./get-node-descriptors.js";
import { registerListIntents } from "./list-intents.js";
import { registerGetIntent } from "./get-intent.js";
import { registerListEndpoints } from "./list-endpoints.js";
import { registerGetEndpoint } from "./get-endpoint.js";
import { registerInjectContext } from "./inject-context.js";
import { registerResetContext } from "./reset-context.js";
import { registerGetConversations } from "./get-conversations.js";
import { registerGetConversation } from "./get-conversation.js";
import { registerGetTranscript } from "./get-transcript.js";
import { registerListSnapshots } from "./list-snapshots.js";
import { registerGetSnapshot } from "./get-snapshot.js";
import { registerGetSnapshotResources } from "./get-snapshot-resources.js";
import { registerListTasks } from "./list-tasks.js";
import { registerGetTask } from "./get-task.js";
// Phase 2: Node authoring
import { registerCreateNode } from "./create-node.js";
import { registerUpdateNode } from "./update-node.js";
import { registerDeleteNode } from "./delete-node.js";
import { registerMoveNode } from "./move-node.js";
import { registerGenerateNodeOutput } from "./generate-node-output.js";
// Phase 2: Intent authoring
import { registerCreateIntent } from "./create-intent.js";
import { registerUpdateIntent } from "./update-intent.js";
import { registerDeleteIntent } from "./delete-intent.js";
import { registerTrainIntents } from "./train-intents.js";
// Phase 2: Example sentences
import { registerListSentences } from "./list-sentences.js";
import { registerCreateSentence } from "./create-sentence.js";
import { registerGenerateSentences } from "./generate-sentences.js";
// Phase 2: Playbooks & testing
import { registerListPlaybooks } from "./list-playbooks.js";
import { registerGetPlaybook } from "./get-playbook.js";
import { registerRunPlaybook } from "./run-playbook.js";
import { registerListPlaybookRuns } from "./list-playbook-runs.js";
import { registerGetPlaybookRun } from "./get-playbook-run.js";
// Phase 2: NLU scoring
import { registerGenerateNluScores } from "./generate-nlu-scores.js";
// Phase 2: Composite tools
import { registerScoreUtterance } from "./score-utterance.js";
import { registerRunRegression } from "./run-regression.js";
import { registerAuditNlu } from "./audit-nlu.js";
// Phase 3: Snapshot lifecycle
import { registerCreateSnapshot } from "./create-snapshot.js";
import { registerDeleteSnapshot } from "./delete-snapshot.js";
import { registerCreateSnapshotDownloadLink } from "./create-snapshot-download-link.js";
import { registerRestoreSnapshot } from "./restore-snapshot.js";
import { registerPackageSnapshot } from "./package-snapshot.js";
import { registerUploadSnapshotPackage } from "./upload-snapshot-package.js";
// Phase 3: Packages
import { registerListPackages } from "./list-packages.js";
import { registerGetPackage } from "./get-package.js";
import { registerCreatePackage } from "./create-package.js";
import { registerDeletePackage } from "./delete-package.js";
import { registerMergePackage } from "./merge-package.js";
import { registerUploadPackage } from "./upload-package.js";
import { registerCreatePackageDownloadLink } from "./create-package-download-link.js";
// Phase 3: Composite tools
import { registerDiffSnapshots } from "./diff-snapshots.js";
import { registerPromoteSnapshot } from "./promote-snapshot.js";
import { registerCloneFlow } from "./clone-flow.js";
// Phase 4: Connections
import { registerListConnections } from "./list-connections.js";
import { registerGetConnection } from "./get-connection.js";
import { registerCreateConnection } from "./create-connection.js";
import { registerUpdateConnection } from "./update-connection.js";
import { registerDeleteConnection } from "./delete-connection.js";
// Phase 4: LLMs
import { registerListLlms } from "./list-llms.js";
import { registerGetLlm } from "./get-llm.js";
import { registerCreateLlm } from "./create-llm.js";
import { registerUpdateLlm } from "./update-llm.js";
import { registerDeleteLlm } from "./delete-llm.js";
import { registerCloneLlm } from "./clone-llm.js";
import { registerTestLlmConnection } from "./test-llm-connection.js";
// Phase 4: NLU Connectors
import { registerListNluConnectors } from "./list-nlu-connectors.js";
import { registerGetNluConnector } from "./get-nlu-connector.js";
import { registerCreateNluConnector } from "./create-nlu-connector.js";
import { registerUpdateNluConnector } from "./update-nlu-connector.js";
import { registerDeleteNluConnector } from "./delete-nlu-connector.js";
// Phase 4: Knowledge AI
import { registerListKnowledgeStores } from "./list-knowledge-stores.js";
import { registerGetKnowledgeStore } from "./get-knowledge-store.js";
import { registerCreateKnowledgeStore } from "./create-knowledge-store.js";
import { registerUpdateKnowledgeStore } from "./update-knowledge-store.js";
import { registerDeleteKnowledgeStore } from "./delete-knowledge-store.js";
import { registerListKnowledgeSources } from "./list-knowledge-sources.js";
import { registerGetKnowledgeSource } from "./get-knowledge-source.js";
import { registerCreateKnowledgeSource } from "./create-knowledge-source.js";
import { registerUpdateKnowledgeSource } from "./update-knowledge-source.js";
import { registerDeleteKnowledgeSource } from "./delete-knowledge-source.js";
import { registerListKnowledgeChunks } from "./list-knowledge-chunks.js";
import { registerGetKnowledgeChunk } from "./get-knowledge-chunk.js";
import { registerCreateKnowledgeChunk } from "./create-knowledge-chunk.js";
import { registerUpdateKnowledgeChunk } from "./update-knowledge-chunk.js";
import { registerDeleteKnowledgeChunk } from "./delete-knowledge-chunk.js";
import { registerListKnowledgeConnectors } from "./list-knowledge-connectors.js";
import { registerGetKnowledgeConnector } from "./get-knowledge-connector.js";
import { registerCreateKnowledgeConnector } from "./create-knowledge-connector.js";
import { registerUpdateKnowledgeConnector } from "./update-knowledge-connector.js";
import { registerDeleteKnowledgeConnector } from "./delete-knowledge-connector.js";
import { registerRunKnowledgeConnector } from "./run-knowledge-connector.js";
// Phase 4: Functions
import { registerListFunctions } from "./list-functions.js";
import { registerGetFunction } from "./get-function.js";
import { registerCreateFunction } from "./create-function.js";
import { registerUpdateFunction } from "./update-function.js";
import { registerDeleteFunction } from "./delete-function.js";
import { registerListFunctionInstances } from "./list-function-instances.js";
import { registerGetFunctionInstance } from "./get-function-instance.js";
import { registerTriggerFunction } from "./trigger-function.js";
import { registerStopFunctionInstance } from "./stop-function-instance.js";
// Phase 4: Extensions
import { registerListExtensions } from "./list-extensions.js";
import { registerGetExtension } from "./get-extension.js";
import { registerDeleteExtension } from "./delete-extension.js";
import { registerUpdateExtension } from "./update-extension.js";
import { registerUploadExtension } from "./upload-extension.js";
import { registerUpdateExtensionPackage } from "./update-extension-package.js";
// Phase 4: Contact Profiles
import { registerListContactProfiles } from "./list-contact-profiles.js";
import { registerGetContactProfile } from "./get-contact-profile.js";
import { registerCreateContactProfile } from "./create-contact-profile.js";
import { registerUpdateContactProfile } from "./update-contact-profile.js";
import { registerDeleteContactProfile } from "./delete-contact-profile.js";
import { registerRemoveContactId } from "./remove-contact-id.js";
import { registerMergeContactProfiles } from "./merge-contact-profiles.js";
import { registerUnmergeContactProfiles } from "./unmerge-contact-profiles.js";
import { registerExportContactProfile } from "./export-contact-profile.js";
import { registerGetContactProfileSchema } from "./get-contact-profile-schema.js";
import { registerSetContactProfileSchema } from "./set-contact-profile-schema.js";
// Phase 4: Analytics
import { registerGetConversationMetrics } from "./get-conversation-metrics.js";
import { registerGetCallMetrics } from "./get-call-metrics.js";
import { registerGetKnowledgeQueryMetrics } from "./get-knowledge-query-metrics.js";
import { registerUpdateAnalyticsRecord } from "./update-analytics-record.js";
// Phase 4: Audit
import { registerListAuditEvents } from "./list-audit-events.js";
import { registerGetAuditEvent } from "./get-audit-event.js";
// Phase 4: Handover
import { registerListHandoverProviders } from "./list-handover-providers.js";
import { registerGetHandoverProvider } from "./get-handover-provider.js";
import { registerCreateHandoverProvider } from "./create-handover-provider.js";
import { registerUpdateHandoverProvider } from "./update-handover-provider.js";
import { registerDeleteHandoverProvider } from "./delete-handover-provider.js";
import { registerListHandoverServices } from "./list-handover-services.js";
import { registerGetHandoverService } from "./get-handover-service.js";
// Phase 4: Search
import { registerSearchResources } from "./search-resources.js";

export function registerTools(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  // Phase 0: Core reads
  registerListProjects(server, client, config);
  registerListFlows(server, client, config);
  registerGetFlow(server, client, config);
  registerGetFlowSettings(server, client, config);
  registerGetLatestLogEntries(server, client, config);

  // Phase 1: Nodes (read/search)
  registerGetNodes(server, client, config);
  registerGetNode(server, client, config);
  registerSearchNodes(server, client, config);
  registerGetNodeDescriptors(server, client, config);

  // Phase 1: Intents (read)
  registerListIntents(server, client, config);
  registerGetIntent(server, client, config);

  // Phase 1: Endpoints (read)
  registerListEndpoints(server, client, config);
  registerGetEndpoint(server, client, config);

  // Phase 1: Sessions (inject/reset context)
  registerInjectContext(server, client, config);
  registerResetContext(server, client, config);

  // Phase 1: Conversations/Transcripts
  registerGetConversations(server, client, config);
  registerGetConversation(server, client, config);
  registerGetTranscript(server, client, config);

  // Phase 1: Snapshots (read)
  registerListSnapshots(server, client, config);
  registerGetSnapshot(server, client, config);
  registerGetSnapshotResources(server, client, config);

  // Phase 1: Tasks
  registerListTasks(server, client, config);
  registerGetTask(server, client, config);

  // Phase 2: Node authoring (mutating tools with dryRun)
  registerCreateNode(server, client, config);
  registerUpdateNode(server, client, config);
  registerDeleteNode(server, client, config);
  registerMoveNode(server, client, config);
  registerGenerateNodeOutput(server, client, config);

  // Phase 2: Intent authoring (mutating tools with dryRun + async training)
  registerCreateIntent(server, client, config);
  registerUpdateIntent(server, client, config);
  registerDeleteIntent(server, client, config);
  registerTrainIntents(server, client, config);

  // Phase 2: Example sentences (training data)
  registerListSentences(server, client, config);
  registerCreateSentence(server, client, config);
  registerGenerateSentences(server, client, config);

  // Phase 2: Playbooks & testing (async run with polling)
  registerListPlaybooks(server, client, config);
  registerGetPlaybook(server, client, config);
  registerRunPlaybook(server, client, config);
  registerListPlaybookRuns(server, client, config);
  registerGetPlaybookRun(server, client, config);

  // Phase 2: NLU scoring
  registerGenerateNluScores(server, client, config);

  // Phase 2: Composite tools (combine multiple operations)
  registerScoreUtterance(server, client, config);
  registerRunRegression(server, client, config);
  registerAuditNlu(server, client, config);

  // Phase 3: Snapshot lifecycle (async operations with polling)
  registerCreateSnapshot(server, client, config);
  registerDeleteSnapshot(server, client, config);
  registerCreateSnapshotDownloadLink(server, client, config);
  registerRestoreSnapshot(server, client, config);
  registerPackageSnapshot(server, client, config);
  registerUploadSnapshotPackage(server, client, config);

  // Phase 3: Packages (resource transfer between projects/environments)
  registerListPackages(server, client, config);
  registerGetPackage(server, client, config);
  registerCreatePackage(server, client, config);
  registerDeletePackage(server, client, config);
  registerMergePackage(server, client, config);
  registerUploadPackage(server, client, config);
  registerCreatePackageDownloadLink(server, client, config);

  // Phase 3: Composite tools (multi-step workflows)
  registerDiffSnapshots(server, client, config);
  registerPromoteSnapshot(server, client, config);
  registerCloneFlow(server, client, config);

  // Phase 4: Connections (with secret redaction)
  registerListConnections(server, client, config);
  registerGetConnection(server, client, config);
  registerCreateConnection(server, client, config);
  registerUpdateConnection(server, client, config);
  registerDeleteConnection(server, client, config);

  // Phase 4: LLMs
  registerListLlms(server, client, config);
  registerGetLlm(server, client, config);
  registerCreateLlm(server, client, config);
  registerUpdateLlm(server, client, config);
  registerDeleteLlm(server, client, config);
  registerCloneLlm(server, client, config);
  registerTestLlmConnection(server, client, config);

  // Phase 4: NLU Connectors
  registerListNluConnectors(server, client, config);
  registerGetNluConnector(server, client, config);
  registerCreateNluConnector(server, client, config);
  registerUpdateNluConnector(server, client, config);
  registerDeleteNluConnector(server, client, config);

  // Phase 4: Knowledge AI (stores, sources, chunks, connectors)
  registerListKnowledgeStores(server, client, config);
  registerGetKnowledgeStore(server, client, config);
  registerCreateKnowledgeStore(server, client, config);
  registerUpdateKnowledgeStore(server, client, config);
  registerDeleteKnowledgeStore(server, client, config);
  registerListKnowledgeSources(server, client, config);
  registerGetKnowledgeSource(server, client, config);
  registerCreateKnowledgeSource(server, client, config);
  registerUpdateKnowledgeSource(server, client, config);
  registerDeleteKnowledgeSource(server, client, config);
  registerListKnowledgeChunks(server, client, config);
  registerGetKnowledgeChunk(server, client, config);
  registerCreateKnowledgeChunk(server, client, config);
  registerUpdateKnowledgeChunk(server, client, config);
  registerDeleteKnowledgeChunk(server, client, config);
  registerListKnowledgeConnectors(server, client, config);
  registerGetKnowledgeConnector(server, client, config);
  registerCreateKnowledgeConnector(server, client, config);
  registerUpdateKnowledgeConnector(server, client, config);
  registerDeleteKnowledgeConnector(server, client, config);
  registerRunKnowledgeConnector(server, client, config);

  // Phase 4: Functions
  registerListFunctions(server, client, config);
  registerGetFunction(server, client, config);
  registerCreateFunction(server, client, config);
  registerUpdateFunction(server, client, config);
  registerDeleteFunction(server, client, config);
  registerListFunctionInstances(server, client, config);
  registerGetFunctionInstance(server, client, config);
  registerTriggerFunction(server, client, config);
  registerStopFunctionInstance(server, client, config);

  // Phase 4: Extensions
  registerListExtensions(server, client, config);
  registerGetExtension(server, client, config);
  registerDeleteExtension(server, client, config);
  registerUpdateExtension(server, client, config);
  registerUploadExtension(server, client, config);
  registerUpdateExtensionPackage(server, client, config);

  // Phase 4: Contact Profiles
  registerListContactProfiles(server, client, config);
  registerGetContactProfile(server, client, config);
  registerCreateContactProfile(server, client, config);
  registerUpdateContactProfile(server, client, config);
  registerDeleteContactProfile(server, client, config);
  registerRemoveContactId(server, client, config);
  registerMergeContactProfiles(server, client, config);
  registerUnmergeContactProfiles(server, client, config);
  registerExportContactProfile(server, client, config);
  registerGetContactProfileSchema(server, client, config);
  registerSetContactProfileSchema(server, client, config);

  // Phase 4: Analytics
  registerGetConversationMetrics(server, client, config);
  registerGetCallMetrics(server, client, config);
  registerGetKnowledgeQueryMetrics(server, client, config);
  registerUpdateAnalyticsRecord(server, client, config);

  // Phase 4: Audit
  registerListAuditEvents(server, client, config);
  registerGetAuditEvent(server, client, config);

  // Phase 4: Handover
  registerListHandoverProviders(server, client, config);
  registerGetHandoverProvider(server, client, config);
  registerCreateHandoverProvider(server, client, config);
  registerUpdateHandoverProvider(server, client, config);
  registerDeleteHandoverProvider(server, client, config);
  registerListHandoverServices(server, client, config);
  registerGetHandoverService(server, client, config);

  // Phase 4: Search
  registerSearchResources(server, client, config);
}
