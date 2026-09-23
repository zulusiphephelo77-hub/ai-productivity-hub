import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Bot,
  BrainCircuit,
  Check,
  ClipboardCheck,
  Copy,
  FileText,
  Mail,
  MessageSquareText,
  PanelLeft,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SquarePen,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateWorkplaceDraft } from "@/lib/workplace-ai.functions";

const chatStorageKey = "aurora-workplace-ai-chat";

const toolTabs = [
  {
    id: "email",
    label: "Email",
    title: "Smart Email Generator",
    description: "Turn a brief into a polished workplace email.",
    icon: Mail,
    placeholder: "Ask for a client follow-up, status update, reminder, or announcement.",
    primaryLabel: "Message brief",
  },
  {
    id: "notes",
    label: "Notes",
    title: "Meeting Notes Summarizer",
    description: "Convert raw notes into decisions and next steps.",
    icon: FileText,
    placeholder: "Paste meeting notes, transcript excerpts, or agenda fragments.",
    primaryLabel: "Meeting material",
  },
  {
    id: "tasks",
    label: "Planner",
    title: "AI Task Planner",
    description: "Break an objective into a sequenced action plan.",
    icon: ClipboardCheck,
    placeholder: "Describe the outcome, deadline, constraints, and collaborators.",
    primaryLabel: "Work objective",
  },
  {
    id: "research",
    label: "Research",
    title: "AI Research Assistant",
    description: "Shape a research question into a focused brief.",
    icon: Search,
    placeholder: "Enter the topic, decision, audience, and what needs verification.",
    primaryLabel: "Research question",
  },
  {
    id: "chat",
    label: "Chat",
    title: "AI Chatbot Interface",
    description: "Ask follow-ups across emails, notes, plans, and research.",
    icon: MessageSquareText,
    placeholder: "Ask Aurora to refine, rewrite, summarize, or plan your work.",
    primaryLabel: "Conversation",
  },
] as const;

type ToolId = (typeof toolTabs)[number]["id"];
type DraftToolId = Exclude<ToolId, "chat">;

type DraftInputs = {
  brief: string;
  audience: string;
  tone: string;
  goal: string;
  source: string;
};

const initialInputs: Record<DraftToolId, DraftInputs> = {
  email: {
    brief: "Follow up with a client after a project kickoff and confirm next steps.",
    audience: "Client stakeholder",
    tone: "Warm, concise, confident",
    goal: "Confirm responsibilities and the next meeting time",
    source: "",
  },
  notes: {
    brief: "Summarize this weekly operations sync.",
    audience: "Team leads",
    tone: "Clear and action-oriented",
    goal: "Capture decisions and accountable owners",
    source: "Paste notes or transcript here before generating.",
  },
  tasks: {
    brief: "Prepare a cross-functional launch plan for a new internal AI workflow.",
    audience: "Project team",
    tone: "Practical and direct",
    goal: "Prioritize work for the next two weeks",
    source: "",
  },
  research: {
    brief: "Research how AI assistants can reduce repetitive admin work for operations teams.",
    audience: "Leadership team",
    tone: "Evidence-minded and neutral",
    goal: "Produce a decision-ready brief with assumptions called out",
    source: "",
  },
};

const starterOutputs: Record<DraftToolId, string> = {
  email:
    "Subject: Next steps from our kickoff\n\nHi [Name],\n\nThank you for the productive kickoff today. I’ll consolidate the notes and share the first project outline by [date].\n\nTo keep momentum, could you confirm the primary decision-maker for approvals and the best time for our next checkpoint?\n\nBest,\n[Your name]",
  notes:
    "## Summary\n- The team aligned on the launch timeline and immediate blockers.\n\n## Decisions\n- Confirm the pilot audience before expanding rollout.\n\n## Action items\n- [ ] Assign owners for onboarding materials.\n- [ ] Share the implementation checklist.\n- [ ] Validate open risks before the next sync.",
  tasks:
    "## Priority plan\n1. Define the outcome and success measures.\n2. Identify dependencies and owners.\n3. Build the first working draft.\n4. Review with stakeholders.\n5. Ship, measure, and iterate.\n\n## First next action\nSchedule a 30-minute scope review with the core team.",
  research:
    "## Research brief\n- Clarify the decision this research should support.\n- Separate confirmed information from assumptions.\n- Compare workflow impact, risk, cost, and adoption effort.\n\n## Verify next\n- Recent benchmark data\n- Internal process volume\n- Legal and privacy requirements",
};

const samplePrompts = [
  "Rewrite this update so it sounds senior and concise.",
  "Turn these notes into action items with owners.",
  "Create a two-week plan for a product launch.",
];

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AI Workplace Productivity Assistant | Aurora Workplace AI" },
      {
        name: "description",
        content:
          "A modern responsive AI dashboard for emails, meeting summaries, task plans, research briefs, and ongoing workplace chat.",
      },
      { property: "og:title", content: "AI Workplace Productivity Assistant" },
      {
        property: "og:description",
        content:
          "Draft, summarize, plan, research, and chat with a professional AI workplace assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeTool, setActiveTool] = useState<ToolId>("email");
  const [inputs, setInputs] = useState(initialInputs);
  const [outputs, setOutputs] = useState(starterOutputs);
  const [runningTool, setRunningTool] = useState<DraftToolId | null>(null);
  const [toolError, setToolError] = useState<string | null>(null);
  const activeConfig = toolTabs.find((tool) => tool.id === activeTool) ?? toolTabs[0];
  const runDraft = useServerFn(generateWorkplaceDraft);

  const updateInput = (toolId: DraftToolId, key: keyof DraftInputs, value: string) => {
    setInputs((current) => ({
      ...current,
      [toolId]: { ...current[toolId], [key]: value },
    }));
  };

  const generateDraft = async (toolId: DraftToolId) => {
    setRunningTool(toolId);
    setToolError(null);
    try {
      const response = await runDraft({ data: { toolId, ...inputs[toolId] } });
      setOutputs((current) => ({ ...current, [toolId]: response.text }));
    } catch (error) {
      setToolError(error instanceof Error ? error.message : "The draft could not be generated.");
    } finally {
      setRunningTool(null);
    }
  };

  return (
    <main className="workplace-shell soft-grid min-h-dvh text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-strong sticky top-4 z-30 flex items-center justify-between gap-4 rounded-xl px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-extrabold text-brand-foreground shadow-glass">
              AW
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">Aurora Workplace AI</p>
              <p className="truncate text-xs text-muted-foreground">Productivity assistant dashboard</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge className="border-glass-border bg-aqua-soft text-aqua-foreground" variant="outline">
              AI draft studio
            </Badge>
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-xs font-bold text-brand">
              JP
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="glass-panel hidden rounded-xl p-3 lg:block">
            <div className="mb-4 flex items-center gap-2 px-2 text-sm font-semibold text-ink">
              <PanelLeft className="size-4 text-brand" />
              Workspace
            </div>
            <nav className="space-y-2">
              {toolTabs.map((tool) => {
                const Icon = tool.icon;
                const selected = activeTool === tool.id;
                return (
                  <Button
                    className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    type="button"
                    variant={selected ? "brand" : "glass"}
                  >
                    <Icon className="size-4" />
                    <span className="min-w-0">
                      <span className="block truncate">{tool.title}</span>
                      <span className="block truncate text-xs font-normal opacity-80">{tool.description}</span>
                    </span>
                  </Button>
                );
              })}
            </nav>
          </aside>

          <section className="flex min-h-0 flex-col gap-4">
            <div className="glass-panel flex gap-2 overflow-x-auto rounded-xl p-2 lg:hidden">
              {toolTabs.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Button
                    className="shrink-0"
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    type="button"
                    variant={activeTool === tool.id ? "brand" : "ghost"}
                  >
                    <Icon className="size-4" />
                    {tool.label}
                  </Button>
                );
              })}
            </div>

            <div className="grid min-h-[calc(100dvh-9.5rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="glass-strong flex min-h-0 flex-col rounded-xl p-4 sm:p-5">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <activeConfig.icon className="size-5 text-brand" />
                      <Badge className="border-glass-border bg-brand-soft text-brand" variant="outline">
                        {activeConfig.label}
                      </Badge>
                    </div>
                    <h1 className="text-2xl font-bold text-ink sm:text-3xl">{activeConfig.title}</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {activeConfig.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-aqua-soft px-3 py-2 text-xs font-medium text-aqua-foreground">
                    <ShieldCheck className="size-4" />
                    Review before use
                  </div>
                </div>

                {activeTool === "chat" ? (
                  <ChatWorkspace />
                ) : (
                  <DraftWorkspace
                    config={activeConfig}
                    error={toolError}
                    input={inputs[activeTool]}
                    isRunning={runningTool === activeTool}
                    onGenerate={() => generateDraft(activeTool)}
                    onInputChange={(key, value) => updateInput(activeTool, key, value)}
                    onOutputChange={(value) =>
                      setOutputs((current) => ({ ...current, [activeTool]: value }))
                    }
                    output={outputs[activeTool]}
                    toolId={activeTool}
                  />
                )}
              </div>

              <aside className="glass-panel rounded-xl p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
                  <BrainCircuit className="size-4 text-brand" />
                  Prompt structure
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <StructureRow label="Context" value="What happened, who is involved, and why it matters." />
                  <StructureRow label="Intent" value="The outcome, decision, or action you need." />
                  <StructureRow label="Constraints" value="Tone, audience, dates, owners, and risks." />
                  <StructureRow label="Review" value="Check names, facts, commitments, and sensitive details." />
                </div>
                <div className="mt-5 rounded-lg border border-glass-border bg-card/70 p-3 text-xs leading-relaxed text-muted-foreground">
                  AI outputs are drafts. Review, edit, and verify facts before sending messages or acting on recommendations.
                </div>
              </aside>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function DraftWorkspace({
  config,
  error,
  input,
  isRunning,
  onGenerate,
  onInputChange,
  onOutputChange,
  output,
  toolId,
}: {
  config: (typeof toolTabs)[number];
  error: string | null;
  input: DraftInputs;
  isRunning: boolean;
  onGenerate: () => void;
  onInputChange: (key: keyof DraftInputs, value: string) => void;
  onOutputChange: (value: string) => void;
  output: string;
  toolId: DraftToolId;
}) {
  const outputLines = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ]") || line.startsWith("- [x]") || /^\d+\./.test(line))
    .slice(0, 5);

  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4 rounded-xl border border-glass-border bg-card/70 p-4">
        <label className="grid gap-2 text-sm font-medium text-ink">
          {config.primaryLabel}
          <Textarea
            className="min-h-40 resize-none bg-background/60 text-sm leading-relaxed"
            onChange={(event) => onInputChange("brief", event.currentTarget.value)}
            placeholder={config.placeholder}
            value={input.brief}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Audience
            <Input
              className="bg-background/60"
              onChange={(event) => onInputChange("audience", event.currentTarget.value)}
              value={input.audience}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Tone
            <Input
              className="bg-background/60"
              onChange={(event) => onInputChange("tone", event.currentTarget.value)}
              value={input.tone}
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-ink">
          Goal
          <Input
            className="bg-background/60"
            onChange={(event) => onInputChange("goal", event.currentTarget.value)}
            value={input.goal}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-ink">
          Supporting material
          <Textarea
            className="min-h-24 resize-none bg-background/60 text-sm leading-relaxed"
            onChange={(event) => onInputChange("source", event.currentTarget.value)}
            value={input.source}
          />
        </label>

        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={isRunning || !input.brief.trim()} onClick={onGenerate} type="button" variant="brand">
            {isRunning ? <RefreshCw className="size-4 animate-spin" /> : <SquarePen className="size-4" />}
            {isRunning ? "Generating" : "Generate draft"}
          </Button>
          <Button onClick={() => copyText(output)} type="button" variant="glass">
            <Copy className="size-4" />
            Copy output
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-glass-border bg-card/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Editable output</p>
            <p className="text-xs text-muted-foreground">Refine the draft directly before using it.</p>
          </div>
          <Badge className="border-glass-border bg-aqua-soft text-aqua-foreground" variant="outline">
            Draft
          </Badge>
        </div>
        <Textarea
          className="min-h-[22rem] flex-1 resize-none bg-background/60 text-sm leading-relaxed"
          onChange={(event) => onOutputChange(event.currentTarget.value)}
          value={output}
        />
        {toolId === "tasks" && outputLines.length > 0 ? (
          <div className="mt-4 space-y-2 rounded-lg border border-glass-border bg-background/50 p-3">
            {outputLines.map((line) => (
              <div className="flex items-start gap-2 text-sm text-muted-foreground" key={line}>
                <Check className="mt-0.5 size-4 text-aqua" />
                <span>{line.replace(/^(- \[ \]|- \[x\]|\d+\.)\s*/, "")}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChatWorkspace() {
  const [loaded, setLoaded] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, setMessages, status, stop } = useChat({
    id: "aurora-workplace-chat",
    messages: [],
    transport,
    onError: (error) => setChatError(error.message),
    onFinish: ({ messages: finishedMessages }) => {
      localStorage.setItem(chatStorageKey, JSON.stringify(finishedMessages));
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const stored = localStorage.getItem(chatStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UIMessage[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch {
        localStorage.removeItem(chatStorageKey);
      }
    }
    setLoaded(true);
  }, [setMessages]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(chatStorageKey, JSON.stringify(messages));
    }
  }, [loaded, messages]);

  useEffect(() => {
    document.getElementById("aurora-chat-input")?.focus();
  }, [activeFocusKey(messages.length, status)]);

  const submitChat = async ({ text }: { text: string }) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    setChatError(null);
    await sendMessage({ text: trimmed });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-glass-border bg-card/70">
      <Conversation className="min-h-[26rem]">
        <ConversationContent className="gap-5 p-4 sm:p-5">
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Ask about an email, meeting, plan, or research task."
              icon={<Bot className="size-10 text-brand" />}
              title="Start with a workplace question"
            />
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}
          {status === "submitted" ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking...</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-glass-border p-3 sm:p-4">
        {chatError ? <p className="mb-2 text-sm font-medium text-destructive">{chatError}</p> : null}
        <PromptInput className="rounded-xl" onSubmit={submitChat}>
          <PromptInputTextarea
            className="min-h-20 bg-background/60 pr-4 text-sm leading-relaxed"
            id="aurora-chat-input"
            placeholder="Ask for help with a workplace task..."
          />
          <PromptInputFooter className="justify-between">
            <div className="flex min-w-0 flex-wrap gap-2">
              {samplePrompts.map((prompt) => (
                <Button
                  className="h-8 text-xs"
                  disabled={isBusy}
                  key={prompt}
                  onClick={() => sendMessage({ text: prompt })}
                  type="button"
                  variant="glass"
                >
                  {prompt}
                </Button>
              ))}
            </div>
            <PromptInputSubmit disabled={isBusy} onStop={stop} status={status} variant="default">
              {isBusy ? undefined : <Send className="size-4" />}
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>;
          }

          if (part.type === "reasoning") {
            return (
              <details className="rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-xs text-muted-foreground" key={`${message.id}-${index}`}>
                <summary className="cursor-pointer font-medium text-ink">Thinking</summary>
                <p className="mt-2 leading-relaxed">{part.text}</p>
              </details>
            );
          }

          if (part.type === "file") {
            return (
              <div className="rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-xs text-muted-foreground" key={`${message.id}-${index}`}>
                Attached file
              </div>
            );
          }

          return null;
        })}
      </MessageContent>
    </Message>
  );
}

function StructureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-glass-border bg-card/70 p-3">
      <p className="font-semibold text-ink">{label}</p>
      <p className="mt-1 leading-relaxed">{value}</p>
    </div>
  );
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function activeFocusKey(messageCount: number, status: string) {
  return `${messageCount}-${status}`;
}