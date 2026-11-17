// Details the side panel shows for connectors and Discover cards (illustrative; connector URLs follow the real Copilot Connectors pattern).
const connectorUrl = (id) => `https://api.github.com/copilot-connectors/api/v1/connectors/${id}/mcp`;
const connector = (id, o) => ({ kind: "connector", identifier: id, url: connectorUrl(id), author: "GitHub", authorSite: "https://github.com/", preview: true, exportable: true, ...o });

/** Installed connectors, by connection id. */
export const CONNECTOR_INFO = {
  slack: connector("githubcopilotslackmcp", { desc: "Search and interact with Slack conversations and workspace content.", keywords: "slack, messaging, collaboration", homepage: "https://slack.com/" }),
  workiq: connector("githubcopilotworkiqmcp", { desc: "Search and work with email, meetings, chats and files in Microsoft 365.", author: "Microsoft", authorSite: "https://www.microsoft.com/", keywords: "microsoft 365, outlook, teams, sharepoint", homepage: "https://www.microsoft.com/microsoft-365/copilot", exportable: false }),
};

const gh = (repo) => `https://github.com/${repo}`;
/** Discover cards, by card name. kind: connector | mcp | plugin | skill. */
export const DISCOVER_INFO = {
  // Copilot Connectors
  Airtable: connector("githubcopilotairtablemcp", { keywords: "airtable, databases, records", homepage: "https://airtable.com/" }),
  Amplitude: connector("githubcopilotamplitudemcp", { keywords: "analytics, product usage, events", homepage: "https://amplitude.com/" }),
  Apify: connector("githubcopilotapifymcp", { keywords: "web scraping, crawling, automation", homepage: "https://apify.com/" }),
  "Atlassian Rovo": connector("githubcopilotatlassianmcp", { keywords: "jira, confluence, atlassian", homepage: "https://www.atlassian.com/software/rovo" }),
  // MCP servers
  "Figma MCP Server": { kind: "mcp", author: "Figma", version: "1.3.0", def: { type: "http", url: "https://mcp.figma.com/mcp" }, repo: gh("figma/mcp-server-guide"), homepage: "https://www.figma.com/", keywords: "design, figma, components", license: "MIT" },
  "Playwright MCP": { kind: "mcp", author: "Microsoft", version: "0.0.41", def: { type: "stdio", command: "npx", args: ["@playwright/mcp@latest"] }, repo: gh("microsoft/playwright-mcp"), homepage: "https://playwright.dev/", keywords: "browser, testing, automation", license: "Apache-2.0" },
  "Azure DevOps MCP Server": { kind: "mcp", author: "Microsoft", version: "2.2.1", def: { type: "stdio", command: "npx", args: ["-y", "@azure-devops/mcp", "contoso"] }, env: ["ADO_ORGANIZATION"], repo: gh("microsoft/azure-devops-mcp"), homepage: "https://azure.microsoft.com/products/devops", keywords: "azure devops, work items, pipelines", license: "MIT" },
  "Power BI Authoring MCP Server": { kind: "mcp", author: "Microsoft", version: "0.1.9", def: { type: "stdio", command: "dnx", args: ["Microsoft.PowerBI.Modeling.Mcp@0.1.9", "--yes"] }, repo: gh("microsoft/powerbi-modeling-mcp"), homepage: "https://www.microsoft.com/power-platform/products/power-bi", keywords: "power bi, semantic models, dax", license: "MIT" },
  Markitdown: { kind: "mcp", author: "Microsoft", version: "0.0.1a4", def: { type: "stdio", command: "uvx", args: ["markitdown-mcp"] }, repo: gh("microsoft/markitdown"), keywords: "markdown, pdf, office, conversion", license: "MIT" },
  Netdata: { kind: "mcp", author: "Netdata", version: "2.6.0", def: { type: "stdio", command: "nd-mcp", args: ["ws://localhost:19999/mcp"] }, repo: gh("netdata/netdata"), homepage: "https://www.netdata.cloud/", keywords: "monitoring, metrics, alerts", license: "GPL-3.0" },
  Context7: { kind: "mcp", author: "Upstash", version: "1.0.17", def: { type: "http", url: "https://mcp.context7.com/mcp" }, headers: ["CONTEXT7_API_KEY"], repo: gh("upstash/context7"), homepage: "https://context7.com/", keywords: "docs, libraries, api reference", license: "MIT" },
  "Chrome DevTools MCP": { kind: "mcp", author: "Google", version: "0.8.1", def: { type: "stdio", command: "npx", args: ["chrome-devtools-mcp@latest"] }, repo: gh("ChromeDevTools/chrome-devtools-mcp"), homepage: "https://developer.chrome.com/docs/devtools", keywords: "chrome, devtools, performance, debugging", license: "Apache-2.0" },
  // Plugins
  "Azure DevOps Copilot Plugin": { kind: "plugin", author: "Microsoft", version: "1.2.0", repo: gh("microsoft/azure-devops-copilot-plugin"), keywords: "azure devops, work items, pull requests", license: "MIT",
    contains: { skills: ["ado-work-items", "ado-pull-requests", "ado-pipelines"], mcp: [["azure-devops", "stdio · npx -y @azure-devops/mcp"]] } },
  "Microsoft Foundry Canvas": { kind: "plugin", author: "Microsoft", version: "0.9.0", repo: gh("microsoft/foundry-copilot-canvas"), keywords: "foundry, agents, deployment", license: "MIT",
    contains: { canvases: ["Agent Inspector"], skills: ["foundry-deploy", "foundry-evaluate"] } },
  "Security & Code Quality Plugin": { kind: "plugin", author: "GitHub", version: "1.0.0", repo: gh("github/awesome-copilot"), keywords: "security, accessibility, performance", license: "MIT",
    contains: { skills: ["ai-prompt-engineering-safety-review", "secure-code-review", "a11y-audit"], mcp: [["semgrep", "stdio · semgrep mcp"]] } },
  "WorkIQ Tools for Microsoft 365": { kind: "plugin", author: "Microsoft", version: "1.4.0", repo: gh("microsoft/workiq-copilot-plugin"), keywords: "microsoft 365, email, calendar, files", license: "MIT",
    contains: { mcp: [["workiqmcp", "http · https://workiq.svc.cloud.microsoft/mcp"]], skills: ["meeting-recap", "inbox-triage"] } },
  "Jira Sprint Dashboard": { kind: "plugin", author: "Atlassian Labs", version: "0.3.2", repo: gh("atlassian-labs/jira-sprint-dashboard"), keywords: "jira, sprints, dashboard", license: "Apache-2.0",
    contains: { canvases: ["Sprint Dashboard"], mcp: [["jira", "http · https://mcp.atlassian.com/v1/sse"]] } },
  "Sentry Triage Plugin": { kind: "plugin", author: "Sentry", version: "0.5.0", repo: gh("getsentry/sentry-triage-plugin"), keywords: "sentry, errors, triage", license: "MIT",
    contains: { canvases: ["Sentry Triage"], mcp: [["sentry", "http · https://mcp.sentry.dev/mcp"]], skills: ["fix-sentry-issue"] } },
  "Microsoft Azure Skills Plugin": { kind: "plugin", author: "Microsoft", version: "2.0.3", repo: gh("microsoft/azure-skills"), keywords: "azure, deployment, monitoring", license: "MIT",
    contains: { skills: ["azure-deploy", "azure-diagnostics", "azure-cost-optimization", "azure-resource-lookup"], mcp: [["azure", "stdio · npx -y @azure/mcp@latest server start"]] } },
  // Skills
  "Impeccable Design Tool": { kind: "skill", author: "Paul Bakaus", version: "1.1.0", repo: gh("pbakaus/impeccable"), keywords: "design, ux, typography, accessibility", license: "Apache-2.0",
    files: ["SKILL.md", "reference/typography.md", "reference/color.md", "reference/ux-review.md"] },
  "Web Design Guidelines Reviewer": { kind: "skill", author: "Vercel Labs", version: "1.0.0", repo: gh("vercel-labs/agent-skills"), keywords: "web, guidelines, accessibility, review", license: "MIT",
    files: ["SKILL.md", "rules/interactions.md", "rules/accessibility.md"] },
};

/** Environment variables configured servers already pass (by MCP id). */
export const MCP_ENV = {
  kusto: [["AZURE_TENANT_ID", "72f988bf-86f1-41af-91ab-2d7cd011db47"], ["KUSTO_CLUSTER", "https://help.kusto.windows.net"]],
  xcodebuild: [["INCREMENTAL_BUILDS_ENABLED", "true"]],
};
export const MCP_HEADERS = {
  context7: [["CONTEXT7_API_KEY", "${input:context7-key}"]],
};
