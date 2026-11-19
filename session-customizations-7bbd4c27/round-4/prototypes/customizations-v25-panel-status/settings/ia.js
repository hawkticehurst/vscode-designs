/*
 * Proposed information architecture for the Settings editor.
 * Each setting goes to the subcategory whose pattern matches it most specifically
 * (longest literal prefix; exact keys beat globs). Settings tagged `experimental` or
 * `preview` are then moved to the dedicated Experimental section, grouped by their home.
 */
window.SETTINGS_IA = {
	commonlyUsed: [
		'editor.fontSize', 'editor.formatOnSave', 'files.autoSave', 'editor.defaultFormatter', 'editor.fontFamily',
		'editor.wordWrap', 'chat.agent.maxRequests', 'files.exclude', 'workbench.colorTheme', 'editor.tabSize',
		'editor.mouseWheelZoom', 'editor.formatOnPaste'
	],
	categories: [
		{
			id: 'appearance', label: 'Appearance', icon: 'symbol-color',
			description: 'Themes, fonts, density and how the window is laid out.',
			subs: [
				{ id: 'theme', label: 'Color Theme', description: 'Workbench, icon and token colors, and following the OS color scheme.', order: ['workbench.colorTheme', 'workbench.iconTheme', 'workbench.productIconTheme', 'window.autoDetectColorScheme', 'workbench.preferredDarkColorTheme', 'workbench.preferredLightColorTheme', 'window.autoDetectHighContrast', 'workbench.preferredHighContrastColorTheme', 'workbench.preferredHighContrastLightColorTheme', 'window.systemColorTheme', 'workbench.colorCustomizations', 'editor.tokenColorCustomizations', 'editor.semanticHighlighting.enabled', 'editor.semanticTokenColorCustomizations'], match: ['workbench.colorTheme', 'workbench.preferred*Theme', 'workbench.iconTheme', 'workbench.productIconTheme', 'workbench.colorCustomizations', 'window.autoDetect*', 'window.systemColorTheme', 'editor.tokenColorCustomizations', 'editor.semanticTokenColorCustomizations', 'editor.semanticHighlighting.*'] },
				{ id: 'fonts', label: 'Fonts & Zoom', description: 'Editor typography and window zoom.', match: ['editor.font*', 'editor.lineHeight', 'editor.letterSpacing', 'editor.allowVariableLineHeights', 'editor.allowVariableFonts', 'window.zoom*', 'workbench.fontAliasing'] },
				{ id: 'layout', label: 'Layout', description: 'Activity bar, side bars, panel and status bar.', match: ['workbench.activityBar.*', 'workbench.sideBar.*', 'workbench.secondarySideBar.*', 'workbench.panel.*', 'workbench.statusBar.*', 'workbench.layoutControl.*', 'workbench.navigationControl.*', 'window.density.*', 'workbench.view.*', 'workbench.sash.*', 'workbench.notifications.*', 'workbench.accounts.*'] },
				{ id: 'effects', label: 'Visual Effects', description: 'Modern UI, shadows, transparency and motion.', match: ['workbench.experimental.modernUI*', 'workbench.modernUI*', 'workbench.shadows', 'workbench.reduceMotion', 'workbench.reduceTransparency', 'workbench.hover.*'] },
				{ id: 'lists', label: 'Lists & Trees', description: 'Indentation, scrolling and keyboard navigation in lists and trees.', match: ['workbench.list.*', 'workbench.tree.*'] },
				{ id: 'breadcrumbs', label: 'Breadcrumbs', description: 'The navigation bar above editors.', match: ['breadcrumbs.*'] },
				{ id: 'zen', label: 'Zen Mode & Screencast', description: 'Distraction-free and presentation modes.', match: ['zenMode.*', 'screencastMode.*'] }
			]
		},
		{
			id: 'editor', label: 'Text Editor', icon: 'file-code',
			description: 'Typing, IntelliSense, navigation and how code is rendered.',
			subs: [
				{ id: 'indent', label: 'Indentation & Whitespace', match: ['editor.tabSize', 'editor.indentSize', 'editor.insertSpaces', 'editor.detectIndentation', 'editor.trimAutoWhitespace', 'editor.useTabStops', 'editor.stickyTabStops', 'editor.renderWhitespace', 'editor.renderControlCharacters', 'editor.renderFinalNewline', 'editor.trimWhitespaceOnDelete', 'editor.experimentalWhitespaceRendering'] },
				{ id: 'wrap', label: 'Word Wrap', match: ['editor.wordWrap*', 'editor.wrapping*', 'editor.wordBreak', 'editor.wrapOnEscapedLineFeeds'] },
				{ id: 'typing', label: 'Typing & Auto-Closing', match: ['editor.autoClosing*', 'editor.autoIndent*', 'editor.autoSurround', 'editor.linkedEditing', 'editor.renameOnType', 'editor.comments.*', 'editor.overtypeOnPaste', 'editor.wordSeparators', 'editor.wordSegmenterLocales'] },
				{ id: 'cursor', label: 'Cursor', match: ['editor.cursor*', 'editor.overtypeCursorStyle', 'editor.hideCursorInOverviewRuler'] },
				{ id: 'selection', label: 'Selection & Multi-Cursor', match: ['editor.multiCursor*', 'editor.columnSelection', 'editor.selection*', 'editor.selectedTextMatchMode', 'editor.occurrencesHighlight*', 'editor.smartSelect.*', 'editor.roundedSelection', 'editor.emptySelectionClipboard', 'editor.copyWithSyntaxHighlighting', 'editor.dragAndDrop', 'editor.dropIntoEditor.*', 'editor.pasteAs.*', 'editor.doubleClickSelectsBlock', 'editor.mouseMiddleClickAction'] },
				{ id: 'find', label: 'Find', match: ['editor.find.*'] },
				{ id: 'formatting', label: 'Formatting', match: ['editor.format*', 'editor.defaultFormatter', 'editor.codeActionsOnSave'] },
				{ id: 'suggest', label: 'Suggestions', match: ['editor.suggest*', 'editor.quickSuggestions*', 'editor.acceptSuggestion*', 'editor.wordBasedSuggestions*', 'editor.snippetSuggestions', 'editor.tabCompletion', 'editor.parameterHints.*'] },
				{ id: 'inline', label: 'Inline Suggestions', match: ['editor.inlineSuggest.*'] },
				{ id: 'nav', label: 'Hover, Peek & Navigation', match: ['editor.hover.*', 'editor.gotoLocation.*', 'editor.peekWidgetDefaultFocus', 'editor.definitionLinkOpensInPeek', 'editor.stablePeek', 'editor.links', 'editor.rename.*', 'editor.lightbulb.*', 'editor.codeActionWidget.*', 'editor.codeActions.*'] },
				{ id: 'hints', label: 'Inlay Hints & CodeLens', match: ['editor.inlayHints.*', 'editor.codeLens*'] },
				{ id: 'minimap', label: 'Minimap', match: ['editor.minimap.*'] },
				{ id: 'sticky', label: 'Sticky Scroll', match: ['editor.stickyScroll.*'] },
				{ id: 'scrolling', label: 'Scrolling', match: ['editor.scrollbar.*', 'editor.scroll*', 'editor.smoothScrolling', 'editor.mouseWheel*', 'editor.fastScrollSensitivity', 'editor.inertialScroll', 'editor.padding.*'] },
				{ id: 'brackets', label: 'Brackets & Guides', match: ['editor.bracketPairColorization.*', 'editor.guides.*', 'editor.matchBrackets', 'editor.language.*'] },
				{ id: 'folding', label: 'Folding', match: ['editor.folding*', 'editor.showFoldingControls', 'editor.unfoldOnClickAfterEndOfLine'] },
				{ id: 'rendering', label: 'Rendering', match: ['editor.lineNumbers', 'editor.rulers', 'editor.renderLineHighlight*', 'editor.glyphMargin', 'editor.overviewRulerBorder', 'editor.colorDecorators*', 'editor.defaultColorDecorators', 'editor.showUnused', 'editor.showDeprecated', 'editor.unicodeHighlight.*', 'editor.unusualLineTerminators', 'editor.experimentalGpuAcceleration', 'editor.editContext', 'editor.largeFileOptimizations', 'editor.maxTokenizationLineLength', 'editor.fullwidthCharacterWidth', 'editor.experimental.*'] },
				{ id: 'diff', label: 'Diff Editor', match: ['diffEditor.*', 'multiDiffEditor.*'] },
				{ id: 'merge', label: 'Merge Editor & Conflicts', match: ['mergeEditor.*', 'merge-conflict.*'] },
				{ id: 'general', label: 'Other', match: ['editor.*'] }
			]
		},
		{
			id: 'workbench', label: 'Workbench', icon: 'layout',
			description: 'Editor tabs and groups, quick open, startup and windows.',
			subs: [
				{ id: 'tabs', label: 'Editor Tabs', match: ['workbench.editor.showTabs', 'workbench.editor.wrapTabs', 'workbench.editor.tab*', 'workbench.editor.pinnedTab*', 'workbench.editor.highlightModifiedTabs', 'workbench.editor.decorations.*', 'workbench.editor.labelFormat', 'workbench.editor.untitled.*', 'workbench.editor.customLabels.*', 'workbench.editor.showIcons', 'workbench.editor.titleScrollbar*', 'workbench.editor.editorActionsLocation', 'workbench.editor.alwaysShowEditorActions', 'workbench.editor.showTabIndex', 'workbench.editor.scrollToSwitchTabs', 'workbench.editor.doubleClickTabToToggleEditorGroupSizes', 'workbench.editor.preventPinnedEditorClose'] },
				{ id: 'editors', label: 'Editor Management', match: ['workbench.editor.*', 'workbench.editorAssociations', 'workbench.diffEditorAssociations', 'workbench.editorLargeFileConfirmation'] },
				{ id: 'languageDetection', label: 'Language Detection', match: ['workbench.editor.languageDetection*', 'workbench.editor.historyBasedLanguageDetection', 'workbench.editor.preferHistoryBasedLanguageDetection'] },
				{ id: 'history', label: 'Local History', match: ['workbench.localHistory.*'] },
				{ id: 'quickOpen', label: 'Command Palette & Quick Open', match: ['workbench.commandPalette.*', 'workbench.quickOpen.*'] },
				{ id: 'startup', label: 'Startup & Welcome', match: ['workbench.startupEditor', 'workbench.welcomePage.*', 'workbench.tips.enabled', 'onboarding.*'] },
				{ id: 'settingsEditor', label: 'Settings Editor', match: ['workbench.settings.*'] },
				{ id: 'browser', label: 'Integrated Browser & Previews', match: ['workbench.browser.*', 'workbench.externalBrowser', 'workbench.externalUriOpeners', 'simpleBrowser.*', 'mediaPreview.*', 'imageCarousel.*'] },
				{ id: 'comments', label: 'Comments', match: ['comments.*'] },
				{ id: 'window', label: 'Window', match: ['window.*'] },
				{ id: 'titlebar', label: 'Title Bar & Command Center', match: ['window.title*', 'window.titleBarStyle', 'window.customTitleBarVisibility', 'window.commandCenter', 'window.menuStyle', 'window.dialogStyle', 'window.doubleClickIconToClose'] },
				{ id: 'general', label: 'Other', match: ['workbench.*'] }
			]
		},
		{
			id: 'ai', label: 'Chat & Agents', icon: 'copilot',
			description: 'Chat, agents, tools and approvals, MCP, customizations and AI-assisted editing.',
			subs: [
				{ id: 'general', label: 'General', match: ['chat.*', 'chat.disableAIFeatures', 'chat.agent.enabled', 'chat.defaultModel', 'chat.defaultConfiguration', 'chat.permissions.*', 'chat.newSession.*', 'chat.titleBar.*', 'chat.welcomePage.*', 'chat.copilotCliCommand.*', 'github.copilot.chat.localeOverride', 'github.copilot.chat.*', 'github.copilot.*'] },
				{ id: 'agent', label: 'Agent', match: ['chat.agent.*', 'chat.autopilot.*', 'chat.autoReply', 'chat.checkpoints.*', 'chat.editRequests', 'chat.undoRequests.*', 'chat.requestQueuing.*', 'chat.editing.*', 'chat.subagents.*', 'chat.planAgent.*', 'chat.exploreAgent.*', 'chat.exitAfterDelegation', 'github.copilot.chat.agent.*', 'github.copilot.chat.*Agent.*', 'github.copilot.chat.*Subagent.*', 'github.copilot.chat.summarizeAgentConversationHistory*', 'github.copilot.chat.agentHistorySummarizationMode'] },
				{ id: 'approvals', label: 'Approvals & Sandbox', match: ['chat.tools.global.*', 'chat.tools.edits.*', 'chat.tools.urls.*', 'chat.tools.eligibleForAutoApproval', 'chat.tools.terminal.enableAutoApprove', 'chat.tools.terminal.autoApprove*', 'chat.tools.terminal.ignoreDefaultAutoApproveRules', 'chat.tools.terminal.blockDetectedFileWrites', 'chat.tools.riskAssessment.*', 'chat.tools.confirmationCarousel.*', 'chat.agent.sandbox.*', 'chat.agent.networkFilter', 'chat.agent.terminal.*', 'github.copilot.chat.agent.terminal.*'] },
				{ id: 'tools', label: 'Tools', match: ['chat.tools.*', 'chat.extensionTools.*', 'github.copilot.chat.tools.*', 'github.copilot.chat.virtualTools.*', 'github.copilot.chat.*Tool.*', 'github.copilot.chat.*Tool'] },
				{ id: 'mcp', label: 'MCP Servers & Plugins', match: ['mcp', 'chat.mcp.*', 'chat.plugins.*', 'chat.pluginLocations', 'github.copilot.chat.githubMcpServer.*'] },
				{ id: 'customizations', label: 'Instructions, Prompts & Skills', match: ['chat.*FilesLocations', 'chat.agentSkillsLocations', 'chat.use*', 'chat.include*Instructions', 'chat.promptFilesRecommendations', 'chat.customizations.*', 'chat.experimental.collectInstructionsInExtension', 'chat.experimental.useSkillAdherencePrompt', 'github.copilot.chat.organization*', 'github.copilot.chat.*Generation.*', 'github.copilot.chat.customInstructionsInSystemMessage', 'github.copilot.chat.reviewSelection.*', 'github.copilot.chat.setupTests.*'] },
				{ id: 'context', label: 'Context & Memory', match: ['chat.implicitContext.*', 'chat.detectParticipant.*', 'chat.experimental.detectParticipant.*', 'chat.pasteAsAttachmentThreshold', 'chat.copilot.memory.*', 'github.copilot.chat.workspace.*', 'github.copilot.chat.codesearch.*', 'github.copilot.chat.languageContext.*', 'github.copilot.chat.localIndex.*', 'github.copilot.chat.imageUpload.*', 'github.copilot.chat.additionalReadAccessPaths', 'github.copilot.chat.projectLabels.*', 'github.copilot.chat.promptFileContextProvider.*'] },
				{ id: 'sessions', label: 'Sessions', match: ['chat.agentSessions.*', 'chat.viewSessions.*', 'chat.sessions.*', 'chat.agentSessionProjection.*', 'chat.sessionSync.*', 'chat.agentMerge.*', 'chat.artifacts.*', 'chat.artifactIntegrations.*', 'chat.artifactTools.*', 'chat.experimental.session*', 'chat.experimental.workspaceSnapshot', 'chat.restoreLastPanelSession', 'github.copilot.chat.cli.*', 'github.copilot.chat.cloudAgent.*', 'github.copilot.chat.backgroundAgent.*'] },
				{ id: 'agentHost', label: 'Agent Host & Harnesses', match: ['chat.agentHost.*', 'chat.remoteAgentHostsEnabled', 'chat.workspaceRemoteAgentHosts', 'chat.editor.preferCopilotHarness', 'chat.defaultToCopilotHarness', 'chat.editor.localAgent.*', 'chat.editor.codex.*', 'chat.terminal.agentHost.*', 'chat.inlineChat.agentHost.*', 'chat.copilotHarnessIntroduction.*', 'chat.harnessSwitchFeedbackSurvey.*'] },
				{ id: 'models', label: 'Models', match: ['chat.utilityModel', 'chat.utilitySmallModel', 'chat.byokUtilityModelDefault', 'chat.copilot.*', 'github.copilot.chat.autoModeTierOverride', 'github.copilot.chat.rateLimitAutoSwitchToAuto', 'github.copilot.chat.reasoningEffortOverride', 'github.copilot.chat.modelCapabilityOverrides', 'github.copilot.chat.anthropic.*', 'github.copilot.chat.responsesApi*', 'github.copilot.chat.useResponsesApiTruncation', 'github.copilot.chat.*Prompt.*', 'github.copilot.chat.gpt*', 'github.copilot.chat.gemini*', 'github.copilot.chat.chatCompletionsTokenParameter', 'github.copilot.chat.instantApply.*', 'github.copilot.chat.edits.*', 'github.copilot.chat.omitBaseAgentInstructions', 'github.copilot.chat.completionsFetcher', 'github.copilot.chat.nesFetcher'] },
				{ id: 'appearance', label: 'Chat Appearance', match: ['chat.fontSize', 'chat.fontFamily', 'chat.editor.font*', 'chat.editor.wordWrap', 'chat.editor.lineHeight', 'chat.editor.workingSet.*', 'chat.math.*', 'chat.inlineReferences.*', 'chat.agentsControl.*', 'chat.unifiedAgentsBar.*', 'chat.tips.*', 'chat.upvoteAnimation', 'chat.stickyScroll.*', 'chat.experimental.stickyScroll.*', 'chat.experimental.incrementalRendering.*', 'chat.experimental.richLinks.*', 'chat.progressBorder.*', 'chat.persistentProgress*', 'chat.contextUsage.*', 'chat.viewProgressBadge.*', 'chat.notifyWindow*', 'chat.editorAssociations', 'chat.btwTip.*', 'chat.agentsHandoffTip.*', 'chat.agentsParallelWorkBanner.*', 'chat.agent.thinking*', 'chat.agent.collapseCompletedResponses', 'chat.agent.codeBlockProgress', 'chat.tools.todos.*', 'chat.tools.terminal.simpleCollapsible', 'chat.tools.autoExpandFailures', 'chat.canvases.*', 'chat.growthNotification.*', 'chat.closedPromoNotification'] },
				{ id: 'inline', label: 'Inline Chat & Completions', match: ['inlineChat.*', 'github.copilot.enable', 'github.copilot.nextEditSuggestions.*', 'github.copilot.completions.*', 'github.copilot.selectedCompletionModel', 'github.copilot.chat.inlineEdits.*', 'github.copilot.renameSuggestions.*', 'github.copilot.editor.*', 'github.copilot.chat.inlineChat.*', 'github.copilot.chat.terminalChatLocation', 'github.copilot.chat.notebook.*', 'github.copilot.chat.scopeSelection'] },
				{ id: 'agentsWindow', label: 'Agents Window', match: ['agents.*', 'sessions.*', 'chat.experimentalSessionsWindowOverride', 'chat.titleBar.openInAgentsWindow.*', 'chat.experimental.openInAgentsWindow.*', 'chat.welcomePage.agentsWindow*', 'chat.agentsWindowBanner.*', 'workbench.editor.markdownDefaultEditorInAgentsWindow'] },
				{ id: 'voice', label: 'Voice & Dictation', match: ['dictation.*', 'agents.voice.*'] },
				{ id: 'diagnostics', label: 'Diagnostics & Telemetry', match: ['chat.verbose', 'chat.agentHost.otel.*', 'chat.agentHost.agentDebugLog.*', 'chat.agentHost.debugLogs.*', 'chat.agentHost.ahpJsonlLoggingEnabled', 'chat.agentHost.copilotSdk.logLevel', 'github.copilot.chat.otel.*', 'github.copilot.chat.agentDebugLog.*', 'github.copilot.chat.debug.*', 'github.copilot.chat.*Recording.*', 'github.copilot.chat.feedback.*', 'github.copilot.chat.copilotDebugCommand.*', 'github.copilot.chat.debugTerminalCommandPatterns', 'github.copilot.chat.review.*', 'github.copilot.chat.enableUserPreferences'] }
			]
		},
		{
			id: 'scm', label: 'Source Control', icon: 'source-control',
			description: 'Source control views, Git and GitHub.',
			subs: [
				{ id: 'general', label: 'Source Control', match: ['scm.*'] },
				{ id: 'git', label: 'Git', match: ['git.*'] },
				{ id: 'commits', label: 'Git: Commits', match: ['git.*Commit*', 'git.inputValidation*', 'git.verboseCommit', 'git.alwaysSignOff', 'git.addAICoAuthor', 'git.*SmartCommit*', 'git.smartCommitChanges', 'git.postCommitCommand', 'git.rememberPostCommitCommand', 'git.diagnosticsCommitHook.*'] },
				{ id: 'sync', label: 'Git: Sync, Fetch & Push', match: ['git.autofetch*', 'git.*Sync*', 'git.*Pull*', 'git.*Push*', 'git.fetchOnPull', 'git.pruneOnFetch', 'git.pullTags', 'git.followTagsWhenSync', 'git.replaceTagsWhenPull', 'git.rebaseWhenSync', 'git.autoStash', 'git.allowForcePush', 'git.useForcePush*'] },
				{ id: 'branches', label: 'Git: Branches', match: ['git.branch*', 'git.defaultBranchName', 'git.checkoutType'] },
				{ id: 'repos', label: 'Git: Repositories & Worktrees', match: ['git.autoRepositoryDetection', 'git.scanRepositories', 'git.repositoryScanMaxDepth', 'git.repositoryScanIgnoredFolders', 'git.detect*', 'git.worktree*', 'git.ignoredRepositories', 'git.openRepositoryInParentFolders', 'git.defaultCloneDirectory', 'git.openAfterClone', 'git.ignoreSubmodules'] },
				{ id: 'blame', label: 'Blame & Timeline', match: ['git.blame.*', 'git.timeline.*', 'timeline.*'] },
				{ id: 'github', label: 'GitHub', match: ['github.*', 'github-enterprise.*', 'github-authentication.*', 'git.githubAuthentication'] }
			]
		},
		{
			id: 'terminal', label: 'Terminal', icon: 'terminal',
			description: 'Integrated terminal shells, appearance and behavior.',
			subs: [
				{ id: 'profiles', label: 'Shells & Profiles', match: ['terminal.integrated.profiles.*', 'terminal.integrated.defaultProfile.*', 'terminal.integrated.automationProfile.*', 'terminal.integrated.agentHostProfile.*', 'terminal.integrated.env.*', 'terminal.integrated.cwd', 'terminal.integrated.splitCwd', 'terminal.integrated.inheritEnv', 'terminal.integrated.useWslProfiles', 'terminal.integrated.shellIntegration.*', 'terminal.integrated.environmentChangesRelaunch', 'terminal.integrated.environmentChangesIndicator'] },
				{ id: 'appearance', label: 'Appearance', match: ['terminal.integrated.font*', 'terminal.integrated.lineHeight', 'terminal.integrated.letterSpacing', 'terminal.integrated.cursor*', 'terminal.integrated.minimumContrastRatio', 'terminal.integrated.gpuAcceleration', 'terminal.integrated.drawBoldTextInBrightColors', 'terminal.integrated.customGlyphs', 'terminal.integrated.rescaleOverlappingGlyphs', 'terminal.integrated.tabStopWidth', 'terminal.integrated.smoothScrolling', 'terminal.integrated.enableImages'] },
				{ id: 'general', label: 'Behavior', match: ['terminal.integrated.*'] },
				{ id: 'tabs', label: 'Tabs', match: ['terminal.integrated.tabs.*'] },
				{ id: 'suggest', label: 'Suggestions', match: ['terminal.integrated.suggest.*'] },
				{ id: 'sticky', label: 'Sticky Scroll', match: ['terminal.integrated.stickyScroll.*'] },
				{ id: 'external', label: 'External Terminal', match: ['terminal.external.*', 'terminal.explorerKind', 'terminal.sourceControlRepositoriesKind'] }
			]
		},
		{
			id: 'debug', label: 'Run & Debug', icon: 'debug-alt',
			description: 'Debugging, testing, tasks and problems.',
			subs: [
				{ id: 'general', label: 'Debugging', match: ['debug.*', 'launch'] },
				{ id: 'console', label: 'Debug Console', match: ['debug.console.*'] },
				{ id: 'js', label: 'JavaScript Debugger', match: ['debug.javascript.*'] },
				{ id: 'testing', label: 'Testing', match: ['testing.*'] },
				{ id: 'tasks', label: 'Tasks', match: ['task.*', 'npm.*', 'grunt.*', 'gulp.*', 'jake.*'] },
				{ id: 'problems', label: 'Problems & Output', match: ['problems.*', 'output.*'] }
			]
		},
		{
			id: 'files', label: 'Files & Search', icon: 'files',
			description: 'Saving, encoding, Explorer, Search and Outline.',
			subs: [
				{ id: 'general', label: 'Files', match: ['files.*'] },
				{ id: 'save', label: 'Auto Save & Hot Exit', match: ['files.autoSave*', 'files.hotExit'] },
				{ id: 'encoding', label: 'Encoding & Line Endings', match: ['files.encoding', 'files.autoGuessEncoding', 'files.candidateGuessEncodings', 'files.eol', 'files.insertFinalNewline', 'files.trim*'] },
				{ id: 'explorer', label: 'Explorer', match: ['explorer.*'] },
				{ id: 'search', label: 'Search', match: ['search.*'] },
				{ id: 'outline', label: 'Outline & References', match: ['outline.*', 'references.*'] }
			]
		},
		{
			id: 'languages', label: 'Languages', icon: 'code',
			description: 'Settings contributed by built-in language features.',
			subs: [
				{ id: 'jsts', label: 'JavaScript & TypeScript', match: ['js/ts.*', 'typescript.*', 'javascript.*', 'jsts-chat-features.*'] },
				{ id: 'css', label: 'CSS, SCSS & Less', match: ['css.*', 'scss.*', 'less.*'] },
				{ id: 'html', label: 'HTML', match: ['html.*'] },
				{ id: 'emmet', label: 'Emmet', match: ['emmet.*'] },
				{ id: 'json', label: 'JSON', match: ['json.*'] },
				{ id: 'markdown', label: 'Markdown', match: ['markdown.*', 'markdown-mermaid.*'] },
				{ id: 'php', label: 'PHP', match: ['php.*'] }
			]
		},
		{
			id: 'notebooks', label: 'Notebooks', icon: 'notebook',
			description: 'Notebook editor, outputs, diffing and the Interactive Window.',
			subs: [
				{ id: 'general', label: 'Notebook Editor', match: ['notebook.*'] },
				{ id: 'output', label: 'Outputs', match: ['notebook.output.*'] },
				{ id: 'format', label: 'Formatting & Save', match: ['notebook.format*', 'notebook.codeActionsOnSave', 'notebook.insertFinalNewline', 'notebook.defaultFormatter'] },
				{ id: 'diff', label: 'Notebook Diff', match: ['notebook.diff.*'] },
				{ id: 'interactive', label: 'Interactive Window', match: ['interactiveWindow.*', 'ipynb.*'] }
			]
		},
		{
			id: 'accessibility', label: 'Accessibility', icon: 'eye',
			description: 'Screen reader support, signals and verbosity.',
			subs: [
				{ id: 'screenReader', label: 'Screen Reader', match: ['editor.accessibilitySupport', 'editor.accessibilityPageSize', 'editor.screenReaderAnnounceInlineSuggestion', 'editor.renderRichScreenReaderContent', 'editor.tabFocusMode', 'editor.allowVariableFontsInAccessibilityMode', 'editor.inlineCompletionsAccessibilityVerbose', 'accessibility.windowTitleOptimized', 'accessibility.accessibleView.*', 'accessibility.hideAccessibleView', 'accessibility.replEditor.*'] },
				{ id: 'signals', label: 'Accessibility Signals', match: ['accessibility.signals.*', 'accessibility.signalOptions.*'] },
				{ id: 'verbosity', label: 'Verbosity', match: ['accessibility.verbosity.*'] },
				{ id: 'general', label: 'Other', match: ['accessibility.*'] }
			]
		},
		{
			id: 'extensions', label: 'Extensions', icon: 'extensions',
			description: 'Installing, updating and allowing extensions.',
			subs: [
				{ id: 'general', label: 'Extensions', match: ['extensions.*'] }
			]
		},
		{
			id: 'security', label: 'Privacy & Security', icon: 'shield',
			description: 'Workspace Trust, telemetry and trusted domains.',
			subs: [
				{ id: 'trust', label: 'Workspace Trust', match: ['security.*'] },
				{ id: 'telemetry', label: 'Telemetry', match: ['telemetry.*', 'workbench.enableExperiments'] },
				{ id: 'domains', label: 'Trusted Domains', match: ['workbench.trustedDomains*'] }
			]
		},
		{
			id: 'application', label: 'Application', icon: 'globe',
			description: 'Proxy, updates, Settings Sync, accounts and remote.',
			subs: [
				{ id: 'network', label: 'Proxy & Network', match: ['http.*', 'network.*'] },
				{ id: 'update', label: 'Update', match: ['update.*'] },
				{ id: 'sync', label: 'Settings Sync & Cloud Changes', match: ['settingsSync.*', 'workbench.cloudChanges.*'] },
				{ id: 'keyboard', label: 'Keyboard', match: ['keyboard.*'] },
				{ id: 'accounts', label: 'Accounts', match: ['microsoft-sovereign-cloud.*', 'microsoft-authentication.*'] },
				{ id: 'remote', label: 'Remote', match: ['remote.*'] },
				{ id: 'general', label: 'Other', match: ['application.*', 'issueReporter.*'] }
			]
		}
	]
};
