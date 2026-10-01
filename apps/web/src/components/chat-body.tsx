import { type ReactNode } from "react";

interface ParagraphBlock {
  kind: "p";
  text: string;
}

interface ListBlock {
  kind: "ul";
  items: string[];
}

export type ChatBlock = ParagraphBlock | ListBlock;

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;

export function parseChatBlocks(content: string): ChatBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ChatBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;

  function flushParagraph() {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (text) blocks.push({ kind: "p", text });
  }

  function flushList() {
    if (list?.length) blocks.push({ kind: "ul", items: list });
    list = null;
  }

  for (const line of lines) {
    const bullet = line.match(BULLET);
    if (bullet) {
      flushParagraph();
      if (!list) list = [];
      list.push(bullet[1].trim());
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}

const INLINE =
  /(\*\*[^*\n]+?\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>)\]]+)/g;

/** Bold and links already present in a reply. Text stays text — no HTML injection. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const re = new RegExp(INLINE.source, "g");
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("[")) {
      const parsed = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      nodes.push(
        parsed ? (
          <ChatLink key={key} href={parsed[2]}>
            {parsed[1]}
          </ChatLink>
        ) : (
          token
        ),
      );
    } else {
      nodes.push(
        <ChatLink key={key} href={token}>
          {token}
        </ChatLink>,
      );
    }
    last = match.index + token.length;
    key += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function ChatLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
    >
      {children}
    </a>
  );
}

export function ChatBody({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseChatBlocks(content);
  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-2.5 leading-relaxed ${className}`}>
      {blocks.map((block, index) =>
        block.kind === "p" ? (
          <p key={index} className="break-words">
            {renderInline(block.text)}
          </p>
        ) : (
          <ul key={index} className="space-y-2">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2.5">
                <span
                  className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  aria-hidden
                />
                <span className="min-w-0 break-words">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
