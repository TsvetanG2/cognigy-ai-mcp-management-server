# Cognigy.AI MCP Tools Reference

Complete reference of all 132 tools available in this MCP server.

## Table of Contents

- [Projects & Flows](#projects--flows)
- [Nodes](#nodes)
- [Intents & NLU](#intents--nlu)
- [Example Sentences](#example-sentences)
- [Endpoints](#endpoints)
- [Sessions](#sessions)
- [Conversations](#conversations)
- [Playbooks & Testing](#playbooks--testing)
- [Snapshots](#snapshots)
- [Packages](#packages)
- [Connections](#connections)
- [LLMs](#llms)
- [NLU Connectors](#nlu-connectors)
- [Knowledge AI](#knowledge-ai)
- [Functions](#functions)
- [Extensions](#extensions)
- [Contact Profiles](#contact-profiles)
- [Analytics](#analytics)
- [Audit](#audit)
- [Handover](#handover)
- [Search](#search)
- [Tasks](#tasks)

---

## Projects & Flows

| Tool | Description |
|------|-------------|
| `list_projects` | Lists all Cognigy.AI projects accessible by your API key |
| `list_flows` | Lists all flows in a project |
| `get_flow` | Gets detailed metadata for a specific flow |
| `get_flow_settings` | Gets settings and configuration for a flow |
| `get_latest_log_entries` | Gets latest execution logs for debugging |

## Nodes

| Tool | Description |
|------|-------------|
| `get_nodes` | Lists all nodes in a flow with their configuration |
| `get_node` | Gets full details of a single node |
| `search_nodes` | Searches nodes by text content across a flow |
| `get_node_descriptors` | Lists available node types/blueprints for creating nodes |
| `create_node` | Creates a new node in a flow (Say, Question, If, etc.) |
| `update_node` | Updates node properties (label, config, position) |
| `delete_node` | Deletes a node from a flow |
| `move_node` | Moves a node to a new position in the flow tree |
| `generate_node_output` | AI-generates text or adaptive card content for a node |

## Intents & NLU

| Tool | Description |
|------|-------------|
| `list_intents` | Lists all intents in a flow |
| `get_intent` | Gets detailed intent configuration including rules and slots |
| `create_intent` | Creates a new NLU intent |
| `update_intent` | Updates intent properties (name, rules, confirmation) |
| `delete_intent` | Deletes an intent (irreversible) |
| `train_intents` | Trains the NLU model and waits for completion |
| `generate_nlu_scores` | Scores an utterance against all trained intents |
| `score_utterance` | User-friendly NLU scoring with confidence levels |
| `audit_nlu` | Audits NLU quality: finds low-coverage intents, disabled intents, overlaps |

## Example Sentences

| Tool | Description |
|------|-------------|
| `list_sentences` | Lists example sentences for an intent |
| `create_sentence` | Creates a new example sentence for NLU training |
| `generate_sentences` | AI-generates example sentences for an intent |

## Endpoints

| Tool | Description |
|------|-------------|
| `list_endpoints` | Lists all endpoints in a project (Webchat, Voice, etc.) |
| `get_endpoint` | Gets detailed endpoint configuration |

## Sessions

| Tool | Description |
|------|-------------|
| `inject_context` | Injects context data into an active conversation session |
| `reset_context` | Resets context for a conversation session |

## Conversations

| Tool | Description |
|------|-------------|
| `get_conversations` | Lists conversations for specified contact IDs |
| `get_conversation` | Gets conversation details for a session |
| `get_transcript` | Assembles a human-readable transcript from conversation data |

## Playbooks & Testing

| Tool | Description |
|------|-------------|
| `list_playbooks` | Lists playbooks (automated test scenarios) in a project |
| `get_playbook` | Gets playbook details with steps and assertions |
| `run_playbook` | Runs a playbook and waits for completion |
| `list_playbook_runs` | Lists run history for a playbook |
| `get_playbook_run` | Gets detailed run results with step outcomes |
| `run_regression` | Runs all playbooks in a project, returns pass/fail summary |

## Snapshots

| Tool | Description |
|------|-------------|
| `list_snapshots` | Lists all snapshots in a project |
| `get_snapshot` | Gets snapshot details and metadata |
| `get_snapshot_resources` | Lists resources (flows, locales, etc.) contained in a snapshot |
| `create_snapshot` | Creates a snapshot of the current project state |
| `delete_snapshot` | Deletes a snapshot |
| `restore_snapshot` | Restores a snapshot to its project |
| `package_snapshot` | Packages a snapshot for download |
| `upload_snapshot_package` | Uploads a snapshot package file |
| `create_snapshot_download_link` | Gets a temporary download URL for a snapshot |
| `diff_snapshots` | Compares two snapshots and shows differences |
| `promote_snapshot` | Packages snapshot and generates download link for promotion |

## Packages

| Tool | Description |
|------|-------------|
| `list_packages` | Lists packages in a project |
| `get_package` | Gets package details and contents |
| `create_package` | Creates a package from selected resources |
| `delete_package` | Deletes a package |
| `merge_package` | Merges a package into a project |
| `upload_package` | Uploads a package file |
| `create_package_download_link` | Gets a temporary download URL for a package |

## Connections

| Tool | Description |
|------|-------------|
| `list_connections` | Lists API connections in a project or organization |
| `get_connection` | Gets connection details (secrets are automatically redacted) |
| `create_connection` | Creates a new API connection |
| `update_connection` | Updates connection settings |
| `delete_connection` | Deletes a connection |

## LLMs

| Tool | Description |
|------|-------------|
| `list_llms` | Lists LLM configurations (OpenAI, Azure, Anthropic, etc.) |
| `get_llm` | Gets LLM details with provider settings |
| `create_llm` | Creates a new LLM configuration |
| `update_llm` | Updates LLM settings |
| `delete_llm` | Deletes an LLM configuration |
| `clone_llm` | Clones an existing LLM configuration |
| `test_llm_connection` | Tests LLM provider credentials and connectivity |

## NLU Connectors

| Tool | Description |
|------|-------------|
| `list_nlu_connectors` | Lists external NLU connectors (Dialogflow, LUIS, etc.) |
| `get_nlu_connector` | Gets NLU connector details |
| `create_nlu_connector` | Creates a new NLU connector |
| `update_nlu_connector` | Updates NLU connector settings |
| `delete_nlu_connector` | Deletes an NLU connector |

## Knowledge AI

### Knowledge Stores

| Tool | Description |
|------|-------------|
| `list_knowledge_stores` | Lists knowledge stores (RAG containers) |
| `get_knowledge_store` | Gets store details and statistics |
| `create_knowledge_store` | Creates a new knowledge store |
| `update_knowledge_store` | Updates store settings |
| `delete_knowledge_store` | Deletes a store and all its contents |

### Knowledge Sources

| Tool | Description |
|------|-------------|
| `list_knowledge_sources` | Lists sources in a knowledge store |
| `get_knowledge_source` | Gets source details and ingestion status |
| `create_knowledge_source` | Creates a source (URL, file, or manual) |
| `update_knowledge_source` | Updates source metadata |
| `delete_knowledge_source` | Deletes a source and its chunks |

### Knowledge Chunks

| Tool | Description |
|------|-------------|
| `list_knowledge_chunks` | Lists text chunks in a knowledge store |
| `get_knowledge_chunk` | Gets chunk content and metadata |
| `create_knowledge_chunk` | Creates a manual text chunk |
| `update_knowledge_chunk` | Updates chunk text or metadata |
| `delete_knowledge_chunk` | Deletes a chunk |

### Knowledge Connectors

| Tool | Description |
|------|-------------|
| `list_knowledge_connectors` | Lists automated ingestion connectors |
| `get_knowledge_connector` | Gets connector configuration |
| `create_knowledge_connector` | Creates a connector (SharePoint, etc.) |
| `update_knowledge_connector` | Updates connector settings |
| `delete_knowledge_connector` | Deletes a connector |
| `run_knowledge_connector` | Triggers a connector to ingest content |

## Functions

| Tool | Description |
|------|-------------|
| `list_functions` | Lists custom code functions in a project |
| `get_function` | Gets function code and settings |
| `create_function` | Creates a new custom function |
| `update_function` | Updates function code or settings |
| `delete_function` | Deletes a function |
| `list_function_instances` | Lists function execution instances |
| `get_function_instance` | Gets instance status and output |
| `trigger_function` | Triggers a function to run |
| `stop_function_instance` | Stops a running function instance |

## Extensions

| Tool | Description |
|------|-------------|
| `list_extensions` | Lists installed extensions in a project |
| `get_extension` | Gets extension details and node types |
| `upload_extension` | Uploads a new extension package |
| `update_extension` | Updates extension settings |
| `update_extension_package` | Updates extension to a new package version |
| `delete_extension` | Deletes an extension |

## Contact Profiles

| Tool | Description |
|------|-------------|
| `list_contact_profiles` | Lists contact profiles with filtering |
| `get_contact_profile` | Gets profile details and attributes |
| `create_contact_profile` | Creates a new contact profile |
| `update_contact_profile` | Updates profile attributes |
| `delete_contact_profile` | Deletes a contact profile |
| `merge_contact_profiles` | Merges two profiles into one |
| `unmerge_contact_profiles` | Splits a previously merged profile |
| `remove_contact_id` | Removes a contact ID from a profile |
| `export_contact_profile` | Exports profile data (GDPR compliance) |
| `get_contact_profile_schema` | Gets the profile schema definition |
| `set_contact_profile_schema` | Updates the profile schema |

## Analytics

| Tool | Description |
|------|-------------|
| `get_conversation_metrics` | Gets conversation count metrics (project or org level) |
| `get_call_metrics` | Gets Voice Gateway call metrics |
| `get_knowledge_query_metrics` | Gets Knowledge AI query metrics |
| `update_analytics_record` | Updates an analytics record |

## Audit

| Tool | Description |
|------|-------------|
| `list_audit_events` | Lists audit events with filtering |
| `get_audit_event` | Gets detailed audit event information |

## Handover

| Tool | Description |
|------|-------------|
| `list_handover_providers` | Lists live agent handover providers |
| `get_handover_provider` | Gets provider configuration |
| `create_handover_provider` | Creates a new handover provider |
| `update_handover_provider` | Updates provider settings |
| `delete_handover_provider` | Deletes a handover provider |
| `list_handover_services` | Lists available handover service types |
| `get_handover_service` | Gets service details and configuration schema |

## Search

| Tool | Description |
|------|-------------|
| `search_resources` | Searches across all resource types in the organization |

## Tasks

| Tool | Description |
|------|-------------|
| `list_tasks` | Lists async tasks in a project |
| `get_task` | Gets task status and progress |

---

## Tool Conventions

### Safe by Default

All mutating tools (`create_*`, `update_*`, `delete_*`) use `dryRun: true` by default. Set `dryRun: false` to actually execute the operation.

### Pagination

List tools support `limit` (default: 25, max: 100) and `skip` parameters for pagination.

### Secret Redaction

Tools that return sensitive data (connections, credentials) automatically redact secret values.

### Async Operations

Long-running operations (training, snapshot creation, etc.) automatically poll until completion and return the final result.
